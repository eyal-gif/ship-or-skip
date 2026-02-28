"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import MicButton from "@/components/MicButton";

export default function Landing() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!idea.trim() || idea.trim().length < 10) return;
    setLoading(true);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaDescription: idea.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      const { sessionId } = await res.json();
      router.push(`/session/${sessionId}/question/1`);
    } catch {
      setLoading(false);
    }
  };

  const charCount = idea.length;
  const canStart = idea.trim().length >= 10;

  return (
    <div className="min-h-dvh bg-[#111] text-white">
      {/* ── Top Bar ── */}
      <div className="px-4 py-3 flex items-center justify-between max-w-sm mx-auto">
        <span className="text-xs font-extrabold tracking-[0.15em] text-white">
          PRODUCT BUILDER
        </span>
        <span className="text-[10px] font-bold tracking-wider text-[#FF6B35] border border-[#FF6B35]/30 px-2.5 py-1 rounded-full">
          SHIP OR SKIP
        </span>
      </div>

      <div className="px-4 pb-16 max-w-sm mx-auto">
        {/* ── Hero ── */}
        <div className="pt-10 pb-8 text-center">
          <h1 className="text-[28px] font-extrabold leading-tight mb-3">
            Before you build,
            <br />
            <span className="text-[#FF6B35]">check if it&apos;s worth it.</span>
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            Your product thinking partner &mdash;
            <br />
            5 questions that surface what matters
            <br />
            and expose what doesn&apos;t.
          </p>
        </div>

        {/* ── Idea Input Card ── */}
        <div className="bg-[#333] rounded-2xl p-4 border border-[#2A2A2A]">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="What product or feature are you considering building?"
            maxLength={1000}
            className="w-full bg-[#222] border border-[#444] rounded-xl px-3.5 py-3
                       text-sm text-white placeholder-[#666] resize-none h-24
                       outline-none focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35]/20
                       transition-colors"
          />

          {charCount > 800 && (
            <p className="text-[10px] text-gray-500 text-right mt-1">
              {charCount}/1000
            </p>
          )}

          <div className="flex items-center gap-3 my-3">
            <div className="flex-1 h-px bg-[#444]" />
            <span className="text-[11px] text-gray-500 font-medium">or</span>
            <div className="flex-1 h-px bg-[#444]" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-[#666]">Speak your idea</span>
            <MicButton
              onTranscript={(text) => setIdea(text)}
              disabled={loading}
              variant="dark"
            />
          </div>
        </div>

        {/* ── Start Validation ── */}
        <button
          onClick={handleStart}
          disabled={loading || !canStart}
          className="w-full mt-4 bg-[#FF6B35] hover:bg-[#e55a28] text-white font-bold text-base
                     py-4 rounded-full transition-colors duration-200
                     disabled:opacity-40 disabled:cursor-not-allowed
                     shadow-lg shadow-orange-900/20"
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

        <p className="text-gray-500 text-[11.5px] text-center mt-3">
          Free &middot; 3 minutes &middot; Shareable report
        </p>

        {/* ── WHAT YOU'LL GET ── */}
        <div className="mt-12">
          <p className="text-[10px] font-bold tracking-[0.15em] text-gray-500 mb-3">
            WHAT YOU&apos;LL GET
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { icon: "\uD83D\uDCCA", title: "Readiness score", desc: "Rated across 5 dimensions" },
              { icon: "\uD83C\uDFAF", title: "What to focus on", desc: "Pinpoints the weakest area" },
              { icon: "\uD83C\uDF99\uFE0F", title: "Expert reactions", desc: "From 100+ interviews" },
              { icon: "\uD83D\uDD17", title: "Shareable report", desc: "Send to team or investors" },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-[#222] border border-[#2A2A2A] rounded-xl p-3.5"
              >
                <span className="text-lg">{card.icon}</span>
                <p className="text-xs font-bold text-white mt-2">{card.title}</p>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── SCORED ACROSS ── */}
        <div className="mt-10">
          <p className="text-[10px] font-bold tracking-[0.15em] text-gray-500 mb-3">
            SCORED ACROSS
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "Problem Severity",
              "Evidence Quality",
              "Strategic Fit",
              "Impact Potential",
              "Measurement Readiness",
            ].map((dim) => (
              <span
                key={dim}
                className="text-[11px] text-gray-400 border border-[#333] rounded-full px-3 py-1.5"
              >
                {dim}
              </span>
            ))}
          </div>
        </div>

        {/* ── SOURCE ── */}
        <div className="mt-10">
          <p className="text-[10px] font-bold tracking-[0.15em] text-gray-500 mb-3">
            SOURCE
          </p>
          <div className="bg-[#222] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-lg">&#127897;&#65039;</span>
              <p className="text-xs text-gray-400 leading-relaxed">
                Powered by the <span className="text-white font-semibold">Product Builder Podcast</span>.
                Insights from 100+ interviews with product leaders at companies like Loom, Figma, and Linear.
              </p>
            </div>
          </div>
        </div>

        {/* ── Footer Trust Bar ── */}
        <div className="mt-10 flex items-center justify-center gap-4 text-[11px] text-gray-500">
          <span>3 min</span>
          <span className="w-1 h-1 rounded-full bg-gray-600" />
          <span>100% free</span>
          <span className="w-1 h-1 rounded-full bg-gray-600" />
          <span>Shareable link</span>
        </div>
      </div>
    </div>
  );
}
