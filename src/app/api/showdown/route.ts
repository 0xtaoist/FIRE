export const dynamic = "force-dynamic";
export const revalidate = 0;

const BUY_TRACKER_URL = process.env.BUY_TRACKER_URL;

export async function GET() {
  if (!BUY_TRACKER_URL) {
    return Response.json(
      { success: false, message: "BUY_TRACKER_URL not configured" },
      { status: 500 }
    );
  }

  try {
    const upstream = await fetch(`${BUY_TRACKER_URL}/showdown`, {
      cache:  "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) {
      return Response.json(
        { success: false, message: `Upstream ${upstream.status}` },
        { status: 502 }
      );
    }
    const data = await upstream.json();
    // Real-time contest — keep the edge cache tiny so the clock stays honest.
    return Response.json(data, {
      headers: { "Cache-Control": "public, s-maxage=2, stale-while-revalidate=10" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ success: false, message: msg }, { status: 502 });
  }
}
