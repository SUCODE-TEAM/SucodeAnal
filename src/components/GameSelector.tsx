"use client";

import React, { useRef, useState } from "react";
import {
  ChessComGameItem,
  GameAnalysisResult,
  GameMetadata,
} from "@/types/chess";
import { SAMPLE_GAMES } from "@/lib/sample-games";
import {
  Search,
  FileText,
  BookMarked,
  History,
  ArrowUpRight,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { gsap, useGSAP, Flip, MOTION_OK } from "@/lib/gsap";

interface GameSelectorProps {
  onSelectGame: (pgnOrFen: string, metadata?: Partial<GameMetadata>) => void;
  onLoadCachedAnalysis: (cached: GameAnalysisResult) => void;
  onDeleteCachedAnalysis: (id: string) => void;
  cachedAnalyses: GameAnalysisResult[];
  isAnalyzing: boolean;
}

type SelectorTab = "chesscom" | "pgn" | "samples" | "history";

export default function GameSelector({
  onSelectGame,
  onLoadCachedAnalysis,
  onDeleteCachedAnalysis,
  cachedAnalyses,
  isAnalyzing,
}: GameSelectorProps) {
  const [activeTab, setActiveTab] = useState<SelectorTab>("chesscom");

  // Chess.com API state
  const [username, setUsername] = useState("");
  const [loadingGames, setLoadingGames] = useState(false);
  const [chessComError, setChessComError] = useState<string | null>(null);
  const [games, setGames] = useState<ChessComGameItem[]>([]);
  const [searchedUser, setSearchedUser] = useState("");

  // Manual PGN/FEN state
  const [manualInput, setManualInput] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);

  const rootRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const flipStateRef = useRef<Flip.FlipState | null>(null);

  const switchTab = (next: SelectorTab) => {
    if (next === activeTab) return;
    if (
      indicatorRef.current &&
      window.matchMedia(MOTION_OK).matches
    ) {
      flipStateRef.current = Flip.getState(indicatorRef.current);
    }
    setActiveTab(next);
  };

  // Animate tab underline via GSAP Flip + stagger in active tab panel items
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        if (flipStateRef.current && indicatorRef.current) {
          Flip.from(flipStateRef.current, {
            targets: indicatorRef.current,
            duration: 0.45,
            ease: "expo.out",
          });
          flipStateRef.current = null;
        }
        gsap.from(".gs-panel-item", {
          y: 12,
          opacity: 0,
          stagger: 0.045,
          duration: 0.45,
          ease: "expo.out",
          clearProps: "transform,opacity",
        });
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [activeTab, games.length] }
  );

  const handleFetchChessCom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    if (!cleanUser) return;

    setLoadingGames(true);
    setChessComError(null);

    try {
      const res = await fetch(
        `/api/chesscom?username=${encodeURIComponent(cleanUser)}`
      );
      const data = await res.json();

      if (!res.ok) {
        setChessComError(
          data.error || "Gagal mengambil daftar pertandingan Chess.com."
        );
        setGames([]);
      } else {
        setGames(data.games || []);
        setSearchedUser(cleanUser.toLowerCase());
        if ((data.games || []).length === 0) {
          setChessComError(
            "Tidak ada riwayat pertandingan catur publik ditemukan untuk akun ini."
          );
        }
      }
    } catch {
      setChessComError("Gagal terhubung ke server. Periksa koneksi internet Anda.");
    } finally {
      setLoadingGames(false);
    }
  };

  const handleAnalyzeChessComGame = (game: ChessComGameItem) => {
    const dateStr = game.end_time
      ? new Date(game.end_time * 1000).toISOString().split("T")[0]
      : "Unknown";

    const resultStr =
      game.white.result === "win"
        ? "1-0"
        : game.black.result === "win"
        ? "0-1"
        : "1/2-1/2";

    onSelectGame(game.pgn, {
      id: `chesscom_${game.end_time}_${game.white.username}_${game.black.username}`,
      white: {
        username: game.white.username,
        rating: game.white.rating,
        result: game.white.result,
      },
      black: {
        username: game.black.username,
        rating: game.black.rating,
        result: game.black.result,
      },
      result: resultStr,
      date: dateStr,
      timeControl: game.time_control,
      timeClass: game.time_class,
      url: game.url,
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    const trimmed = manualInput.trim();
    if (!trimmed) {
      setManualError("Silakan tempelkan teks PGN atau posisi FEN terlebih dahulu.");
      return;
    }
    onSelectGame(trimmed);
  };

  const tabs: {
    id: SelectorTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "chesscom", label: "Arsip Chess.com", icon: Search },
    { id: "pgn", label: "Notasi PGN / FEN", icon: FileText },
    { id: "samples", label: "Partai Klasik", icon: BookMarked },
    {
      id: "history",
      label: `Tersimpan (${cachedAnalyses.length})`,
      icon: History,
    },
  ];

  return (
    <section
      ref={rootRef}
      className="border-y border-ink-700 bg-ink-900/70"
      aria-label="Sumber pertandingan"
    >
      {/* Editorial Tab Strip with GSAP Flip shared underline */}
      <div className="flex flex-wrap items-center border-b border-ink-700 px-3 sm:px-5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchTab(tab.id)}
              className={`relative flex items-center gap-2 py-3 px-3 sm:px-4 text-xs font-medium transition ${
                isActive
                  ? "text-paper-100"
                  : "text-paper-400 hover:text-paper-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {isActive && (
                <span
                  ref={indicatorRef}
                  data-flip-id="gs-tab-underline"
                  className="absolute inset-x-0 -bottom-px h-0.5 bg-signal"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Body */}
      <div className="p-4 sm:p-5">
        {/* TAB 1: CHESS.COM API IMPORT (FR-01) */}
        {activeTab === "chesscom" && (
          <div className="space-y-3">
            <form
              onSubmit={handleFetchChessCom}
              className="gs-panel-item flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-paper-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username publik Chess.com (mis. hikaru, magnuscarlsen, gothamchess)"
                  className="w-full h-10 pl-10 pr-4 rounded-[3px] bg-ink-950 ring-1 ring-ink-700 focus:ring-signal text-sm text-paper-100 placeholder-paper-400 focus:outline-none transition"
                />
              </div>
              <button
                type="submit"
                disabled={loadingGames || !username.trim()}
                className="h-10 px-5 rounded-[3px] bg-paper-100 hover:bg-signal text-ink-950 font-semibold text-xs tracking-wide flex items-center justify-center gap-2 disabled:opacity-40 transition shrink-0"
              >
                {loadingGames ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memuat arsip...</span>
                  </>
                ) : (
                  <span>Ambil Partai Terbaru</span>
                )}
              </button>
            </form>

            {/* Quick preset usernames */}
            <div className="gs-panel-item flex flex-wrap items-center gap-1.5 text-xs text-paper-400">
              <span>Contoh akun:</span>
              {["hikaru", "magnuscarlsen", "firouzja2003", "danielnaroditsky"].map(
                (preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setUsername(preset)}
                    className="px-2 py-0.5 rounded-[3px] bg-ink-800 hover:bg-ink-700 text-paper-200 font-mono text-[11px] transition"
                  >
                    @{preset}
                  </button>
                )
              )}
            </div>

            {chessComError && (
              <div className="gs-panel-item flex items-center gap-2 p-3 rounded-[3px] bg-ink-950 ring-1 ring-signal/50 text-paper-200 text-xs">
                <AlertCircle className="w-4 h-4 text-signal shrink-0" />
                <span>{chessComError}</span>
              </div>
            )}

            {games.length > 0 && (
              <div className="divide-y divide-ink-700 border-t border-ink-700 max-h-[260px] overflow-y-auto">
                {games.map((g, idx) => {
                  const isUserWhite =
                    g.white.username.toLowerCase() === searchedUser;
                  const userObj = isUserWhite ? g.white : g.black;
                  const oppObj = isUserWhite ? g.black : g.white;
                  const won = userObj.result === "win";
                  const lost = oppObj.result === "win";
                  const dateFormatted = g.end_time
                    ? new Date(g.end_time * 1000).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "";

                  return (
                    <div
                      key={`${g.end_time}_${idx}`}
                      className="gs-panel-item flex items-center justify-between gap-3 py-2.5 px-2 hover:bg-ink-850 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`font-mono text-[11px] font-semibold w-14 text-center py-0.5 rounded-[2px] shrink-0 ${
                            won
                              ? "bg-paper-100 text-ink-950"
                              : lost
                              ? "bg-ink-800 text-paper-300 ring-1 ring-ink-600"
                              : "bg-ink-800 text-paper-200"
                          }`}
                        >
                          {won ? "MENANG" : lost ? "KALAH" : "REMIS"}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs font-medium text-paper-100 truncate tabular">
                            <span>
                              {g.white.username}{" "}
                              <span className="text-paper-400 font-mono">
                                ({g.white.rating})
                              </span>
                            </span>
                            <span className="text-paper-400">vs</span>
                            <span>
                              {g.black.username}{" "}
                              <span className="text-paper-400 font-mono">
                                ({g.black.rating})
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-paper-400 mt-0.5 font-mono">
                            <span className="uppercase text-signal">
                              {g.time_class}
                            </span>
                            <span>·</span>
                            <span>{dateFormatted}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isAnalyzing}
                        onClick={() => handleAnalyzeChessComGame(g)}
                        className="h-8 px-3 rounded-[3px] bg-signal hover:bg-signal-soft disabled:opacity-40 text-ink-950 text-xs font-semibold flex items-center gap-1 shrink-0 transition"
                      >
                        <span>Bedah</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MANUAL PGN / FEN INPUT (FR-02) */}
        {activeTab === "pgn" && (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <textarea
              rows={4}
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={`Tempelkan notasi PGN lengkap atau string posisi FEN...\nContoh PGN: 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6\nContoh FEN: r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3`}
              className="gs-panel-item w-full p-3 rounded-[3px] bg-ink-950 ring-1 ring-ink-700 focus:ring-signal text-xs font-mono text-paper-100 placeholder-paper-400 focus:outline-none transition"
            />
            {manualError && (
              <p className="text-xs text-signal">{manualError}</p>
            )}
            <div className="gs-panel-item flex justify-end">
              <button
                type="submit"
                disabled={isAnalyzing}
                className="h-9 px-5 rounded-[3px] bg-signal hover:bg-signal-soft disabled:opacity-40 text-ink-950 font-semibold text-xs flex items-center gap-1.5 transition"
              >
                <span>Evaluasi PGN / FEN</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: SAMPLE INSTRUCTIVE GAMES */}
        {activeTab === "samples" && (
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-ink-700">
            {SAMPLE_GAMES.map((sample, idx) => (
              <div
                key={sample.id}
                className={`gs-panel-item flex flex-col justify-between gap-3 py-3 md:py-0 ${
                  idx === 0
                    ? "md:pr-4"
                    : idx === 1
                    ? "md:px-4"
                    : "md:pl-4"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-paper-400 mb-1">
                    <span className="uppercase text-signal">
                      {sample.timeClass}
                    </span>
                    <span>{sample.result}</span>
                  </div>
                  <h4 className="font-display text-base text-paper-100 leading-snug">
                    {sample.title}
                  </h4>
                  <p className="text-xs text-paper-300 mt-1 leading-relaxed">
                    {sample.subtitle}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() =>
                    onSelectGame(sample.pgn, {
                      id: sample.id,
                      white: {
                        username: sample.white,
                        rating: sample.whiteElo,
                      },
                      black: {
                        username: sample.black,
                        rating: sample.blackElo,
                      },
                      result: sample.result,
                      timeClass: sample.timeClass,
                    })
                  }
                  className="self-start inline-flex items-center gap-1 text-xs font-semibold text-paper-100 hover:text-signal transition"
                >
                  <span>Buka di meja analisa</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: INDEXEDDB CACHED ANALYSES HISTORY (Fase 3) */}
        {activeTab === "history" && (
          <div>
            {cachedAnalyses.length === 0 ? (
              <div className="gs-panel-item py-4 text-xs text-paper-400">
                Belum ada riwayat analisa yang tersimpan di penyimpanan lokal browser.
              </div>
            ) : (
              <div className="divide-y divide-ink-700 max-h-[240px] overflow-y-auto">
                {cachedAnalyses.map((item) => (
                  <div
                    key={item.id}
                    className="gs-panel-item flex items-center justify-between gap-3 py-2.5 px-2 hover:bg-ink-850 transition"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-paper-100 truncate tabular">
                        {item.metadata.white.username}{" "}
                        <span className="font-mono text-paper-300">
                          ({item.whiteAccuracy}%)
                        </span>{" "}
                        <span className="text-paper-400">vs</span>{" "}
                        {item.metadata.black.username}{" "}
                        <span className="font-mono text-paper-300">
                          ({item.blackAccuracy}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-paper-400 mt-0.5 font-mono">
                        <span className="text-signal">{item.opening.eco}</span>
                        <span className="truncate">{item.opening.name}</span>
                        <span>·</span>
                        <span>d{item.depth}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onLoadCachedAnalysis(item)}
                        className="h-7 px-3 rounded-[3px] bg-paper-100 hover:bg-signal text-ink-950 text-xs font-semibold transition"
                      >
                        Muat
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCachedAnalysis(item.id)}
                        className="p-1.5 rounded-[3px] text-paper-400 hover:text-signal transition"
                        title="Hapus dari penyimpanan lokal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
