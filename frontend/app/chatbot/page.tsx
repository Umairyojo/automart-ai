"use client";

import Link from "next/link";

export default function ChatbotPage() {
  const openChat = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-autobot"));
    }
  };

  return (
    <div className="min-h-screen py-16 px-4">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-slate-900/40 p-8 md:p-10">
        <h1 className="text-4xl font-extrabold text-white mb-3">AutoMart AI Assistant</h1>
        <p className="text-slate-300 text-lg mb-6">
          Ask for compatible spare parts by vehicle company, model, and year. You will get concise
          suggestions and quick add-to-cart options.
        </p>

        <div className="grid gap-3 mb-8 text-sm text-slate-300">
          <p>Example 1: Suggest brake pads for Honda City 2020 petrol</p>
          <p>Example 2: Best universal engine oil options for daily use</p>
          <p>Example 3: Recommend electrical parts for Hyundai Creta</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={openChat}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-carRed text-primary-foreground font-semibold"
          >
            Open Chatbot
          </button>
          <Link
            href="/spare-parts"
            className="px-6 py-3 rounded-xl border border-primary/40 text-primary font-semibold"
          >
            Browse Spare Parts
          </Link>
        </div>
      </div>
    </div>
  );
}
