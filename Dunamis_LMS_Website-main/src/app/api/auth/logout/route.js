import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { TOKEN_COOKIE } from "@/lib/authConstants";
import { clearSessionCookies } from "@/lib/serverSession";

const BACKEND_URL = process.env.NEXT_PUBLIC_BASE_URL;

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;

  // Best-effort backend logout; clear cookies regardless of outcome.
  if (token) {
    try {
      await fetch(`${BACKEND_URL}/v1/user/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore — we still clear the local session
    }
  }

  return clearSessionCookies(NextResponse.json({ success: true }));
}
