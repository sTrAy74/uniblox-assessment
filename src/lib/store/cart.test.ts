import { beforeEach, describe, expect, it } from "vitest";

import {
  addToCart,
  getCartSummary,
  removeFromCart,
  resetCartForTests,
  updateCartItemQuantity,
} from "./cart";

describe("cart store", () => {
  beforeEach(() => {
    resetCartForTests();
  });

  it("adds items and defaults quantity to one", () => {
    const cart = addToCart({ productId: "p-001" });

    expect(cart.totalItems).toBe(1);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.quantity).toBe(1);
  });

  it("merges repeated adds for the same product", () => {
    addToCart({ productId: "p-001", quantity: 2 });
    const cart = addToCart({ productId: "p-001", quantity: 3 });

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.quantity).toBe(5);
  });

  it("updates existing item quantity", () => {
    addToCart({ productId: "p-001", quantity: 1 });
    const updated = updateCartItemQuantity("p-001", 4);

    expect(updated).not.toBeNull();
    expect(updated?.items[0]?.quantity).toBe(4);
    expect(updated?.totalItems).toBe(4);
  });

  it("returns null when updating a missing item", () => {
    const updated = updateCartItemQuantity("p-999", 4);
    expect(updated).toBeNull();
  });

  it("removes an existing item", () => {
    addToCart({ productId: "p-001", quantity: 1 });
    addToCart({ productId: "p-002", quantity: 1 });

    const result = removeFromCart("p-001");
    expect(result).not.toBeNull();
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0]?.productId).toBe("p-002");
  });

  it("returns null when removing a missing item", () => {
    const result = removeFromCart("p-001");
    expect(result).toBeNull();
  });

  it("computes subtotal and total items correctly", () => {
    addToCart({ productId: "p-001", quantity: 2 });
    addToCart({ productId: "p-004", quantity: 1 });

    const cart = getCartSummary();
    expect(cart.totalItems).toBe(3);
    expect(cart.subtotal).toBe(108.98);
  });
});
