"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import MicButton from "@/components/MicButton";

export default function Landing() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStart = async () => {
    const trimmed = idea.trim();
    if (trimmed.length < 10) {
      setError("Please describe your idea in at least 10 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaDescription: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      const { sessionId } = await res.json();
      router.push(`/session/${sessionId}/question/1`);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#111] text-white">
      {/* ── Top Bar ── */}
      <div className="px-6 py-4 max-w-[420px] mx-auto">
        <span className="text-xs font-bold tracking-[0.15em] text-white">
          PRODUCT BUILDER
        </span>
      </div>

      <div className="max-w-[420px] mx-auto">
        {/* ── Hero ── */}
        <div className="px-6 pt-6 pb-9 text-center">
          <h1 className="text-4xl font-extrabold leading-[1.15] mb-2.5">
            Before you build,
            <br />
            <span className="text-[#FF6B35]">check if it&apos;s worth it.</span>
          </h1>
          <p className="text-[17px] text-[#E0E0E0] leading-relaxed max-w-[340px] mx-auto">
            Describe your idea. Get scored across 5 dimensions with expert feedback in 3 minutes.
          </p>
        </div>

        {/* ── Idea Input Card ── */}
        <div className="mx-6 bg-[#222] border border-[#444] rounded-2xl p-5">
          <textarea
            value={idea}
            onChange={(e) => { setIdea(e.target.value); setError(""); }}
            placeholder="What product or feature are you considering building?"
            rows={3}
            maxLength={1000}
            className="w-full bg-transparent border-none text-base text-white
                       placeholder-[#AAA] resize-none outline-none leading-relaxed
                       min-h-[80px] font-[inherit]"
          />

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#444]">
            <span className="text-[13px] text-[#CCC]">Type or hold to speak</span>
            <MicButton
              onTranscript={(text) => { setIdea(text); setError(""); }}
              disabled={loading}
              variant="dark"
              size="small"
            />
          </div>
        </div>

        {/* ── Start Validation ── */}
        <div className="mx-6">
          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full mt-4 bg-[#FF6B35] hover:opacity-90 text-white font-bold text-base
                       py-4 rounded-xl transition-opacity duration-200
                       disabled:bg-[#333] disabled:text-[#666] disabled:cursor-default"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Starting...
              </span>
            ) : (
              "Start Validation"
            )}
          </button>

          {error && (
            <p className="text-red-400 text-xs text-center mt-2">{error}</p>
          )}

          <p className="text-[#CCC] text-[13px] text-center mt-3 pb-8">
            Free &middot; 3 minutes &middot; Shareable report
          </p>
        </div>

        {/* ── WHAT YOU'LL GET ── */}
        <p className="text-[11px] font-bold tracking-[0.15em] text-[#CCC] text-center mx-6 mt-8 mb-4">
          WHAT YOU&apos;LL GET
        </p>

        <div className="grid grid-cols-2 gap-2.5 px-6">
          {[
            { icon: "📊", title: "Readiness score", desc: "Rated across 5 dimensions" },
            { icon: "🎯", title: "What to focus on", desc: "Pinpoints the weakest area" },
            { icon: "🎙️", title: "Expert reactions", desc: "From 100+ interviews" },
            { icon: "🔗", title: "Shareable report", desc: "Send to team or investors" },
          ].map((card) => (
            <div
              key={card.title}
              className="bg-[#1E1E1E] border border-[#444] rounded-xl p-4"
            >
              <span className="text-xl">{card.icon}</span>
              <p className="text-[13px] font-semibold text-white mt-2">{card.title}</p>
              <p className="text-xs text-[#CCC] mt-1 leading-snug">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* ── SCORED ACROSS ── */}
        <p className="text-[11px] font-bold tracking-[0.15em] text-[#CCC] text-center mx-6 mt-7 mb-4">
          SCORED ACROSS
        </p>
        <div className="flex flex-wrap gap-2 px-6 justify-center">
          {[
            "Problem Severity",
            "Evidence Quality",
            "Strategic Fit",
            "Impact Potential",
            "Measurement Readiness",
          ].map((dim) => (
            <span
              key={dim}
              className="text-xs text-[#DDD] border border-[#666] rounded-full px-3.5 py-1.5"
            >
              {dim}
            </span>
          ))}
        </div>

        {/* ── SOURCE ── */}
        <div className="mx-6 mt-6 bg-[#1E1E1E] border border-[#444] rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl shrink-0">🎙️</span>
          <p className="text-[13px] text-[#CCC] leading-relaxed">
            Powered by the <span className="text-[#ccc] font-semibold">Product Builder Podcast</span>.
            Insights from 100+ interviews with product leaders at companies like Loom, Figma, and Linear.
          </p>
        </div>

        {/* ── Footer Trust Bar ── */}
        <div className="flex items-center justify-center gap-4 py-6 text-[13px] text-[#BBB]">
          <span>3 min</span>
          <span>&middot;</span>
          <span>100% free</span>
          <span>&middot;</span>
          <span>Shareable link</span>
        </div>
      </div>
    </div>
  );
}
