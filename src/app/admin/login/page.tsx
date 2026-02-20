"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { SiteNav } from "@/components/SiteNav";

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginContent />
    </Suspense>
  );
}

function AdminLoginContent() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchParams.get("error") === "link_expired") {
      setError("Your sign-in link has expired or was opened in a different browser. Enter the code from your email instead.");
    }
  }, [searchParams]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createSupabaseBrowser();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      setSent(true);
      setLoading(false);
      // Auto-focus the OTP input
      setTimeout(() => otpRef.current?.focus(), 100);
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setVerifying(true);

    try {
      const supabase = createSupabaseBrowser();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (verifyError) {
        setError(verifyError.message);
        setVerifying(false);
        return;
      }

      router.push("/admin");
    } catch {
      setError("An unexpected error occurred");
      setVerifying(false);
    }
  };

  return (
    <div className="admin-theme min-h-screen bg-white">
      <SiteNav
        links={[
          { label: "Home", href: "/" },
          { label: "Try It", href: "/demo" },
        ]}
        cta={{ label: "Builder Demo", href: "/stone-martin/kinkade" }}
      />

      <section className="relative overflow-hidden px-4 py-14 md:py-20 flex items-center justify-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-36 right-0 h-[420px] w-[420px] rounded-full bg-sky-100/45 blur-3xl" />
          <div className="absolute top-24 -left-20 h-[300px] w-[300px] rounded-full bg-slate-100 blur-3xl" />
        </div>

        <div className="relative w-full max-w-sm border border-slate-200 bg-white shadow-sm p-6 md:p-8">
          <div className="mb-7 text-center">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-semibold mb-3">Finch Admin</p>
            <h1 className="text-3xl leading-tight tracking-tight text-slate-900">Sign In</h1>
            <p className="text-sm text-slate-600 mt-2">Manage floor plans, pricing, and upgrades.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          {sent ? (
            <div className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-4 text-sm">
                Check your email for a sign-in code.
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-slate-700 mb-1">
                    Enter code
                  </label>
                  <input
                    ref={otpRef}
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-slate-500 tracking-widest text-center text-lg font-mono"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifying || otp.length < 6}
                  className="w-full py-2.5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying ? "Verifying..." : "Sign in"}
                </button>
              </form>

              <div className="text-center space-y-2">
                <p className="text-slate-500 text-xs">
                  Sent to <span className="text-slate-700">{email}</span>
                </p>
                <p className="text-slate-500 text-xs">
                  Or click the magic link in your email from this same browser.
                </p>
                <button
                  onClick={() => {
                    setSent(false);
                    setEmail("");
                    setOtp("");
                    setError(null);
                  }}
                  className="text-slate-600 text-xs hover:text-slate-900 transition-colors"
                >
                  Use a different email
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-slate-500"
                  placeholder="you@company.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending code..." : "Continue with email"}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
