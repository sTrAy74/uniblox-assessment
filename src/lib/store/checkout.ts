import { clearCart, getCartSummary } from "@/lib/store/cart";
import type { CheckoutRequest, Coupon, Order } from "@/lib/store/types";

const REWARD_ORDER_INTERVAL = 2;
const REWARD_DISCOUNT_PERCENT = 10;
const REWARD_COUPON_TTL_MS = 2 * 60 * 60 * 1000;

const orders: Order[] = [];
const coupons: Coupon[] = [];
const milestoneIssuance = new Map<number, { autoIssued: boolean; adminIssued: boolean }>();

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildCouponCode(): string {
  // Keep coupon codes short, readable, and easy to type.
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SAVE10-${randomPart}`;
}

function issueRewardCoupon(now: Date): Coupon {
  const expiresAt = new Date(now.getTime() + REWARD_COUPON_TTL_MS);

  const coupon: Coupon = {
    code: buildCouponCode(),
    discountPercent: REWARD_DISCOUNT_PERCENT,
    expiresAt: expiresAt.toISOString(),
  };

  coupons.push(coupon);
  return coupon;
}

function isNthOrderConditionSatisfied(): boolean {
  return orders.length > 0 && orders.length % REWARD_ORDER_INTERVAL === 0;
}

function getCurrentMilestoneNumber(): number | null {
  if (!isNthOrderConditionSatisfied()) {
    return null;
  }
  return orders.length / REWARD_ORDER_INTERVAL;
}

function ensureMilestoneState(milestone: number): { autoIssued: boolean; adminIssued: boolean } {
  const existingState = milestoneIssuance.get(milestone);
  if (existingState) {
    return existingState;
  }

  const initialState = { autoIssued: false, adminIssued: false };
  milestoneIssuance.set(milestone, initialState);
  return initialState;
}

function getCouponByCode(code: string): Coupon | undefined {
  return coupons.find((coupon) => coupon.code.toUpperCase() === code.toUpperCase());
}

type CheckoutErrorCode =
  | "EMPTY_CART"
  | "INVALID_COUPON"
  | "EXPIRED_COUPON"
  | "USED_COUPON";

type CheckoutResult =
  | {
      success: true;
      order: Order;
      rewardCoupon?: Coupon;
    }
  | {
      success: false;
      error: {
        code: CheckoutErrorCode;
        message: string;
      };
    };

export function checkoutCart(payload: CheckoutRequest): CheckoutResult {
  const cart = getCartSummary();
  if (cart.items.length === 0) {
    return {
      success: false,
      error: {
        code: "EMPTY_CART",
        message: "Cannot checkout with an empty cart.",
      },
    };
  }

  const now = new Date();
  const rawCouponCode = payload.couponCode?.trim();
  // Normalize blank strings to undefined so downstream logic stays simple.
  const couponCode = rawCouponCode && rawCouponCode.length > 0 ? rawCouponCode : undefined;

  let discountAmount = 0;
  let appliedCouponCode: string | undefined;
  let couponToRedeem: Coupon | undefined;

  if (couponCode) {
    const coupon = getCouponByCode(couponCode);
    if (!coupon) {
      return {
        success: false,
        error: {
          code: "INVALID_COUPON",
          message: "Coupon code is invalid.",
        },
      };
    }

    if (coupon.usedAt) {
      return {
        success: false,
        error: {
          code: "USED_COUPON",
          message: "Coupon code has already been used.",
        },
      };
    }

    // Expiration is inclusive of the stored timestamp: equal means already expired.
    if (new Date(coupon.expiresAt).getTime() <= now.getTime()) {
      return {
        success: false,
        error: {
          code: "EXPIRED_COUPON",
          message: "Coupon code has expired.",
        },
      };
    }

    discountAmount = roundCurrency((cart.subtotal * coupon.discountPercent) / 100);
    appliedCouponCode = coupon.code;
    couponToRedeem = coupon;
  }

  const total = roundCurrency(Math.max(0, cart.subtotal - discountAmount));
  const order: Order = {
    id: `ord-${String(orders.length + 1).padStart(4, "0")}`,
    createdAt: now.toISOString(),
    items: cart.items,
    subtotal: cart.subtotal,
    discountAmount,
    total,
    appliedCouponCode,
  };

  if (couponToRedeem) {
    couponToRedeem.usedAt = now.toISOString();
  }

  orders.push(order);
  clearCart();
  const milestone = getCurrentMilestoneNumber();
  let rewardCoupon: Coupon | undefined;
  if (milestone !== null) {
    const milestoneState = ensureMilestoneState(milestone);
    if (!milestoneState.autoIssued) {
      rewardCoupon = issueRewardCoupon(now);
      milestoneState.autoIssued = true;
    }
  }

  return {
    success: true,
    order,
    rewardCoupon,
  };
}

type GenerateDiscountCodeResult =
  | {
      success: true;
      coupon: Coupon;
      remainingEligibleGenerations: number;
    }
  | {
      success: false;
      error: {
        code: "CONDITION_NOT_MET";
        message: string;
      };
    };

export function generateDiscountCode(): GenerateDiscountCodeResult {
  const milestone = getCurrentMilestoneNumber();
  if (milestone === null) {
    return {
      success: false,
      error: {
        code: "CONDITION_NOT_MET",
        message: "Discount code generation condition is not satisfied yet.",
      },
    };
  }

  const milestoneState = ensureMilestoneState(milestone);
  if (milestoneState.adminIssued) {
    return {
      success: false,
      error: {
        code: "CONDITION_NOT_MET",
        message: "Discount code generation condition is not satisfied yet.",
      },
    };
  }

  const coupon = issueRewardCoupon(new Date());
  milestoneState.adminIssued = true;

  return {
    success: true,
    coupon,
    remainingEligibleGenerations: 0,
  };
}

export function listOrders(): Order[] {
  // Return defensive copies so callers cannot mutate in-memory state directly.
  return orders.map((order) => ({
    ...order,
    items: order.items.map((item) => ({ ...item })),
  }));
}

export function listCoupons(): Coupon[] {
  return coupons.map((coupon) => ({ ...coupon }));
}

export function getAdminMetrics() {
  const purchasedItemsCount = orders.reduce(
    (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  );
  const revenue = roundCurrency(orders.reduce((sum, order) => sum + order.total, 0));
  const totalDiscountsGiven = roundCurrency(orders.reduce((sum, order) => sum + order.discountAmount, 0));

  return {
    purchasedItemsCount,
    revenue,
    discountCodesCount: coupons.length,
    totalDiscountsGiven,
  };
}

export function resetCheckoutStoreForTests(): void {
  orders.splice(0, orders.length);
  coupons.splice(0, coupons.length);
  milestoneIssuance.clear();
}

export function forceExpireCouponForTests(code: string): void {
  const coupon = coupons.find((item) => item.code === code);
  if (!coupon) {
    return;
  }

  coupon.expiresAt = new Date(Date.now() - 1_000).toISOString();
}
