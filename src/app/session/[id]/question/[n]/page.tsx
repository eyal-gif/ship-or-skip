"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import MicButton from "@/components/MicButton";
import ProgressDots from "@/components/ProgressDots";

const QUESTIONS = [
  "Describe your feature and the problem it solves or opportunity.",
  "What data supports this?",
  "What's the expected impact?",
  "Who is it for? Who's the persona?",
  "How will you measure success?",
];

export default function QuestionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const questionNum = parseInt(params.n as string, 10);
  const questionIndex = questionNum - 1;

  const [answer, setAnswer] = useState("");
  const [hasVoice, setHasVoice] = useState(false);
  const [saving, setSaving] = useState(false);

  const question = QUESTIONS[questionIndex];
  const isLast = questionNum === 5;

  const saveAnswer = useCallback(
    async (text: string | null) => {
      setSaving(true);
      try {
        await fetch(`/api/session/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionKey: `q${questionNum}`,
            answer: text,
          }),
        });
      } catch {
        // Non-blocking
      }
      setSaving(false);
    },
    [sessionId, questionNum]
  );

  const handleNext = async () => {
    const text = answer.trim() || null;
    await saveAnswer(text);

    if (isLast) {
      router.push(`/session/${sessionId}/email`);
    } else {
      router.push(`/session/${sessionId}/question/${questionNum + 1}`);
    }
  };

  const handleSkip = async () => {
    // Q1 (feature description) is required — can't score without it
    if (questionNum === 1) return;

    await saveAnswer(null);

    if (isLast) {
      router.push(`/session/${sessionId}/email`);
    } else {
      router.push(`/session/${sessionId}/question/${questionNum + 1}`);
    }
  };

  const handleTranscript = (text: string) => {
    setAnswer(text);
    setHasVoice(true);
  };

  if (!question) {
    router.push("/");
    return null;
  }

  const hasAnswer = answer.trim().length > 0 || hasVoice;

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 sticky top-0 z-50">
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <span className="text-xs font-extrabold text-[#1A1A1A]">PRODUCT BUILDER</span>
          <span className="text-[10px] text-gray-400">Q{questionNum} of 5</span>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center pt-6 px-4 pb-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <ProgressDots current={questionNum} total={5} />

            <h2 className="text-lg font-bold text-[#1A1A1A] leading-snug mb-5">
              {question}
            </h2>

            {/* Mic Button */}
            <div className="py-2">
              <MicButton onTranscript={handleTranscript} disabled={saving} />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[11px] text-gray-400 font-medium">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Text input */}
            <textarea
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                setHasVoice(false);
              }}
              placeholder="Type your answer here..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                         text-gray-700 resize-none h-16 bg-gray-50 outline-none
                         focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35]/20
                         transition-colors"
            />

            {/* Actions */}
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
              {questionNum === 1 ? (
                <span className="text-[11px] text-gray-300">Required</span>
              ) : (
                <button
                  onClick={handleSkip}
                  disabled={saving}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors
                             disabled:opacity-50"
                >
                  Skip
                </button>
              )}

              <button
                onClick={handleNext}
                disabled={saving || !hasAnswer}
                className="bg-[#1A1A1A] text-white text-sm font-semibold px-5 py-2
                           rounded-lg hover:bg-black transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed
                           flex items-center gap-1"
              >
                {saving ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {isLast ? "Done" : "Next"}
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
