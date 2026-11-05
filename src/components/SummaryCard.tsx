"use client";

import React, { useRef, useState } from "react";
import {
  GameAnalysisResult,
  MoveClassification,
} from "@/types/chess";
import { CLASSIFICATION_META } from "@/lib/evaluation";
import { ChessComBadge } from "@/components/ChessComBadge";
import { Share2, Check, Target } from "lucide-react";
import { gsap, useGSAP, MOTION_OK } from "@/lib/gsap";

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
  const rootRef = useRef<HTMLElement>(null);

  // Accuracy numbers count up and the breakdown bars grow from the center axis
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.utils.toArray<HTMLElement>(".sc-count").forEach((el) => {
          const target = Number(el.dataset.value) || 0;
          const counter = { v: 0 };
          gsap.to(counter, {
            v: target,
            duration: 1.6,
            ease: "expo.out",
            onUpdate: () => {
              el.textContent = counter.v.toFixed(1);
            },
          });
        });
        gsap.from(".sc-bar-w", {
          scaleX: 0,
          transformOrigin: "100% 50%",
          stagger: 0.04,
          duration: 0.9,
          delay: 0.2,
        });
        gsap.from(".sc-bar-b", {
          scaleX: 0,
          transformOrigin: "0% 50%",
          stagger: 0.04,
          duration: 0.9,
          delay: 0.2,
        });
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [analysis.id, analysis.analyzedAt] }
  );

  const handleCopySummary = async () => {
    const text = [
      `ChessInsight — Ringkasan Analisa Pertandingan`,
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

  const maxCount = Math.max(
    1,
    ...CLASSIFICATION_ORDER.map((c) =>
      Math.max(analysis.whiteCounts[c], analysis.blackCounts[c])
    )
  );

  return (
    <section ref={rootRef} className="pt-5 border-t border-ink-700 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-2xl leading-tight">Rapor partai</h3>
          <p className="mt-1 text-xs text-paper-300 truncate">
            <span className="font-mono text-signal">{analysis.opening.eco}</span>{" "}
            {analysis.opening.name}
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopySummary}
          className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-[3px] text-xs font-medium text-paper-200 ring-1 ring-ink-600 hover:ring-paper-300 hover:text-paper-100 transition"
          title="Salin ringkasan analisa untuk dibagikan"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-signal" />
              <span>Tersalin</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span>Salin ringkasan</span>
            </>
          )}
        </button>
      </div>

      {/* Accuracy per side */}
      <div className="grid grid-cols-2 divide-x divide-ink-700">
        {(
          [
            ["white", analysis.metadata.white.username, analysis.whiteAccuracy],
            ["black", analysis.metadata.black.username, analysis.blackAccuracy],
          ] as const
        ).map(([side, name, acc]) => (
          <div key={side} className={side === "white" ? "pr-4" : "pl-4 text-right"}>
            <div
              className={`flex items-center gap-2 text-xs text-paper-300 ${
                side === "black" ? "justify-end" : ""
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ring-1 ${
                  side === "white"
                    ? "bg-paper-100 ring-paper-300"
                    : "bg-ink-950 ring-paper-400"
                }`}
              />
              <span className="truncate max-w-[140px]">{name}</span>
            </div>
            <div className="mt-1 font-display text-5xl leading-none tabular tracking-tight">
              <span className="sc-count" data-value={acc}>
                {Number(acc).toFixed(1)}
              </span>
              <span className="text-2xl text-paper-400">%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Classification breakdown: white bars grow left, black bars grow right */}
      <div className="space-y-1">
        {CLASSIFICATION_ORDER.map((cls) => {
          const meta = CLASSIFICATION_META[cls];
          const wCount = analysis.whiteCounts[cls];
          const bCount = analysis.blackCounts[cls];
          return (
            <div
              key={cls}
              className="grid grid-cols-[1fr_104px_1fr] items-center gap-2 text-xs"
              title={meta.description}
            >
              <div className="flex items-center justify-end gap-2">
                <span
                  className="font-mono tabular"
                  style={{ color: wCount > 0 ? meta.color : "#4a443c" }}
                >
                  {wCount}
                </span>
                <div className="flex-1 flex justify-end h-1.5">
                  <div
                    className="sc-bar-w h-full rounded-l-full"
                    style={{
                      width: `${(wCount / maxCount) * 100}%`,
                      backgroundColor: meta.color,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5">
                <ChessComBadge classification={cls} size={16} />
                <span className="text-paper-200">{meta.shortLabel}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5">
                  <div
                    className="sc-bar-b h-full rounded-r-full"
                    style={{
                      width: `${(bCount / maxCount) * 100}%`,
                      backgroundColor: meta.color,
                    }}
                  />
                </div>
                <span
                  className="font-mono tabular"
                  style={{ color: bCount > 0 ? meta.color : "#4a443c" }}
                >
                  {bCount}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-paper-400">
        {analysis.engineName} · depth {analysis.depth}
      </p>

      {mistakeAndBlunderCount > 0 && (
        <button
          type="button"
          onClick={onStartRetryMistakes}
          className="group w-full h-11 px-4 rounded-[3px] bg-signal text-ink-950 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-signal-soft transition"
        >
          <Target className="w-4 h-4 transition-transform duration-500 ease-out-expo group-hover:rotate-90" />
          <span>Ulangi {mistakeAndBlunderCount} kesalahan</span>
        </button>
      )}
    </section>
  );
}
