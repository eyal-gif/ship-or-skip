interface ScoreBarProps {
  label: string;
  score: number;
  detail: string;
}

export default function ScoreBar({ label, score, detail }: ScoreBarProps) {
  const color =
    score >= 8 ? "bg-green-500" : score >= 6 ? "bg-[#FF6B35]" : "bg-red-500";
  const textColor =
    score >= 8 ? "text-green-500" : score >= 6 ? "text-[#FF6B35]" : "text-red-500";

  return (
    <div className="mb-3.5">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span className={`text-sm font-extrabold ${textColor}`}>{score}/10</span>
      </div>
      <div className="bg-gray-200 rounded h-1.5 overflow-hidden mb-1">
        <div
          className={`h-full rounded ${color} transition-all duration-500`}
          style={{ width: `${score * 10}%` }}
        />
      </div>
      <p className="text-[11px] text-gray-400 leading-tight">{detail}</p>
    </div>
  );
}
