export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE = (
  process.env.BIS_SIH_API_BASE_URL
  || process.env.NEXT_PUBLIC_API_BASE_URL
  || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export async function POST(request: Request) {
  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  try {
    const res = await fetch(`${API_BASE}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backend unavailable";
    return new Response(JSON.stringify({ detail: message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
