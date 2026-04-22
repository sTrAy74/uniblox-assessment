import { NextResponse } from "next/server";

import { listCoupons } from "@/lib/store/checkout";

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      data: listCoupons(),
    },
    { status: 200 },
  );
}
