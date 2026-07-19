# Dunamis LMS — Dashboard

Admin and instructor portal for [dashboard.dunamisindia.co.in](https://dashboard.dunamisindia.co.in): user, course, and branch management, scheduling, attendance, payments, referrals, and system status.

Built with React 19, Vite, Tailwind CSS, Redux Toolkit, and React Router.

## Develop

```bash
npm install
npm run dev     # http://localhost:5173
```

Requires a `.env` with `VITE_BASE_URL` pointing at the backend API (and optionally `VITE_IT_SUPPORT_EMAIL`).

## Test & Build

```bash
npm test        # vitest
npm run build   # required before serving in production
npm run preview # serve the production build locally (:4173)
```

See the [repo root README](../README.md) for the full monorepo overview and deployment details.
