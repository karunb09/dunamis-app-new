# Dunamis LMS — iOS & Android App Roadmap

**Prepared:** July 2026
**Scope:** Bring the Dunamis India platform (dunamisindia.co.in) to iOS and Android, covering the student experience first and the teacher experience second, while reusing the existing backend and React expertise.

---

## 1. Executive Summary

| Item | Recommendation |
|---|---|
| Framework | **React Native + Expo** (single codebase for iOS + Android) |
| First release | **Student app MVP in ~3 months**, full launch by **Month 6** |
| Teacher features | Added in Months 4–5 inside the same app (role-based) |
| Backend | Reuse the existing Express/MongoDB API — add push notifications, refresh tokens, and a versioned mobile API surface |
| Payments | Keep **Cashfree** (allowed on both stores for real-world/live classes — see §7) |
| Build budget (6 months) | **₹9.4L – ₹19.6L** (~$11.3k – $23.6k) depending on team model |
| Ongoing maintenance | **₹55k – ₹1.2L/month** (~$660 – $1,450) after launch |

---

## 2. Current Codebase Assessment

The monorepo has three apps; the mobile apps sit alongside them as a fourth.

### What exists today

| Component | Stack | Mobile relevance |
|---|---|---|
| `Dunamis_LMS_Website-main` | Next.js 15, React 19, Redux Toolkit, Tailwind v4 | Student portal (`/student/*`) is the blueprint for the student app: my-courses, attendance, homework, assignments, performance, profile, upload |
| `Dunamis_LMS_Dashboard-main` | React 19 + Vite, Redux Toolkit, React Query, React Router | `TeacherPages` are the blueprint for teacher features: rosters, attendance marking, homework, scheduling |
| `dunamis-lms-backend-main` | Express 5, Mongoose 9, JWT, Zod, node-cron, Nodemailer | **Directly reusable.** 26 route modules covering courses, enrollments, payments, slots, attendance/homework, assessments, demo bookings, referrals, notices |

### Reusability audit

**Works for mobile as-is:**
- REST API with JWT — `middleware/auth.js` already accepts a header token (not just cookies), so mobile clients can use `Authorization` headers today.
- Zod validators, business logic in `services/` (enrollment, payment), and the Cashfree order/webhook flow.
- Redux Toolkit slices from the website/dashboard — state shapes and thunks port to React Native with minor changes.
- Domain models: student, teacher, class, classRoster, attendanceHomework, assignment, assessment, slot, demoBooking, paymentTransaction, referral.

**Gaps that mobile exposes (backend work required):**
1. **No push notifications.** All 8 cron jobs (class reminders, installment reminders, overdue reminders, attendance digests, assignment reminders) deliver by **email only**. Push is the single biggest UX win of going mobile.
2. **No refresh tokens.** A single JWT means either short sessions (bad on mobile) or long-lived tokens (bad security). Mobile needs access + refresh token rotation.
3. **No API versioning.** Web apps redeploy atomically with the API; mobile apps do not. Old app versions will live in the field for months, so breaking API changes need `/api/v1/` style versioning or additive-only discipline.
4. **File uploads** use `express-fileupload` with a local `uploads/` dir on the VPS — fine to keep initially, but homework photo uploads from phones will grow storage; plan object storage (S3/R2) by Month 5.
5. **No deep-link routes** (needed for payment return URLs, notification taps, password reset links).
6. **List endpoints** need consistent pagination for mobile infinite-scroll (some already paginate; audit all in Phase 0).

---

## 3. Framework Decision

| Criterion | React Native + Expo ✅ | Flutter | Capacitor (wrap website) |
|---|---|---|---|
| Team fit | **Excellent** — team already writes React 19 + Redux daily | New language (Dart), new paradigm | Excellent |
| Code reuse | High: Redux slices, API layer, validation logic, business rules | None — full rewrite | Highest, but… |
| Native feel / performance | Very good (New Architecture, Fabric) | Excellent | Poor — WebView; classes/attendance UIs feel sluggish; store rejection risk for "just a website" apps |
| Push, camera, offline | First-class via Expo modules | First-class | Plugin-dependent, clunky |
| OTA updates (bug fixes without store review) | **Yes — EAS Update** | No (store releases only) | Partial |
| Hiring in India | Large talent pool | Large pool | — |

**Decision: React Native with Expo (managed workflow + EAS).** One codebase, one team skill set, over-the-air JS fixes, and Expo handles the iOS/Android build/signing pain. Flutter is only worth it for a greenfield team; Capacitor is rejected because Apple routinely flags thin website wrappers (Guideline 4.2) and the student portal deserves native interactions.

**One app or two?** Ship **a single app with role-based experiences** (student by default; teacher tab set after teacher login). Two binaries double store overhead, review cycles, and marketing cost. Revisit a separate "Dunamis Teacher" app only if teacher tooling grows past ~15 screens.

---

## 4. Target Architecture

```
├── dunamis-mobile/                  # NEW — Expo app in the monorepo
│   ├── app/                         # expo-router file-based navigation
│   │   ├── (auth)/                  # login, signup, OTP, forgot-password
│   │   ├── (student)/               # home, my-courses, attendance, homework,
│   │   │                            #   assignments, performance, profile
│   │   ├── (teacher)/               # roster, mark-attendance, homework, schedule
│   │   └── (public)/                # course catalog, demo booking, centers
│   ├── src/
│   │   ├── api/                     # axios client + interceptors (token refresh)
│   │   ├── store/                   # Redux Toolkit (ported slices)
│   │   ├── components/
│   │   └── notifications/           # expo-notifications handlers
│   └── package.json
```

- **Navigation:** `expo-router` (mirrors the Next.js App Router mental model the team already knows).
- **State/data:** Redux Toolkit for session/global state + TanStack Query for server data (the dashboard already uses React Query — same patterns).
- **Auth:** access token in memory, refresh token in `expo-secure-store`; biometric unlock (Face ID / fingerprint) as a fast-login enhancement in Phase 3.
- **Payments:** Cashfree's official React Native SDK; deep link (`dunamis://payment-result`) replaces `CASHFREE_RETURN_URL` for the in-app flow.
- **Push:** Firebase Cloud Messaging (Android) + APNs (iOS) via `expo-notifications`; backend gets a `deviceToken` model and a small `notificationService` that the existing cron jobs call alongside Nodemailer.
- **Offline:** read-only caching of enrolled courses, schedule, and homework list (React Query persistence); no offline writes in v1.
- **Observability:** Sentry (React Native) + existing backend `log.model.js`.

---

## 5. Phased Roadmap (6 months to full launch)

### Phase 0 — Foundations (Month 1)
*Backend hardening + project setup. No screens yet beyond a walking skeleton.*

- Add refresh-token rotation and mobile login endpoints (reuse OTP flow in `otp.model.js`).
- Introduce `/api/v1` prefix (aliasing current routes; no breaking change for web).
- Audit + standardize pagination and error shapes on the ~15 endpoints mobile will hit.
- Device token registration endpoint + `notificationService` (FCM/APNs) — wire into `classReminder.cron.js` first.
- Expo project scaffold in the monorepo, CI via EAS Build, internal distribution (TestFlight + Play Internal Testing).
- Enroll in Apple Developer Program and Google Play Console (lead time: Apple D-U-N-S/org verification can take 2–4 weeks — **start Day 1**).

**Exit criteria:** log in on a real device, receive a test push, CI produces installable builds.

### Phase 1 — Student MVP (Months 2–3)
- Auth: login, signup, OTP verify, forgot password, secure session.
- Student home: today's classes, pending homework, notices (`adminNotice`).
- My courses, class schedule (slots), attendance history.
- Homework: view + submit with **camera/photo upload** (native advantage over web).
- Assignments & assessments: view, submit, see scores (`performance`).
- Profile + **in-app account deletion** (mandatory — Apple 5.1.1(v) and Google both require it).
- Push notifications live for: class reminder (30 min before), homework posted, attendance marked.

**Exit criteria:** closed beta with 30–50 real students across 2 branches; crash-free rate > 99%.

### Phase 2 — Payments & Growth Loop (Month 4)
- Course catalog + course detail (public, pre-login browsing).
- **Demo booking flow** in-app (the funnel's top — currently website-only).
- Enrollment + Cashfree checkout (SDK), payment status via existing webhook; installment payments + installment-due push (replacing/augmenting `installmentReminder.js` emails).
- Referral code entry + referral status screens.
- Deep links + Android App Links / iOS Universal Links (`dunamisindia.co.in/app/*`).

### Phase 3 — Teacher Experience (Month 5)
- Teacher login → teacher tab set.
- Today's roster, **mark attendance + homework** in one flow (mirrors `attendanceHomework` model) — kills the biggest teacher pain of doing this on a laptop.
- Class schedule, student list per class, missed-attendance nudge via push (replacing `missedAttendanceReminder.cron.js` email).
- Biometric quick-unlock; offline read cache; move uploads to S3-compatible storage (Cloudflare R2) if photo volume warrants.

### Phase 4 — Polish & Public Launch (Month 6)
- Store assets: screenshots, preview video, localized listings (English + Hindi descriptions).
- Privacy policy page + Apple Privacy "Nutrition Labels" + Google Data Safety form.
- Performance pass (cold start < 2.5s, list virtualization), accessibility pass, Android back-gesture audit.
- Staged rollout: Play Store 10% → 50% → 100%; iOS phased release.
- Analytics events (Firebase Analytics or PostHog) for the funnel: install → demo booked → enrolled → paid.

### Post-launch (Months 7+)
- In-app chat / announcements per class (WebSocket — new backend capability).
- Class recordings / content library (`content.model.js` exists — surface it).
- Wallet / partial-payment UX, sibling accounts under one parent login.
- Tablet layout for teachers; widget for "next class"; regional language UI (Hindi first).

---

## 6. Team & Timeline

Two realistic staffing models for an Indian market build:

**Model A — Lean (freelance/contract):** 1 senior React Native dev (full-time contract) + existing backend dev at 50% + designer on-demand + founder-led QA. Fits the 6-month plan with ~2-week buffer risk per phase.

**Model B — Small team (recommended if budget allows):** 2 RN devs (1 senior, 1 mid) + existing backend dev at 50% + part-time designer + part-time QA. Compresses Phases 1–3 by ~1 month and de-risks the single-dev bus factor.

| Role | Model A (₹/mo) | Model B (₹/mo) |
|---|---|---|
| Senior React Native dev | 1,20,000 | 1,40,000 |
| Mid React Native dev | — | 80,000 |
| Backend dev (50% allocation) | 40,000 | 50,000 |
| UI/UX designer (part-time) | 25,000 (M1–M3, M6) | 35,000 (M1–M4, M6) |
| QA (part-time, from Phase 1) | — (founder/staff) | 30,000 (M3–M6) |

---

## 7. Store Compliance & Payment Policy (read before building checkout)

- **Cashfree in-app is permitted** because Dunamis sells **live, real-world instruction** (music/dance/art classes at physical centers or live online). Apple Guideline **3.1.3(d)** (person-to-person / real-world services) and Google Play's payments policy both exempt such services from mandatory IAP/Play Billing. **Caveat:** if the roadmap later adds *pre-recorded self-serve courses* (the `content` model), those are digital goods — selling them in-app would trigger Apple's 15–30% IAP requirement. Keep recorded-content purchases on the website, or price in the commission.
- **Account deletion in-app** is mandatory on both stores (Phase 1 scope, not optional).
- **Apple review lead times:** first submission commonly takes 1–3 rounds; budget 2 weeks in Month 6.
- **Privacy:** DPDP Act (India) + store privacy forms; students may be minors — add a guardian-consent line to signup and avoid ad SDKs entirely.
- **Google Play** requires 12+ testers for 14 days on new personal accounts — use an **organization** Play account to skip this, matching the business entity.

---

## 8. Cost Plan — Build Phase (Months 1–6)

Fixed/one-time (Month 1 unless noted):

| Item | Cost |
|---|---|
| Apple Developer Program (annual) | ₹8,500 (~$99/yr) |
| Google Play Console (one-time) | ₹2,100 (~$25) |
| Design assets/icon/screenshot tooling | ₹15,000 one-time |
| 2 mid-range Android test devices + 1 used iPhone | ₹60,000 one-time (skip if devices exist) |

Recurring tooling & infra during build:

| Item | ₹/month | Notes |
|---|---|---|
| Expo EAS (Production plan) | 1,700 (~$19) | Builds + OTA updates; free tier OK for M1–M2 |
| Firebase (FCM, Analytics) | 0 | Spark plan is free; FCM is free at any scale |
| Sentry (Team) | 2,300 (~$26) | Free tier acceptable until beta (M3) |
| Existing Hostinger VPS | 0 incremental | Current API handles mobile load; revisit at >5k MAU |
| Cloudflare R2 storage (from M5) | ~850 | Homework photo uploads |
| Cashfree | 0 fixed | ~2% MDR per transaction (existing cost, not new) |

### Month-by-month totals

**Model A (lean):**

| Month | Team | Tools/Infra | One-time | Total (₹) |
|---|---|---|---|---|
| M1 | 1,85,000 | 0 | 85,600 | **2,70,600** |
| M2 | 1,85,000 | 1,700 | — | **1,86,700** |
| M3 | 1,85,000 | 4,000 | — | **1,89,000** |
| M4 | 1,60,000 | 4,000 | — | **1,64,000** |
| M5 | 1,60,000 | 4,850 | — | **1,64,850** |
| M6 | 1,85,000 | 4,850 | — | **1,89,850** |
| **Build total** | | | | **≈ ₹11.65L (~$14k)** |

*(Without new test devices: ≈ ₹11.05L. Absolute floor with a single cheaper contractor and free tiers: ≈ ₹9.4L.)*

**Model B (small team):**

| Month | Team | Tools/Infra | One-time | Total (₹) |
|---|---|---|---|---|
| M1 | 3,05,000 | 0 | 85,600 | **3,90,600** |
| M2 | 3,05,000 | 1,700 | — | **3,06,700** |
| M3 | 3,35,000 | 4,000 | — | **3,39,000** |
| M4 | 3,35,000 | 4,000 | — | **3,39,000** |
| M5 | 3,00,000 | 4,850 | — | **3,04,850** |
| M6 | 3,35,000 | 4,850 | — | **3,39,850** |
| **Build total** | | | | **≈ ₹19.6L (~$23.6k)** |

### Ongoing maintenance (Month 7 onward)

| Item | ₹/month |
|---|---|
| RN dev retainer (bug fixes, OS updates, small features — 25–50%) | 40,000 – 90,000 |
| Backend share of mobile maintenance | 10,000 – 20,000 |
| EAS + Sentry + R2 | ~5,000 |
| Apple annual fee (amortized) | ~700 |
| **Total** | **≈ ₹55,000 – ₹1,15,000/month** |

Annual recurring floor even with zero feature work: **~₹1.5L/year** (store fees + tooling + mandatory OS-compatibility updates — Apple and Google each ship breaking SDK/target requirements yearly; an unmaintained app gets delisted).

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Apple org enrollment / D-U-N-S delays | Blocks TestFlight | Start enrollment Day 1 of Month 1 |
| Apple rejects payment flow interpretation | Launch delay | Document the "live real-world services" position in review notes; keep recorded content out of in-app purchase paths |
| Single RN dev leaves (Model A) | Project stalls | Monorepo code reviews by web team; Model B if budget allows |
| Old app versions vs API changes | Broken clients in field | `/api/v1` versioning + additive-only changes + minimum-supported-version check on app launch |
| Photo uploads swamp VPS disk | API instability | R2 migration gate in Phase 3; monitor disk via existing ops routes |
| Push fatigue → notification opt-outs | Loses the key channel | Per-category notification preferences in profile from day one |

---

## 10. Success Metrics (first 90 days post-launch)

- ≥ 60% of active students install and log in.
- ≥ 40% of teacher attendance marked via mobile.
- Crash-free sessions ≥ 99.5%; cold start < 2.5s on mid-range Android.
- Demo bookings from app ≥ 20% of total demo bookings.
- Push opt-in ≥ 70%; class-reminder push open rate ≥ 35%.
- Store rating ≥ 4.3 on both stores.

---

## 11. Immediate Next Steps (this week)

1. Approve framework choice (React Native + Expo) and staffing model (A or B).
2. Begin Apple Developer **organization** enrollment and Google Play **organization** account setup.
3. Backend: spike the refresh-token + device-token endpoints (est. 3–4 dev-days).
4. Design: student app wireframes for Phase 1 screens, starting from the existing `/student/*` pages.
