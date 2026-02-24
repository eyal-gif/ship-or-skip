"use client";

import { useState } from "react";
import ScoreBar from "@/components/ScoreBar";

/* ───────────────────────────────────────────────
   CTA copy tables — stored as constants
   ─────────────────────────────────────────────── */

const TIER_COPY = {
  low: {
    bg: "bg-[#FF6B35]",
    headline: "Stop wasting dev cycles.",
    sub: "We help founders figure out what to build \u2014 and what to kill \u2014 before committing resources.",
  },
  mid: {
    bg: "bg-[#1A1A1A]",
    headline: "Almost there. Close the gaps first.",
    sub: "We work with product leaders to sharpen bets before they cost you a quarter.",
  },
  high: {
    bg: "bg-[#1A1A1A]",
    headline: "Good call. Let\u2019s make sure it ships right.",
    sub: "We help founders go from validated idea to shipped feature \u2014 without adding headcount.",
  },
} as const;

const METRIC_NUDGE: Record<string, string> = {
  "Problem Severity":
    "We\u2019ll pressure-test the problem with you. If there\u2019s no pain, there\u2019s no point building.",
  "Evidence Quality":
    "We\u2019ll help you find the signal in your data \u2014 or design a fast experiment to get it.",
  "Strategic Fit":
    "We\u2019ll map features to your actual company goals so nothing gets built in a vacuum.",
  "Impact Potential":
    "We\u2019ll scope, sequence, and quantify impact so you ship what matters most.",
  "Measurement Readiness":
    "We\u2019ll set up your measurement framework before you write a single line of code.",
};

/* ─────────────────────────────────────────────── */

interface Reaction {
  name: string;
  role: string;
  company: string;
  reaction: string;
  stance: "supportive" | "cautious" | "critical";
}

interface ReportClientProps {
  featureName: string;
  companyName: string | null;
  companyDescription: string | null;
  companySize: string | null;
  companyIndustry: string | null;
  overallScore: number;
  verdict: string;
  summary: string;
  scores: Array<{ dimension: string; score: number; detail: string }>;
  reactions: Reaction[];
  slug: string;
  createdAt: string;
}

export default function ReportClient({
  featureName,
  companyName,
  companyDescription,
  companySize,
  companyIndustry,
  overallScore,
  verdict,
  summary,
  scores,
  reactions,
  slug,
  createdAt,
}: ReportClientProps) {
  const [copied, setCopied] = useState(false);
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const reportUrl = `${appUrl}/report/${slug}`;
  const date = new Date(createdAt);
  const dateStr = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  const verdictColor =
    verdict === "BUILD IT" ? "text-green-500 bg-green-500/10" :
    verdict === "SKIP IT" ? "text-red-500 bg-red-500/10" :
    "text-yellow-500 bg-yellow-500/10";

  const verdictEmoji =
    verdict === "BUILD IT" ? "\uD83D\uDE80" : verdict === "SKIP IT" ? "\uD83D\uDED1" : "\uD83D\uDD27";

  /* Tier + weakest metric */
  const tier: "low" | "mid" | "high" =
    overallScore < 5 ? "low" : overallScore < 7 ? "mid" : "high";
  const tierCopy = TIER_COPY[tier];

  const weakest = scores.length > 0
    ? scores.reduce((min, s) => (s.score < min.score ? s : min))
    : null;

  /* WhatsApp deep link */
  const waText = encodeURIComponent(
    `Hi, I just scored my feature "${featureName}" (${overallScore.toFixed(1)}/10) on Ship or Skip. I'd like to discuss it.`
  );
  const waLink = `https://wa.me/972544964988?text=${waText}`;
  const calLink = "https://cal.com/eyald";

  const copyLink = async () => {
    await navigator.clipboard.writeText(reportUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-dvh bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <span className="text-xs font-extrabold text-[#1A1A1A]">PRODUCT BUILDER</span>
          <span className="text-[10px] text-gray-400">Feature Report</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* ── 1. Report Card Header (UNCHANGED) ── */}
        <div className="bg-[#1A1A1A] rounded-t-2xl p-5 text-white">
          <div className="text-[9px] font-bold text-[#FF6B35] tracking-wider mb-1.5">
            PRODUCT BUILDER
          </div>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-lg font-extrabold leading-tight">{featureName}</h1>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {companyName || "Your company"} &middot; {dateStr}
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-[#FF6B35] leading-none">
                {overallScore.toFixed(1)}
              </div>
              <div className="text-[9px] text-gray-500">/10</div>
            </div>
          </div>
          <div className="mt-3">
            <span className={`inline-block text-xs font-bold px-3 py-1 rounded-md ${verdictColor}`}>
              {verdictEmoji} {verdict}
            </span>
          </div>
        </div>

        {/* Report Body */}
        <div className="bg-white rounded-b-2xl shadow-sm">
          {/* Summary */}
          <div className="px-5 pt-4 pb-2">
            <p className="text-sm text-gray-600 leading-relaxed">{summary}</p>
          </div>

          {/* Company Context */}
          {companyDescription && companyDescription !== "Unknown" && (
            <div className="mx-5 mb-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Company Context</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                <span className="font-semibold">{companyName}</span>
                {companyDescription && companyDescription !== "Unknown" && ` \u2014 ${companyDescription}`}
                {companySize && companySize !== "Unknown" && (
                  <span className="text-gray-400"> &middot; {companySize}</span>
                )}
                {companyIndustry && companyIndustry !== "Unknown" && (
                  <span className="text-gray-400"> &middot; {companyIndustry}</span>
                )}
              </p>
            </div>
          )}

          {/* ── 2. Scores (UNCHANGED) ── */}
          <div className="px-5 pt-2 pb-4">
            {scores.map((s) => (
              <ScoreBar
                key={s.dimension}
                label={s.dimension}
                score={s.score}
                detail={s.detail}
              />
            ))}
          </div>
        </div>

        {/* ── 3. Dynamic Score-Driven CTA (NEW) ── */}
        <div className={`${tierCopy.bg} rounded-2xl p-5 mt-3 text-white`}>
          <h3 className="text-[17px] font-bold leading-snug mb-1">
            {tierCopy.headline}
          </h3>
          <p className="text-[13px] text-white/80 leading-relaxed mb-4">
            {tierCopy.sub}
          </p>

          {/* Weakest metric callout */}
          {weakest && METRIC_NUDGE[weakest.dimension] && (
            <div className="border-l-[3px] border-[#FF6B35] bg-white/10 rounded-r-lg px-4 py-3 mb-4">
              <p className="text-xs font-bold text-white mb-0.5">
                {weakest.dimension} ({weakest.score}/10)
              </p>
              <p className="text-[12px] text-white/80 leading-relaxed">
                {METRIC_NUDGE[weakest.dimension]}
              </p>
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex gap-2">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-[#1A1A1A] text-white text-xs font-semibold
                         py-2.5 rounded-lg hover:bg-black transition-colors text-center"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp Us
            </a>
            <a
              href={calLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-transparent border border-white/40 text-white text-xs font-semibold
                         py-2.5 rounded-lg hover:bg-white/10 transition-colors text-center"
            >
              Book a Call
            </a>
          </div>
        </div>

        {/* ── 4. Expert Panel — Product Builder Podcast (UPDATED BRANDING) ── */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mt-3">
          {/* Podcast badge */}
          <div className="mb-3">
            <span className="inline-flex items-center gap-1.5 bg-[#FFF3ED] text-[#FF6B35] text-[10px] font-bold tracking-wider px-3 py-1.5 rounded-full uppercase">
              &#127897;&#65039; The Product Builder Podcast
            </span>
          </div>

          <h4 className="text-base font-bold text-[#1A1A1A] mb-1">
            What would product leaders say?
          </h4>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Matched from 100+ episodes of the Product Builder Podcast
          </p>

          {/* Expert reaction cards (internals UNCHANGED) */}
          <div className="space-y-3 mb-4">
            {reactions.length > 0 ? reactions.map((r, i) => {
              const stanceIcon =
                r.stance === "supportive" ? "\uD83D\uDC4D" :
                r.stance === "cautious" ? "\uD83E\uDD14" : "\u26A0\uFE0F";
              const stanceColor =
                r.stance === "supportive" ? "bg-green-50 border-green-100" :
                r.stance === "cautious" ? "bg-yellow-50 border-yellow-100" :
                "bg-red-50 border-red-100";
              return (
                <div key={i} className={`border rounded-xl p-4 ${stanceColor}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm flex-shrink-0">
                      {stanceIcon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-[#1A1A1A]">{r.name}</span>
                        <span className="text-[10px] text-gray-400">{r.role}, {r.company}</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed italic">
                        &ldquo;{r.reaction}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="border border-gray-100 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400">No expert reactions available for this report.</p>
              </div>
            )}
          </div>

          <p className="text-[10px] text-gray-400 italic leading-relaxed">
            AI-generated based on real Product Builder Podcast interviews. Not direct quotes.
          </p>
        </div>

        {/* ── 5. Share Block — Simplified (MOVED DOWN) ── */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mt-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A]">Share with your team</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Make the case &mdash; or show why not yet.
              </p>
            </div>
            <button
              onClick={copyLink}
              className="flex-shrink-0 bg-[#1A1A1A] text-white text-xs font-semibold
                         px-4 py-2 rounded-lg hover:bg-black transition-colors"
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>

        {/* ── 6. Bottom Mini CTA (NEW) ── */}
        <div className="bg-[#1A1A1A] rounded-2xl p-4 mt-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Need help prioritizing?</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Ship more without adding headcount.
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#FF6B35] text-white text-[11px] font-semibold
                           px-3 py-1.5 rounded-lg hover:bg-[#e55a28] transition-colors"
              >
                WhatsApp
              </a>
              <a
                href={calLink}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-transparent border border-white/30 text-white text-[11px] font-semibold
                           px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                Call
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
