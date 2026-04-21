"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getProducts, type Product } from "../../lib/api";
import { formatINR } from "../../lib/currency";

type PageProps = {
  params: { category: string };
};

function normalizeCategory(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function prettyCategory(raw: string): string {
  return String(raw || "")
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function GenericCategoryPage({ params }: PageProps) {
  const category = normalizeCategory(params.category);
  const title = useMemo(() => prettyCategory(params.category), [params.category]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getProducts({ category })
      .then((res) => {
        if (!active) return;
        setItems(res.products || []);
      })
      .catch((e: any) => {
        if (!active) return;
        setError(e?.message || "Could not load category products");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [category]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen">
      <div className="flex items-baseline justify-between mb-8 pb-6 border-b border-white/10">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-100">{title} Parts</h1>
        <Link href="/spare-parts" className="text-primary hover:text-primary/80 font-semibold">
          All Spare Parts
        </Link>
      </div>

      {loading && <p className="text-slate-300">Loading category parts...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/20 p-8 text-center text-slate-400">
          No parts found for this category.
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 gap-y-10 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 xl:gap-x-8">
          {items.map((item) => (
            <article
              key={item.id}
              className="group relative flex flex-col bg-slate-800/40 rounded-3xl p-4 shadow-lg hover:shadow-2xl border border-white/5 hover:border-primary/50 transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-900">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt={item.name} className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-slate-500 text-xs">
                    No image
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col flex-1 px-2">
                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-primary transition-colors">
                  {item.name}
                </h3>
                <p className="text-sm text-slate-400 mb-4 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between mt-auto">
                  <p className="text-2xl font-black text-slate-300">{formatINR(item.price)}</p>
                  <Link
                    href={`/products/${item.slug}`}
                    className="px-6 py-2 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-bold transition-colors"
                  >
                    View
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
