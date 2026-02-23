"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

export default function EmailGate() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Check if user just came back from Google sign-in
  const checkSession = useCallback(async () => {
    try {
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      if (session?.user?.email) {
        await createLeadAndReport(session.user.email, session.user.name, session.user.image);
        return true;
      }
    } catch {
      // Not signed in yet
    }
    return false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    // Check on mount if already authenticated (e.g. came back from OAuth redirect)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("callback") === "true") {
      setLoading(true);
      checkSession().then((ok) => {
        if (!ok) setLoading(false);
      });
    }
  }, [checkSession]);

  const handleGoogleSignIn = () => {
    // NextAuth v5 requires POST with CSRF token for sign-in.
    // The simplest approach: redirect to the built-in sign-in page with provider hint
    const callbackUrl = `/session/${sessionId}/email?callback=true`;
    window.location.href = `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };

  const createLeadAndReport = async (email: string, name?: string | null, image?: string | null) => {
    setLoading(true);
    try {
      const leadRes = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          email,
          name: name || null,
          image: image || null,
        }),
      });

      if (!leadRes.ok) throw new Error("Failed to create lead");
      const { leadId } = await leadRes.json();
      router.push(`/session/${sessionId}/generating?leadId=${leadId}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  // Fallback email form
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [showFallback, setShowFallback] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await createLeadAndReport(email.trim(), name.trim() || null);
  };

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 sticky top-0 z-50">
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <span className="text-xs font-extrabold text-[#1A1A1A]">PRODUCT BUILDER</span>
          <span className="text-[10px] text-gray-400">Almost done</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-1.5">
              Your report is ready.
            </h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Sign in so we can add context about your company and save your report.
            </p>

            {/* Google Sign-In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200
                         hover:border-gray-300 rounded-xl py-3.5 px-4 transition-colors
                         disabled:opacity-60 disabled:cursor-not-allowed mb-4"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="text-sm font-semibold text-gray-700">
                {loading ? "Signing in..." : "Continue with Google"}
              </span>
            </button>

            <p className="text-[11px] text-gray-400 text-center mb-4 leading-relaxed">
              We&apos;ll look up your company to make the report more useful.
              <br />
              Your email is only used for this report.
            </p>

            {/* Fallback email form */}
            {!showFallback ? (
              <button
                onClick={() => setShowFallback(true)}
                className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Use email instead
              </button>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-2.5 pt-2 border-t border-gray-100">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Work email"
                  required
                  className="w-full border-2 border-[#FF6B35] rounded-xl px-3.5 py-3
                             text-sm text-[#1A1A1A] outline-none"
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name (optional)"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-3
                             text-sm text-[#1A1A1A] outline-none focus:border-gray-300"
                />
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full bg-[#FF6B35] hover:bg-[#e55a28] text-white font-bold
                             text-sm py-3.5 rounded-xl transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Loading..." : "Show My Report"}
                </button>
              </form>
            )}

            {error && (
              <p className="text-xs text-red-500 text-center mt-3">{error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
