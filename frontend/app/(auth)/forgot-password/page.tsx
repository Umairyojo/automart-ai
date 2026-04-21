"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

import { forgotPassword } from "../../../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [demoToken, setDemoToken] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      setMessage(res.message || "If that email exists, reset instructions have been generated.");
      setDemoToken(res.reset_token || "");
      toast.success("Reset request submitted");
    } catch (err: any) {
      toast.error(err?.message || "Could not submit reset request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md w-full px-4">
      <div className="backdrop-blur-xl bg-slate-900/60 py-10 px-6 sm:px-10 shadow-2xl border border-white/10 rounded-3xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-white">Forgot Password</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Enter your email and we will generate a reset token for your AutoMart account.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/70 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="you@automart.local"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold text-primary-foreground bg-gradient-to-r from-primary to-secondary hover:opacity-95 disabled:opacity-60 transition-all"
          >
            {loading ? "Submitting..." : "Generate Reset Token"}
          </button>
        </form>

        {message && (
          <div className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {demoToken && (
          <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200 space-y-2">
            <p className="font-semibold">Demo reset token (development only)</p>
            <p className="break-all text-xs">{demoToken}</p>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(demoToken);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                  toast.success("Token copied");
                } catch {
                  toast.error("Could not copy token");
                }
              }}
              className="inline-flex rounded-lg border border-amber-300/40 px-3 py-1 text-xs font-semibold hover:bg-amber-300/10 transition-colors"
            >
              {copied ? "Copied" : "Copy Token"}
            </button>
            <Link
              href={`/reset-password?token=${encodeURIComponent(demoToken)}`}
              className="inline-flex text-primary hover:text-primary/80 font-medium"
            >
              Continue to Reset Password
            </Link>
          </div>
        )}

        {message && !demoToken && (
          <p className="mt-3 text-xs text-slate-400">
            For production-style flow, user receives token by email service. In local demo, keep
            `EXPOSE_RESET_TOKEN=1` in backend env.
          </p>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-slate-400 hover:text-primary transition-colors">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
