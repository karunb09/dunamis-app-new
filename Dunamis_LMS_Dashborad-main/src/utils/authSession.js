const TOKEN_KEY = "token";
const USER_KEY = "user";

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
