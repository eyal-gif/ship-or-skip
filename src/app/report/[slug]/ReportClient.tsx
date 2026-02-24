"use client";

import { useState } from "react";
import ScoreBar from "@/components/ScoreBar";

interface ReportClientProps {
  featureName: string;
  companyName: string | null;
  overallScore: number;
  verdict: string;
  summary: string;
  scores: Array<{ dimension: string; score: number; detail: string }>;
  slug: string;
  createdAt: string;
}

export default function ReportClient({
  featureName,
  companyName,
  overallScore,
  verdict,
  summary,
  scores,
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
    verdict === "BUILD IT" ? "🚀" : verdict === "SKIP IT" ? "🛑" : "🔧";

  const copyLink = async () => {
    await navigator.clipboard.writeText(reportUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(reportUrl)}`,
      "_blank",
      "width=600,height=400"
    );
  };

  const shareX = () => {
    const text = `${featureName} — ${overallScore}/10 — ${verdict}\nFeature validation via Product Builder`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(reportUrl)}`,
      "_blank",
      "width=600,height=400"
    );
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
        {/* Report Card Header */}
        <div className="bg-[#1A1A1A] rounded-t-2xl p-5 text-white">
          <div className="text-[9px] font-bold text-[#FF6B35] tracking-wider mb-1.5">
            PRODUCT BUILDER
          </div>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-lg font-extrabold leading-tight">{featureName}</h1>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {companyName || "Your company"} · {dateStr}
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

          {/* Scores */}
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

        {/* Share Block — Orange, prominent, right after scores */}
        <div className="bg-[#FF6B35] rounded-2xl p-5 mt-3 text-white">
          <h3 className="text-base font-bold mb-1">
            Send this to your team.
          </h3>
          <p className="text-sm text-white/80 mb-4 leading-relaxed">
            Use it to make the case — or show why it&apos;s not worth it yet.
          </p>
          <div className="flex gap-2">
            <button
              onClick={copyLink}
              className="flex-1 bg-white text-[#1A1A1A] text-xs font-semibold
                         py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <button
              onClick={shareLinkedIn}
              className="flex-1 bg-white text-[#1A1A1A] text-xs font-semibold
                         py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              LinkedIn
            </button>
            <button
              onClick={shareX}
              className="flex-1 bg-white text-[#1A1A1A] text-xs font-semibold
                         py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              X
            </button>
          </div>
        </div>

        {/* Expert Panel — Product Builder Podcast */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mt-3">
          {/* Podcast badge */}
          <div className="mb-3">
            <span className="inline-flex items-center gap-1.5 bg-[#FFF3ED] text-[#FF6B35] text-[10px] font-bold tracking-wider px-3 py-1.5 rounded-full uppercase">
              🎙️ The Product Builder Podcast
            </span>
          </div>

          <h4 className="text-base font-bold text-[#1A1A1A] mb-1">
            What would product leaders say?
          </h4>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Matched from 100+ episodes of the Product Builder Podcast
          </p>

          {/* Expert cards placeholder — populated if data exists */}
          <div className="space-y-3 mb-4">
            <div className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">
                  🎧
                </div>
                <div>
                  <p className="text-sm text-gray-700 leading-relaxed italic">
                    &ldquo;Coming soon — expert reactions from real podcast episodes will appear here.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 italic leading-relaxed">
            AI-generated based on real Product Builder Podcast interviews. Not direct quotes.
          </p>
        </div>

        {/* CTA — Black block */}
        <div className="bg-[#1A1A1A] rounded-2xl p-6 mt-3 text-center">
          <div className="text-[9px] font-bold text-[#FF6B35] tracking-[0.15em] mb-3">
            PRODUCT BUILDER
          </div>
          <h3 className="text-[17px] font-bold text-white mb-3 leading-snug">
            Ship more with the team you have.
          </h3>
          <p className="text-[13px] text-gray-400 leading-relaxed mb-5 max-w-xs mx-auto">
            We help founders and product leaders prioritize what matters, cut what doesn&apos;t, and deliver faster — without adding headcount.
          </p>
          <a
            href="https://getproductbuilder.com"
            className="inline-block bg-[#FF6B35] hover:bg-[#e55a28] text-white
                       font-bold text-sm px-8 py-3 rounded-lg transition-colors"
          >
            Talk to Us
          </a>
        </div>
      </div>
    </div>
  );
}
