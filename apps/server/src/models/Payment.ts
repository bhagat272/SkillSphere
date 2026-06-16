import mongoose, { Document, Schema } from 'mongoose';

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';
export type SubscriptionPlan = 'free' | 'premium' | 'pro';

export interface ISubscription {
  user: mongoose.Types.ObjectId;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubscriptionDocument extends ISubscription, Document {}

const subscriptionSchema = new Schema<ISubscriptionDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    stripeCustomerId: { type: String, required: true },
    stripeSubscriptionId: { type: String, required: true },
    plan: { type: String, enum: ['free', 'premium', 'pro'], required: true },
    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'trialing'],
      required: true,
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  { timestamps: true }
);

subscriptionSchema.index({ stripeCustomerId: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 });

export const Subscription = mongoose.model<ISubscriptionDocument>(
  'Subscription',
  subscriptionSchema
);

// ─── Payment Model ────────────────────────────────────────────────────────────
export interface IPayment {
  user: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'refunded';
  stripePaymentIntentId: string;
  description: string;
  metadata?: Record<string, string>;
  createdAt: Date;
}

export interface IPaymentDocument extends IPayment, Document {}

const paymentSchema = new Schema<IPaymentDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    status: { type: String, enum: ['succeeded', 'failed', 'refunded'], required: true },
    stripePaymentIntentId: { type: String, required: true, unique: true },
    description: String,
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Payment = mongoose.model<IPaymentDocument>('Payment', paymentSchema);
