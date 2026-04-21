"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

import { resetPassword } from "../../../lib/api";

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [tokenPrefilled, setTokenPrefilled] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams.get("token") || "";
    if (fromQuery) {
      setToken(fromQuery);
      setTokenPrefilled(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    if (!token.trim()) {
      toast.error("Reset token is required");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(token.trim(), newPassword);
      setDone(true);
      toast.success(res.message || "Password reset successful");
      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (err: any) {
      toast.error(err?.message || "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md w-full px-4">
      <div className="backdrop-blur-xl bg-slate-900/60 py-10 px-6 sm:px-10 shadow-2xl border border-white/10 rounded-3xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-white">Reset Password</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Enter your reset token and set a new password for your AutoMart account.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-slate-300 mb-1">
              Reset Token
            </label>
            <textarea
              id="token"
              name="token"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-slate-900/70 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Paste reset token from forgot-password response"
            />
            {tokenPrefilled && (
              <p className="mt-1 text-xs text-slate-400">
                Token auto-filled from URL query.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300 mb-1">
              New Password
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/70 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Minimum 6 characters"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/70 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Re-enter new password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || done}
            className="w-full py-3 rounded-xl text-sm font-bold text-primary-foreground bg-gradient-to-r from-primary to-secondary hover:opacity-95 disabled:opacity-60 transition-all"
          >
            {loading ? "Resetting..." : done ? "Password Updated" : "Reset Password"}
          </button>
        </form>

        {done && (
          <div className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            Password reset successful. Redirecting to login...
          </div>
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 pt-24">Loading...</div>}
    >
      <ResetPasswordPageContent />
    </Suspense>
  );
}
