"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { useCart } from "../../../components/cart-provider";
import { formatINR } from "../../../lib/currency";
import { getProductBySlug, type Product } from "../../../lib/api";

function labelForType(productType: Product["product_type"] | string) {
  if (productType === "vehicleSpecific") return "Vehicle Specific";
  if (productType === "companyBranded") return "Company Branded";
  return "Universal";
}

function compatibilityLines(text: string): string[] {
  const value = (text || "").trim();
  if (!value) return [];
  return value
    .split(/[;\n]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export default function ProductDetailsPage({ params }: { params: { slug: string } }) {
  const { addToCart } = useCart();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getProductBySlug(params.slug)
      .then((res) => {
        if (!active) return;
        setProduct(res.product || null);
      })
      .catch((e: any) => {
        if (!active) return;
        setError(e?.status === 404 ? "Product not found" : e?.message || "Could not load product");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.slug]);

  const lines = useMemo(
    () => compatibilityLines(product?.vehicle_compatibility || ""),
    [product?.vehicle_compatibility]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen">
        <p className="text-slate-300">Loading product details...</p>
      </div>
    );
  }

  if (!product || error) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen">
        <div className="rounded-3xl border border-white/10 bg-slate-800/40 p-8 text-center">
          <h1 className="text-3xl font-extrabold text-white mb-3">Product not found</h1>
          <p className="text-slate-300 mb-6">
            This product link is not available in the current AutoMart catalog.
          </p>
          <Link
            href="/spare-parts"
            className="inline-flex items-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Browse Spare Parts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen">
      <Link
        href="/spare-parts"
        className="text-muted-foreground hover:text-white mb-8 inline-block transition-colors font-medium"
      >
        &larr; Back to Spare Parts
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-4">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-slate-900 border border-white/10 shadow-2xl">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                <span className="text-slate-400 text-sm">No image available</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="inline-flex items-center rounded-full bg-primary/15 text-primary px-3 py-1 text-xs font-semibold mb-4">
            {labelForType(product.product_type)}
          </p>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">{product.name}</h1>
          <p className="text-slate-300 text-lg mb-6">{product.description || "No description available."}</p>

          <div className="flex items-center gap-3 mb-8">
            <span className="text-4xl font-bold text-slate-100">{formatINR(product.price)}</span>
            <span
              className={`text-sm font-semibold px-3 py-1 rounded-full ${
                product.stock > 0
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-rose-500/15 text-rose-300"
              }`}
            >
              {product.stock > 0 ? `In stock (${product.stock})` : "Out of stock"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="border border-white/10 rounded-2xl p-4 bg-slate-800/40">
              <p className="text-sm text-slate-400 mb-1">Brand</p>
              <p className="text-lg font-bold text-slate-200">{product.brand || "Generic"}</p>
            </div>
            <div className="border border-white/10 rounded-2xl p-4 bg-slate-800/40">
              <p className="text-sm text-slate-400 mb-1">Category</p>
              <p className="text-lg font-bold text-slate-200">{product.category || "Spare Parts"}</p>
            </div>
          </div>

          <div className="border border-white/10 rounded-2xl p-4 bg-slate-800/40 mb-8">
            <p className="text-sm text-slate-400 mb-2">Vehicle Compatibility</p>
            {lines.length > 0 ? (
              <ul className="space-y-1 text-slate-200 text-sm">
                {lines.map((line, idx) => (
                  <li key={`${line}-${idx}`}>• {line}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-300">
                Universal fit or compatibility information is available at checkout support.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={async () => {
                if (product.stock < 1) {
                  toast.error("This product is out of stock");
                  return;
                }
                await addToCart({
                  id: String(product.id),
                  productId: product.id,
                  title: product.name,
                  price: product.price,
                  image: product.image_url || "",
                });
                router.push("/cart");
              }}
              className="flex-1 py-4 font-bold rounded-2xl text-lg shadow-lg hover:shadow-xl transition-all bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              disabled={product.stock < 1}
            >
              Buy Now
            </button>
            <button
              onClick={async () => {
                if (product.stock < 1) {
                  toast.error("This product is out of stock");
                  return;
                }
                await addToCart({
                  id: String(product.id),
                  productId: product.id,
                  title: product.name,
                  price: product.price,
                  image: product.image_url || "",
                });
              }}
              className="flex-1 py-4 font-bold rounded-2xl text-lg border-2 border-primary text-primary bg-transparent hover:bg-primary/10 transition-all disabled:opacity-60"
              disabled={product.stock < 1}
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
