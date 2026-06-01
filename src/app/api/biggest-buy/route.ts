export const dynamic = "force-dynamic";
export const revalidate = 0;

const BUY_TRACKER_URL = process.env.BUY_TRACKER_URL;

export async function GET(req: Request) {
  if (!BUY_TRACKER_URL) {
    return Response.json(
      { success: false, message: "BUY_TRACKER_URL not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit");
  const qs    = limit ? `?limit=${encodeURIComponent(limit)}` : "";

  try {
    const upstream = await fetch(`${BUY_TRACKER_URL}/leaderboard${qs}`, {
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
    return Response.json(data, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ success: false, message: msg }, { status: 502 });
  }
}
