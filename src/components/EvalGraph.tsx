"use client";

import React, { useRef } from "react";
import { EvaluatedMove, PositionEvaluation } from "@/types/chess";
import { formatEvalScore } from "@/components/EvalBar";
import { gsap, useGSAP, MOTION_OK } from "@/lib/gsap";

interface EvalGraphProps {
  initialEval: PositionEvaluation;
  moves: EvaluatedMove[];
  currentPly: number;
  onSelectPly: (ply: number) => void;
}

export default function EvalGraph({
  initialEval,
  moves,
  currentPly,
  onSelectPly,
}: EvalGraphProps) {
  const width = 600;
  const height = 110;
  const totalPlies = moves.length;

  const rootRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<SVGGElement>(null);
  const dotRef = useRef<SVGGElement>(null);

  const points: { ply: number; winWhite: number; move?: EvaluatedMove }[] = [
    { ply: 0, winWhite: initialEval.winProbWhite },
    ...moves.map((m) => ({
      ply: m.ply,
      winWhite: m.evalAfter.winProbWhite,
      move: m,
    })),
  ];

  const getX = (ply: number) =>
    totalPlies === 0 ? 0 : (ply / totalPlies) * width;
  // In SVG, y=0 is top (White 100%), y=height is bottom (White 0% / Black 100%)
  const getY = (winWhite: number) =>
    height - (Math.max(2, Math.min(98, winWhite)) / 100) * height;

  const lineCoords = points
    .map((p) => `${getX(p.ply).toFixed(1)},${getY(p.winWhite).toFixed(1)}`)
    .join(" ");

  const areaCoords = `0,${height} ${lineCoords} ${width},${height}`;
  const activePoint =
    points.find((p) => p.ply === currentPly) || points[0];

  const cursorX = getX(activePoint.ply);
  const cursorY = getY(activePoint.winWhite);

  // New game: the curve is drawn left-to-right, area and markers follow it
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const tl = gsap.timeline();
        tl.from(".eg-curve", { drawSVG: "0%", duration: 1.4, ease: "power2.inOut" })
          .from(
            ".eg-area",
            { clipPath: "inset(0 100% 0 0)", duration: 1.4, ease: "power2.inOut" },
            0
          )
          .from(
            ".eg-marker",
            {
              scale: 0,
              transformOrigin: "50% 50%",
              stagger: 0.05,
              duration: 0.5,
              ease: "back.out(3)",
            },
            0.6
          );
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [moves] }
  );

  // Ply change: cursor glides to the new move instead of jumping
  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.to(cursorRef.current, {
        x: cursorX,
        duration: reduce ? 0 : 0.45,
        overwrite: true,
      });
      gsap.to(dotRef.current, {
        x: cursorX,
        y: cursorY,
        duration: reduce ? 0 : 0.45,
        overwrite: true,
      });
    },
    { dependencies: [cursorX, cursorY] }
  );

  if (totalPlies === 0) {
    return (
      <div className="h-[110px] flex items-center justify-center text-xs text-paper-400 border-t border-ink-700">
        Grafik evaluasi akan tampil setelah pertandingan dianalisa
      </div>
    );
  }

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetPly = Math.round(relX * totalPlies);
    onSelectPly(targetPly);
  };

  return (
    <div ref={rootRef} className="pt-4 border-t border-ink-700">
      <div className="flex items-baseline justify-between mb-2 gap-4">
        <h3 className="font-display text-lg leading-none">Alur evaluasi</h3>
        <span className="font-mono text-xs text-paper-300 tabular truncate">
          {activePoint.move ? (
            <>
              {activePoint.move.moveNumber}
              {activePoint.move.color === "w" ? "." : "..."}{" "}
              <strong className="text-paper-100 font-semibold">
                {activePoint.move.san}
              </strong>{" "}
              {formatEvalScore(
                activePoint.move.evalAfter.cp,
                activePoint.move.evalAfter.mate
              )}
            </>
          ) : (
            "Posisi awal 0.0"
          )}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto rounded-[3px] cursor-crosshair"
        onClick={handleSvgClick}
        role="img"
        aria-label="Grafik evaluasi; klik untuk melompat ke langkah"
      >
        {/* Black side background */}
        <rect x={0} y={0} width={width} height={height} fill="#25221e" />

        {/* White advantage area */}
        <polygon className="eg-area" points={areaCoords} fill="#d6cebf" />

        {/* Equal line */}
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#958b7c"
          strokeWidth={1}
          strokeDasharray="2 4"
        />

        <polyline
          className="eg-curve"
          fill="none"
          stroke="#ff5b2e"
          strokeWidth={1.75}
          strokeLinejoin="round"
          points={lineCoords}
        />

        {/* Mistakes and blunders on the curve */}
        {points.map((p) => {
          if (!p.move) return null;
          if (
            p.move.classification !== "blunder" &&
            p.move.classification !== "mistake"
          ) {
            return null;
          }
          const isBlunder = p.move.classification === "blunder";
          return (
            <circle
              key={p.ply}
              className="eg-marker"
              cx={getX(p.ply)}
              cy={getY(p.winWhite)}
              r={isBlunder ? 4 : 3}
              fill={isBlunder ? "#ef4444" : "#fb923c"}
              stroke="#0f0e0c"
              strokeWidth={1.25}
            />
          );
        })}

        {/* Current ply cursor (positioned by GSAP) */}
        <g ref={cursorRef}>
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={height}
            stroke="#ece6d9"
            strokeWidth={1}
            opacity={0.8}
          />
        </g>
        <g ref={dotRef}>
          <circle r={4.5} fill="#ff5b2e" stroke="#0f0e0c" strokeWidth={2} />
        </g>
      </svg>
    </div>
  );
}
