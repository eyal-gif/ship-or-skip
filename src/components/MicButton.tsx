"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type MicState = "idle" | "recording" | "processing" | "done";

interface MicButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export default function MicButton({ onTranscript, disabled }: MicButtonProps) {
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

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        disabled={disabled || state === "processing"}
        className={`
          relative w-[72px] h-[72px] rounded-full flex items-center justify-center
          transition-all duration-200 select-none touch-none
          ${state === "recording"
            ? "bg-green-500 shadow-[0_0_0_8px_rgba(34,197,94,0.15),0_0_0_16px_rgba(34,197,94,0.05)]"
            : state === "done"
              ? "bg-green-500"
              : state === "processing"
                ? "bg-gray-400"
                : "bg-[#FF6B35] shadow-[0_0_0_8px_rgba(255,107,53,0.1)] hover:shadow-[0_0_0_8px_rgba(255,107,53,0.2)]"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        {state === "processing" ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : state === "done" ? (
          <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}

        {/* Pulsing ring for recording */}
        {state === "recording" && (
          <div className="absolute inset-0 rounded-full border-2 border-green-500 animate-ping opacity-30" />
        )}
      </button>

      <span className={`text-xs font-semibold ${
        state === "recording" ? "text-green-500" :
        state === "processing" ? "text-gray-400" :
        state === "done" ? "text-green-500" :
        "text-gray-700"
      }`}>
        {state === "recording" ? "Recording..." :
         state === "processing" ? "Processing..." :
         state === "done" ? "Recorded. Tap to redo." :
         "Hold to speak"}
      </span>
    </div>
  );
}
