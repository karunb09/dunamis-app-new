const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

const safeParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const decodeJwtPayload = (token) => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
};

export const clearWebsiteAuthSession = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
};

export const getWebsiteToken = () => {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(TOKEN_KEY);

  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  if (payload?.exp && payload.exp * 1000 <= Date.now()) {
    clearWebsiteAuthSession();
    return null;
  }

  return token;
};

export const getWebsiteUser = () => {
  if (typeof window === "undefined") return null;
  if (!getWebsiteToken()) return null;
  return safeParse(window.localStorage.getItem(USER_KEY));
};

export const persistWebsiteAuthSession = ({ token, user }) => {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
  if (user) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};
