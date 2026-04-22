import { NextResponse } from "next/server";

import { checkoutCart } from "@/lib/store/checkout";
import type { CheckoutRequest } from "@/lib/store/types";

function validateCheckoutBody(body: unknown): { data?: CheckoutRequest; error?: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be a valid JSON object." };
  }

  const { couponCode } = body as Record<string, unknown>;

  if (couponCode !== undefined && typeof couponCode !== "string") {
    return { error: "couponCode must be a string when provided." };
  }

  return {
    data: {
      couponCode: couponCode as string | undefined,
    },
  };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid JSON body.",
      },
      { status: 400 },
    );
  }

  const validation = validateCheckoutBody(body);
  if (validation.error || !validation.data) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error ?? "Invalid request body.",
      },
      { status: 400 },
    );
  }

  const result = checkoutCart(validation.data);
  if (!result.success) {
    const statusCode =
      result.error.code === "EMPTY_CART" || result.error.code === "INVALID_COUPON" ? 400 : 409;

    return NextResponse.json(
      {
        success: false,
        error: result.error.message,
        code: result.error.code,
      },
      { status: statusCode },
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        order: result.order,
        rewardCoupon: result.rewardCoupon ?? null,
      },
    },
    { status: 201 },
  );
}
