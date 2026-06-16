import { Router } from 'express';
import { paymentController } from '../controller/payment.controller';
import { authenticate } from '../../../shared/middleware/auth.middleware';

const router = Router();

// Public webhook route (Stripe calls this anonymously, signature verification protects it)
router.post('/webhook', paymentController.webhook);

// Protected endpoints requiring active authentication session
router.get('/subscription', authenticate, paymentController.getSubscription);
router.get('/billing-history', authenticate, paymentController.getBillingHistory);
router.post('/create-checkout', authenticate, paymentController.createCheckoutSession);
router.post('/simulate-success', authenticate, paymentController.simulateSuccess);

export default router;
