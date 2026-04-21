import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen">
      <h1 className="text-4xl font-extrabold tracking-tight text-slate-100 mb-4">Terms of Service</h1>
      <p className="text-slate-300 mb-8">
        Last updated: April 18, 2026. By accessing AutoMart, you agree to these terms for using
        our spare parts marketplace and associated services.
      </p>

      <div className="space-y-6 text-slate-300 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-white mb-2">1. Platform Usage</h2>
          <p>
            AutoMart is intended for lawful use only. Users must provide accurate account, vehicle,
            and order details while using search, cart, and checkout features.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">2. Product Information</h2>
          <p>
            We provide compatibility data to assist selection, but users should verify model, year,
            and variant before placing orders for critical components.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">3. Pricing and Payments</h2>
          <p>
            Prices shown on AutoMart are in INR. Taxes and shipping are displayed at checkout. The
            current payment module may run in demo mode during project phase demonstrations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">4. User Accounts</h2>
          <p>
            You are responsible for account confidentiality and all activity under your login.
            AutoMart may suspend accounts for misuse, fraud attempts, or policy violation.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">5. Policy Links</h2>
          <p>
            Please read our <Link href="/privacy" className="text-primary hover:underline"> Privacy Policy</Link> and{" "}
            <Link href="/refund" className="text-primary hover:underline"> Refund Policy</Link> for related commitments.
          </p>
        </section>
      </div>
    </div>
  );
}
