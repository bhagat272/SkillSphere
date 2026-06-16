# SkillSphere AI

AI-powered professional networking and freelance collaboration platform built as a production-grade MERN SaaS portfolio project.

## Why This Project Helps in Full Stack Interviews

SkillSphere AI demonstrates the exact engineering themes startups and product companies expect from a 2+ year full-stack developer:

- Secure JWT authentication with refresh token rotation, email verification, reset flows, RBAC, session/device tracking, rate limiting, Helmet, HPP, and Mongo sanitization.
- Feature-based backend architecture with controllers, services, repositories, validators, models, queues, workers, sockets, and shared utilities.
- MongoDB schema design with indexes, embedded subdocuments, virtuals, text search, pagination, aggregation pipelines, and dashboard analytics.
- Real-time chat and notifications with Socket.io, BullMQ, Redis, read receipts, typing, and presence-ready client hooks.
- Job marketplace, recruiter/candidate dashboards, saved jobs, application tracking, Stripe subscriptions, and payment history.
- React 19 + Vite + TypeScript frontend with Redux Toolkit, RTK Query, lazy-loaded routes, reusable dashboards, protected-app structure, and responsive Tailwind UI.

## Monorepo Structure

```txt
apps/
  client/                 React 19, Vite, TypeScript, Redux Toolkit, RTK Query
  server/                 Express, TypeScript, MongoDB, Redis, BullMQ, Socket.io
packages/
  shared/                 Shared product types used by client and server
docs/
  system-design.md        HLD, LLD, ER/database diagrams, tradeoffs, interview notes
  openapi.json            Swagger-ready API contract
  postman_collection.json Postman collection for core flows
```

## Run Locally

```bash
npm install
npm run dev
```

PowerShell users may need `npm.cmd run dev` if script execution policy blocks `npm.ps1`.

## Local Login/Register Setup

For development with MongoDB Atlas and no local Redis/SMTP:

1. Copy `apps/server/.env.local.example` to `apps/server/.env`.
2. Replace `MONGODB_URI=PASTE_YOUR_MONGODB_ATLAS_URL_HERE` with your MongoDB cluster URL.
3. Keep these development flags enabled:

```env
DEV_DISABLE_REDIS=true
DEV_AUTO_VERIFY_EMAIL=true
DEV_SKIP_EMAIL_QUEUE=true
```

4. Seed verified demo accounts:

```bash
npm.cmd run seed:demo --workspace=apps/server
```

Demo logins:

```txt
candidate@skillsphere.dev / Password123!
recruiter@skillsphere.dev / Password123!
admin@skillsphere.dev / Password123!
```

5. Start both apps in dev mode and open `http://localhost:3000`:

```bash
npm.cmd run dev:server
npm.cmd run dev:client
```

## Environment

Create `apps/server/.env`:

```env
NODE_ENV=development
PORT=5000
API_PREFIX=/api/v1
CLIENT_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/skillsphere
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=replace_with_32_plus_chars_access_secret
JWT_REFRESH_SECRET=replace_with_32_plus_chars_refresh_secret
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=replace
SMTP_PASS=replace
EMAIL_FROM=no-reply@skillsphere.ai
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PREMIUM_PRICE_ID=
STRIPE_PRO_PRICE_ID=
OPENAI_API_KEY=
```

## Verification

```bash
npm.cmd run build --workspace=apps/client
npm.cmd run build --workspace=apps/server
```

Both client and server builds pass in this workspace.

## Production Notes

- Redis is used for short-lived verification/reset tokens and BullMQ queues. This prevents slow email/notification work from blocking HTTP requests.
- Refresh tokens are stored server-side per device so sessions can be revoked and token reuse can be detected.
- MongoDB indexes are intentionally defined close to the schemas so query strategy is visible during code review.
- Stripe has simulation mode for local demos and real webhook handling for production.
- AI endpoints are isolated in their own feature module so provider changes do not leak across the product.

Read [docs/system-design.md](./docs/system-design.md) for diagrams, low-level design, tradeoffs, scalability concerns, schema decisions, React optimization notes, and interview questions.
