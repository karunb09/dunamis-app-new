# Dunamis LMS — Website

Public site for [dunamisindia.co.in](https://dunamisindia.co.in): course listings, enrollment and payment flow (Cashfree), become-an-instructor form, and the student portal (`/student/*`).

Built with Next.js 15 (App Router), React 19, Tailwind CSS v4, Redux Toolkit, and Framer Motion.

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
```

Requires a `.env` with `NEXT_PUBLIC_API_URL` pointing at the backend API.

## Build

```bash
npm run build
npm start
```

See the [repo root README](../README.md) for the full monorepo overview and deployment details.
