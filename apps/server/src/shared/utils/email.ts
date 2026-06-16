import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

// ─── Email Service ────────────────────────────────────────────────────────────
// Nodemailer with SMTP (Gmail/SendGrid compatible).
// Actual sending is queued via BullMQ (see workers/email.worker.ts)
// so HTTP requests are not blocked by email delivery.

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

// Verify connection on startup
transporter.verify().then(() => {
  logger.info('✅ Email transporter ready');
}).catch((err) => {
  logger.warn('⚠️  Email transporter not configured:', err.message);
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || options.html.replace(/<[^>]*>/g, ''),
  });
}

// ─── Email Templates ──────────────────────────────────────────────────────────

export const emailTemplates = {
  verifyEmail: (firstName: string, verifyUrl: string) => ({
    subject: 'Verify your SkillSphere AI account',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: 'Inter', Arial, sans-serif; background: #0f172a; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">SkillSphere AI</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Verify Your Email Address</p>
          </div>
          <div style="padding: 40px;">
            <p style="color: #94a3b8; font-size: 16px;">Hi <strong style="color: #e2e8f0;">${firstName}</strong>,</p>
            <p style="color: #94a3b8;">Thanks for signing up! Please verify your email address to get started.</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${verifyUrl}" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #64748b; font-size: 14px;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  forgotPassword: (firstName: string, resetUrl: string) => ({
    subject: 'Reset your SkillSphere AI password',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: 'Inter', Arial, sans-serif; background: #0f172a; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #ef4444, #f97316); padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">SkillSphere AI</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Password Reset Request</p>
          </div>
          <div style="padding: 40px;">
            <p style="color: #94a3b8; font-size: 16px;">Hi <strong style="color: #e2e8f0;">${firstName}</strong>,</p>
            <p style="color: #94a3b8;">We received a request to reset your password. Click below to choose a new one.</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #ef4444, #f97316); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Reset Password
              </a>
            </div>
            <p style="color: #64748b; font-size: 14px;">This link expires in 1 hour. If you didn't request this, please ignore this email and your password will remain unchanged.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  welcomeEmail: (firstName: string) => ({
    subject: 'Welcome to SkillSphere AI 🚀',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: 'Inter', Arial, sans-serif; background: #0f172a; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #6366f1, #06b6d4); padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to SkillSphere AI! 🎉</h1>
          </div>
          <div style="padding: 40px;">
            <p style="color: #94a3b8;">Hi <strong style="color: #e2e8f0;">${firstName}</strong>, your account is ready!</p>
            <p style="color: #94a3b8;">Start by completing your profile to get the most out of our AI-powered networking platform.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};
