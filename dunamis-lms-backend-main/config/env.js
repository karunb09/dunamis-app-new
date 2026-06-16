/**
 * Centralised environment validation.
 *
 * Runs once at process start (imported from index.js BEFORE the app boots).
 * Fails fast on missing critical secrets and loudly warns on weak ones so a
 * bad config is caught at deploy time instead of at the first request.
 */
const crypto = require("crypto");

// Secrets that the app cannot run safely without.
const REQUIRED = ["MONGODB_URL", "JWT_SECRET"];

// Known-weak placeholder secrets that must never reach production.
const WEAK_JWT_SECRETS = new Set([
  "thisisasecretkeyforjwt",
  "secret",
  "jwtsecret",
  "changeme",
]);

const MIN_JWT_SECRET_LENGTH = 32;

const validateEnv = () => {
  const isProd = process.env.NODE_ENV === "production";
  const missing = REQUIRED.filter((key) => !process.env[key]);

  if (missing.length) {
    console.error(
      `\n[env] FATAL: missing required environment variable(s): ${missing.join(", ")}`
    );
    console.error("[env] Set them in your .env / secret manager and restart.\n");
    process.exit(1);
  }

  const jwtSecret = process.env.JWT_SECRET.trim();
  const isWeak =
    WEAK_JWT_SECRETS.has(jwtSecret.toLowerCase()) ||
    jwtSecret.length < MIN_JWT_SECRET_LENGTH;

  if (isWeak) {
    const suggestion = crypto.randomBytes(48).toString("base64url");
    const banner =
      "============================================================";
    console.warn(`\n${banner}`);
    console.warn("[env] WEAK JWT_SECRET DETECTED");
    console.warn(
      `[env] Current secret is a known placeholder or shorter than ${MIN_JWT_SECRET_LENGTH} chars.`
    );
    console.warn("[env] Rotate it to a strong, random value, e.g.:");
    console.warn(`[env]   JWT_SECRET=${suggestion}`);
    console.warn(
      "[env] (rotating invalidates existing sessions — users re-login once)"
    );
    console.warn(`${banner}\n`);

    // In production a weak signing key is a security incident: refuse to boot.
    if (isProd) {
      console.error("[env] FATAL: refusing to start in production with a weak JWT_SECRET.");
      process.exit(1);
    }
  }
};

module.exports = { validateEnv };
