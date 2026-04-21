"use client";

import Link from "next/link";
import { Search, ShoppingCart, User, Menu, Sun, Moon, CarFront } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { useCart } from "./cart-provider";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const { items } = useCart();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim() !== "") {
      router.push(`/vehicle-search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border/50 supports-[backdrop-filter:blur(20px)]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-6 lg:gap-8 min-w-0">
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <div className="w-10 h-10 bg-gradient-to-r from-carRed to-bikeBlue rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <CarFront className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-foreground via-primary to-carRed bg-clip-text text-transparent">
                AutoMart
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-6 xl:gap-7 whitespace-nowrap">
              <Link href="/" className="text-base font-medium hover:text-primary transition-colors">
                Home
              </Link>
              <Link
                href="/cars"
                className="text-base font-medium hover:text-carRed transition-colors"
              >
                Cars
              </Link>
              <Link
                href="/bikes"
                className="text-base font-medium hover:text-bikeBlue transition-colors"
              >
                Bikes
              </Link>
              <Link
                href="/vehicle-search"
                className="text-base font-medium hover:text-primary transition-colors"
              >
                Vehicle Search
              </Link>
              <Link
                href="/spare-parts"
                className="text-base font-medium hover:text-primary transition-colors"
              >
                Spare Parts
              </Link>
              <div className="relative group">
                <button className="text-base font-medium hover:text-primary transition-colors">
                  Categories
                </button>
                <div className="absolute left-0 mt-2 w-48 bg-background border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-2">
                  <Link
                    href="/spare-parts?category=engine"
                    className="block px-4 py-2 hover:bg-muted rounded-lg"
                  >
                    Engine
                  </Link>
                  <Link
                    href="/spare-parts?category=brake"
                    className="block px-4 py-2 hover:bg-muted rounded-lg"
                  >
                    Brake
                  </Link>
                  <Link
                    href="/spare-parts?category=electrical"
                    className="block px-4 py-2 hover:bg-muted rounded-lg"
                  >
                    Electrical
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative hidden md:block">
              <Search className="w-5 h-5 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearch}
                placeholder="Search vehicle company/model..."
                className="w-52 xl:w-72 pl-11 pr-4 py-2 bg-muted/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Toggle theme"
              disabled={!mounted}
            >
              {mounted ? (
                resolvedTheme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )
              ) : (
                <span className="block w-5 h-5" aria-hidden="true" />
              )}
            </button>

            <Link href="/cart" className="relative p-2 hover:bg-muted rounded-xl transition-colors">
              <ShoppingCart className="w-6 h-6" />
              {mounted && items.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-carRed text-xs rounded-full flex items-center justify-center text-white font-bold">
                  {items.length}
                </span>
              )}
            </Link>

            <Link
              href="/profile"
              className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg hover:shadow-xl transition-all"
            >
              <User className="w-5 h-5" />
            </Link>

            <button
              className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden pb-4 border-t border-border/50">
            <div className="flex flex-col space-y-3 pt-3">
              <Link href="/" className="py-1 hover:text-primary transition-colors">
                Home
              </Link>
              <Link href="/cars" className="py-1 hover:text-carRed transition-colors">
                Cars
              </Link>
              <Link href="/bikes" className="py-1 hover:text-bikeBlue transition-colors">
                Bikes
              </Link>
              <Link href="/vehicle-search" className="py-1 hover:text-primary transition-colors">
                Vehicle Search
              </Link>
              <Link href="/spare-parts" className="py-1 hover:text-primary transition-colors">
                Spare Parts
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
