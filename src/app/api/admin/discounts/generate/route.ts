import { NextResponse } from "next/server";

import { generateDiscountCode } from "@/lib/store/checkout";

type GenerateDiscountCodeBody = {
  discountPercent?: number;
  expiresAt?: string;
};

function validateBody(body: unknown): { data?: GenerateDiscountCodeBody; error?: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be a valid JSON object." };
  }

  const { discountPercent, expiresAt } = body as Record<string, unknown>;

  if (discountPercent !== undefined) {
    if (typeof discountPercent !== "number" || !Number.isFinite(discountPercent)) {
      return { error: "discountPercent must be a valid number when provided." };
    }
    if (discountPercent <= 0 || discountPercent > 95) {
      return { error: "discountPercent must be greater than 0 and at most 95." };
    }
  }

  if (expiresAt !== undefined) {
    if (typeof expiresAt !== "string") {
      return { error: "expiresAt must be a valid ISO date string when provided." };
    }
    const parsed = new Date(expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      return { error: "expiresAt must be a valid date." };
    }
    if (parsed.getTime() <= Date.now()) {
      return { error: "expiresAt must be in the future." };
    }
  }

  return {
    data: {
      discountPercent: discountPercent as number | undefined,
      expiresAt: expiresAt as string | undefined,
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

  const validation = validateBody(body);
  if (validation.error || !validation.data) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error ?? "Invalid request body.",
      },
      { status: 400 },
    );
  }

  const result = generateDiscountCode({
    discountPercent: validation.data.discountPercent,
    expiresAt: validation.data.expiresAt ? new Date(validation.data.expiresAt) : undefined,
  });
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
