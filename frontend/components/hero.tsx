"use client";

import { Search } from "lucide-react";
import { useState, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface HeroProps {
  onOpenChat?: () => void;
}

export function Hero({ onOpenChat }: HeroProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim() !== "") {
      router.push(`/vehicle-search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <section className="relative overflow-hidden bg-background py-14 sm:py-16">
      <div className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl" aria-hidden="true">
        <div
          className="relative left-[calc(50%-12rem)] aspect-[1155/678] w-[38rem] -translate-x-1/2 rotate-[24deg] bg-gradient-to-tr from-carRed via-primary to-bikeBlue opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <p className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold tracking-widest uppercase text-primary mb-5">
          Vehicle-Based + General Shopping
        </p>
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight mb-4 text-foreground">
          Find the right spare parts for your car or bike.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          Search your vehicle, check compatibility, and order trusted parts in a smooth AutoMart
          shopping flow.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-4xl mx-auto">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearch}
              placeholder="Try: Honda City 2021 Petrol"
              className="w-full pl-11 pr-4 py-4 text-base rounded-2xl border border-border bg-card/60 backdrop-blur-md placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-foreground shadow-sm"
            />
          </div>
          <Link
            href="/spare-parts"
            className="w-full sm:w-auto px-8 py-4 border border-border rounded-2xl font-semibold hover:bg-muted transition-colors"
          >
            Browse All Parts
          </Link>
          <button
            onClick={() => onOpenChat?.()}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-carRed to-primary text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Ask AutoMart AI
          </button>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            { label: "Vehicle Coverage", value: "Cars + Bikes + Scooters" },
            { label: "Shopping Modes", value: "Vehicle specific and Universal" },
            { label: "Support", value: "Chatbot-guided product discovery" },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-5 shadow-sm"
            >
              <p className="text-xs uppercase tracking-widest text-primary font-bold mb-1">{item.label}</p>
              <p className="text-lg font-bold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
