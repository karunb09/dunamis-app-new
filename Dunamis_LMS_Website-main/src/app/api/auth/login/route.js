import { NextResponse } from "next/server";
import { setSessionCookies, slimUser } from "@/lib/serverSession";

const BACKEND_URL = process.env.NEXT_PUBLIC_BASE_URL;

// Proxies the backend login, then stores the JWT in an httpOnly cookie. The
// token is never sent back to the browser; the client only receives the user.
export async function POST(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request" },
      { status: 400 },
    );
  }

  let data;
  let upstreamOk;
  try {
    const res = await fetch(`${BACKEND_URL}/v1/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    upstreamOk = res.ok;
    data = await res.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to login" },
      { status: 502 },
    );
  }

  if (!upstreamOk || data?.success === false || !data?.token) {
    return NextResponse.json(
      { success: false, message: data?.message || "Login failed" },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ success: true, user: slimUser(data.user) });
  return setSessionCookies(res, data.token, data.user);
}
