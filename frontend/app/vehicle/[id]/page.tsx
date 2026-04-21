"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getVehicleParts, type Product, type Vehicle } from "../../../lib/api";
import { formatINR } from "../../../lib/currency";
import { useCart } from "../../../components/cart-provider";

export default function VehiclePartsPage({ params }: { params: { id: string } }) {
  const vehicleId = Number(params.id);
  const { addToCart } = useCart();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getVehicleParts(vehicleId)
      .then((res) => {
        if (!active) return;
        setVehicle(res.vehicle || null);
        setProducts(res.products || []);
      })
      .catch((e) => {
        if (active) setError(e.message || "Could not load vehicle parts");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [vehicleId]);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).sort(),
    [products]
  );
  const filtered = useMemo(
    () => (category ? products.filter((p) => p.category === category) : products),
    [products, category]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen">
      <div className="mb-8">
        <Link href="/vehicle-search" className="text-primary hover:text-primary/80 font-semibold">
          Back to Vehicle Search
        </Link>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-100 mt-3 mb-2">
          Compatible Spare Parts
        </h1>
        {vehicle && (
          <p className="text-slate-300 text-lg">
            Selected vehicle:{" "}
            <span className="font-semibold text-white">{vehicle.display_name}</span>
          </p>
        )}
      </div>

      {categories.length > 0 && (
        <div className="mb-6">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-3 bg-slate-900/70 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && <p className="text-slate-300">Loading compatible parts...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((p) => (
            <article
              key={p.id}
              className="group bg-slate-800/40 border border-white/10 rounded-2xl p-5 hover:border-primary/40 transition-colors"
            >
              <div className="h-44 mb-4 overflow-hidden rounded-xl bg-slate-900 border border-white/10">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-slate-500 text-xs">
                    No image
                  </div>
                )}
              </div>
              <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
                {p.brand || "Generic"} | {p.product_type}
              </p>
              <h2 className="text-xl font-bold text-white mb-2">{p.name}</h2>
              <p className="text-slate-400 text-sm mb-3 line-clamp-2">{p.description}</p>
              <p className="text-sm text-slate-400 mb-3">
                Compatibility: {p.vehicle_compatibility || "Not specified"}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-slate-200">{formatINR(p.price)}</span>
                <button
                  onClick={() =>
                    addToCart({
                      id: String(p.id),
                      title: p.name,
                      price: p.price,
                      image: p.image_url || "",
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground font-semibold transition-colors"
                >
                  Add to Cart
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
