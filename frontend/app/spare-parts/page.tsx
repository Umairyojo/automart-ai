"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  getProducts,
  getProductsMeta,
  type Product,
  type ProductType,
} from "../../lib/api";
import { formatINR } from "../../lib/currency";
import { useCart } from "../../components/cart-provider";

function SparePartsPageContent() {
  const searchParams = useSearchParams();
  const { addToCart } = useCart();
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [productType, setProductType] = useState<ProductType | "">("");

  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQ(searchParams.get("q") || "");
    setBrand(searchParams.get("brand") || "");
    setCategory(searchParams.get("category") || "");
    const productTypeParam = searchParams.get("product_type") || "";
    if (
      productTypeParam === "vehicleSpecific" ||
      productTypeParam === "universal" ||
      productTypeParam === "companyBranded"
    ) {
      setProductType(productTypeParam);
      return;
    }
    setProductType("");
  }, [searchParams]);

  useEffect(() => {
    getProductsMeta()
      .then((res) => {
        setBrands(res.brands || []);
        setCategories(res.categories || []);
      })
      .catch(() => {
        // Non-blocking for page load
      });
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getProducts({
      q: q || undefined,
      brand: brand || undefined,
      category: category || undefined,
      product_type: productType || undefined,
    })
      .then((res) => {
        if (active) setProducts(res.products || []);
      })
      .catch((e) => {
        if (active) setError(e.message || "Could not load spare parts");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [q, brand, category, productType]);

  const totalInStock = useMemo(
    () => products.reduce((sum, p) => sum + (p.stock || 0), 0),
    [products]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pt-16 sm:pt-20 min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
          All Spare Parts
        </h1>
        <p className="text-muted-foreground text-lg">
          Browse all universal, company branded, and vehicle-specific parts without selecting a
          vehicle.
        </p>
      </div>

      <div className="bg-card/95 border border-border rounded-2xl p-5 mb-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by part name or company..."
            className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={productType}
            onChange={(e) => setProductType((e.target.value as ProductType | "") || "")}
            className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All product types</option>
            <option value="vehicleSpecific">vehicleSpecific</option>
            <option value="universal">universal</option>
            <option value="companyBranded">companyBranded</option>
          </select>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          {products.length} parts found | {totalInStock} total units in stock
        </p>
      </div>

      {loading && <p className="text-muted-foreground">Loading parts...</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {products.map((p) => (
            <article
              key={p.id}
              className="group bg-card/95 border border-border rounded-2xl p-5 shadow-sm hover:border-primary/40 transition-colors"
            >
              <div className="h-44 mb-4 overflow-hidden rounded-xl bg-muted border border-border">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-muted to-secondary flex items-center justify-center text-muted-foreground text-xs">
                    No image
                  </div>
                )}
              </div>
              <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
                {p.brand || "Generic"} | {p.product_type}
              </p>
              <h2 className="text-xl font-bold text-card-foreground mb-2">{p.name}</h2>
              <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{p.description}</p>
              <p className="text-sm text-muted-foreground mb-4">
                Category: {p.category} | Stock: {p.stock}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-foreground">{formatINR(p.price)}</span>
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

export default function SparePartsPage() {
  return (
    <Suspense
      fallback={<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pt-16 sm:pt-20">Loading...</div>}
    >
      <SparePartsPageContent />
    </Suspense>
  );
}
