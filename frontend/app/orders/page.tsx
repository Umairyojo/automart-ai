"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { cancelOrder, getOrders, type OrderSummary } from "../../lib/api";
import { formatINR } from "../../lib/currency";

function formatDate(value: string | null): string {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const canCancel = (status: string) =>
    ["pending", "confirmed", "processing", "payment_pending"].includes(
      String(status || "").toLowerCase()
    );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getOrders()
      .then((res) => {
        if (!active) return;
        setOrders(res.orders || []);
      })
      .catch((e: any) => {
        if (!active) return;
        if (e?.status === 401) {
          router.push("/login");
          return;
        }
        setError(e?.message || "Could not load orders");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  const handleCancelOrder = async (orderId: number) => {
    if (!window.confirm("Cancel this order? Stock will be restored.")) return;
    setCancellingId(orderId);
    try {
      const res = await cancelOrder(orderId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
      toast.success(`Order #${orderId} cancelled`);
    } catch (e: any) {
      toast.error(e?.message || "Could not cancel order");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">My Orders</h1>
        <p className="text-slate-400 text-lg">Track your recent AutoMart spare parts purchases.</p>
      </div>

      {loading && <p className="text-slate-300">Loading orders...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <div className="p-12 text-center border-2 border-dashed border-border rounded-3xl bg-slate-800/10">
          <p className="text-xl text-slate-400 mb-6">No orders yet.</p>
          <Link
            href="/spare-parts"
            className="inline-block px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow hover:bg-primary/90 transition-colors"
          >
            Browse Spare Parts
          </Link>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-2xl border border-white/10 bg-slate-800/40 p-5 flex flex-col md:flex-row md:items-center gap-4 md:gap-6"
            >
              <div className="flex-1">
                <p className="text-slate-400 text-sm mb-1">Order ID</p>
                <p className="text-white font-bold text-lg">#{order.id}</p>
                <p className="text-slate-400 text-sm mt-2">{formatDate(order.created_at)}</p>
              </div>
              <div className="flex-1">
                <p className="text-slate-400 text-sm mb-1">Status</p>
                <p className="text-primary font-semibold capitalize">{order.status}</p>
                <p className="text-slate-400 text-xs mt-1 capitalize">
                  Payment: {order.payment_status}
                </p>
              </div>
              <div className="flex-1">
                <p className="text-slate-400 text-sm mb-1">Total</p>
                <p className="text-white font-bold">{formatINR(order.total)}</p>
              </div>
              <div>
                <Link
                  href={`/orders/${order.id}`}
                  className="inline-flex px-4 py-2 rounded-xl bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground font-semibold transition-colors"
                >
                  View Details
                </Link>
                {canCancel(order.status) && (
                  <button
                    type="button"
                    onClick={() => handleCancelOrder(order.id)}
                    disabled={cancellingId === order.id}
                    className="ml-2 inline-flex px-4 py-2 rounded-xl bg-red-500/15 text-red-300 hover:bg-red-500 hover:text-white font-semibold transition-colors disabled:opacity-60"
                  >
                    {cancellingId === order.id ? "Cancelling..." : "Cancel"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
