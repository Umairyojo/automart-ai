import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen">
      <h1 className="text-4xl font-extrabold tracking-tight text-slate-100 mb-4">Privacy Policy</h1>
      <p className="text-slate-300 mb-8">
        Last updated: April 18, 2026. This page explains how AutoMart collects, uses, and protects
        your information when you use our website.
      </p>

      <div className="space-y-6 text-slate-300 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-white mb-2">1. Information We Collect</h2>
          <p>
            We collect basic account details (name, email), delivery details (address and contact
            number), and order information needed to process purchases and support requests.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">2. How We Use Information</h2>
          <p>
            Data is used to provide vehicle-wise spare part recommendations, process cart and
            checkout, track orders, and improve user experience. We do not sell your personal data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">3. Cookies and Session Data</h2>
          <p>
            AutoMart uses session cookies for login and cart continuity. These help keep your
            shopping session secure and consistent across pages.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">4. Data Security</h2>
          <p>
            We apply reasonable project-level safeguards including hashed passwords, validated API
            requests, and protected routes for user and admin modules.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">5. Contact</h2>
          <p>
            For privacy-related questions, contact us at support@automart.com. You can also visit
            the <Link href="/about" className="text-primary hover:underline"> About page</Link> for platform details.
          </p>
        </section>
      </div>
    </div>
  );
}
