import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { TOKEN_COOKIE } from "@/lib/authConstants";
import {
  setSessionCookies,
  clearSessionCookies,
  slimUser,
} from "@/lib/serverSession";

const BACKEND_URL = process.env.NEXT_PUBLIC_BASE_URL;

const isStudent = (user) =>
  String(user?.accountType || "").toLowerCase() === "student";

// Validates/refreshes the session against the backend using the httpOnly cookie.
// Returns the user (never the token). Clears the session on failure or for
// non-student accounts (the website portal is student-only).
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "No session" },
      { status: 401 },
    );
  }

  let data;
  let upstreamOk;
  try {
    const res = await fetch(`${BACKEND_URL}/v1/user/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    upstreamOk = res.ok;
    data = await res.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to restore session" },
      { status: 502 },
    );
  }

  if (!upstreamOk || data?.success === false || !isStudent(data?.user)) {
    return clearSessionCookies(
      NextResponse.json(
        { success: false, message: data?.message || "Session expired" },
        { status: 401 },
      ),
    );
  }

  const res = NextResponse.json({ success: true, user: slimUser(data.user) });
  // Refresh cookies (rolling user data + same token).
  return setSessionCookies(res, data.token || token, data.user);
}
