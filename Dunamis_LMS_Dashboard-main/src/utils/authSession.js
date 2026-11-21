const TOKEN_KEY = "token";
const USER_KEY = "user";
const SESSION_STATE_PREFIX = "session:";

// Storage key for UI state (filters, etc.) that lasts until sign-out.
export const sessionStateKey = (name) => `${SESSION_STATE_PREFIX}${name}`;

const safeParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const readStorage = (storage, key) => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (storage, key, value) => {
  try {
    storage.setItem(key, value);
  } catch {}
};

const removeStorage = (storage, key) => {
  try {
    storage.removeItem(key);
  } catch {}
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

export const clearAuthSession = () => {
  if (typeof window === "undefined") return;

  [window.sessionStorage, window.localStorage].forEach((storage) => {
    removeStorage(storage, TOKEN_KEY);
    removeStorage(storage, USER_KEY);
  });

  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(SESSION_STATE_PREFIX))
      .forEach((key) => removeStorage(window.localStorage, key));
  } catch {
    /* storage unavailable */
  }
};

export const getStoredToken = () => {
  if (typeof window === "undefined") return null;

  const token =
    readStorage(window.sessionStorage, TOKEN_KEY) ||
    readStorage(window.localStorage, TOKEN_KEY);

  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  if (payload?.exp && payload.exp * 1000 <= Date.now()) {
    clearAuthSession();
    return null;
  }

  if (!readStorage(window.sessionStorage, TOKEN_KEY)) {
    writeStorage(window.sessionStorage, TOKEN_KEY, token);
  }

  return token;
};

export const getStoredUser = () => {
  if (typeof window === "undefined") return null;

  const token = getStoredToken();
  if (!token) {
    clearAuthSession();
    return null;
  }

  const rawUser =
    readStorage(window.sessionStorage, USER_KEY) ||
    readStorage(window.localStorage, USER_KEY);
  const user = safeParse(rawUser);

  if (user && !readStorage(window.sessionStorage, USER_KEY)) {
    writeStorage(window.sessionStorage, USER_KEY, JSON.stringify(user));
  }

  return user;
};

// When the session ends, in epoch ms, or null once signed out (here or in
// another tab — sign-out clears the shared localStorage copy). Each tab reads
// its token from sessionStorage first, so a newer token that another tab got
// from "Stay signed in" is adopted here; otherwise this tab would keep the old
// one and sign everyone out when it lapsed.
export const syncSessionExpiry = () => {
  if (typeof window === "undefined") return null;
  const shared = readStorage(window.localStorage, TOKEN_KEY);
  if (!shared) return null;

  const expiryOf = (token) => (decodeJwtPayload(token)?.exp || 0) * 1000;
  const own = readStorage(window.sessionStorage, TOKEN_KEY);
  if (!own || expiryOf(shared) > expiryOf(own)) {
    writeStorage(window.sessionStorage, TOKEN_KEY, shared);
    const user = readStorage(window.localStorage, USER_KEY);
    if (user) writeStorage(window.sessionStorage, USER_KEY, user);
  }
  return Math.max(expiryOf(shared), own ? expiryOf(own) : 0) || null;
};

// One-time note for the sign-in page after a timed-out session. Router state
// can't carry it: the route guard redirects again and replaces that state.
const SESSION_ENDED_KEY = "sessionEndedNotice";

export const markSessionEnded = () =>
  writeStorage(window.sessionStorage, SESSION_ENDED_KEY, "1");

export const hasSessionEndedNotice = () =>
  typeof window !== "undefined" &&
  readStorage(window.sessionStorage, SESSION_ENDED_KEY) === "1";

export const clearSessionEndedNotice = () =>
  removeStorage(window.sessionStorage, SESSION_ENDED_KEY);

export const persistAuthSession = ({ token, user }) => {
  if (typeof window === "undefined") return;

  const userValue = user ? JSON.stringify(user) : "";

  [window.sessionStorage, window.localStorage].forEach((storage) => {
    if (token) {
      writeStorage(storage, TOKEN_KEY, token);
    }

    if (userValue) {
      writeStorage(storage, USER_KEY, userValue);
    }
  });
};
