"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function GeneratingContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = params.id as string;
  const leadId = searchParams.get("leadId");

  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  const steps = [
    "Analyzing your answers...",
    "Looking up your company...",
    "Scoring 5 dimensions...",
    "Writing your report...",
  ];

  useEffect(() => {
    if (!leadId) {
      router.push(`/session/${sessionId}/email`);
      return;
    }

    // Animate steps while waiting
    const interval = setInterval(() => {
      setStep((s) => Math.min(s + 1, steps.length - 1));
    }, 1200);

    // Generate report
    const generate = async () => {
      try {
        const res = await fetch("/api/report/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, leadId }),
        });

        if (!res.ok) throw new Error("Report generation failed");
        const { slug } = await res.json();

        // Wait a moment for animation to complete
        setTimeout(() => {
          router.push(`/report/${slug}`);
        }, 800);
      } catch {
        setError("Failed to generate report. Please try again.");
        clearInterval(interval);
      }
    };

    generate();
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <div className="w-12 h-12 bg-[#FF6B35] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>

          <h2 className="text-base font-bold text-[#1A1A1A] mb-5">
            Building your report...
          </h2>

          <div className="space-y-1 text-left">
            {steps.map((label, i) => (
              <div
                key={i}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${
                  i < step
                    ? "bg-green-50"
                    : i === step
                      ? "bg-orange-50"
                      : "bg-gray-50"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-white ${
                    i < step
                      ? "bg-green-500"
                      : i === step
                        ? "bg-[#FF6B35]"
                        : "bg-gray-200"
                  }`}
                >
                  {i < step ? "✓" : ""}
                </div>
                <span
                  className={`text-xs font-medium ${
                    i < step
                      ? "text-green-600"
                      : i === step
                        ? "text-[#FF6B35] font-semibold"
                        : "text-gray-400"
                  }`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-4">
              <p className="text-xs text-red-500 mb-3">{error}</p>
              <button
                onClick={() => router.push(`/session/${sessionId}/email`)}
                className="text-xs text-[#FF6B35] font-semibold hover:underline"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GeneratingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <GeneratingContent />
    </Suspense>
  );
}
