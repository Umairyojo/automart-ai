"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { cancelOrder, getOrder, type OrderDetail } from "../../../lib/api";
import { formatINR } from "../../../lib/currency";

function formatDate(value: string | null): string {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const orderId = Number(params.id);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const canCancel = (status: string) =>
    ["pending", "confirmed", "processing", "payment_pending"].includes(
      String(status || "").toLowerCase()
    );

  useEffect(() => {
    let active = true;
    if (!Number.isInteger(orderId) || orderId <= 0) {
      setError("Invalid order ID");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getOrder(orderId)
      .then((res) => {
        if (!active) return;
        setOrder(res.order || null);
      })
      .catch((e: any) => {
        if (!active) return;
        if (e?.status === 401) {
          router.push("/login");
          return;
        }
        setError(e?.message || "Could not load order details");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderId, router]);

  const itemCount = useMemo(
    () => (order?.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0),
    [order]
  );

  const handleCancelOrder = async () => {
    if (!order) return;
    if (!window.confirm(`Cancel order #${order.id}? Stock will be restored.`)) return;
    setCancelling(true);
    try {
      const res = await cancelOrder(order.id);
      setOrder(res.order);
      toast.success(`Order #${order.id} cancelled`);
    } catch (e: any) {
      toast.error(e?.message || "Could not cancel order");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen">
      <div className="mb-8">
        <Link href="/orders" className="text-primary hover:text-primary/80 font-semibold">
          Back to Orders
        </Link>
        <h1 className="text-4xl font-extrabold tracking-tight text-white mt-3 mb-2">Order Details</h1>
      </div>

      {loading && <p className="text-slate-300">Loading order details...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && order && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-slate-800/40 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-slate-400 text-sm">Order ID</p>
                <p className="text-white font-bold text-xl">#{order.id}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Status</p>
                <p className="text-primary font-semibold capitalize">{order.status}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Payment</p>
                <p className="text-white font-semibold capitalize">
                  {order.payment_method} / {order.payment_status}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Placed On</p>
                <p className="text-white">{formatDate(order.created_at)}</p>
              </div>
            </div>
            {canCancel(order.status) && (
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="mt-4 px-4 py-2 rounded-xl bg-red-500/15 text-red-300 hover:bg-red-500 hover:text-white font-semibold transition-colors disabled:opacity-60"
              >
                {cancelling ? "Cancelling..." : "Cancel Order"}
              </button>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-800/40 p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Items</h2>
            <div className="space-y-3">
              {(order.items || []).map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-2 border border-white/5 rounded-xl p-4 bg-slate-900/30"
                >
                  <div>
                    <p className="text-white font-semibold">{item.product_name || "Product"}</p>
                    <p className="text-slate-400 text-sm">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-slate-400 text-sm">Unit: {formatINR(item.unit_price)}</p>
                    <p className="text-white font-bold">{formatINR(item.line_total)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-800/40 p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Summary</h2>
            <div className="flex justify-between text-slate-300 mb-2">
              <span>Total Items</span>
              <span>{itemCount}</span>
            </div>
            <div className="flex justify-between text-slate-300 mb-2">
              <span>Subtotal</span>
              <span>{formatINR(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-300 mb-2">
                <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</span>
                <span>-{formatINR(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-300 mb-2">
              <span>GST</span>
              <span>{formatINR(order.gst)}</span>
            </div>
            <div className="flex justify-between text-slate-300 mb-2">
              <span>Shipping</span>
              <span>{formatINR(order.shipping)}</span>
            </div>
            <div className="flex justify-between text-2xl font-bold text-white border-t border-white/10 pt-4 mt-4">
              <span>Order Total</span>
              <span className="text-primary">{formatINR(order.total)}</span>
            </div>
            <p className="text-slate-400 text-sm mt-4">
              Shipping Address: {order.shipping_address || "Address not provided"}
            </p>
            <Link
              href={`/orders/${order.id}/invoice`}
              className="mt-4 inline-flex px-4 py-2 rounded-xl bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground font-semibold transition-colors"
            >
              View Invoice
            </Link>
          </section>
        </div>
      )}
    </div>
  );
}
