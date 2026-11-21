import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { TOKEN_COOKIE } from "@/lib/authConstants";
import { isSameOrigin } from "@/lib/sameOrigin";
import { clearSessionCookies, setSessionCookies, slimUser } from "@/lib/serverSession";

const BACKEND_URL = process.env.NEXT_PUBLIC_BASE_URL;

const isStudent = (user) => String(user?.accountType || "").toLowerCase() === "student";

// "Stay signed in": swaps the current, still-valid token for a fresh one and
// resets every session cookie, including the expiry the page counts down to.
export async function POST() {
  if (!(await isSameOrigin())) {
    return NextResponse.json(
      { success: false, message: "Cross-origin request blocked" },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) {
    return clearSessionCookies(
      NextResponse.json({ success: false, message: "No session" }, { status: 401 }),
    );
  }

  let data;
  let upstreamOk;
  try {
    const res = await fetch(`${BACKEND_URL}/v1/user/refresh-session`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    upstreamOk = res.ok;
    data = await res.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to extend session" },
      { status: 502 },
    );
  }

  if (!upstreamOk || !data?.token || !isStudent(data?.user)) {
    return clearSessionCookies(
      NextResponse.json(
        { success: false, message: data?.message || "Session expired" },
        { status: 401 },
      ),
    );
  }

  const res = NextResponse.json({ success: true, user: slimUser(data.user) });
  return setSessionCookies(res, data.token, data.user);
}
