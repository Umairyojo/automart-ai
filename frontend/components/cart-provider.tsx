"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { cartAdd, cartClear, cartUpdate, getCart } from "../lib/api";

export interface CartItem {
  id: string;
  title: string;
  price: number;
  image: string;
  quantity?: number;
  productId?: number;
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  addToCart: (item: CartItem) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function parseProductId(item: CartItem): number | null {
  if (typeof item.productId === "number" && Number.isFinite(item.productId)) {
    return item.productId;
  }
  const parsed = Number(item.id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshCart = async () => {
    try {
      const res = await getCart();
      const mapped: CartItem[] = (res.items || []).map((line) => ({
        id: String(line.product.id),
        productId: line.product.id,
        title: line.product.name,
        price: line.product.price,
        image: line.product.image_url || "",
        quantity: line.quantity,
      }));
      setLines(mapped);
    } catch {
      // Silent: we keep cart empty if API is unavailable
      setLines([]);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    refreshCart()
      .catch(() => {
        // handled in refreshCart
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const addToCart = async (item: CartItem) => {
    const productId = parseProductId(item);
    if (!productId) {
      toast.error("This page is demo-only. Add products from Spare Parts listings.");
      return;
    }
    try {
      await cartAdd(productId, 1);
      await refreshCart();
      toast.success(`${item.title} added to cart!`);
    } catch (e: any) {
      toast.error(e?.message || "Could not add item");
    }
  };

  const removeFromCart = async (id: string) => {
    const parsed = Number(id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setLines((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    try {
      await cartUpdate(parsed, 0);
      await refreshCart();
      toast("Removed from cart", { icon: "🗑️" });
    } catch (e: any) {
      toast.error(e?.message || "Could not remove item");
    }
  };

  const updateQuantity = async (id: string, quantity: number) => {
    const parsed = Number(id);
    if (!Number.isInteger(parsed) || parsed <= 0) return;
    try {
      await cartUpdate(parsed, Math.max(0, quantity));
      await refreshCart();
    } catch (e: any) {
      toast.error(e?.message || "Could not update quantity");
    }
  };

  const clearCart = async () => {
    try {
      await cartClear();
      await refreshCart();
    } catch (e: any) {
      toast.error(e?.message || "Could not clear cart");
    }
  };

  const items = useMemo(
    () => lines.map((line) => ({ ...line, quantity: line.quantity || 1 })),
    [lines]
  );

  return (
    <CartContext.Provider
      value={{ items, loading, addToCart, removeFromCart, updateQuantity, clearCart, refreshCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
