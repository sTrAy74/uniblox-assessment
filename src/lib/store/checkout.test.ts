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
    }
  });

  it("auto-issues a coupon on every second successful order", () => {
    addToCart({ productId: "p-001", quantity: 1 });
    const firstOrder = checkoutCart({});
    expect(firstOrder.success).toBe(true);
    if (firstOrder.success) {
      expect(firstOrder.rewardCoupon).toBeUndefined();
    }

    addToCart({ productId: "p-001", quantity: 1 });
    const secondOrder = checkoutCart({});
    expect(secondOrder.success).toBe(true);
    if (secondOrder.success) {
      expect(secondOrder.rewardCoupon).toBeDefined();
      expect(secondOrder.rewardCoupon?.discountPercent).toBe(10);
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
    expect(metrics.discountCodesCount).toBe(2);
    expect(metrics.totalDiscountsGiven).toBeGreaterThan(0);
  });

  it("allows admin generation only when current order count satisfies nth condition", () => {
    for (let index = 0; index < 4; index += 1) {
      addToCart({ productId: "p-001", quantity: 1 });
      const order = checkoutCart({});
      expect(order.success).toBe(true);
    }

    const firstGenerated = generateDiscountCode();
    expect(firstGenerated.success).toBe(true);

    const secondGeneratedSameMilestone = generateDiscountCode();
    expect(secondGeneratedSameMilestone.success).toBe(false);

    addToCart({ productId: "p-001", quantity: 1 });
    const fifthOrder = checkoutCart({});
    expect(fifthOrder.success).toBe(true);

    const afterFifthOrderGeneration = generateDiscountCode();
    expect(afterFifthOrderGeneration.success).toBe(false);
  });

  it("caps coupon issuance to two per milestone (one auto and one admin)", () => {
    addToCart({ productId: "p-001", quantity: 1 });
    checkoutCart({});

    addToCart({ productId: "p-001", quantity: 1 });
    const secondOrder = checkoutCart({});
    expect(secondOrder.success).toBe(true);
    if (!secondOrder.success) {
      throw new Error("Expected successful second order.");
    }
    expect(secondOrder.rewardCoupon).toBeDefined();

    const adminCoupon = generateDiscountCode();
    expect(adminCoupon.success).toBe(true);

    const extraAdminCoupon = generateDiscountCode();
    expect(extraAdminCoupon.success).toBe(false);
  });

  it("supports custom discount and expiry for admin-generated coupons", () => {
    addToCart({ productId: "p-001", quantity: 1 });
    checkoutCart({});
    addToCart({ productId: "p-001", quantity: 1 });
    const secondOrder = checkoutCart({});
    expect(secondOrder.success).toBe(true);

    const customExpiry = new Date(Date.now() + 30 * 60 * 1000);
    const adminCoupon = generateDiscountCode({
      discountPercent: 35,
      expiresAt: customExpiry,
    });

    expect(adminCoupon.success).toBe(true);
    if (!adminCoupon.success) {
      throw new Error("Expected admin coupon generation to succeed.");
    }

    expect(adminCoupon.coupon.discountPercent).toBe(35);
    expect(new Date(adminCoupon.coupon.expiresAt).getTime()).toBe(customExpiry.getTime());

    if (secondOrder.success) {
      expect(secondOrder.rewardCoupon?.discountPercent).toBe(10);
    }
  });
});
