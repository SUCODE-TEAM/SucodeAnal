"use client";

import React from "react";
import { EvaluatedMove, PositionEvaluation } from "@/types/chess";
import { formatEvalScore } from "@/components/EvalBar";

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

  if (totalPlies === 0) {
    return (
      <div className="h-[110px] rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-xs text-slate-500">
        Grafik evaluasi akan tampil setelah pertandingan dianalisa
      </div>
    );
  }

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

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetPly = Math.round(relX * totalPlies);
    onSelectPly(targetPly);
  };

  return (
    <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3">
      <div className="flex items-center justify-between mb-1.5 text-xs">
        <span className="font-semibold text-slate-300">
          Grafik Evaluasi Pertandingan
        </span>
        <span className="text-slate-400 font-mono">
          {activePoint.move ? (
            <>
              Langkah {activePoint.move.moveNumber}
              {activePoint.move.color === "w" ? "." : "..."}{" "}
              <strong className="text-white">{activePoint.move.san}</strong> (
              {formatEvalScore(
                activePoint.move.evalAfter.cp,
                activePoint.move.evalAfter.mate
              )}
              )
            </>
          ) : (
            "Posisi Awal (0.0)"
          )}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-24 rounded-lg bg-[#1e1d1b] cursor-pointer overflow-hidden border border-slate-800/80"
        onClick={handleSvgClick}
      >
        {/* Background for Black (top half) and White (bottom half) */}
        <rect x={0} y={0} width={width} height={height} fill="#262421" />

        {/* Filled White advantage polygon */}
        <polygon points={areaCoords} fill="rgba(241, 245, 249, 0.85)" />

        {/* Midline (Equal 0.0 / 50% win prob) */}
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#10b981"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.6}
        />

        {/* Evaluation curve */}
        <polyline
          fill="none"
          stroke="#10b981"
          strokeWidth={2}
          points={lineCoords}
        />

        {/* Highlight Blunders and Mistakes as dots on the curve */}
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
              cx={getX(p.ply)}
              cy={getY(p.winWhite)}
              r={isBlunder ? 4 : 3}
              fill={isBlunder ? "#ef4444" : "#fb923c"}
              stroke="#0f172a"
              strokeWidth={1}
            />
          );
        })}

        {/* Current ply cursor line & marker */}
        <line
          x1={getX(currentPly)}
          y1={0}
          x2={getX(currentPly)}
          y2={height}
          stroke="#38bdf8"
          strokeWidth={1.5}
        />
        <circle
          cx={getX(activePoint.ply)}
          cy={getY(activePoint.winWhite)}
          r={4.5}
          fill="#38bdf8"
          stroke="#ffffff"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}

