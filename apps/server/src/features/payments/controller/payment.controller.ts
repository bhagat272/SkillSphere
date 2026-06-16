import { Request, Response } from 'express';
import { paymentService } from '../service/payment.service';
import { sendResponse } from '../../../shared/utils/response';
import { asyncHandler } from '../../../shared/utils/asyncHandler';

export class PaymentController {
  // POST /api/v1/payments/create-checkout
  createCheckoutSession = asyncHandler(async (req: Request, res: Response) => {
    const { plan } = req.body;
    if (!plan || (plan !== 'premium' && plan !== 'pro')) {
      sendResponse.badRequest(res, 'Plan must be premium or pro');
      return;
    }

    const result = await paymentService.createCheckoutSession(req.user!.userId, plan);
    sendResponse.success(res, result, 'Checkout session created');
  });

  // GET /api/v1/payments/subscription
  getSubscription = asyncHandler(async (req: Request, res: Response) => {
    const subscription = await paymentService.getSubscription(req.user!.userId);
    sendResponse.success(res, { subscription });
  });

  // GET /api/v1/payments/billing-history
  getBillingHistory = asyncHandler(async (req: Request, res: Response) => {
    const history = await paymentService.getBillingHistory(req.user!.userId);
    sendResponse.success(res, { history });
  });

  // POST /api/v1/payments/webhook
  // Receives Stripe events. Needs rawBody for validation check
  webhook = asyncHandler(async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    if (!sig) {
      sendResponse.badRequest(res, 'Missing stripe-signature header');
      return;
    }

    // Capture raw body buffer from request
    const rawBody = (req as any).rawBody || req.body;

    try {
      await paymentService.handleWebhook(rawBody, sig);
      res.status(200).json({ received: true });
    } catch (err: any) {
      logger.error('Stripe webhook handling failed:', err);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  // POST /api/v1/payments/simulate-success
  // Sandbox development endpoint to complete simulated checkout
  simulateSuccess = asyncHandler(async (req: Request, res: Response) => {
    const { plan } = req.body;
    if (!plan || (plan !== 'premium' && plan !== 'pro')) {
      sendResponse.badRequest(res, 'Plan must be premium or pro');
      return;
    }

    await paymentService.processSimulatedSuccess(req.user!.userId, plan);
    sendResponse.success(res, null, 'Subscription upgraded successfully (simulated)');
  });
}

import { logger } from '../../../config/logger';

export const paymentController = new PaymentController();
