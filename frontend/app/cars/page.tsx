"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getVehicles, type Vehicle } from "../../lib/api";

type CompanyCard = {
  company: string;
  models: string[];
  image_url?: string;
};

export default function CarsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getVehicles({ vehicle_type: "car" })
      .then((res) => {
        if (!active) return;
        setVehicles(res.vehicles || []);
      })
      .catch((e: any) => {
        if (!active) return;
        setError(e?.message || "Could not load car companies");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const companies = useMemo<CompanyCard[]>(() => {
    const grouped = new Map<string, { models: Set<string>; image_url: string }>();
    for (const v of vehicles) {
      const key = (v.company || "").trim();
      if (!key) continue;
      if (!grouped.has(key)) grouped.set(key, { models: new Set<string>(), image_url: "" });
      const row = grouped.get(key);
      row?.models.add(v.model);
      if (row && !row.image_url && v.image_url) {
        row.image_url = v.image_url;
      }
    }
    return Array.from(grouped.entries())
      .map(([company, row]) => ({
        company,
        models: Array.from(row.models).sort(),
        image_url: row.image_url || "",
      }))
      .sort((a, b) => a.company.localeCompare(b.company));
  }, [vehicles]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div
          className="float-animation absolute -top-20 -left-12 h-72 w-72 rounded-full bg-primary/15 blur-3xl dark:bg-primary/20"
          style={{ animationDuration: "8.5s" }}
        />
        <div
          className="float-animation absolute top-32 right-10 h-64 w-64 rounded-full bg-bikeBlue/15 blur-3xl dark:bg-bikeBlue/20"
          style={{ animationDuration: "10s", animationDelay: "1s" }}
        />
        <div
          className="float-animation absolute bottom-20 left-1/3 h-56 w-56 rounded-full bg-carRed/10 blur-3xl dark:bg-carRed/15"
          style={{ animationDuration: "9.5s", animationDelay: "0.5s" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pt-16 sm:pt-20">
        <div className="mb-6 pb-4 border-b border-border/70">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Car Companies</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Select a company to view spare parts for its cars.
          </p>
        </div>

        {loading && <p className="text-muted-foreground">Loading car companies...</p>}
        {error && <p className="text-destructive">{error}</p>}

        {!loading && !error && companies.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
            No car companies found.
          </div>
        )}

        {!loading && !error && companies.length > 0 && (
          <div className="grid grid-cols-1 gap-y-8 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 xl:gap-x-8">
            {companies.map((company, idx) => (
              <article
                key={`${company.company}-${idx}`}
                className="group relative flex flex-col rounded-3xl border border-border bg-card/95 p-4 text-card-foreground shadow-md hover:-translate-y-1 hover:shadow-xl hover:border-carRed/40 transition-all duration-300"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted">
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-90 transition-transform duration-700 group-hover:scale-110"
                    style={{
                      backgroundImage: `url('${
                        company.image_url ||
                        "https://loremflickr.com/900/600/" +
                          encodeURIComponent(company.company) +
                          ",car?lock=" +
                          String(idx + 101)
                      }')`,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-40" />
                </div>

                <div className="mt-5 flex flex-1 flex-col px-2">
                  <h2 className="mb-2 text-xl font-bold text-card-foreground group-hover:text-carRed transition-colors">
                    {company.company}
                  </h2>
                  <p className="mb-5 text-sm text-muted-foreground">
                    {company.models.slice(0, 5).join(" | ")}
                  </p>
                  <Link
                    href={`/spare-parts?q=${encodeURIComponent(company.company)}`}
                    className="mt-auto inline-flex items-center justify-center rounded-xl bg-primary/10 px-6 py-2.5 font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    View Spare Parts
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
