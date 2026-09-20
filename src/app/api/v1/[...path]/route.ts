export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stage 4: versioned-API proxy with auth injection (docs/21 Stage 4).
// Forwards method + body + cookies to the backend /api/v1/* surface and
// passes Set-Cookie headers back, so the HttpOnly bis_session cookie flows
// without frontend JS ever touching it. Login UI is a later slice.

const API_BASE = (
  process.env.BIS_SIH_API_BASE_URL
  || process.env.NEXT_PUBLIC_API_BASE_URL
  || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

async function proxy(request: Request, path: string[]) {
  const url = new URL(request.url);
  const target = `${API_BASE}/api/v1/${path.join("/")}${url.search}`;
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const csrf = request.headers.get("x-csrf-token");
  if (csrf) headers.set("x-csrf-token", csrf);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  let res: Response;
  try {
    res = await fetch(target, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backend unavailable";
    return new Response(JSON.stringify({ error: { code: "BAD_GATEWAY", message } }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const out = new Headers();
  const body = await res.arrayBuffer();
  res.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === "set-cookie" || k === "content-type" || k === "x-request-id" || k === "retry-after") {
      out.append(key, value);
    }
  });
  // NextResponse-less raw Response: combine multiple Set-Cookie via getSetCookie when available.
  const setCookies = typeof (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === "function"
    ? (res.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
    : [];
  setCookies.forEach((c) => out.append("set-cookie", c));
  if (!out.has("content-type")) out.set("content-type", "application/json");
  return new Response(body, { status: res.status, headers: out });
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await params).path);
}
export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await params).path);
}
export async function PATCH(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await params).path);
}
export async function DELETE(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await params).path);
}
