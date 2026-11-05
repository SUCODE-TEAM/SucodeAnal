"use client";

import React, { useRef } from "react";
import { gsap, useGSAP, MOTION_OK } from "@/lib/gsap";

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
  const fillRef = useRef<HTMLDivElement>(null);
  const whitePercent = Math.max(3, Math.min(97, winProbWhite));
  // Only the first render sets height in markup; GSAP owns it afterwards
  const initialPercent = useRef(whitePercent).current;
  const scoreText = formatEvalScore(cp, mate);
  const whiteAdvantage = mate !== null ? mate > 0 : cp >= 0;

  // If board is oriented for White, White is at the bottom.
  // If oriented for Black, White is at the top.
  const isWhiteBottom = orientation === "white";

  // The white fill springs to the new evaluation instead of sliding linearly
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.to(fillRef.current, {
          height: `${whitePercent}%`,
          duration: 0.9,
          ease: "elastic.out(1, 0.75)",
          overwrite: true,
        });
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(fillRef.current, { height: `${whitePercent}%` });
      });
      return () => mm.revert();
    },
    { dependencies: [whitePercent] }
  );

  const labelAtBottom =
    (whiteAdvantage && isWhiteBottom) || (!whiteAdvantage && !isWhiteBottom);

  return (
    <div
      className="relative w-7 sm:w-9 h-full min-h-[320px] overflow-hidden rounded-[3px] bg-ink-800 ring-1 ring-ink-700 select-none"
      title={`Evaluasi: ${scoreText} (Peluang Menang Putih: ${winProbWhite.toFixed(
        1
      )}%)`}
    >
      <div
        ref={fillRef}
        className={`absolute inset-x-0 bg-paper-100 ${
          isWhiteBottom ? "bottom-0" : "top-0"
        }`}
        style={{ height: `${initialPercent}%` }}
      />

      {/* Equal position tick */}
      <div className="absolute top-1/2 inset-x-0 h-px bg-signal/70 pointer-events-none" />

      <div
        className={`absolute inset-x-0 text-center font-mono text-[10px] font-semibold tabular pointer-events-none ${
          labelAtBottom ? "bottom-1.5" : "top-1.5"
        } ${whiteAdvantage ? "text-ink-950" : "text-paper-100"}`}
      >
        {scoreText}
      </div>
    </div>
  );
}
