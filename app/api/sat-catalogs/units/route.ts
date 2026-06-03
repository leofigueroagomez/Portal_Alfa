import type { NextRequest } from "next/server";
import { handleSatCatalogSearch } from "@/lib/satCatalogSearch";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleSatCatalogSearch(request, "units");
}
