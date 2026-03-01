"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type MicState = "idle" | "recording" | "processing" | "done";

interface MicButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  variant?: "light" | "dark";
  /** "default" = 72px circle with label, "small" = 44px inline circle, no label */
  size?: "default" | "small";
}

export default function MicButton({
  onTranscript,
  disabled,
  variant = "light",
  size = "default",
}: MicButtonProps) {
  const [state, setState] = useState<MicState>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        const duration = Date.now() - startTimeRef.current;
        if (duration < 1000) {
          setState("idle");
          return; // Too short
        }

        setState("processing");

        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");

        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: formData });
          if (!res.ok) throw new Error("Transcription failed");
          const { text } = await res.json();
          onTranscript(text);
          setState("done");
        } catch {
          setState("idle");
        }
      };

      mediaRecorder.start();
      setState("recording");

      // Auto-stop after 60s
      timeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 60000);
    } catch {
      setState("idle");
    }
  }, [disabled, onTranscript, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handlePointerDown = () => {
    if (state === "done") {
      // Re-record
      setState("idle");
    }
    startRecording();
  };

  const handlePointerUp = () => {
    if (state === "recording") {
      stopRecording();
    }
  };

  const isSmall = size === "small";
  const btnSize = isSmall ? "w-11 h-11" : "w-[72px] h-[72px]";
  const iconSize = isSmall ? 18 : 30;
  const spinnerSize = isSmall ? "w-4 h-4" : "w-6 h-6";

  const bgClass =
    state === "recording"
      ? isSmall
        ? "bg-green-500"
        : "bg-green-500 shadow-[0_0_0_8px_rgba(34,197,94,0.15),0_0_0_16px_rgba(34,197,94,0.05)]"
      : state === "done"
        ? "bg-green-500"
        : state === "processing"
          ? "bg-gray-400"
          : isSmall
            ? "bg-[#333] border-2 border-[#888] hover:bg-[#444] hover:border-[#aaa]"
            : "bg-[#FF6B35] shadow-[0_0_0_8px_rgba(255,107,53,0.1)] hover:shadow-[0_0_0_8px_rgba(255,107,53,0.2)]";

  return (
    <div className={`flex ${isSmall ? "items-center" : "flex-col items-center gap-2"}`}>
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        disabled={disabled || state === "processing"}
        className={`
          relative ${btnSize} rounded-full flex items-center justify-center
          transition-all duration-200 select-none touch-none
          ${bgClass}
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        {state === "processing" ? (
          <div className={`${spinnerSize} border-2 border-white border-t-transparent rounded-full animate-spin`} />
        ) : state === "done" ? (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isSmall && state === "idle" ? "white" : "none"} stroke={isSmall && state === "idle" ? "none" : "white"} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}

        {/* Pulsing ring for recording */}
        {state === "recording" && !isSmall && (
          <div className="absolute inset-0 rounded-full border-2 border-green-500 animate-ping opacity-30" />
        )}
      </button>

      {!isSmall && (
        <span className={`text-xs font-semibold ${
          state === "recording" ? "text-green-500" :
          state === "processing" ? (variant === "dark" ? "text-gray-500" : "text-gray-400") :
          state === "done" ? "text-green-500" :
          variant === "dark" ? "text-gray-400" : "text-gray-700"
        }`}>
          {state === "recording" ? "Recording..." :
           state === "processing" ? "Processing..." :
           state === "done" ? "Recorded. Tap to redo." :
           "Hold to speak"}
        </span>
      )}
    </div>
  );
}
