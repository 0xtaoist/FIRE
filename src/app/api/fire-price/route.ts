import { getFireStats } from "@/lib/firePrice";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(await getFireStats());
}
