import Link from "next/link";
import { Facebook, Instagram, Send, Twitter, Youtube } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative mt-20 pt-16 pb-8 overflow-hidden bg-background">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] opacity-50 pointer-events-none -translate-y-1/2" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-bikeBlue/20 rounded-full blur-[128px] opacity-50 pointer-events-none -translate-y-1/2" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">
          <div className="lg:col-span-4 space-y-6">
            <Link href="/" className="inline-block group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-carRed to-primary flex items-center justify-center text-white shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform duration-300">
                  <span className="font-bold text-xl leading-none">A</span>
                </div>
                <span className="text-3xl font-extrabold tracking-tight text-foreground transition-colors group-hover:text-primary">
                  AutoMart
                </span>
              </div>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              AutoMart helps you find vehicle-compatible spare parts with a simple, reliable shopping
              flow for Indian car and bike owners.
            </p>
          </div>

          <div className="hidden lg:block lg:col-span-2" />

          <div className="lg:col-span-2">
            <h4 className="text-sm font-bold tracking-widest uppercase text-foreground mb-6 bg-gradient-to-r from-primary to-bikeBlue bg-clip-text text-transparent inline-block">
              Company
            </h4>
            <div className="space-y-4 text-sm text-muted-foreground font-medium">
              <Link href="/about" className="flex items-center gap-2 hover:text-primary transition-colors group">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/0 group-hover:bg-primary transition-colors" />
                About Us
              </Link>
              <Link href="/cars" className="flex items-center gap-2 hover:text-carRed transition-colors group">
                <span className="w-1.5 h-1.5 rounded-full bg-carRed/0 group-hover:bg-carRed transition-colors" />
                Cars
              </Link>
              <Link
                href="/vehicle-search"
                className="flex items-center gap-2 hover:text-bikeBlue transition-colors group"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-bikeBlue/0 group-hover:bg-bikeBlue transition-colors" />
                Vehicle Search
              </Link>
              <Link
                href="/spare-parts"
                className="flex items-center gap-2 hover:text-gold transition-colors group"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-gold/0 group-hover:bg-gold transition-colors" />
                Spare Parts
              </Link>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h4 className="text-sm font-bold tracking-widest uppercase text-foreground mb-6 bg-gradient-to-r from-primary to-bikeBlue bg-clip-text text-transparent inline-block">
              Categories
            </h4>
            <div className="space-y-4 text-sm text-muted-foreground font-medium">
              <Link href="/spare-parts?category=engine" className="block hover:text-foreground transition-all hover:translate-x-1">
                Engine Parts
              </Link>
              <Link href="/spare-parts?category=brake" className="block hover:text-foreground transition-all hover:translate-x-1">
                Brake Parts
              </Link>
              <Link href="/spare-parts?category=electrical" className="block hover:text-foreground transition-all hover:translate-x-1">
                Electrical Parts
              </Link>
              <Link href="/spare-parts?category=accessories" className="block hover:text-foreground transition-all hover:translate-x-1">
                Accessories
              </Link>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h4 className="text-sm font-bold tracking-widest uppercase text-foreground mb-6 bg-gradient-to-r from-primary to-bikeBlue bg-clip-text text-transparent inline-block">
              Contact
            </h4>
            <div className="space-y-4 text-sm text-muted-foreground font-medium">
              <p className="hover:text-primary transition-colors cursor-pointer flex items-center gap-2">
                <Send size={14} /> support@automart.com
              </p>
              <p className="hover:text-primary transition-colors cursor-pointer">+91 98765 43210</p>
              <div className="flex space-x-4 pt-4">
                <a href="#" className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-white hover:scale-110 transition-all shadow-sm">
                  <Instagram size={14} />
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-white hover:scale-110 transition-all shadow-sm">
                  <Twitter size={14} />
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-white hover:scale-110 transition-all shadow-sm">
                  <Facebook size={14} />
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-white hover:scale-110 transition-all shadow-sm">
                  <Youtube size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-border/30 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} AutoMart Inc. All rights reserved.</p>
          <div className="flex space-x-6 backdrop-blur-md bg-muted/20 px-4 py-2 rounded-full border border-border/30">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link href="/refund" className="hover:text-foreground transition-colors">
              Refund Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
