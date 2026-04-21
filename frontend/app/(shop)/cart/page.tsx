"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "../../../components/cart-provider";
import {
  checkoutOrder,
  createRazorpayOrder,
  getCart,
  getPaymentConfig,
  listAddresses,
  meAuth,
  type Address,
  type PaymentConfig,
  validateCoupon,
} from "../../../lib/api";
import { formatINR } from "../../../lib/currency";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

type RazorpaySuccessPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export default function CartPage() {
  const { items, loading, removeFromCart, clearCart, updateQuantity, refreshCart } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "upi" | "card">("cod");
  const [paymentOutcome, setPaymentOutcome] = useState<"success" | "failed" | "pending">("success");
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [paymentConfigLoading, setPaymentConfigLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [manualShippingAddress, setManualShippingAddress] = useState("");
  const router = useRouter();

  const [summary, setSummary] = useState({
    subtotal: 0,
    gst: 0,
    shipping: 0,
    discount: 0,
    total: 0,
    couponError: "",
  });

  function formatAddressForOrder(address: Address): string {
    const parts = [
      address.full_name,
      address.phone,
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.postal_code,
      address.country,
    ]
      .map((p) => String(p || "").trim())
      .filter(Boolean);
    return parts.join(", ");
  }

  const selectedAddress = useMemo(
    () => addresses.find((a) => String(a.id) === selectedAddressId) || null,
    [addresses, selectedAddressId]
  );

  const checkoutShippingAddress = useMemo(() => {
    if (selectedAddress) return formatAddressForOrder(selectedAddress);
    return manualShippingAddress.trim();
  }, [manualShippingAddress, selectedAddress]);

  useEffect(() => {
    let active = true;
    if (loading) return;

    setLoadingSummary(true);
    getCart(appliedCoupon || undefined)
      .then((res) => {
        if (!active) return;
        setSummary({
          subtotal: res.subtotal ?? 0,
          gst: res.gst ?? 0,
          shipping: res.shipping ?? 0,
          discount: res.discount ?? 0,
          total: res.total ?? 0,
          couponError: res.coupon?.error || "",
        });
      })
      .catch(() => {
        if (!active) return;
        const subtotal = items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
        const gst = subtotal * 0.18;
        const shipping = items.length > 0 ? 149 : 0;
        const total = subtotal + gst + shipping;
        setSummary({ subtotal, gst, shipping, discount: 0, total, couponError: "" });
      })
      .finally(() => {
        if (active) setLoadingSummary(false);
      });

    return () => {
      active = false;
    };
  }, [items, loading, appliedCoupon]);

  useEffect(() => {
    let active = true;
    setAddressesLoading(true);
    meAuth()
      .then(async (me) => {
        if (!active) return;
        if (!me.user) {
          setAddresses([]);
          return;
        }
        const res = await listAddresses();
        if (!active) return;
        const rows = res.addresses || [];
        setAddresses(rows);
        const preferred = rows.find((a) => a.is_default) || rows[0];
        if (preferred) setSelectedAddressId(String(preferred.id));
      })
      .catch((e: any) => {
        if (!active) return;
        if (e?.status !== 401) {
          toast.error(e?.message || "Could not load saved addresses");
        }
      })
      .finally(() => {
        if (active) setAddressesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setPaymentConfigLoading(true);
    getPaymentConfig()
      .then((res) => {
        if (!active) return;
        setPaymentConfig(res);
      })
      .catch(() => {
        if (!active) return;
        setPaymentConfig(null);
      })
      .finally(() => {
        if (active) setPaymentConfigLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + (i.quantity || 1), 0),
    [items]
  );

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      toast.error("Enter a coupon code");
      return;
    }
    try {
      const res = await validateCoupon(code);
      if (!res.valid) {
        toast.error(res.message || "Invalid coupon");
        return;
      }
      setAppliedCoupon(code);
      toast.success(`${code} applied`);
    } catch (e: any) {
      toast.error(e?.message || "Could not apply coupon");
    }
  };

  const loadRazorpayScript = async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    if ((window as any).Razorpay) return true;

    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    ) as HTMLScriptElement | null;
    if (existing) {
      return new Promise((resolve) => {
        if ((window as any).Razorpay) {
          resolve(true);
          return;
        }
        existing.addEventListener("load", () => resolve(true), { once: true });
        existing.addEventListener("error", () => resolve(false), { once: true });
      });
    }

    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const openRazorpayPopup = async (params: {
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
  }): Promise<RazorpaySuccessPayload> => {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded || !(window as any).Razorpay) {
      throw new Error("Could not load Razorpay checkout. Please try again.");
    }

    return new Promise((resolve, reject) => {
      const RazorpayCtor = (window as any).Razorpay;
      const razorpay = new RazorpayCtor({
        key: params.keyId,
        amount: params.amount,
        currency: params.currency,
        order_id: params.orderId,
        name: "AutoMart",
        description: "AutoMart Spare Parts Checkout",
        theme: { color: "#7C3AED" },
        handler: (response: RazorpaySuccessPayload) => resolve(response),
        modal: {
          ondismiss: () => reject(new Error("Payment was cancelled.")),
        },
      });

      razorpay.on("payment.failed", (response: any) => {
        const msg =
          response?.error?.description ||
          response?.error?.reason ||
          "Payment failed. Please try again.";
        reject(new Error(msg));
      });

      razorpay.open();
    });
  };

  const handleCheckout = async () => {
    if (!checkoutShippingAddress) {
      toast.error("Select a saved address or enter shipping address");
      return;
    }
    setCheckingOut(true);
    try {
      let res;

      if (paymentMethod === "cod") {
        res = await checkoutOrder({
          shippingAddress: checkoutShippingAddress,
          paymentMethod,
          couponCode: appliedCoupon || undefined,
          paymentGateway: "demo",
        });
      } else if (paymentConfig?.enabled) {
        const gatewayOrder = await createRazorpayOrder(appliedCoupon || undefined);
        const payment = await openRazorpayPopup({
          keyId: gatewayOrder.key_id,
          orderId: gatewayOrder.order.id,
          amount: gatewayOrder.order.amount,
          currency: gatewayOrder.order.currency || "INR",
        });
        res = await checkoutOrder({
          shippingAddress: checkoutShippingAddress,
          paymentMethod,
          couponCode: appliedCoupon || undefined,
          paymentGateway: "razorpay",
          razorpayOrderId: payment.razorpay_order_id,
          razorpayPaymentId: payment.razorpay_payment_id,
          razorpaySignature: payment.razorpay_signature,
        });
      } else {
        res = await checkoutOrder({
          shippingAddress: checkoutShippingAddress,
          paymentMethod,
          couponCode: appliedCoupon || undefined,
          paymentGateway: "demo",
          paymentOutcome,
        });
      }

      if (res.payment_status === "failed") {
        toast.error(`Payment failed. Order #${res.order_id} marked as failed.`);
      } else if (res.payment_status === "pending") {
        toast.success(`Order #${res.order_id} placed with pending payment.`);
      } else {
        toast.success(`Order placed. Order #${res.order_id}`);
      }

      await refreshCart();
      router.push(`/orders/${res.order_id}`);
    } catch (e: any) {
      if (e?.status === 401) {
        toast.error("Please login to place order.");
        router.push("/login");
      } else {
        toast.error(e?.message || "Checkout failed");
      }
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pt-16 sm:pt-20 min-h-screen">
      <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-8">Your Cart</h1>

      {loading ? (
        <p className="text-muted-foreground">Loading cart...</p>
      ) : items.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-border rounded-3xl bg-card/60">
          <p className="text-xl text-muted-foreground mb-6">Your spare-parts cart is empty.</p>
          <Link
            href="/spare-parts"
            className="inline-block px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow hover:bg-primary/90 transition-colors"
          >
            Browse Spare Parts
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const qty = item.quantity || 1;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-6 p-4 rounded-2xl bg-card/95 border border-border shadow-sm"
                >
                  <div
                    className="w-32 h-24 bg-cover bg-center rounded-xl bg-muted border border-border"
                    style={{ backgroundImage: item.image ? `url('${item.image}')` : undefined }}
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-card-foreground">{item.title}</h3>
                    <p className="text-lg text-primary font-bold mt-1">{formatINR(item.price)}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Line total: {formatINR(item.price * qty)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, qty - 1)}
                      className="w-8 h-8 rounded-lg bg-muted hover:bg-accent text-foreground font-bold"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-semibold text-foreground">{qty}</span>
                    <button
                      onClick={() => updateQuantity(item.id, qty + 1)}
                      className="w-8 h-8 rounded-lg bg-muted hover:bg-accent text-foreground font-bold"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-3 text-muted-foreground hover:text-carRed hover:bg-carRed/10 rounded-xl transition-colors"
                    aria-label="Remove item"
                  >
                    x
                  </button>
                </div>
              );
            })}
          </div>

          <div className="bg-card/95 border border-border rounded-3xl p-6 h-fit shadow-lg">
            <h2 className="text-2xl font-bold text-card-foreground mb-6 border-b border-border pb-4">
              Billing Summary
            </h2>
            <div className="flex justify-between text-muted-foreground mb-4">
              <span>Subtotal ({itemCount} items)</span>
              <span>{formatINR(summary.subtotal)}</span>
            </div>
            {summary.discount > 0 && (
              <div className="flex justify-between text-emerald-300 mb-4">
                <span>Coupon Discount {appliedCoupon ? `(${appliedCoupon})` : ""}</span>
                <span>-{formatINR(summary.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground mb-4">
              <span>GST (18%)</span>
              <span>{formatINR(summary.gst)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground mb-6">
              <span>Shipping</span>
              <span>{formatINR(summary.shipping)}</span>
            </div>

            <div className="flex justify-between text-2xl font-bold text-foreground border-t border-border pt-6 mb-8">
              <span>Total</span>
              <span className="text-primary">{formatINR(summary.total)}</span>
            </div>

            <div className="mb-4 space-y-3">
              <label className="block text-sm text-muted-foreground font-medium">Apply Coupon</label>
              <div className="flex gap-2">
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="AUTOMART10"
                  className="flex-1 rounded-xl bg-background border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="px-4 py-2 rounded-xl bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground font-semibold transition-colors"
                >
                  Apply
                </button>
              </div>
              {summary.couponError && (
                <p className="text-xs text-amber-300">{summary.couponError}</p>
              )}
            </div>

            <div className="mb-6 space-y-3">
              <label className="block text-sm text-muted-foreground font-medium">Shipping Address</label>
              {addressesLoading ? (
                <p className="text-sm text-muted-foreground">Loading saved addresses...</p>
              ) : addresses.length > 0 ? (
                <>
                  <select
                    value={selectedAddressId}
                    onChange={(e) => setSelectedAddressId(e.target.value)}
                    className="w-full rounded-xl bg-background border border-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {addresses.map((address) => (
                      <option key={address.id} value={String(address.id)}>
                        {address.label} - {address.line1}, {address.city}
                        {address.is_default ? " (Default)" : ""}
                      </option>
                    ))}
                  </select>
                  {selectedAddress && (
                    <p className="text-xs text-muted-foreground">
                      Delivering to: {formatAddressForOrder(selectedAddress)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Manage addresses in{" "}
                    <Link href="/profile" className="text-primary hover:underline">
                      My Profile
                    </Link>
                  </p>
                </>
              ) : (
                <p className="text-sm text-amber-300">
                  No saved address found. Add one in{" "}
                  <Link href="/profile" className="text-primary hover:underline">
                    My Profile
                  </Link>{" "}
                  or use one-time address below.
                </p>
              )}
              <textarea
                value={manualShippingAddress}
                onChange={(e) => setManualShippingAddress(e.target.value)}
                placeholder="One-time shipping address (optional if saved address selected)"
                rows={3}
                className="w-full rounded-xl bg-background border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="mb-6 space-y-3">
              <label className="block text-sm text-muted-foreground font-medium">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as "cod" | "upi" | "card")}
                className="w-full rounded-xl bg-background border border-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="cod">Cash on Delivery</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
              {paymentMethod !== "cod" && !paymentConfigLoading && !paymentConfig?.enabled && (
                <>
                  <label className="block text-sm text-muted-foreground font-medium">Demo Payment Result</label>
                  <select
                    value={paymentOutcome}
                    onChange={(e) =>
                      setPaymentOutcome(e.target.value as "success" | "failed" | "pending")
                    }
                    className="w-full rounded-xl bg-background border border-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="success">Success</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </>
              )}
              {paymentMethod !== "cod" && !paymentConfigLoading && paymentConfig?.enabled && (
                <p className="text-xs text-emerald-400">
                  Razorpay sandbox enabled. You will be redirected to secure payment modal.
                </p>
              )}
              {paymentMethod !== "cod" && paymentConfigLoading && (
                <p className="text-xs text-muted-foreground">Checking payment gateway availability...</p>
              )}
            </div>

            <button
              onClick={handleCheckout}
              disabled={checkingOut || loadingSummary || (paymentMethod !== "cod" && paymentConfigLoading)}
              className="w-full py-4 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-bold rounded-2xl text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              {checkingOut
                ? "Processing..."
                : paymentMethod === "cod"
                ? "Place COD Order"
                : paymentConfig?.enabled
                ? "Pay Securely (Razorpay)"
                : "Place Order (Demo Payment)"}
            </button>
            <button
              onClick={clearCart}
              className="w-full mt-4 py-3 text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Clear Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
