import { headers } from "next/headers";

// CSRF guard for cookie-authenticated, state-changing route handlers. For
// same-origin browser fetches the Origin header equals our own origin.
// Cross-site (CSRF) requests carry the attacker's origin or, for some
// navigations, none — reject those.
export async function isSameOrigin() {
  const hdrs = await headers();
  const origin = hdrs.get("origin");
  if (!origin) return false;
  try {
    // Use the Host header (set explicitly by Nginx) rather than req.url, which
    // carries http:// behind a TLS-terminating proxy without X-Forwarded-Proto.
    // Host-only comparison is sufficient for CSRF — attacker domains differ here.
    const host = hdrs.get("x-forwarded-host") || hdrs.get("host");
    if (!host) return false;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
