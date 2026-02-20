"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export default function AdminLoginPage() {
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
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">Finch Admin</h1>
          <p className="text-sm text-neutral-400 mt-1">Sign in to manage your upgrades</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {sent ? (
          <div className="space-y-5">
            <div className="bg-emerald-900/30 border border-emerald-800 text-emerald-300 px-4 py-4 text-sm">
              Check your email for a sign-in code.
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-neutral-300 mb-1">
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
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-neutral-500 tracking-widest text-center text-lg font-mono"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={verifying || otp.length < 6}
                className="w-full py-2.5 bg-white text-neutral-900 text-sm font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifying ? "Verifying..." : "Sign in"}
              </button>
            </form>

            <div className="text-center space-y-2">
              <p className="text-neutral-500 text-xs">
                Sent to <span className="text-neutral-300">{email}</span>
              </p>
              <p className="text-neutral-600 text-xs">
                Or click the magic link in your email from this same browser.
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setEmail("");
                  setOtp("");
                  setError(null);
                }}
                className="text-neutral-400 text-xs hover:text-white transition-colors"
              >
                Use a different email
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
                placeholder="you@company.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-white text-neutral-900 text-sm font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending code..." : "Continue with email"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
