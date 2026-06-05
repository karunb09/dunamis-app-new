import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { TOKEN_COOKIE } from "@/lib/authConstants";

const BACKEND_URL = process.env.NEXT_PUBLIC_BASE_URL;

// Methods that mutate state must be protected against CSRF, because we now
// authenticate with a cookie (header-based bearer auth was immune to CSRF).
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Hop-by-hop / host-specific headers we must not forward upstream.
const STRIPPED_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "accept-encoding",
  "cookie", // never leak our cookies to the backend
  "authorization", // we set this ourselves from the httpOnly cookie
]);

const STRIPPED_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
]);

async function sameOriginOk(req) {
  const hdrs = await headers();
  const origin = hdrs.get("origin");
  // For same-origin browser fetches the Origin header equals our own origin.
  // Cross-site (CSRF) requests carry the attacker's origin or, for some
  // navigations, none — reject those on unsafe methods.
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

async function handle(req, ctx) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { success: false, message: "Backend not configured" },
      { status: 500 },
    );
  }

  if (UNSAFE_METHODS.has(req.method) && !(await sameOriginOk(req))) {
    return NextResponse.json(
      { success: false, message: "Cross-origin request blocked" },
      { status: 403 },
    );
  }

  const { path = [] } = await ctx.params;
  const search = new URL(req.url).search;
  const targetUrl = `${BACKEND_URL}/${path.join("/")}${search}`;

  // Build upstream headers from the incoming request, minus host-specific ones.
  const outHeaders = new Headers();
  req.headers.forEach((value, key) => {
    if (!STRIPPED_REQUEST_HEADERS.has(key.toLowerCase())) {
      outHeaders.set(key, value);
    }
  });

  // Inject the real JWT from the httpOnly cookie. The client never sees it.
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (token) outHeaders.set("authorization", `Bearer ${token}`);

  const hasBody = !["GET", "HEAD"].includes(req.method);
  const init = {
    method: req.method,
    headers: outHeaders,
    redirect: "manual",
  };
  if (hasBody) {
    init.body = await req.arrayBuffer();
    init.duplex = "half";
  }

  let upstream;
  try {
    upstream = await fetch(targetUrl, init);
  } catch {
    return NextResponse.json(
      { success: false, message: "Upstream request failed" },
      { status: 502 },
    );
  }

  const body = await upstream.arrayBuffer();
  const resHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!STRIPPED_RESPONSE_HEADERS.has(key.toLowerCase())) {
      resHeaders.set(key, value);
    }
  });

  return new NextResponse(body, {
    status: upstream.status,
    headers: resHeaders,
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
