import { getStockPricesUsd } from "@/lib/stockPrices";
export const dynamic = "force-dynamic";
export async function GET() {
  const { prices, ethUsd } = await getStockPricesUsd();
  return Response.json({ prices, ethUsd, updatedAt: new Date().toISOString() });
}
