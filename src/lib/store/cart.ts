import { PRODUCTS } from "@/lib/store/data";
import type { AddToCartRequest, CartItem, CartLine, CartSummary } from "@/lib/store/types";

const cartItems: CartItem[] = [];

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getProductById(productId: string) {
  return PRODUCTS.find((product) => product.id === productId);
}

export function getCartSummary(): CartSummary {
  const lines: CartLine[] = cartItems
    .map((item) => {
      const product = getProductById(item.productId);
      if (!product) {
        return null;
      }

      const lineTotal = roundCurrency(product.price * item.quantity);

      return {
        productId: item.productId,
        name: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        lineTotal,
      };
    })
    .filter((line): line is CartLine => line !== null);

  const subtotal = roundCurrency(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const totalItems = lines.reduce((sum, line) => sum + line.quantity, 0);

  return {
    items: lines,
    subtotal,
    totalItems,
  };
}

export function addToCart(payload: AddToCartRequest): CartSummary {
  const quantityToAdd = payload.quantity ?? 1;
  const existingItem = cartItems.find((item) => item.productId === payload.productId);

  if (existingItem) {
    existingItem.quantity += quantityToAdd;
  } else {
    cartItems.push({
      productId: payload.productId,
      quantity: quantityToAdd,
    });
  }

  return getCartSummary();
}

export function updateCartItemQuantity(productId: string, quantity: number): CartSummary | null {
  const existingItem = cartItems.find((item) => item.productId === productId);
  if (!existingItem) {
    return null;
  }

  existingItem.quantity = quantity;
  return getCartSummary();
}

export function removeFromCart(productId: string): CartSummary | null {
  const itemIndex = cartItems.findIndex((item) => item.productId === productId);
  if (itemIndex < 0) {
    return null;
  }

  cartItems.splice(itemIndex, 1);
  return getCartSummary();
}
