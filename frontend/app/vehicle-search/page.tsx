"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

import { createGarageEntry, getVehicles, type Vehicle } from "../../lib/api";

function VehicleSearchPageContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingVehicleId, setSavingVehicleId] = useState<number | null>(null);

  const companies = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.company))).sort(),
    [vehicles]
  );
  const [companyFilter, setCompanyFilter] = useState("");

  useEffect(() => {
    const q = searchParams.get("q") || "";
    if (q) setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getVehicles({ q: query, company: companyFilter || undefined })
      .then((res) => {
        if (active) setVehicles(res.vehicles || []);
      })
      .catch((e) => {
        if (active) setError(e.message || "Failed to load vehicles");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query, companyFilter]);

  const handleSaveGarage = async (vehicle: Vehicle) => {
    setSavingVehicleId(vehicle.id);
    try {
      const res = await createGarageEntry({ vehicle_id: vehicle.id });
      if (res.created) {
        toast.success(`${vehicle.display_name} saved to My Garage`);
      } else {
        toast("Vehicle already in My Garage");
      }
    } catch (e: any) {
      if (e?.status === 401) {
        toast.error("Please login to save vehicles");
        return;
      }
      toast.error(e?.message || "Could not save vehicle");
    } finally {
      setSavingVehicleId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pt-16 sm:pt-20 min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
          Find Your Vehicle
        </h1>
        <p className="text-muted-foreground text-lg">
          Search by company, model, year, variant, or fuel type and then shop compatible spare
          parts.
        </p>
      </div>

      <div className="bg-card/95 border border-border rounded-2xl p-5 mb-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try: Honda City 2020 Petrol"
            className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All companies</option>
            {companies.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p className="text-muted-foreground">Loading vehicles...</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {vehicles.map((v) => (
            <article
              key={v.id}
              className="bg-card/95 border border-border rounded-2xl p-5 shadow-sm hover:border-primary/40 transition-colors"
            >
              <div className="h-40 mb-4 overflow-hidden rounded-xl bg-muted border border-border">
                {v.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.image_url} alt={v.display_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-muted to-secondary flex items-center justify-center text-muted-foreground text-xs">
                    No image
                  </div>
                )}
              </div>
              <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
                {v.company}
              </p>
              <h2 className="text-xl font-bold text-card-foreground mb-2">{v.model}</h2>
              <p className="text-muted-foreground mb-4">
                {v.year} {v.variant} {v.fuel_type}
              </p>
              <Link
                href={`/vehicle/${v.id}`}
                className="inline-flex px-4 py-2 rounded-xl bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground font-semibold transition-colors"
              >
                Select Vehicle
              </Link>
              <button
                type="button"
                onClick={() => handleSaveGarage(v)}
                disabled={savingVehicleId === v.id}
                className="ml-2 inline-flex px-4 py-2 rounded-xl bg-muted text-foreground hover:bg-accent font-semibold transition-colors disabled:opacity-60"
              >
                {savingVehicleId === v.id ? "Saving..." : "Save to Garage"}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VehicleSearchPage() {
  return (
    <Suspense
      fallback={<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pt-16 sm:pt-20">Loading...</div>}
    >
      <VehicleSearchPageContent />
    </Suspense>
  );
}
