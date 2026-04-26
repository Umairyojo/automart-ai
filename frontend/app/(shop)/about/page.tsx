import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--secondary))_48%,hsl(var(--background))_100%)] dark:bg-background">
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

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 pt-24">
      <section className="text-center mb-12">
        <p className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold tracking-widest uppercase text-primary mb-4">
          About AutoMart
        </p>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground mb-4">
          Built for smarter spare-parts shopping.
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          AutoMart is a vehicle spare parts platform where users can shop by selected vehicle or
          directly browse universal and branded parts in one clean flow.
        </p>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        <article className="rounded-3xl border border-border bg-card/95 p-6 text-card-foreground shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-carRed/40 hover:shadow-xl dark:border-white/10 dark:bg-slate-800/40">
          <h2 className="text-xl font-bold text-card-foreground mb-3">Vehicle-Based Search</h2>
          <p className="text-muted-foreground leading-relaxed">
            Users can search by company, model, year, variant, and fuel type to get compatible part
            suggestions and avoid ordering mismatched products.
          </p>
        </article>
        <article className="rounded-3xl border border-border bg-card/95 p-6 text-card-foreground shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-bikeBlue/40 hover:shadow-xl dark:border-white/10 dark:bg-slate-800/40">
          <h2 className="text-xl font-bold text-card-foreground mb-3">General Spare Parts</h2>
          <p className="text-muted-foreground leading-relaxed">
            The platform also supports direct browsing of universal parts, branded parts, and
            category-specific listings without requiring vehicle selection first.
          </p>
        </article>
        <article className="rounded-3xl border border-border bg-card/95 p-6 text-card-foreground shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl dark:border-white/10 dark:bg-slate-800/40">
          <h2 className="text-xl font-bold text-card-foreground mb-3">College Project Ready</h2>
          <p className="text-muted-foreground leading-relaxed">
            AutoMart focuses on practical e-commerce modules with realistic user and admin flows,
            making it easy to present in demo, viva, and documentation.
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-border bg-card/95 p-8 mb-12 text-card-foreground shadow-md dark:border-white/10 dark:bg-slate-800/30">
        <h2 className="text-2xl font-bold text-card-foreground mb-4">What makes AutoMart different</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-muted-foreground">
          <p>1. Vehicle compatibility-first buying experience.</p>
          <p>2. INR pricing with GST-aware billing summary.</p>
          <p>3. Mock/demo payment-ready checkout phase.</p>
          <p>4. Admin panel for products, orders, and vehicles.</p>
          <p>5. AI chatbot support for user-side guidance.</p>
          <p>6. Responsive interface for desktop and mobile.</p>
        </div>
      </section>

      <section className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">Start browsing now</h2>
        <p className="text-muted-foreground mb-6">
          Pick your flow: vehicle-based compatibility shopping or direct spare parts catalog
          browsing.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/vehicle-search"
            className="px-6 py-3 rounded-xl bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground font-semibold transition-colors"
          >
            Vehicle Search
          </Link>
          <Link
            href="/spare-parts"
            className="px-6 py-3 rounded-xl bg-bikeBlue/15 text-bikeBlue hover:bg-bikeBlue hover:text-white font-semibold transition-colors"
          >
            Browse Spare Parts
          </Link>
        </div>
      </section>
      </div>
    </div>
  );
}
