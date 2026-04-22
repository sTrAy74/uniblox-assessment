import { NextResponse } from "next/server";

import { getAdminMetrics } from "@/lib/store/checkout";

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      data: getAdminMetrics(),
    },
    { status: 200 },
  );
}
