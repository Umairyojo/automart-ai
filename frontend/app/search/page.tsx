"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { getProducts, type Product } from "../../lib/api";
import { formatINR } from "../../lib/currency";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") || "").trim();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Product[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getProducts({ q: q || undefined })
      .then((res) => {
        if (!active) return;
        setResults(res.products || []);
      })
      .catch((e: any) => {
        if (!active) return;
        setError(e?.message || "Could not load search results");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [q]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen">
      <div className="mb-8 pb-6 border-b border-white/10">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-100">Search Results</h1>
        <p className="text-lg text-slate-400 mt-2">
          Query: <span className="text-white font-semibold">{q || "all parts"}</span>
        </p>
      </div>

      {loading && <p className="text-slate-300">Searching spare parts...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && results.length === 0 && (
        <div className="py-16 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">No matching spare parts found</h2>
          <p className="text-slate-400 mb-6">
            Try a broader query like Bosch, brake pad, or engine oil.
          </p>
          <Link
            href="/spare-parts"
            className="inline-flex px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold"
          >
            Browse All Spare Parts
          </Link>
        </div>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {results.map((item) => (
            <article
              key={item.id}
              className="group bg-slate-800/40 border border-white/10 rounded-2xl p-5 hover:border-primary/40 transition-colors"
            >
              <div className="h-44 mb-4 overflow-hidden rounded-xl bg-slate-900 border border-white/10">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-slate-500 text-xs">
                    No image
                  </div>
                )}
              </div>

              <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
                {item.brand || "Generic"} | {item.product_type}
              </p>
              <h3 className="text-xl font-bold text-white mb-2">{item.name}</h3>
              <p className="text-sm text-slate-400 line-clamp-2 mb-3">{item.description}</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-black text-slate-300">{formatINR(item.price)}</p>
                <Link
                  href={`/products/${item.slug}`}
                  className="px-5 py-2 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-bold transition-colors"
                >
                  View
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 pt-24">Loading...</div>}
    >
      <SearchPageContent />
    </Suspense>
  );
}
