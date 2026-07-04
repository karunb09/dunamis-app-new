/**
 * Auth/token configuration.
 *
 * Single source of truth for the access-token lifetime so the JWT `expiresIn`
 * and the auth cookie stay in sync. There is no refresh token, so this value is
 * effectively the session length before a user must log in again.
 *
 * Override with JWT_ACCESS_TTL_MINUTES (defaults to 15).
 */
const ACCESS_TOKEN_TTL_MINUTES = Number(process.env.JWT_ACCESS_TTL_MINUTES) || 60;
const ACCESS_TOKEN_TTL_SECONDS = ACCESS_TOKEN_TTL_MINUTES * 60;
const ACCESS_TOKEN_TTL_MS = ACCESS_TOKEN_TTL_SECONDS * 1000;

module.exports = {
  ACCESS_TOKEN_TTL_MINUTES,
  ACCESS_TOKEN_TTL_SECONDS,
  ACCESS_TOKEN_TTL_MS,
};
