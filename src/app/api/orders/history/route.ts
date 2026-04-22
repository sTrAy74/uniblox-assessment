import { NextResponse } from "next/server";

import { listOrderHistory } from "@/lib/store/checkout";

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      data: listOrderHistory(),
    },
    { status: 200 },
  );
}
