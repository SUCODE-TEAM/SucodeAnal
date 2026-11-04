"use client";

import React, { useState } from "react";
import {
  GameAnalysisResult,
  MoveClassification,
} from "@/types/chess";
import { CLASSIFICATION_META } from "@/lib/evaluation";
import { BookOpen, Share2, Check, Target } from "lucide-react";

interface SummaryCardProps {
  analysis: GameAnalysisResult;
  onStartRetryMistakes: () => void;
  mistakeAndBlunderCount: number;
}

const CLASSIFICATION_ORDER: MoveClassification[] = [
  "best",
  "excellent",
  "good",
  "book",
  "inaccuracy",
  "mistake",
  "blunder",
];

export default function SummaryCard({
  analysis,
  onStartRetryMistakes,
  mistakeAndBlunderCount,
}: SummaryCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopySummary = async () => {
    const text = [
      `♟️ ChessInsight — Ringkasan Analisa Pertandingan`,
      `Putih: ${analysis.metadata.white.username}${
        analysis.metadata.white.rating
          ? ` (${analysis.metadata.white.rating})`
          : ""
      } — Akurasi: ${analysis.whiteAccuracy}%`,
      `Hitam: ${analysis.metadata.black.username}${
        analysis.metadata.black.rating
          ? ` (${analysis.metadata.black.rating})`
          : ""
      } — Akurasi: ${analysis.blackAccuracy}%`,
      `Pembukaan: [${analysis.opening.eco}] ${analysis.opening.name}`,
      `Engine: ${analysis.engineName} (Depth ${analysis.depth})`,
      `---`,
      `Best: ${analysis.whiteCounts.best} vs ${analysis.blackCounts.best}`,
      `Inaccuracy: ${analysis.whiteCounts.inaccuracy} vs ${analysis.blackCounts.inaccuracy}`,
      `Mistake: ${analysis.whiteCounts.mistake} vs ${analysis.blackCounts.mistake}`,
      `Blunder: ${analysis.whiteCounts.blunder} vs ${analysis.blackCounts.blunder}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore clipboard error
    }
  };

  return (
    <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-4">
      {/* Header + Share */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            Game Review & Akurasi
          </h3>
          <p className="text-[11px] text-slate-400">
            {analysis.engineName} • Depth {analysis.depth}
          </p>
        </div>

        <button
          onClick={handleCopySummary}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          title="Salin ringkasan analisa untuk dibagikan"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Tersalin!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span>Bagikan</span>
            </>
          )}
        </button>
      </div>

      {/* Opening Badge (FR-07) */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs">
        <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
        <div className="truncate">
          <span className="font-mono font-bold text-amber-400 mr-1.5">
            {analysis.opening.eco}
          </span>
          <span className="text-slate-200 font-medium">
            {analysis.opening.name}
          </span>
        </div>
      </div>

      {/* Accuracy Comparison Cards (FR-05) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="w-3 h-3 rounded-sm bg-white border border-slate-400 inline-block" />
            <span className="text-xs font-semibold text-slate-200 truncate max-w-[110px]">
              {analysis.metadata.white.username}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight">
            {analysis.whiteAccuracy}%
          </div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">
            Akurasi Putih
          </div>
        </div>

        <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="w-3 h-3 rounded-sm bg-slate-800 border border-slate-500 inline-block" />
            <span className="text-xs font-semibold text-slate-200 truncate max-w-[110px]">
              {analysis.metadata.black.username}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight">
            {analysis.blackAccuracy}%
          </div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">
            Akurasi Hitam
          </div>
        </div>
      </div>

      {/* Classification Breakdown Table */}
      <div className="space-y-1.5 pt-1">
        {CLASSIFICATION_ORDER.map((cls) => {
          const meta = CLASSIFICATION_META[cls];
          const wCount = analysis.whiteCounts[cls];
          const bCount = analysis.blackCounts[cls];
          return (
            <div
              key={cls}
              className="grid grid-cols-[1fr_auto_1fr] items-center text-xs py-1 px-2 rounded-lg hover:bg-slate-800/50 transition"
              title={meta.description}
            >
              <span
                className="font-bold font-mono text-left"
                style={{ color: wCount > 0 ? meta.color : "#64748b" }}
              >
                {wCount}
              </span>

              <div className="flex items-center justify-center gap-1.5 px-3">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    backgroundColor: meta.bgColor,
                    color: meta.color,
                    border: `1px solid ${meta.borderColor}`,
                  }}
                >
                  {meta.symbol}
                </span>
                <span className="text-slate-300 font-medium w-20 text-center">
                  {meta.shortLabel}
                </span>
              </div>

              <span
                className="font-bold font-mono text-right"
                style={{ color: bCount > 0 ? meta.color : "#64748b" }}
              >
                {bCount}
              </span>
            </div>
          );
        })}
      </div>

      {/* Retry Mistake CTA (FR-08) */}
      {mistakeAndBlunderCount > 0 && (
        <button
          onClick={onStartRetryMistakes}
          className="w-full py-2.5 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold text-xs flex items-center justify-center gap-2 transition shadow-sm"
        >
          <Target className="w-4 h-4 text-amber-400" />
          <span>
            Latihan &ldquo;Retry Mistake&rdquo; ({mistakeAndBlunderCount} Kesalahan)
          </span>
        </button>
      )}
    </div>
  );
}

