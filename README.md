# Dunamis LMS

Monorepo for [Dunamis India](https://dunamisindia.co.in) — a creative-education platform offering music, dance, languages, art, and wellness courses. Three independently deployed apps live here, each with its own `package.json` and `.env`.

| App | Stack | Port | Domain |
|-----|-------|------|--------|
| [`Dunamis_LMS_Website-main`](Dunamis_LMS_Website-main/) | Next.js 15 (App Router), React 19, Tailwind v4, Redux Toolkit, Framer Motion | 3000 | dunamisindia.co.in |
| [`Dunamis_LMS_Dashboard-main`](Dunamis_LMS_Dashboard-main/) | React 19 + Vite, Tailwind, Redux Toolkit, React Router | 4173 | dashboard.dunamisindia.co.in |
| [`dunamis-lms-backend-main`](dunamis-lms-backend-main/) | Node.js, Express 5, MongoDB (Mongoose) | 3003 | api.dunamisindia.co.in |

- **Website** — public site: course listings, enrollment and payment flow (Cashfree), become-an-instructor form, student portal (`/student/*`).
- **Dashboard** — admin and instructor portal: user/course/branch management, scheduling, attendance, payments, referrals, system status.
- **Backend** — REST API: auth (JWT), courses, enrollments, payments, slots, instructors, branches; cron jobs (node-cron, IST schedules); transactional email (Nodemailer).

## Getting Started

Prerequisites: Node.js 20+, a MongoDB instance, and a `.env` file in each app folder (not committed — ask a maintainer for the current values).

Run each app from within its own folder:

```bash
# Backend (API on :3003)
cd dunamis-lms-backend-main
npm install
npm run dev

# Website (:3000)
cd Dunamis_LMS_Website-main
npm install
npm run dev

# Dashboard (:5173 in dev)
cd Dunamis_LMS_Dashboard-main
npm install
npm run dev
```

Key environment variables:

- Website: `NEXT_PUBLIC_API_URL` — backend API base URL
- Dashboard: `VITE_BASE_URL` — backend API base URL, `VITE_IT_SUPPORT_EMAIL`
- Backend: MongoDB connection, JWT secret, Cashfree credentials (`CASHFREE_API_VERSION`, `CASHFREE_RETURN_URL`), SMTP credentials, `IT_SUPPORT_EMAIL`

## Tests & Builds

```bash
# Backend
npm test                    # validation tests
npm run test:integration    # integration tests

# Dashboard
npm test                    # vitest
npm run build               # verify before deploying

# Website
npm run build
```

Both frontends require `npm run build` before serving in production; the backend has no build step.

## Deployment

Push to `main` deploys automatically via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

1. GitHub Actions SSHes into the production VPS (Hostinger).
2. The repo is pulled and diffed against the previous HEAD — **only apps with changed files are rebuilt/reinstalled**.
3. Apps run as PM2-managed processes behind Nginx (Let's Encrypt SSL); PM2 restarts only if at least one app was processed.

Dependabot ([`.github/dependabot.yml`](.github/dependabot.yml)) runs weekly: patch/minor updates grouped into one PR per app, majors separate.

## Repository Layout

```
├── Dunamis_LMS_Website-main/     # Public site (Next.js)
├── Dunamis_LMS_Dashboard-main/   # Admin/instructor dashboard (React + Vite)
├── dunamis-lms-backend-main/     # REST API (Express + Mongoose)
├── nginx-conf/                   # Nginx server blocks for the three domains
└── .github/                      # Deploy workflow + Dependabot config
```

For architecture details, domain rules, and coding conventions, see [CLAUDE.md](Claude.md).
