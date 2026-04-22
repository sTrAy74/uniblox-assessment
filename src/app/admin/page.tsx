"use client";

import { useState } from "react";
import Link from "next/link";

type Metrics = {
  purchasedItemsCount: number;
  revenue: number;
  discountCodesCount: number;
  totalDiscountsGiven: number;
};

type Coupon = {
  code: string;
  discountPercent: number;
  expiresAt: string;
  usedAt?: string;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function AdminPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [latestCoupon, setLatestCoupon] = useState<Coupon | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function loadMetrics() {
    setBusy(true);
    setNotice("");

    const response = await fetch("/api/admin/metrics");
    const body = (await response.json()) as ApiResponse<Metrics>;
    if (!response.ok || !body.success || !body.data) {
      setNotice(body.error ?? "Could not load admin metrics.");
      setBusy(false);
      return;
    }

    setMetrics(body.data);
    setBusy(false);
  }

  async function generateDiscountCode() {
    setBusy(true);
    setNotice("");

    const response = await fetch("/api/admin/discounts/generate", { method: "POST" });
    const body = (await response.json()) as ApiResponse<{ coupon: Coupon }>;
    if (!response.ok || !body.success || !body.data) {
      setNotice(body.error ?? "Condition not met for code generation yet.");
      setBusy(false);
      return;
    }

    setLatestCoupon(body.data.coupon);
    setNotice("New coupon generated successfully.");
    await loadMetrics();
    setBusy(false);
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Uniblox</p>
            <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          </div>
          <Link href="/" className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:border-zinc-900">
            Back to store
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-5xl gap-6 px-6 py-8 md:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Discount Operations</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Generate a coupon only when every 2 successful orders condition is met.
          </p>

          <button
            type="button"
            onClick={generateDiscountCode}
            disabled={busy}
            className="mt-5 w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Processing..." : "Generate Discount Code"}
          </button>

          {latestCoupon ? (
            <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm">
              <p className="font-medium">Latest Coupon</p>
              <p className="mt-2 font-mono">{latestCoupon.code}</p>
              <p className="text-zinc-600">Discount: {latestCoupon.discountPercent}%</p>
              <p className="text-zinc-600">Expires: {new Date(latestCoupon.expiresAt).toLocaleString()}</p>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Store Metrics</h2>
          <p className="mt-1 text-sm text-zinc-500">Read model from admin metrics API.</p>

          <button
            type="button"
            onClick={loadMetrics}
            disabled={busy}
            className="mt-5 w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm font-semibold transition hover:border-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh Metrics
          </button>

          {metrics ? (
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3">
                <span className="text-zinc-500">Purchased items</span>
                <span className="font-medium">{metrics.purchasedItemsCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3">
                <span className="text-zinc-500">Revenue</span>
                <span className="font-medium">{formatMoney(metrics.revenue)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3">
                <span className="text-zinc-500">Discount codes</span>
                <span className="font-medium">{metrics.discountCodesCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3">
                <span className="text-zinc-500">Total discounts given</span>
                <span className="font-medium">{formatMoney(metrics.totalDiscountsGiven)}</span>
              </div>
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
              No metrics loaded yet.
            </p>
          )}
        </section>
      </main>

      {notice ? (
        <div className="mx-auto w-full max-w-5xl px-6 pb-8">
          <p className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-700">{notice}</p>
        </div>
      ) : null}
    </div>
  );
}
