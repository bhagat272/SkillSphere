import mongoose from 'mongoose';
import { Subscription, Payment, ISubscriptionDocument, IPaymentDocument } from '../../../models/Payment';
import { User } from '../../../models/User';

export class PaymentRepository {
  async findSubscriptionByUserId(userId: string): Promise<ISubscriptionDocument | null> {
    return Subscription.findOne({ user: new mongoose.Types.ObjectId(userId) }).exec();
  }

  async upsertSubscription(data: {
    user: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    plan: 'free' | 'premium' | 'pro';
    status: 'active' | 'canceled' | 'past_due' | 'trialing';
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  }): Promise<ISubscriptionDocument> {
    const userObjId = new mongoose.Types.ObjectId(data.user);

    // Upsert subscription log
    const sub = await Subscription.findOneAndUpdate(
      { user: userObjId },
      {
        $set: {
          stripeCustomerId: data.stripeCustomerId,
          stripeSubscriptionId: data.stripeSubscriptionId,
          plan: data.plan,
          status: data.status,
          currentPeriodStart: data.currentPeriodStart,
          currentPeriodEnd: data.currentPeriodEnd,
        },
      },
      { new: true, upsert: true }
    ).exec();

    // Update user profile flags
    await User.findByIdAndUpdate(data.user, {
      $set: {
        isPremium: data.plan !== 'free' && data.status === 'active',
        subscriptionTier: data.plan,
      },
    }).exec();

    return sub;
  }

  async updateSubscriptionStatus(
    subscriptionId: string,
    status: 'active' | 'canceled' | 'past_due' | 'trialing'
  ): Promise<ISubscriptionDocument | null> {
    const sub = await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscriptionId },
      { $set: { status } },
      { new: true }
    ).exec();

    if (sub) {
      await User.findByIdAndUpdate(sub.user, {
        $set: {
          isPremium: sub.plan !== 'free' && status === 'active',
        },
      }).exec();
    }

    return sub;
  }

  async logPayment(data: {
    user: string;
    amount: number;
    currency: string;
    status: 'succeeded' | 'failed' | 'refunded';
    stripePaymentIntentId: string;
    description: string;
    metadata?: Record<string, string>;
  }): Promise<IPaymentDocument> {
    const payment = new Payment({
      user: new mongoose.Types.ObjectId(data.user),
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      stripePaymentIntentId: data.stripePaymentIntentId,
      description: data.description,
      metadata: data.metadata,
    });
    return payment.save();
  }

  async getPaymentHistory(userId: string): Promise<IPaymentDocument[]> {
    return Payment.find({ user: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }
}

export const paymentRepository = new PaymentRepository();
