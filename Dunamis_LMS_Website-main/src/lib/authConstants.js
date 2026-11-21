// Shared auth constants (safe to import on both client and server).

// httpOnly cookie holding the real JWT. Set/cleared ONLY by server route
// handlers (src/app/api/auth/*). JavaScript can never read it.
export const TOKEN_COOKIE = "dunamis_token";

// Readable cookie holding NON-SENSITIVE display fields (name, role, image) so
// the server can render the nav and the client can show the user before /me
// resolves. Not a credential.
export const USER_COOKIE = "dunamis_user";

// Readable cookie holding only when the session ends (epoch seconds), so the
// page can warn before it does. Set and cleared with the two cookies above.
export const SESSION_EXP_COOKIE = "dunamis_session_exp";

// Client-side marker placed in Redux/state to mean "a session exists" without
// ever exposing the JWT. Existing `token && ...` checks keep working.
export const SESSION_SENTINEL = "session";
