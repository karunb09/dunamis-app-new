# Dunamis LMS — Backend

REST API for [api.dunamisindia.co.in](https://api.dunamisindia.co.in): auth (JWT), courses, enrollments, payments (Cashfree), slots, instructors, branches; cron jobs (node-cron, IST schedules); transactional email (Nodemailer).

Built with Node.js, Express 5, and MongoDB (Mongoose). Structure: `routes/` → `controller/` → `model/`, helpers in `utils/`, crons in `cronJobs/`, email templates in `mail/`. Entry point is `index.js` — no build step.

## Develop

```bash
npm install
npm run dev     # nodemon, http://localhost:3003
```

Requires a `.env` with the MongoDB connection string, JWT secret, Cashfree credentials, SMTP credentials, and `IT_SUPPORT_EMAIL`.

## Test

```bash
npm test                  # validation tests
npm run test:integration  # integration tests
npm run test:all
```

## Run in production

```bash
npm start   # NODE_ENV=production node index.js (managed by PM2 on the VPS)
```

See the [repo root README](../README.md) for the full monorepo overview and deployment details.
