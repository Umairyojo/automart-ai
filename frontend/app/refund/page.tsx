import Link from "next/link";

export default function RefundPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen">
      <h1 className="text-4xl font-extrabold tracking-tight text-slate-100 mb-4">Refund Policy</h1>
      <p className="text-slate-300 mb-8">
        Last updated: April 18, 2026. This policy describes when AutoMart accepts returns or
        refunds for spare parts.
      </p>

      <div className="space-y-6 text-slate-300 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-white mb-2">1. Return Window</h2>
          <p>
            Return requests should be raised within 7 days of delivery for wrong item, damaged
            product, or compatibility mismatch supported by order details.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">2. Eligible Cases</h2>
          <p>
            Refunds are typically approved for incorrect shipment, defective parts on arrival, or
            cancelled orders before dispatch. Consumables and used parts are not eligible.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">3. Refund Process</h2>
          <p>
            Once return verification is complete, refunds are initiated to the original payment mode
            or project demo wallet flow. Processing time can vary based on payment method.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">4. Shipping and Handling</h2>
          <p>
            Return shipping may be covered by AutoMart for platform-side errors. For buyer-side
            change-of-mind requests, shipping may be non-refundable.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">5. Support</h2>
          <p>
            For refund help, contact support@automart.com with order ID and product details. You can
            review terms on the <Link href="/terms" className="text-primary hover:underline"> Terms page</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
