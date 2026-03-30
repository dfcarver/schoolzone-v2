"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getDefaultRoute } from "@/lib/auth/types";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { session, loading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session) {
      router.replace("/");
    }
  }, [loading, session, router]);

  function doLogin(user: string, pass: string) {
    setSubmitting(true);
    setError("");
    const result = login(user, pass);
    if (result.success) {
      router.replace("/");
    } else {
      setError(result.error ?? "Invalid credentials");
      setSubmitting(false);
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Username and password are required");
      return;
    }
    doLogin(username.trim(), password);
  };

  if (loading || session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">

      {/* Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-blue-600/10 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_32px_rgba(59,130,246,0.4)]">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            School<span className="text-blue-400">Zone</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Digital Twin Operations Platform</p>
          <p className="text-xs text-slate-600 mt-0.5">Abu Dhabi Department of Transport</p>
        </div>

        {/* Credentials hint */}
        <div className="mb-4 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-500 space-y-1">
          <p className="font-medium text-slate-400 mb-1.5">Access credentials</p>
          {[
            { user: "admin", pass: "admin2026", label: "Full access" },
            { user: "executive", pass: "exec2026", label: "Command Brief" },
            { user: "operator", pass: "ops2026", label: "Operations" },
            { user: "governance", pass: "gov2026", label: "Governance" },
          ].map(({ user, pass, label }) => (
            <div key={user} className="flex items-center justify-between gap-4">
              <span className="font-mono text-slate-400">{user} / {pass}</span>
              <span className="text-slate-600">{label}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-slate-400 mb-1.5">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                placeholder="executive / operator / governance"
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-400 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 text-sm font-medium text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50 border border-slate-600"
            >
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
