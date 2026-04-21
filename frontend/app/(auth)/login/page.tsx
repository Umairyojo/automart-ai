"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { loginAuth, meAuth, registerAuth } from "../../../lib/api";

type AuthMode = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await meAuth();
        if (active && res.user) {
          router.replace("/profile");
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (mode === "login") {
        await loginAuth(email, password);
        toast.success("Logged in successfully");
      } else {
        await registerAuth(name.trim(), email, password);
        toast.success("Account created successfully");
      }
      router.push("/profile");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md w-full px-4">
      <div className="backdrop-blur-xl bg-slate-900/60 py-10 px-6 sm:px-10 shadow-2xl border border-white/10 rounded-3xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-white">AutoMart</h1>
          <p className="text-slate-400 mt-2 text-sm">
            {mode === "login"
              ? "Login to continue your spare-parts checkout."
              : "Create your account to place orders."}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-800/70 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
              mode === "login" ? "bg-primary text-primary-foreground" : "text-slate-300"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
              mode === "register" ? "bg-primary text-primary-foreground" : "text-slate-300"
            }`}
          >
            Register
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {mode === "register" && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/70 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Aman Kumar"
              />
            </div>
          )}

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

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/70 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Minimum 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold text-primary-foreground bg-gradient-to-r from-primary to-secondary hover:opacity-95 disabled:opacity-60 transition-all"
          >
            {loading
              ? mode === "login"
                ? "Logging in..."
                : "Creating account..."
              : mode === "login"
                ? "Login"
                : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-slate-400">Forgot password? </span>
          <Link href="/forgot-password" className="text-primary hover:text-primary/80 font-medium">
            Reset it here
          </Link>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-slate-400 hover:text-primary transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
