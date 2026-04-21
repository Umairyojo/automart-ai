"use client";

import Link from "next/link";
import {
  BatteryCharging,
  CircleDot,
  Filter,
  Gauge,
  ShieldCheck,
  Wrench,
} from "lucide-react";

const categories = [
  {
    name: "Engine and Lubricants",
    description: "Engine oils, coolant, spark plugs, and performance kits.",
    href: "/spare-parts?category=engine",
    icon: Wrench,
    tone: "from-orange-500 to-red-500",
  },
  {
    name: "Brake and Safety",
    description: "Brake pads, discs, and safety-focused replacement parts.",
    href: "/spare-parts?category=brake",
    icon: ShieldCheck,
    tone: "from-rose-500 to-pink-500",
  },
  {
    name: "Electrical and Lighting",
    description: "Batteries, bulbs, relays, and charging components.",
    href: "/spare-parts?category=electrical",
    icon: BatteryCharging,
    tone: "from-cyan-500 to-blue-500",
  },
  {
    name: "Suspension and Handling",
    description: "Bearings, joints, and ride-control parts for stable handling.",
    href: "/spare-parts?q=suspension",
    icon: Gauge,
    tone: "from-indigo-500 to-violet-500",
  },
  {
    name: "Filters and Service Kits",
    description: "Air, oil, and fuel filters for regular maintenance.",
    href: "/spare-parts?q=filter",
    icon: Filter,
    tone: "from-emerald-500 to-teal-500",
  },
  {
    name: "Accessories",
    description: "Daily-use accessories for comfort, utility, and protection.",
    href: "/spare-parts?category=accessories",
    icon: CircleDot,
    tone: "from-fuchsia-500 to-purple-500",
  },
];

export function Categories() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {categories.map(({ name, description, tone, href, icon: Icon }) => (
        <article
          key={name}
          className="rounded-3xl border border-border/40 bg-background/80 p-6 shadow-lg transition hover:-translate-y-1 hover:shadow-2xl"
        >
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-r ${tone} flex items-center justify-center mb-4`}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{name}</h3>
          <p className="text-muted-foreground mb-5">{description}</p>
          <Link
            href={href}
            className="inline-flex items-center rounded-lg bg-primary/10 text-primary px-3 py-2 text-sm font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Explore
          </Link>
        </article>
      ))}
    </div>
  );
}
