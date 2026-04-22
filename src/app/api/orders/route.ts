import { NextResponse } from "next/server";

import { listOrders } from "@/lib/store/checkout";

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      data: listOrders(),
    },
    { status: 200 },
  );
}
