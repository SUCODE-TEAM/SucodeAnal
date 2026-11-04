"use client";

import React from "react";

interface EvalBarProps {
  cp: number;
  mate: number | null;
  winProbWhite: number;
  orientation: "white" | "black";
}

export function formatEvalScore(cp: number, mate: number | null): string {
  if (mate !== null) {
    return `M${Math.abs(mate)}`;
  }
  const pawns = cp / 100;
  const sign = pawns > 0 ? "+" : "";
  return `${sign}${pawns.toFixed(1)}`;
}

export default function EvalBar({
  cp,
  mate,
  winProbWhite,
  orientation,
}: EvalBarProps) {
  const whitePercent = Math.max(3, Math.min(97, winProbWhite));
  const scoreText = formatEvalScore(cp, mate);
  const whiteAdvantage = mate !== null ? mate > 0 : cp >= 0;

  // If board is oriented for White, White is at the bottom.
  // If oriented for Black, White is at the top.
  const isWhiteBottom = orientation === "white";

  return (
    <div
      className="relative w-7 sm:w-8 h-full min-h-[320px] rounded-lg overflow-hidden border border-slate-700/80 bg-[#262421] flex flex-col select-none shadow-inner"
      title={`Evaluasi: ${scoreText} (Peluang Menang Putih: ${winProbWhite.toFixed(
        1
      )}%)`}
    >
      {isWhiteBottom ? (
        <>
          {/* Black top section */}
          <div
            className="w-full bg-[#262421] transition-all duration-300 ease-out"
            style={{ height: `${100 - whitePercent}%` }}
          />
          {/* White bottom section */}
          <div
            className="w-full bg-[#f1f5f9] transition-all duration-300 ease-out"
            style={{ height: `${whitePercent}%` }}
          />
        </>
      ) : (
        <>
          {/* White top section */}
          <div
            className="w-full bg-[#f1f5f9] transition-all duration-300 ease-out"
            style={{ height: `${whitePercent}%` }}
          />
          {/* Black bottom section */}
          <div
            className="w-full bg-[#262421] transition-all duration-300 ease-out"
            style={{ height: `${100 - whitePercent}%` }}
          />
        </>
      )}

      {/* Center 50% tick line */}
      <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-emerald-500/50 pointer-events-none" />

      {/* Score label positioned on the winning side */}
      <div
        className={`absolute left-0 right-0 text-center text-[10px] font-bold tracking-tighter px-0.5 pointer-events-none ${
          (whiteAdvantage && isWhiteBottom) ||
          (!whiteAdvantage && !isWhiteBottom)
            ? "bottom-1.5"
            : "top-1.5"
        } ${whiteAdvantage ? "text-slate-900" : "text-slate-200"}`}
      >
        {scoreText}
      </div>
    </div>
  );
}

