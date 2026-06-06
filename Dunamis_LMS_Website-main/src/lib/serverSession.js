import { TOKEN_COOKIE, USER_COOKIE } from "@/lib/authConstants";

const isProd = process.env.NODE_ENV === "production";

const decodeExpSeconds = (token) => {
  try {
    const part = token.split(".")[1];
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
    return payload?.exp || null;
  } catch {
    return null;
  }
};

export const slimUser = (user) =>
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

// Sets the httpOnly JWT cookie (invisible to JS) and the readable display-only
// user cookie on a NextResponse.
export const setSessionCookies = (res, token, user) => {
  const exp = decodeExpSeconds(token);
  const maxAge = exp
    ? Math.max(0, exp - Math.floor(Date.now() / 1000))
    : 60 * 60 * 24 * 7;

  res.cookies.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  res.cookies.set(USER_COOKIE, encodeURIComponent(JSON.stringify(slimUser(user))), {
    httpOnly: false, // display data only; not a credential
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  return res;
};

export const clearSessionCookies = (res) => {
  res.cookies.set(TOKEN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  res.cookies.set(USER_COOKIE, "", { httpOnly: false, path: "/", maxAge: 0 });
  return res;
};
