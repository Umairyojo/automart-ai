"use client";

import { useEffect, useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";

import { useCart } from "./cart-provider";
import { getProducts, type Product } from "../lib/api";
import { formatINR } from "../lib/currency";

function fallbackImageForProduct(product: Product, index: number): string {
  if (product.image_url) return product.image_url;
  const keyword = `${product.category || "spare-part"},auto`;
  return `https://loremflickr.com/900/600/${encodeURIComponent(keyword)}?lock=${200 + index}`;
}

export function FeaturedProducts() {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getProducts()
      .then((res) => {
        if (!active) return;
        setProducts(res.products || []);
      })
      .catch((e) => {
        if (!active) return;
        setError(e.message || "Unable to load featured spare parts");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const featured = useMemo(() => {
    const sorted = [...products].sort((a, b) => {
      if ((b.stock || 0) !== (a.stock || 0)) return (b.stock || 0) - (a.stock || 0);
      return a.price - b.price;
    });
    return sorted.slice(0, 4);
  }, [products]);

  if (loading) {
    return <p className="text-muted-foreground text-center">Loading featured spare parts...</p>;
  }

  if (error) {
    return <p className="text-red-400 text-center">{error}</p>;
  }

  if (featured.length === 0) {
    return <p className="text-muted-foreground text-center">No spare parts available right now.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {featured.map((product, index) => (
        <article
          key={product.id}
          className="rounded-3xl border border-border/40 bg-background p-5 shadow-lg hover:shadow-2xl transition-all duration-300"
        >
          <div className="relative h-44 rounded-2xl overflow-hidden mb-4 bg-muted/10">
            <img
              src={fallbackImageForProduct(product, index)}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
          <h3 className="text-lg font-semibold leading-tight">{product.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {product.category} | {product.brand || "Generic"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {product.vehicle_compatibility || "Universal fitment"}
          </p>
          <div className="mt-auto flex items-center justify-between">
            <p className="text-lg font-bold">{formatINR(product.price)}</p>
            <button
              onClick={(e) => {
                e.preventDefault();
                addToCart({
                  id: String(product.id),
                  title: product.name,
                  price: product.price,
                  image: fallbackImageForProduct(product, index),
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-carRed to-bikeBlue text-white rounded-xl text-sm font-medium hover:opacity-90"
            >
              <ShoppingBag size={16} /> Add
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
