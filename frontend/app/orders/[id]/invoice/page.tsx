"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getOrderInvoice, type InvoiceResponse } from "../../../../lib/api";
import { formatINR } from "../../../../lib/currency";

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

export default function InvoicePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const orderId = Number(params.id);

  const [data, setData] = useState<InvoiceResponse["invoice"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!Number.isInteger(orderId) || orderId <= 0) {
      setError("Invalid order ID");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    getOrderInvoice(orderId)
      .then((res) => {
        if (!active) return;
        setData(res.invoice);
      })
      .catch((e: any) => {
        if (!active) return;
        if (e?.status === 401) {
          router.push("/login");
          return;
        }
        setError(e?.message || "Could not load invoice");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderId, router]);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen">
      <div className="mb-8 flex items-center justify-between gap-3">
        <div>
          <Link
            href={`/orders/${orderId}`}
            className="text-primary hover:text-primary/80 font-semibold"
          >
            Back to Order
          </Link>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mt-3">Invoice</h1>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground font-semibold transition-colors"
        >
          Print
        </button>
      </div>

      {loading && <p className="text-slate-300">Loading invoice...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && data && (
        <section className="rounded-2xl border border-white/10 bg-slate-800/40 p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="text-slate-300 text-sm">Invoice Number</p>
              <p className="text-white font-bold text-xl">{data.invoice_number}</p>
              <p className="text-slate-400 text-sm mt-1">Issued: {formatDate(data.issued_at)}</p>
            </div>
            <div className="text-sm text-slate-300">
              <p className="font-semibold text-white">{data.seller.name}</p>
              <p>{data.seller.address}</p>
              <p>GSTIN: {data.seller.gstin}</p>
              <p>{data.seller.support_email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-slate-900/30 p-4">
              <p className="text-slate-400 text-sm">Bill To</p>
              <p className="text-white font-semibold mt-1">{data.customer.name}</p>
              <p className="text-slate-300 text-sm">{data.customer.email}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/30 p-4">
              <p className="text-slate-400 text-sm">Shipping Address</p>
              <p className="text-white mt-1">{data.order.shipping_address || "N/A"}</p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/40 text-slate-300">
                <tr>
                  <th className="text-left p-3">Item</th>
                  <th className="text-right p-3">Qty</th>
                  <th className="text-right p-3">Unit</th>
                  <th className="text-right p-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {(data.order.items || []).map((item) => (
                  <tr key={item.id} className="border-t border-white/10">
                    <td className="p-3 text-white">{item.product_name || "Product"}</td>
                    <td className="p-3 text-right text-slate-300">{item.quantity}</td>
                    <td className="p-3 text-right text-slate-300">{formatINR(item.unit_price)}</td>
                    <td className="p-3 text-right text-white">{formatINR(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto w-full max-w-sm space-y-2">
            <div className="flex justify-between text-slate-300">
              <span>Subtotal</span>
              <span>{formatINR(data.order.subtotal)}</span>
            </div>
            {data.order.discount > 0 && (
              <div className="flex justify-between text-emerald-300">
                <span>Discount {data.order.coupon_code ? `(${data.order.coupon_code})` : ""}</span>
                <span>-{formatINR(data.order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-300">
              <span>GST (18%)</span>
              <span>{formatINR(data.order.gst)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Shipping</span>
              <span>{formatINR(data.order.shipping)}</span>
            </div>
            <div className="flex justify-between text-white text-xl font-bold border-t border-white/10 pt-3">
              <span>Total</span>
              <span>{formatINR(data.order.total)}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
