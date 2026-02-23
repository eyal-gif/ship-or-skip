"use client";

interface ProgressDotsProps {
  current: number;
  total: number;
}

export default function ProgressDots({ current, total }: ProgressDotsProps) {
  return (
    <div className="flex items-center justify-between mb-5">
      <span className="text-xs font-bold text-gray-400 tracking-wide">
        {current} OF {total}
      </span>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i + 1 <= current ? "bg-[#FF6B35]" : "bg-gray-200"
            } ${i + 1 === current ? "w-5" : "w-2"}`}
          />
        ))}
      </div>
    </div>
  );
}
