"use client";

import Link from "next/link";
import { Hero } from "../components/hero";
import { FeaturedProducts } from "../components/featured-products";
import { Categories } from "../components/categories";

export default function HomePage() {
  const openAutoMartChat = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-autobot"));
    }
  };

  return (
    <div className="min-h-screen">
      <Hero onOpenChat={openAutoMartChat} />

      <section className="py-12 bg-gradient-to-r from-muted/20 to-secondary/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-carRed via-gold to-bikeBlue bg-clip-text text-transparent mb-3">
              Explore Spare Part Categories
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Built for AutoMart intent: find engine, brake, electrical, and service parts fast.
            </p>
          </div>
          <Categories />
        </div>
      </section>

      <section className="py-12 bg-background/80 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-muted/20 pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <article className="rounded-3xl border border-border/50 bg-background/60 p-6 shadow-lg backdrop-blur-xl">
              <h3 className="text-2xl font-bold text-foreground mb-2">1. Select Vehicle</h3>
              <p className="text-muted-foreground mb-5">
                Search by company, model, year, variant, and fuel type.
              </p>
              <Link
                href="/vehicle-search"
                className="inline-flex px-4 py-2 rounded-xl bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground font-semibold transition-colors"
              >
                Open Vehicle Search
              </Link>
            </article>

            <article className="rounded-3xl border border-border/50 bg-background/60 p-6 shadow-lg backdrop-blur-xl">
              <h3 className="text-2xl font-bold text-foreground mb-2">2. Match Compatible Parts</h3>
              <p className="text-muted-foreground mb-5">
                See parts mapped for your selected vehicle and compare options.
              </p>
              <Link
                href="/spare-parts"
                className="inline-flex px-4 py-2 rounded-xl bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground font-semibold transition-colors"
              >
                Browse Spare Parts
              </Link>
            </article>

            <article className="rounded-3xl border border-border/50 bg-background/60 p-6 shadow-lg backdrop-blur-xl">
              <h3 className="text-2xl font-bold text-foreground mb-2">3. Checkout in INR</h3>
              <p className="text-muted-foreground mb-5">
                Review GST and shipping in billing summary before placing order.
              </p>
              <Link
                href="/cart"
                className="inline-flex px-4 py-2 rounded-xl bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground font-semibold transition-colors"
              >
                View Cart
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Featured Spare Parts
            </h2>
            <p className="text-lg text-muted-foreground">
              Frequently ordered parts from trusted brands for Indian vehicles.
            </p>
          </div>
          <FeaturedProducts />
        </div>
      </section>

      <section className="py-12 bg-gradient-to-b from-primary/5 to-secondary/20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-carRed to-bikeBlue bg-clip-text text-transparent mb-4">
            Need help choosing the right part?
          </h2>
          <p className="text-lg text-muted-foreground mb-7">
            AutoMart AI can guide you by vehicle details, usage, and budget.
          </p>
          <button
            onClick={openAutoMartChat}
            className="px-8 py-4 bg-gradient-to-r from-carRed to-primary text-primary-foreground text-lg font-semibold rounded-xl hover:shadow-2xl transition-all duration-300"
          >
            Ask AutoMart AI
          </button>
        </div>
      </section>

      <section className="py-12 bg-muted/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-3 text-foreground">
              What AutoMart buyers say
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Real feedback focused on spare-parts fitment confidence and delivery experience.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Ankit",
                city: "Pune",
                quote:
                  "I selected my Hyundai model and got compatible brake parts immediately. Fitment was exact.",
              },
              {
                name: "Meera",
                city: "Bengaluru",
                quote:
                  "The vehicle-wise filter saved me from ordering the wrong service kit. Delivery was on time.",
              },
              {
                name: "Sandeep",
                city: "Delhi",
                quote:
                  "Billing with GST and shipping was clear. I could place my order confidently for my bike.",
              },
            ].map((item, idx) => (
              <article
                key={idx}
                className="rounded-3xl border border-border/50 bg-background/60 p-6 shadow-xl backdrop-blur-xl text-left"
              >
                <p className="mb-4 text-gold font-semibold">5/5 Rating</p>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">{item.quote}</p>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-carRed to-bikeBlue rounded-full flex items-center justify-center text-white font-bold">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.city}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
