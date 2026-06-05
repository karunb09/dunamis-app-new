import { cookies } from "next/headers";
import { authInitialState } from "@/store/authSlice";
import {
  TOKEN_COOKIE,
  USER_COOKIE,
  SESSION_SENTINEL,
} from "@/lib/authConstants";

const decodeJwtPayload = (token) => {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const isExpired = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false; // no exp claim -> trust until backend rejects
  return payload.exp * 1000 <= Date.now();
};

const parseUser = (raw) => {
  try {
    return raw ? JSON.parse(decodeURIComponent(raw)) : null;
  } catch {
    return null;
  }
};

/**
 * Reads the session on the server to seed the Redux store, so the first server
 * render already knows who is logged in (no hydration mismatch). The JWT is read
 * from the httpOnly cookie for validity; only a non-secret sentinel and the
 * display user are placed into client-visible state. Returns null when there is
 * no valid session.
 *
 * Next 15: cookies() is async; reading it opts the route into dynamic rendering
 * (required for per-request auth).
 */
export async function readServerAuth() {
  let token;
  let userRaw;
  try {
    const cookieStore = await cookies();
    token = cookieStore.get(TOKEN_COOKIE)?.value;
    userRaw = cookieStore.get(USER_COOKIE)?.value;
  } catch {
    return null;
  }

  if (!token || isExpired(token)) return null;

  return {
    ...authInitialState,
    // Never expose the JWT to the client bundle; the real token stays in the
    // httpOnly cookie and is injected by the BFF proxy.
    token: SESSION_SENTINEL,
    user: parseUser(userRaw),
    hydrating: false,
  };
}
