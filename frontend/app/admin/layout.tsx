import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-theme flex min-h-screen bg-background text-foreground">
      <aside className="hidden md:flex w-72 flex-shrink-0 border-r border-border bg-card/95 backdrop-blur-sm flex-col">
        <div className="h-16 px-6 flex items-center border-b border-border">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            AutoMart <span className="text-primary">Admin</span>
          </Link>
        </div>

        <nav className="p-4 space-y-2">
          <Link
            href="/admin"
            className="block rounded-xl px-4 py-2.5 bg-primary/15 text-primary font-semibold"
          >
            Dashboard
          </Link>
          <Link
            href="/spare-parts"
            className="block rounded-xl px-4 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            View Storefront
          </Link>
          <Link
            href="/orders"
            className="block rounded-xl px-4 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            User Orders View
          </Link>
        </nav>

        <div className="mt-auto p-4 border-t border-border text-sm text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">Demo Admin Account</p>
          <p>admin@automart.local</p>
          <p className="text-muted-foreground">Use login page to switch account.</p>
        </div>
      </aside>

      <main className="flex-1">
        <header className="h-16 px-6 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm">
          <h2 className="text-lg font-semibold">Operations Panel</h2>
          <Link
            href="/"
            className="px-3 py-1.5 rounded-lg bg-muted hover:bg-accent text-sm transition-colors"
          >
            Back to Site
          </Link>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
