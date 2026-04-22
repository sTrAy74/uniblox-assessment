"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { CartSummary, Product } from "@/lib/store/types";

type StorefrontProps = {
  products: Product[];
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
};

type CheckoutResponse = {
  order: { id: string; total: number; discountAmount: number };
  rewardCoupon: {
    code: string;
    discountPercent: number;
    expiresAt: string;
  } | null;
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

const EMPTY_CART: CartSummary = {
  items: [],
  subtotal: 0,
  totalItems: 0,
};

export default function Storefront({ products }: StorefrontProps) {
  const [cart, setCart] = useState<CartSummary>(EMPTY_CART);
  const [couponCode, setCouponCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>("");

  const canCheckout = cart.items.length > 0 && !busy;

  const productCountLabel = useMemo(() => {
    if (cart.totalItems === 1) {
      return "1 item";
    }
    return `${cart.totalItems} items`;
  }, [cart.totalItems]);

  useEffect(() => {
    void fetchCart();
  }, []);

  async function fetchCart() {
    const response = await fetch("/api/cart");
    const body = (await response.json()) as ApiResponse<CartSummary>;
    if (body.success && body.data) {
      setCart(body.data);
    }
  }

  async function addToCart(productId: string) {
    setBusy(true);
    setNotice("");

    const response = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    const body = (await response.json()) as ApiResponse<CartSummary>;

    if (!response.ok || !body.success || !body.data) {
      setNotice(body.error ?? "Could not add item to cart.");
      setBusy(false);
      return;
    }

    setCart(body.data);
    setBusy(false);
  }

  async function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      await removeItem(productId);
      return;
    }

    setBusy(true);
    setNotice("");

    const response = await fetch("/api/cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity }),
    });
    const body = (await response.json()) as ApiResponse<CartSummary>;

    if (!response.ok || !body.success || !body.data) {
      setNotice(body.error ?? "Could not update cart item.");
      setBusy(false);
      return;
    }

    setCart(body.data);
    setBusy(false);
  }

  async function removeItem(productId: string) {
    setBusy(true);
    setNotice("");

    const response = await fetch("/api/cart", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    const body = (await response.json()) as ApiResponse<CartSummary>;

    if (!response.ok || !body.success || !body.data) {
      setNotice(body.error ?? "Could not remove cart item.");
      setBusy(false);
      return;
    }

    setCart(body.data);
    setBusy(false);
  }

  async function checkout() {
    setBusy(true);
    setNotice("");

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ couponCode }),
    });
    const body = (await response.json()) as ApiResponse<CheckoutResponse>;

    if (!response.ok || !body.success || !body.data) {
      setNotice(body.error ?? "Checkout failed.");
      setBusy(false);
      return;
    }

    const baseMessage = `Order ${body.data.order.id} placed successfully. Final total: ${formatMoney(body.data.order.total)}.`;
    const couponMessage = body.data.rewardCoupon
      ? ` You earned a coupon: ${body.data.rewardCoupon.code} (${body.data.rewardCoupon.discountPercent}% off, valid until ${new Date(body.data.rewardCoupon.expiresAt).toLocaleString()}).`
      : "";
    setNotice(`${baseMessage}${couponMessage}`);
    setCouponCode("");
    await fetchCart();
    setBusy(false);
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Uniblox</p>
            <h1 className="text-2xl font-semibold">Minimal Storefront</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-zinc-900 px-3 py-1 text-sm text-white">{productCountLabel}</span>
            <Link
              href="/admin"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:border-zinc-900"
            >
              Admin
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold">Products</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {products.map((product) => (
              <article key={product.id} className="rounded-xl border border-zinc-200 p-4">
                <div className="mb-3 flex h-32 items-end rounded-lg bg-gradient-to-br from-zinc-200 to-zinc-50 p-3">
                  <span className="text-xs uppercase tracking-widest text-zinc-500">{product.id}</span>
                </div>
                <h3 className="text-base font-medium">{product.name}</h3>
                <p className="mb-3 text-sm text-zinc-500">{formatMoney(product.price)}</p>
                <button
                  type="button"
                  onClick={() => addToCart(product.id)}
                  disabled={busy}
                  className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Add to cart
                </button>
              </article>
            ))}
          </div>
        </section>

        <aside className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Cart & Checkout</h2>
          <p className="mt-1 text-sm text-zinc-500">Live updates via your cart APIs.</p>

          <div className="mt-5 space-y-3">
            {cart.items.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
                Your cart is empty.
              </p>
            ) : (
              cart.items.map((item) => (
                <div key={item.productId} className="rounded-lg border border-zinc-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{item.name}</p>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="text-xs text-zinc-500 hover:text-zinc-900"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-zinc-500">{formatMoney(item.unitPrice)} each</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="h-7 w-7 rounded border border-zinc-300 text-sm"
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-sm">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="h-7 w-7 rounded border border-zinc-300 text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 rounded-lg bg-zinc-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">Subtotal</span>
              <span className="text-sm font-medium">{formatMoney(cart.subtotal)}</span>
            </div>
          </div>

          <label className="mt-4 block text-sm font-medium" htmlFor="couponCode">
            Coupon code
          </label>
          <input
            id="couponCode"
            value={couponCode}
            onChange={(event) => setCouponCode(event.target.value)}
            placeholder="SAVE10-XXXXXX"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900 focus:ring-1"
          />

          <button
            type="button"
            onClick={checkout}
            disabled={!canCheckout}
            className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Processing..." : "Checkout"}
          </button>

          {notice ? (
            <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">{notice}</p>
          ) : null}
        </aside>
      </main>
    </div>
  );
}
