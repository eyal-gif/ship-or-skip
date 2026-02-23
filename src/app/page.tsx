"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Landing() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/session", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create session");
      const { sessionId } = await res.json();
      router.push(`/session/${sessionId}/question/1`);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-xs font-bold text-[#FF6B35] tracking-[0.15em] mb-6">
          PRODUCT BUILDER
        </div>

        <h1 className="text-3xl font-extrabold text-[#1A1A1A] leading-tight mb-3">
          Should you build
          <br />
          that feature?
        </h1>

        <p className="text-gray-500 text-sm leading-relaxed mb-10">
          Explain the feature. Get a score.
          <br />
          Share it with your team to decide.
        </p>

        <button
          onClick={handleStart}
          disabled={loading}
          className="bg-[#FF6B35] hover:bg-[#e55a28] text-white font-bold text-base
                     px-12 py-4 rounded-full transition-colors duration-200
                     disabled:opacity-60 disabled:cursor-not-allowed
                     shadow-lg shadow-orange-200"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Starting...
            </span>
          ) : (
            "Start"
          )}
        </button>

        <p className="text-gray-400 text-xs mt-5">3 minutes · Free</p>
      </div>
    </div>
  );
}
