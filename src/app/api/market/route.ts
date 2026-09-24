import { getMarket } from "@/lib/market";

export async function GET() {
  try {
    const market = await getMarket();
    return Response.json(market, {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" },
    });
  } catch (err) {
    console.error("market snapshot failed", err);
    return Response.json({ error: "Market data is temporarily unavailable." }, { status: 502 });
  }
}
