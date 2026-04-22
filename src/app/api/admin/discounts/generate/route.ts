import { NextResponse } from "next/server";

import { generateDiscountCode } from "@/lib/store/checkout";

export async function POST() {
  const result = generateDiscountCode();
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error.message,
        code: result.error.code,
      },
      { status: 409 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        coupon: result.coupon,
        remainingEligibleGenerations: result.remainingEligibleGenerations,
      },
    },
    { status: 201 },
  );
}
