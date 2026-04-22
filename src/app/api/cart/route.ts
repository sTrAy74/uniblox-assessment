import { NextResponse } from "next/server";

import { addToCart, getCartSummary, getProductById } from "@/lib/store/cart";
import type { AddToCartRequest } from "@/lib/store/types";

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      data: getCartSummary(),
    },
    { status: 200 },
  );
}

function validateAddToCartBody(body: unknown): { data?: AddToCartRequest; error?: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be a valid JSON object." };
  }

  const { productId, quantity } = body as Record<string, unknown>;

  if (typeof productId !== "string" || productId.trim().length === 0) {
    return { error: "productId is required and must be a non-empty string." };
  }

  if (quantity !== undefined) {
    if (!Number.isInteger(quantity) || (quantity as number) <= 0) {
      return { error: "quantity must be a positive integer when provided." };
    }
  }

  return {
    data: {
      productId: productId.trim(),
      quantity: quantity as number | undefined,
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

  const validation = validateAddToCartBody(body);
  if (validation.error || !validation.data) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error ?? "Invalid request body.",
      },
      { status: 400 },
    );
  }

  const product = getProductById(validation.data.productId);
  if (!product) {
    return NextResponse.json(
      {
        success: false,
        error: "Product not found.",
      },
      { status: 404 },
    );
  }

  const cart = addToCart(validation.data);

  return NextResponse.json(
    {
      success: true,
      data: cart,
    },
    { status: 201 },
  );
}
