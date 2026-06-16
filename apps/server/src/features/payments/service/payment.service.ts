import Stripe from 'stripe';
import { paymentRepository } from '../repository/payment.repository';
import { User } from '../../../models/User';
import { AppError } from '../../../shared/utils/asyncHandler';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';

// Lazy initialize Stripe to prevent crash if key is missing
let stripe: Stripe | null = null;
const stripeSecret = env.STRIPE_SECRET_KEY?.trim();
const isStripeConfigured =
  Boolean(stripeSecret) &&
  stripeSecret !== 'sk_test_your_stripe_secret_key';

if (isStripeConfigured) {
  stripe = new Stripe(stripeSecret!, {
    apiVersion: '2024-04-10' as any, // Stable version
  });
  logger.info('Stripe SDK initialized successfully.');
} else {
  logger.warn('STRIPE_SECRET_KEY is missing or using placeholder. Running in Payment Simulation Mode.');
}

export class PaymentService {
  async createCheckoutSession(
    userId: string,
    plan: 'premium' | 'pro'
  ): Promise<{ url: string; isSimulated: boolean }> {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    if (!isStripeConfigured || !stripe) {
      // ─── Payment Simulation Mode Fallback ──────────────────────────
      logger.info(`Creating simulated payment checkout session for user: ${userId}, plan: ${plan}`);
      // Redirect to a local mock success url that registers the plan
      const simulatedUrl = `${env.CLIENT_URL}/payment-success?session_id=mock_sess_${plan}_${userId}`;
      return { url: simulatedUrl, isSimulated: true };
    }

    // Determine price ID from env
    const priceId = plan === 'premium' ? env.STRIPE_PREMIUM_PRICE_ID : env.STRIPE_PRO_PRICE_ID;
    if (!priceId || priceId.startsWith('price_your_')) {
      throw new AppError('Stripe Price ID is not configured in environment variables', 500);
    }

    try {
      // Create or retrieve Stripe customer ID
      let stripeCustomerId = '';
      const existingSub = await paymentRepository.findSubscriptionByUserId(userId);
      if (existingSub) {
        stripeCustomerId = existingSub.stripeCustomerId;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId },
        });
        stripeCustomerId = customer.id;
      }

      // Create standard checkout session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.CLIENT_URL}/pricing`,
        client_reference_id: userId,
        metadata: { userId, plan },
      });

      if (!session.url) {
        throw new AppError('Stripe session URL generation failed', 500);
      }

      return { url: session.url, isSimulated: false };
    } catch (error: any) {
      logger.error('Stripe createCheckoutSession error:', error);
      throw new AppError(error.message || 'Payment initiation failed', 500);
    }
  }

  // Webhook processor for real Stripe events
  async handleWebhook(rawBody: string | Buffer, signature: string): Promise<void> {
    if (!isStripeConfigured || !stripe) return;
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new AppError('Stripe webhook secret is not configured', 500);
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      logger.error(`Webhook Signature verification failed: ${err.message}`);
      throw new AppError('Webhook signature validation failed', 400);
    }

    logger.info(`Received Stripe webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;
        const plan = (session.metadata?.plan || 'premium') as 'premium' | 'pro';
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (!userId || !subscriptionId) {
          logger.error('Missing userId or subscriptionId in checkout.session.completed metadata');
          break;
        }

        // Retrieve subscription details from Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

        await paymentRepository.upsertSubscription({
          user: userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          plan,
          status: 'active',
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        });

        await paymentRepository.logPayment({
          user: userId,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency || 'usd',
          status: 'succeeded',
          stripePaymentIntentId: session.payment_intent as string || `sub_pay_${subscriptionId}`,
          description: `Subscription package: ${plan}`,
        });

        logger.info(`Successfully processed subscription for user: ${userId}, plan: ${plan}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await paymentRepository.updateSubscriptionStatus(
          sub.id,
          sub.status === 'active' ? 'active' : 'canceled'
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        // Reset user subscription status to free tier
        const updatedSub = await paymentRepository.updateSubscriptionStatus(sub.id, 'canceled');
        if (updatedSub) {
          await User.findByIdAndUpdate(updatedSub.user, {
            $set: { isPremium: false, subscriptionTier: 'free' },
          }).exec();
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason === 'subscription_cycle') {
          const subscriptionId = invoice.subscription as string;
          const subDoc = await Subscription.findOne({ stripeSubscriptionId: subscriptionId });
          if (subDoc) {
            await paymentRepository.logPayment({
              user: subDoc.user.toString(),
              amount: invoice.amount_paid / 100,
              currency: invoice.currency,
              status: 'succeeded',
              stripePaymentIntentId: invoice.payment_intent as string || `cycle_${invoice.id}`,
              description: `Recurring renewal charge for subscription: ${subDoc.plan}`,
            });
          }
        }
        break;
      }

      default:
        logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  // ─── Payment Simulation Mode Success Handler ─────────────────────
  // Completes checkout and upgrades user role in Sandbox development environment
  async processSimulatedSuccess(userId: string, plan: 'premium' | 'pro'): Promise<void> {
    logger.info(`Processing simulated payment success for user ${userId}, plan ${plan}`);
    
    const randomSubId = `mock_sub_${Math.random().toString(36).substring(7)}`;
    const randomCustId = `mock_cust_${Math.random().toString(36).substring(7)}`;

    // Upsert subscription
    await paymentRepository.upsertSubscription({
      user: userId,
      stripeCustomerId: randomCustId,
      stripeSubscriptionId: randomSubId,
      plan,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    // Log simulated transaction invoice
    await paymentRepository.logPayment({
      user: userId,
      amount: plan === 'premium' ? 19.0 : 49.0,
      currency: 'usd',
      status: 'succeeded',
      stripePaymentIntentId: `mock_pi_${Math.random().toString(36).substring(7)}`,
      description: `Simulated subscription upgrade: ${plan}`,
    });
  }

  async getSubscription(userId: string) {
    return paymentRepository.findSubscriptionByUserId(userId);
  }

  async getBillingHistory(userId: string) {
    return paymentRepository.getPaymentHistory(userId);
  }
}

// Helper reference since model is imported dynamically inside the repo,
// we define local Subscription schema model check to avoid cycle.
import { Subscription } from '../../../models/Payment';

export const paymentService = new PaymentService();
