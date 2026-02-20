"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
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
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  const otpString = otp.join("");

  const handleDigitChange = useCallback((index: number, value: string) => {
    // Handle paste of full code
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newOtp = Array(6).fill("");
      digits.forEach((d, i) => { newOtp[i] = d; });
      setOtp(newOtp);
      const focusIndex = Math.min(digits.length, 5);
      digitRefs.current[focusIndex]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, "");
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }
  }, [otp]);

  const handleDigitKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  }, [otp]);

  // Restore OTP state from sessionStorage on mount (survives refresh)
  useEffect(() => {
    const saved = sessionStorage.getItem("finch_otp_email");
    if (saved) {
      setEmail(saved);
      setSent(true);
      setTimeout(() => digitRefs.current[0]?.focus(), 100);
    }
  }, []);

  useEffect(() => {
    if (searchParams.get("error") === "link_expired") {
      setError("Your sign-in link has expired or was opened in a different browser. Enter the code from your email instead.");
      // Also check if we have a saved email to show the OTP form
      const saved = sessionStorage.getItem("finch_otp_email");
      if (saved) {
        setEmail(saved);
        setSent(true);
      }
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

      sessionStorage.setItem("finch_otp_email", email);
      setSent(true);
      setLoading(false);
      setTimeout(() => digitRefs.current[0]?.focus(), 100);
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
        token: otpString,
        type: "email",
      });

      if (verifyError) {
        setError(verifyError.message);
        setVerifying(false);
        return;
      }

      sessionStorage.removeItem("finch_otp_email");
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
          { label: "Try It", href: "/try" },
        ]}
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Enter code
                  </label>
                  <div className="flex gap-2 justify-center">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { digitRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                        value={digit}
                        onChange={(e) => handleDigitChange(i, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(i, e)}
                        onFocus={(e) => e.target.select()}
                        maxLength={6}
                        className="w-11 h-13 bg-white border border-slate-300 text-slate-900 text-xl font-mono text-center focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={verifying || otpString.length < 6}
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
                    sessionStorage.removeItem("finch_otp_email");
                    setSent(false);
                    setEmail("");
                    setOtp(Array(6).fill(""));
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
