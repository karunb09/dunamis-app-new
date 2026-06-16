# Backend tests

## Unit tests (no database) — `npm test`

`tests/validation.test.js` — zod validators, the `validate()` middleware, the
central `errorHandler`, and `asyncHandler`. Fast, deterministic, no external
deps. Runs in CI as-is.

## Integration tests (in-memory MongoDB) — `npm run test:integration`

Runs all `tests/*.integration.test.js` against a throwaway in-memory MongoDB
(`mongodb-memory-server`):

- `payment.webhook.integration.test.js` — the **real** Cashfree webhook handler:
  signature rejection, graceful handling of unknown/empty events, and the
  **idempotency guarantee** (a duplicate delivery is ignored and never
  re-processed — a retried callback can't double-fulfill an order).
- `auth.login.integration.test.js` — the **real** login controller: valid login
  issues a verifiable JWT (correct claims + 15m TTL) and an httpOnly cookie and
  never returns the password; wrong password / unknown email → 401; inactive
  account → 400; malformed payload → 400 from validation.
- `enrollment.fulfillment.integration.test.js` — the **real** `fulfillPaidTransaction`:
  a paid transaction enrols the student + seats them in the slot + marks the txn
  `fulfilled` exactly once, and a **repeat call does not double-enrol or
  double-seat** (idempotent fulfilment — protects against retried webhooks);
  non-paid / missing transactions are handled without throwing.

### First run downloads a mongod binary

`mongodb-memory-server` fetches a `mongod` binary from `fastdl.mongodb.org` on
first use, then caches it. This requires outbound network the first time. If your
environment can't reach that host, or the auto-selected version has no build for
your platform, pin one:

```bash
MONGOMS_VERSION=7.0.14 npm run test:integration
# or a distro override:
MONGOMS_DISTRO=ubuntu-22.04 MONGOMS_VERSION=7.0.14 npm run test:integration
```

Or point it at a locally installed mongod:

```bash
MONGOMS_SYSTEM_BINARY=/usr/bin/mongod npm run test:integration
```

> The signature logic and the handler's pre-DB branches (bad-signature → 401,
> no-order → 200) were verified directly against the real handler; only the
> DB-backed idempotency assertions require the mongod binary.

## Run everything — `npm run test:all`

### Extending: PAYMENT_SUCCESS fulfilment
The success path calls Cashfree's API and runs enrollment. Stub the Cashfree
client (see the scaffold comment at the bottom of the integration test) and seed
a Student/Course/Slot graph to assert single, idempotent fulfilment.
