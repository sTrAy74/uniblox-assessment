import { beforeEach, describe, expect, it } from "vitest";

import { addToCart, resetCartForTests } from "./cart";
import {
  checkoutCart,
  forceExpireCouponForTests,
  generateDiscountCode,
  getAdminMetrics,
  resetCheckoutStoreForTests,
} from "./checkout";

describe("checkout discount and rewards", () => {
  beforeEach(() => {
    resetCartForTests();
    resetCheckoutStoreForTests();
  });

  it("allows admin discount generation only after every second successful order", () => {
    const initialAttempt = generateDiscountCode();
    expect(initialAttempt.success).toBe(false);

    addToCart({ productId: "p-001", quantity: 1 });
    const firstOrder = checkoutCart({});
    expect(firstOrder.success).toBe(true);

    const afterFirstOrderAttempt = generateDiscountCode();
    expect(afterFirstOrderAttempt.success).toBe(false);

    addToCart({ productId: "p-001", quantity: 1 });
    const secondOrder = checkoutCart({});
    expect(secondOrder.success).toBe(true);

    const afterSecondOrderAttempt = generateDiscountCode();
    expect(afterSecondOrderAttempt.success).toBe(true);
    if (afterSecondOrderAttempt.success) {
      expect(afterSecondOrderAttempt.coupon.discountPercent).toBe(10);
      expect(afterSecondOrderAttempt.remainingEligibleGenerations).toBe(0);
    }
  });

  it("returns empty cart error when checking out without items", () => {
    const result = checkoutCart({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("EMPTY_CART");
    }
  });

  it("rejects unknown coupon codes", () => {
    addToCart({ productId: "p-001", quantity: 1 });
    const result = checkoutCart({ couponCode: "SAVE10-DOESNOTEXIST" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("INVALID_COUPON");
    }
  });

  it("ignores blank coupon strings", () => {
    addToCart({ productId: "p-001", quantity: 1 });
    const result = checkoutCart({ couponCode: "   " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.order.discountAmount).toBe(0);
      expect(result.order.appliedCouponCode).toBeUndefined();
    }
  });

  it("applies coupon once and rejects reuse", () => {
    addToCart({ productId: "p-001", quantity: 1 });
    checkoutCart({});
    addToCart({ productId: "p-001", quantity: 1 });
    const secondOrder = checkoutCart({});
    expect(secondOrder.success).toBe(true);

    const generatedCoupon = generateDiscountCode();
    expect(generatedCoupon.success).toBe(true);
    // Narrow result type before reading reward coupon properties.
    if (!generatedCoupon.success) {
      throw new Error("Expected reward coupon to be issued.");
    }

    addToCart({ productId: "p-001", quantity: 1 });
    const discountedOrder = checkoutCart({ couponCode: generatedCoupon.coupon.code });
    expect(discountedOrder.success).toBe(true);
    if (discountedOrder.success) {
      expect(discountedOrder.order.discountAmount).toBeGreaterThan(0);
      expect(discountedOrder.order.appliedCouponCode).toBe(generatedCoupon.coupon.code);
    }

    addToCart({ productId: "p-001", quantity: 1 });
    const reusedCouponOrder = checkoutCart({ couponCode: generatedCoupon.coupon.code });
    expect(reusedCouponOrder.success).toBe(false);
    if (!reusedCouponOrder.success) {
      expect(reusedCouponOrder.error.code).toBe("USED_COUPON");
    }
  });

  it("marks coupons as expired after ttl window", () => {
    addToCart({ productId: "p-001", quantity: 1 });
    checkoutCart({});
    addToCart({ productId: "p-001", quantity: 1 });
    const secondOrder = checkoutCart({});
    expect(secondOrder.success).toBe(true);

    const generatedCoupon = generateDiscountCode();
    expect(generatedCoupon.success).toBe(true);
    // Fail fast so the rest of the test can safely use the coupon code.
    if (!generatedCoupon.success) {
      throw new Error("Expected reward coupon to be issued.");
    }

    forceExpireCouponForTests(generatedCoupon.coupon.code);

    addToCart({ productId: "p-001", quantity: 1 });
    const expiredCouponOrder = checkoutCart({ couponCode: generatedCoupon.coupon.code });
    expect(expiredCouponOrder.success).toBe(false);
    if (!expiredCouponOrder.success) {
      expect(expiredCouponOrder.error.code).toBe("EXPIRED_COUPON");
    }
  });

  it("reports admin metrics for purchased items, revenue, coupon count and discounts", () => {
    addToCart({ productId: "p-001", quantity: 2 });
    const firstOrder = checkoutCart({});
    expect(firstOrder.success).toBe(true);

    addToCart({ productId: "p-002", quantity: 1 });
    const secondOrder = checkoutCart({});
    expect(secondOrder.success).toBe(true);

    const generatedCoupon = generateDiscountCode();
    expect(generatedCoupon.success).toBe(true);
    if (!generatedCoupon.success) {
      throw new Error("Expected discount code generation to succeed.");
    }

    addToCart({ productId: "p-003", quantity: 1 });
    const discountedOrder = checkoutCart({ couponCode: generatedCoupon.coupon.code });
    expect(discountedOrder.success).toBe(true);

    const metrics = getAdminMetrics();
    expect(metrics.purchasedItemsCount).toBe(4);
    expect(metrics.revenue).toBeGreaterThan(0);
    expect(metrics.discountCodesCount).toBe(1);
    expect(metrics.totalDiscountsGiven).toBeGreaterThan(0);
  });

  it("tracks remaining eligible generations when many orders are placed", () => {
    for (let index = 0; index < 4; index += 1) {
      addToCart({ productId: "p-001", quantity: 1 });
      const order = checkoutCart({});
      expect(order.success).toBe(true);
    }

    const firstGenerated = generateDiscountCode();
    expect(firstGenerated.success).toBe(true);
    if (firstGenerated.success) {
      expect(firstGenerated.remainingEligibleGenerations).toBe(1);
    }

    const secondGenerated = generateDiscountCode();
    expect(secondGenerated.success).toBe(true);
    if (secondGenerated.success) {
      expect(secondGenerated.remainingEligibleGenerations).toBe(0);
    }

    const thirdGenerated = generateDiscountCode();
    expect(thirdGenerated.success).toBe(false);
  });
});
