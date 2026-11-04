"use client";

import React, { useState } from "react";
import {
  ChessComGameItem,
  GameAnalysisResult,
  GameMetadata,
} from "@/types/chess";
import { SAMPLE_GAMES } from "@/lib/sample-games";
import {
  Search,
  FileText,
  Sparkles,
  History,
  Play,
  Trash2,
  Clock,
  Trophy,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface GameSelectorProps {
  onSelectGame: (pgnOrFen: string, metadata?: Partial<GameMetadata>) => void;
  onLoadCachedAnalysis: (cached: GameAnalysisResult) => void;
   onDeleteCachedAnalysis: (id: string) => void;
  cachedAnalyses: GameAnalysisResult[];
  isAnalyzing: boolean;
}

export default function GameSelector({
  onSelectGame,
  onLoadCachedAnalysis,
  onDeleteCachedAnalysis,
  cachedAnalyses,
  isAnalyzing,
}: GameSelectorProps) {
  const [activeTab, setActiveTab] = useState<
    "chesscom" | "pgn" | "samples" | "history"
  >("chesscom");

  // Chess.com API state
  const [username, setUsername] = useState("");
  const [loadingGames, setLoadingGames] = useState(false);
  const [chessComError, setChessComError] = useState<string | null>(null);
  const [games, setGames] = useState<ChessComGameItem[]>([]);
  const [searchedUser, setSearchedUser] = useState("");

  // Manual PGN/FEN state
  const [manualInput, setManualInput] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);

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

  return (
    <div className="rounded-2xl bg-slate-900/95 border border-slate-800 shadow-xl overflow-hidden">
      {/* Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-800 bg-slate-950/60">
        <button
          type="button"
          onClick={() => setActiveTab("chesscom")}
          className={`flex items-center justify-center gap-2 py-3 px-3 text-xs font-semibold transition border-b-2 ${
            activeTab === "chesscom"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Impor Chess.com</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pgn")}
          className={`flex items-center justify-center gap-2 py-3 px-3 text-xs font-semibold transition border-b-2 ${
            activeTab === "pgn"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Input PGN / FEN</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("samples")}
          className={`flex items-center justify-center gap-2 py-3 px-3 text-xs font-semibold transition border-b-2 ${
            activeTab === "samples"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Partai Contoh</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center justify-center gap-2 py-3 px-3 text-xs font-semibold transition border-b-2 ${
            activeTab === "history"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Riwayat ({cachedAnalyses.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {/* TAB 1: CHESS.COM API IMPORT (FR-01) */}
        {activeTab === "chesscom" && (
          <div className="space-y-4">
            <form
              onSubmit={handleFetchChessCom}
              className="flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username Chess.com (contoh: hikaru, magnuscarlsen, gothamchess)..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
              <button
                type="submit"
                disabled={loadingGames || !username.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shrink-0"
              >
                {loadingGames ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengambil...</span>
                  </>
                ) : (
                  <span>Cari Pertandingan</span>
                )}
              </button>
            </form>

            {/* Quick preset usernames */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
              <span>Coba cepat:</span>
              {["hikaru", "magnuscarlsen", "firouzja2003", "danielnaroditsky"].map(
                (preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setUsername(preset)}
                    className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] transition"
                  >
                    @{preset}
                  </button>
                )
              )}
            </div>

            {chessComError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{chessComError}</span>
              </div>
            )}

            {games.length > 0 && (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
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
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800/80 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase w-14 text-center shrink-0 ${
                            won
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : lost
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : "bg-slate-700/40 text-slate-300 border border-slate-600/40"
                          }`}
                        >
                          {won ? "Menang" : lost ? "Kalah" : "Seri"}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs font-semibold text-white truncate">
                            <span className="inline-flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-xs bg-white inline-block border border-slate-400" />
                              {g.white.username} ({g.white.rating})
                            </span>
                            <span className="text-slate-500">vs</span>
                            <span className="inline-flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-xs bg-slate-700 inline-block border border-slate-400" />
                              {g.black.username} ({g.black.rating})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="uppercase font-mono text-emerald-400">
                              {g.time_class}
                            </span>
                            <span>•</span>
                            <span>{dateFormatted}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isAnalyzing}
                        onClick={() => handleAnalyzeChessComGame(g)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Analisa</span>
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
              placeholder={`Tempelkan teks PGN lengkap atau string posisi FEN di sini...\nContoh PGN: 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6\nContoh FEN: r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3`}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700/80 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
            {manualError && (
              <p className="text-xs text-red-400">{manualError}</p>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isAnalyzing}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Mulai Analisa PGN / FEN</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: SAMPLE INSTRUCTIVE GAMES */}
        {activeTab === "samples" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SAMPLE_GAMES.map((sample) => (
              <div
                key={sample.id}
                className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between gap-3 hover:border-emerald-500/40 transition"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-1">
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3 h-3" /> {sample.timeClass}
                    </span>
                    <span>Hasil: {sample.result}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">
                    {sample.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
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
                  className="w-full py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Analisa Partai Ini</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: INDEXEDDB CACHED ANALYSES HISTORY (Fase 3) */}
        {activeTab === "history" && (
          <div>
            {cachedAnalyses.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                Belum ada riwayat analisa yang tersimpan di browser (IndexedDB).
              </div>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {cachedAnalyses.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {item.metadata.white.username} ({item.whiteAccuracy}%) vs{" "}
                        {item.metadata.black.username} ({item.blackAccuracy}%)
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="text-amber-400 font-mono">
                          [{item.opening.eco}] {item.opening.name}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Depth {item.depth}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onLoadCachedAnalysis(item)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                      >
                        Buka
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCachedAnalysis(item.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                        title="Hapus dari cache"
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
    </div>
  );
}

