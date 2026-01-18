import { NextResponse } from "next/server";

import { getTotals } from "@/lib/totals";

export async function GET() {
  return NextResponse.json(getTotals());
}
