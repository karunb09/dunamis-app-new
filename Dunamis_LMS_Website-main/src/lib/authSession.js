import {
  USER_COOKIE,
  SESSION_SENTINEL,
} from "@/lib/authConstants";

// Client-side session helpers.
//
// The JWT is NOT stored here any more. It lives only in an httpOnly cookie that
// the server sets and reads (see app/api/auth/* and lib/serverAuth.js), so it is
// invisible to JavaScript and cannot be exfiltrated by XSS. The only thing the
// client keeps is a readable, non-sensitive USER cookie for display.

const readCookie = (name) => {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
};

const safeParse = (value) => {
  try {
    return value ? JSON.parse(decodeURIComponent(value)) : null;
  } catch {
    return null;
  }
};

const slimUser = (user) =>
  user
    ? {
        _id: user._id || user.id || null,
        name: user.name || null,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        accountType: user.accountType || null,
        email: user.email || null,
        image: user.image || null,
        roleId: user.roleId || null,
        roleModel: user.roleModel || null,
      }
    : null;

const writeUserCookie = (user) => {
  if (typeof document === "undefined" || !user) return;
  const value = encodeURIComponent(JSON.stringify(slimUser(user)));
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  // 7-day display cookie; the httpOnly token cookie governs real auth lifetime.
  document.cookie = `${USER_COOKIE}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax${secure}`;
};

const deleteUserCookie = () => {
  if (typeof document === "undefined") return;
  document.cookie = `${USER_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
};

// The httpOnly token cookie is cleared by the server /api/auth/logout route.
// Here we can only clear the readable display cookie.
export const clearWebsiteAuthSession = () => {
  deleteUserCookie();
};

// Back-compat: callers use this to mean "is there a session?". Returns a
// non-secret sentinel (never the JWT) when a user cookie is present.
export const getWebsiteToken = () => {
  return getWebsiteUser() ? SESSION_SENTINEL : null;
};

export const getWebsiteUser = () => {
  return safeParse(readCookie(USER_COOKIE));
};

// Keep the readable display cookie in sync. The token is handled server-side.
export const persistWebsiteAuthSession = ({ user } = {}) => {
  if (user) writeUserCookie(user);
};
