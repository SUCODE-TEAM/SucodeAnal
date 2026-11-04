"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Chess, Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import {
  EvaluatedMove,
  GameAnalysisResult,
  GameMetadata,
  PositionEvaluation,
} from "@/types/chess";
import {
  analyzeGame,
  checkNativeEngineStatus,
  evaluateSinglePosition,
} from "@/lib/stockfish-client";
import { CLASSIFICATION_META } from "@/lib/evaluation";
import {
  deleteCachedAnalysis,
  getAllCachedAnalyses,
} from "@/lib/indexeddb";
import { SAMPLE_GAMES } from "@/lib/sample-games";
import EvalBar, { formatEvalScore } from "@/components/EvalBar";
import EvalGraph from "@/components/EvalGraph";
import SummaryCard from "@/components/SummaryCard";
import GameSelector from "@/components/GameSelector";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  FlipVertical2,
  Cpu,
  Settings2,
  Target,
  Eye,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  BookOpen,
} from "lucide-react";

export default function HomePage() {
  // Engine Settings (NFR 8.2: Depth 12 Cepat, 16 Standar, 20 Mendalam, MultiPV 1-3)
  const [depth, setDepth] = useState<number>(14);
  const [multiPV, setMultiPV] = useState<number>(2);
  const [nativeAvailable, setNativeAvailable] = useState<boolean>(false);
  const [engineMode, setEngineMode] = useState<"native-exe" | "browser-wasm">(
    "browser-wasm"
  );
  const [engineLabel, setEngineLabel] = useState<string>(
    "Stockfish WASM (Web Worker)"
  );

  // Analysis State
  const [analysis, setAnalysis] = useState<GameAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progressPly, setProgressPly] = useState<number>(0);
  const [progressTotal, setProgressTotal] = useState<number>(1);
  const [progressText, setProgressText] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Board & Navigation State
  const [currentPly, setCurrentPly] = useState<number>(0);
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">(
    "white"
  );
  // Custom free-exploration FEN when user drags pieces manually on the board
  const [customFen, setCustomFen] = useState<string | null>(null);
  const [customEval, setCustomEval] = useState<PositionEvaluation | null>(null);
  const [isEvaluatingCustom, setIsEvaluatingCustom] = useState<boolean>(false);

  // FR-08: "Retry Mistake" Interactive Training State
  const [retryMode, setRetryMode] = useState<boolean>(false);
  const [retrySolved, setRetrySolved] = useState<boolean>(false);
  const [retryFeedback, setRetryFeedback] = useState<{
    type: "info" | "success" | "error";
    message: string;
  } | null>(null);
  const [showRetryHint, setShowRetryHint] = useState<boolean>(false);

  // IndexedDB History
  const [cachedAnalyses, setCachedAnalyses] = useState<GameAnalysisResult[]>(
    []
  );

  // Initialize engine status + IndexedDB cache + load default sample game
  useEffect(() => {
    let mounted = true;
    async function init() {
      const [status, cached] = await Promise.all([
        checkNativeEngineStatus(),
        getAllCachedAnalyses(),
      ]);
      if (!mounted) return;

      setCachedAnalyses(cached);
      setNativeAvailable(status.available);
      const initialMode = status.available ? "native-exe" : "browser-wasm";
      setEngineMode(initialMode);
      setEngineLabel(status.engineName);

      // Load most recent cached analysis or analyze the first sample game automatically
      if (cached.length > 0) {
        setAnalysis(cached[0]);
        setCurrentPly(0);
      } else {
        const defaultSample = SAMPLE_GAMES[0];
        runGameAnalysis(
          defaultSample.pgn,
          {
            id: defaultSample.id,
            white: {
              username: defaultSample.white,
              rating: defaultSample.whiteElo,
            },
            black: {
              username: defaultSample.black,
              rating: defaultSample.blackElo,
            },
            result: defaultSample.result,
            timeClass: defaultSample.timeClass,
          },
          12,
          2,
          initialMode
        );
      }
    }
    init();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshCacheList = async () => {
    const list = await getAllCachedAnalyses();
    setCachedAnalyses(list);
  };

  const runGameAnalysis = async (
    pgnOrFen: string,
    metadata?: Partial<GameMetadata>,
    overrideDepth?: number,
    overrideMultiPV?: number,
    overrideMode?: "native-exe" | "browser-wasm",
    forceReanalyze = false
  ) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setCustomFen(null);
    setCustomEval(null);
    setRetryMode(false);

    try {
      const targetDepth = overrideDepth ?? depth;
      const targetMultiPV = overrideMultiPV ?? multiPV;
      const targetMode = overrideMode ?? engineMode;

      const res = await analyzeGame({
        pgnOrFen,
        metadata,
        depth: targetDepth,
        multiPV: targetMultiPV,
        engineMode: targetMode,
        forceReanalyze,
        onProgress: (cur, tot, text) => {
          setProgressPly(cur);
          setProgressTotal(Math.max(1, tot));
          setProgressText(text);
        },
      });

      setAnalysis(res);
      setCurrentPly(0);
      await refreshCacheList();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Format PGN atau FEN tidak valid. Periksa kembali input Anda.";
      setErrorMessage(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Current active move (`ply` is 1-indexed; `currentPly === 0` is initial position)
  const currentMove: EvaluatedMove | null = useMemo(() => {
    if (!analysis || currentPly <= 0 || currentPly > analysis.moves.length) {
      return null;
    }
    return analysis.moves[currentPly - 1];
  }, [analysis, currentPly]);

  // Displayed board FEN:
  // - If in Retry Mistake mode (and not yet solved), show `currentMove.fenBefore` so user can play the correction!
  // - If user explored a custom move on the board, show `customFen`.
  // - Otherwise show `currentMove.fenAfter` (or `analysis.initialFen` at ply 0).
  const displayedFen: string = useMemo(() => {
    if (customFen) return customFen;
    if (!analysis) {
      return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    }
    if (retryMode && currentMove && !retrySolved) {
      return currentMove.fenBefore;
    }
    if (currentMove) {
      return currentMove.fenAfter;
    }
    return analysis.initialFen;
  }, [analysis, currentMove, customFen, retryMode, retrySolved]);

  // Active PositionEvaluation for the EvalBar and Engine Lines panel
  const activeEval: PositionEvaluation = useMemo(() => {
    if (customEval) return customEval;
    if (!analysis) {
      return {
        fen: displayedFen,
        depth: 0,
        cp: 0,
        mate: null,
        bestMoveUci: "",
        winProbWhite: 50,
        lines: [],
      };
    }
    if (retryMode && currentMove && !retrySolved) {
      return currentMove.evalBefore;
    }
    if (currentMove) {
      return currentMove.evalAfter;
    }
    return analysis.initialEval;
  }, [analysis, currentMove, customEval, displayedFen, retryMode, retrySolved]);

  // Navigate to a specific ply
  const goToPly = useCallback(
    (targetPly: number) => {
      if (!analysis) return;
      const clamped = Math.max(0, Math.min(analysis.moves.length, targetPly));
      setCurrentPly(clamped);
      setCustomFen(null);
      setCustomEval(null);
      setRetryMode(false);
      setRetrySolved(false);
      setRetryFeedback(null);
      setShowRetryHint(false);
    },
    [analysis]
  );

  // Keyboard navigation (FR-04: ArrowLeft, ArrowRight, ArrowUp, ArrowDown)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (!analysis) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPly(currentPly - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToPly(currentPly + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        goToPly(0);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        goToPly(analysis.moves.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [analysis, currentPly, goToPly]);

  // All mistakes & blunders in the analyzed game for FR-08 Retry Mistake training
  const mistakeMoves = useMemo(() => {
    if (!analysis) return [];
    return analysis.moves.filter(
      (m) =>
        m.classification === "blunder" ||
        m.classification === "mistake" ||
        m.classification === "inaccuracy"
    );
  }, [analysis]);

  const startRetryOnMove = (move: EvaluatedMove) => {
    setCustomFen(null);
    setCustomEval(null);
    setCurrentPly(move.ply);
    setRetryMode(true);
    setRetrySolved(false);
    setShowRetryHint(false);
    setBoardOrientation(move.color === "w" ? "white" : "black");
    setRetryFeedback({
      type: "info",
      message: `Giliran ${
        move.color === "w" ? "Putih" : "Hitam"
      }: Pada partai asli dimainkan ${move.san} (${
        CLASSIFICATION_META[move.classification].shortLabel
      }). Tarik buah catur di papan untuk menebak langkah terbaik Stockfish!`,
    });
  };

  const handleStartNextRetryMistake = () => {
    if (mistakeMoves.length === 0) return;
    const nextMistake =
      mistakeMoves.find((m) => m.ply > currentPly) || mistakeMoves[0];
    startRetryOnMove(nextMistake);
  };

  // Drag-and-drop piece handler (FR-04 & FR-08)
  const onPieceDrop = (sourceSquare: Square, targetSquare: Square): boolean => {
    try {
      const chess = new Chess(displayedFen);
      const moveAttempt = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });

      if (!moveAttempt) return false;

      const playedUci = `${moveAttempt.from}${moveAttempt.to}${
        moveAttempt.promotion || ""
      }`;

      // If in FR-08 Retry Mistake mode, check against Stockfish's best move!
      if (retryMode && currentMove && !retrySolved) {
        const expectedBestUci = currentMove.bestMoveUci.toLowerCase();
        const isCorrect =
          playedUci.toLowerCase() === expectedBestUci ||
          moveAttempt.san === currentMove.bestMoveSan;

        if (isCorrect) {
          setRetrySolved(true);
          setCustomFen(chess.fen());
          setRetryFeedback({
            type: "success",
            message: `Tepat sekali! ${moveAttempt.san} adalah langkah terbaik rekomendasi Stockfish!`,
          });
          return true;
        } else {
          setRetryFeedback({
            type: "error",
            message: `Belum tepat (${moveAttempt.san}). Itu bukan langkah terbaik di posisi ini. Coba lagi atau klik "Lihat Petunjuk"!`,
          });
          return false;
        }
      }

      // Free exploration mode on the board: evaluate the new custom position live!
      const newFen = chess.fen();
      setCustomFen(newFen);
      setIsEvaluatingCustom(true);
      evaluateSinglePosition(newFen, depth, multiPV, engineMode)
        .then((ev) => setCustomEval(ev))
        .finally(() => setIsEvaluatingCustom(false));

      return true;
    } catch {
      return false;
    }
  };

  // Visual arrows on the board (FR-04: engine best move suggestion arrow + played move arrow)
  const customArrows = useMemo((): [Square, Square, string?][] => {
    const arrows: [Square, Square, string?][] = [];

    // In Retry Mistake mode before solving, hide engine arrow unless user clicked "Hint"
    if (retryMode && !retrySolved) {
      if (
        showRetryHint &&
        currentMove &&
        currentMove.bestMoveUci.length >= 4
      ) {
        const from = currentMove.bestMoveUci.slice(0, 2) as Square;
        const to = currentMove.bestMoveUci.slice(2, 4) as Square;
        arrows.push([from, to, "rgba(34, 197, 94, 0.85)"]);
      }
      return arrows;
    }

    // If user is exploring a custom position, show engine best move for that custom position
    if (customFen && customEval && customEval.bestMoveUci.length >= 4) {
      const from = customEval.bestMoveUci.slice(0, 2) as Square;
      const to = customEval.bestMoveUci.slice(2, 4) as Square;
      arrows.push([from, to, "rgba(34, 197, 94, 0.85)"]);
      return arrows;
    }

    // Standard review mode on a game move:
    // 1. Show Stockfish's recommended best move BEFORE the move if the player didn't play the best move
    if (currentMove) {
      if (
        currentMove.bestMoveUci &&
        currentMove.bestMoveUci.length >= 4 &&
        currentMove.bestMoveUci.toLowerCase() !==
          currentMove.uci.toLowerCase()
      ) {
        const bestFrom = currentMove.bestMoveUci.slice(0, 2) as Square;
        const bestTo = currentMove.bestMoveUci.slice(2, 4) as Square;
        arrows.push([bestFrom, bestTo, "rgba(34, 197, 94, 0.85)"]);
      }

      // 2. Also show next best reply in the current position (light blue arrow)
      if (
        currentMove.evalAfter.bestMoveUci &&
        currentMove.evalAfter.bestMoveUci.length >= 4
      ) {
        const nextFrom = currentMove.evalAfter.bestMoveUci.slice(
          0,
          2
        ) as Square;
        const nextTo = currentMove.evalAfter.bestMoveUci.slice(2, 4) as Square;
        arrows.push([nextFrom, nextTo, "rgba(56, 189, 248, 0.65)"]);
      }
    } else if (
      analysis &&
      analysis.initialEval.bestMoveUci &&
      analysis.initialEval.bestMoveUci.length >= 4
    ) {
      const initFrom = analysis.initialEval.bestMoveUci.slice(0, 2) as Square;
      const initTo = analysis.initialEval.bestMoveUci.slice(2, 4) as Square;
      arrows.push([initFrom, initTo, "rgba(34, 197, 94, 0.75)"]);
    }

    return arrows;
  }, [
    analysis,
    currentMove,
    customEval,
    customFen,
    retryMode,
    retrySolved,
    showRetryHint,
  ]);

  // Highlight from/to squares of the current move with its classification color
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (customFen) return styles;

    if (retryMode && !retrySolved && showRetryHint && currentMove) {
      const hintFrom = currentMove.bestMoveUci.slice(0, 2);
      styles[hintFrom] = {
        backgroundColor: "rgba(34, 197, 94, 0.45)",
        boxShadow: "inset 0 0 0 3px #22c55e",
      };
      return styles;
    }

    if (currentMove && !retryMode) {
      const meta = CLASSIFICATION_META[currentMove.classification];
      styles[currentMove.from] = {
        backgroundColor: "rgba(250, 204, 21, 0.22)",
      };
      styles[currentMove.to] = {
        backgroundColor: meta.squareHighlight,
      };
    }
    return styles;
  }, [currentMove, customFen, retryMode, retrySolved, showRetryHint]);

  // Group moves into pairs (1. e4 e5) for the Move Table
  const movePairs = useMemo(() => {
    if (!analysis) return [];
    const pairs: {
      moveNumber: number;
      white?: EvaluatedMove;
      black?: EvaluatedMove;
    }[] = [];

    for (let i = 0; i < analysis.moves.length; i += 2) {
      pairs.push({
        moveNumber: Math.floor(i / 2) + 1,
        white: analysis.moves[i],
        black: analysis.moves[i + 1],
      });
    }
    return pairs;
  }, [analysis]);

  const progressPercent = Math.min(
    100,
    Math.round((progressPly / Math.max(1, progressTotal)) * 100)
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#090d16]/90 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-emerald-900/40">
              ♟
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                  Chess<span className="text-emerald-400">Insight</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Unlimited Game Review
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Analisa Pertandingan Chess.com & PGN Gratis Berbasis Stockfish
              </p>
            </div>
          </div>

          {/* Engine & Depth Controls (NFR 8.2) */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Engine Mode Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400 hidden md:inline">Engine:</span>
              <select
                value={engineMode}
                onChange={(e) => {
                  const val = e.target.value as "native-exe" | "browser-wasm";
                  setEngineMode(val);
                }}
                className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
                title="Pilih mode eksekusi Stockfish"
              >
                {nativeAvailable && (
                  <option value="native-exe" className="bg-slate-900">
                    Stockfish 19 Native (.EXE Lokal)
                  </option>
                )}
                <option value="browser-wasm" className="bg-slate-900">
                  Stockfish WASM (Browser / Vercel)
                </option>
              </select>
            </div>

            {/* Depth Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <Settings2 className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-slate-400 hidden md:inline">Depth:</span>
              <select
                value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
                className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value={12} className="bg-slate-900">
                  Depth 12 (Cepat)
                </option>
                <option value={14} className="bg-slate-900">
                  Depth 14 (Seimbang)
                </option>
                <option value={16} className="bg-slate-900">
                  Depth 16 (Standar)
                </option>
                <option value={20} className="bg-slate-900">
                  Depth 20 (Mendalam)
                </option>
              </select>
            </div>

            {/* MultiPV Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <span className="text-slate-400">Variasi:</span>
              <select
                value={multiPV}
                onChange={(e) => setMultiPV(Number(e.target.value))}
                className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value={1} className="bg-slate-900">
                  1 Baris (MultiPV 1)
                </option>
                <option value={2} className="bg-slate-900">
                  2 Baris (MultiPV 2)
                </option>
                <option value={3} className="bg-slate-900">
                  3 Baris (MultiPV 3)
                </option>
              </select>
            </div>

            {analysis && (
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={() =>
                  runGameAnalysis(
                    analysis.metadata.pgn,
                    analysis.metadata,
                    depth,
                    multiPV,
                    engineMode,
                    true
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-semibold transition flex items-center gap-1.5"
                title="Hitung ulang analisa dengan Depth / Engine saat ini"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Analisa Ulang</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 py-5 space-y-5">
        {/* Top Game Importer (Chess.com API / Manual PGN & FEN / Samples / IndexedDB History) */}
        <GameSelector
          onSelectGame={(pgnOrFen, meta) =>
            runGameAnalysis(pgnOrFen, meta, depth, multiPV, engineMode)
          }
          onLoadCachedAnalysis={(cached) => {
            setAnalysis(cached);
            setCurrentPly(0);
            setCustomFen(null);
            setCustomEval(null);
            setRetryMode(false);
          }}
          onDeleteCachedAnalysis={async (id) => {
            await deleteCachedAnalysis(id);
            await refreshCacheList();
          }}
          cachedAnalyses={cachedAnalyses}
          isAnalyzing={isAnalyzing}
        />

        {/* Progress Bar during Stockfish Batch Calculation */}
        {isAnalyzing && (
          <div className="rounded-2xl bg-slate-900/95 border border-emerald-500/40 p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {progressText || "Menjalankan evaluasi Stockfish..."}
              </span>
              <span className="font-mono font-bold text-white">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3.5 text-xs text-red-300">
            {errorMessage}
          </div>
        )}

        {/* Analysis Workspace Grid */}
        {analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT / CENTER COLUMN: Interactive Chessboard + EvalBar + Controls + EvalGraph */}
            <div className="lg:col-span-7 xl:col-span-7 space-y-4">
              {/* Top Player Banner */}
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-3.5 h-3.5 rounded-sm border ${
                      boardOrientation === "white"
                        ? "bg-slate-800 border-slate-500"
                        : "bg-white border-slate-300"
                    }`}
                  />
                  <div>
                    <span className="text-sm font-bold text-white">
                      {boardOrientation === "white"
                        ? analysis.metadata.black.username
                        : analysis.metadata.white.username}
                    </span>
                    {(boardOrientation === "white"
                      ? analysis.metadata.black.rating
                      : analysis.metadata.white.rating) && (
                      <span className="text-xs text-slate-400 ml-1.5 font-mono">
                        (
                        {boardOrientation === "white"
                          ? analysis.metadata.black.rating
                          : analysis.metadata.white.rating}
                        )
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Akurasi:</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 font-bold text-white font-mono">
                    {boardOrientation === "white"
                      ? analysis.blackAccuracy
                      : analysis.whiteAccuracy}
                    %
                  </span>
                </div>
              </div>

              {/* EvalBar + Interactive 2D Chessboard (FR-04 & FR-06) */}
              <div className="grid grid-cols-[auto_1fr] gap-2.5 sm:gap-3 items-stretch">
                <EvalBar
                  cp={activeEval.cp}
                  mate={activeEval.mate}
                  winProbWhite={activeEval.winProbWhite}
                  orientation={boardOrientation}
                />

                <div className="relative w-full max-w-[540px] mx-auto aspect-square rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900">
                  <Chessboard
                    id="ChessInsightBoard"
                    position={displayedFen}
                    onPieceDrop={onPieceDrop}
                    boardOrientation={boardOrientation}
                    customArrows={customArrows}
                    customSquareStyles={customSquareStyles}
                    customDarkSquareStyle={{ backgroundColor: "#4b7399" }}
                    customLightSquareStyle={{ backgroundColor: "#eae9d2" }}
                    animationDuration={180}
                  />
                </div>
              </div>

              {/* Bottom Player Banner */}
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-3.5 h-3.5 rounded-sm border ${
                      boardOrientation === "white"
                        ? "bg-white border-slate-300"
                        : "bg-slate-800 border-slate-500"
                    }`}
                  />
                  <div>
                    <span className="text-sm font-bold text-white">
                      {boardOrientation === "white"
                        ? analysis.metadata.white.username
                        : analysis.metadata.black.username}
                    </span>
                    {(boardOrientation === "white"
                      ? analysis.metadata.white.rating
                      : analysis.metadata.black.rating) && (
                      <span className="text-xs text-slate-400 ml-1.5 font-mono">
                        (
                        {boardOrientation === "white"
                          ? analysis.metadata.white.rating
                          : analysis.metadata.black.rating}
                        )
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Akurasi:</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 font-bold text-white font-mono">
                    {boardOrientation === "white"
                      ? analysis.whiteAccuracy
                      : analysis.blackAccuracy}
                    %
                  </span>
                </div>
              </div>

              {/* Board Navigation Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => goToPly(0)}
                    disabled={currentPly === 0 && !customFen}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition"
                    title="Ke Awal Pertandingan (ArrowUp)"
                  >
                    <ChevronFirst className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPly(currentPly - 1)}
                    disabled={currentPly === 0 && !customFen}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition"
                    title="Langkah Sebelumnya (ArrowLeft)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPly(currentPly + 1)}
                    disabled={currentPly >= analysis.moves.length}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition"
                    title="Langkah Selanjutnya (ArrowRight)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPly(analysis.moves.length)}
                    disabled={currentPly >= analysis.moves.length}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition"
                    title="Ke Akhir Pertandingan (ArrowDown)"
                  >
                    <ChevronLast className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {customFen && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomFen(null);
                        setCustomEval(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Kembali ke Partai</span>
                    </button>
                  )}

                  {mistakeMoves.length > 0 && (
                    <button
                      type="button"
                      onClick={handleStartNextRetryMistake}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
                        retryMode
                          ? "bg-amber-500 text-slate-950 border-amber-400"
                          : "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30"
                      }`}
                      title="Latihan menebak langkah terbaik pada posisi Blunder/Mistake (FR-08)"
                    >
                      <Target className="w-3.5 h-3.5" />
                      <span>Retry Mistake</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setBoardOrientation((prev) =>
                        prev === "white" ? "black" : "white"
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
                    title="Putar Papan (Flip Board)"
                  >
                    <FlipVertical2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Balik Papan</span>
                  </button>
                </div>
              </div>

              {/* FR-08: Retry Mistake Interactive Banner */}
              {retryMode && currentMove && (
                <div
                  className={`rounded-xl p-4 border space-y-2.5 ${
                    retryFeedback?.type === "success"
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
                      : retryFeedback?.type === "error"
                      ? "bg-red-500/15 border-red-500/40 text-red-200"
                      : "bg-amber-500/15 border-amber-500/40 text-amber-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                      {retryFeedback?.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : retryFeedback?.type === "error" ? (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      ) : (
                        <Target className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <span>
                        Mode Latihan &ldquo;Retry Mistake&rdquo; — Langkah{" "}
                        {currentMove.moveNumber}
                        {currentMove.color === "w" ? "." : "..."}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!retrySolved && (
                        <button
                          type="button"
                          onClick={() => setShowRetryHint(true)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-xs font-semibold text-amber-300 border border-amber-500/30 flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Petunjuk</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleStartNextRetryMistake}
                        className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-xs font-semibold text-white border border-slate-700"
                      >
                        Kesalahan Berikutnya →
                      </button>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed">
                    {retryFeedback?.message}
                  </p>
                </div>
              )}

              {/* Evaluation Graph (FR-06) */}
              <EvalGraph
                initialEval={analysis.initialEval}
                moves={analysis.moves}
                currentPly={currentPly}
                onSelectPly={goToPly}
              />
            </div>

            {/* RIGHT COLUMN: Move Classification Coach + Engine Lines (MultiPV) + Move List + Summary Card */}
            <div className="lg:col-span-5 xl:col-span-5 space-y-4">
              {/* Current Move Classification & Coach Card (FR-05) */}
              <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
                {currentMove && !customFen ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold"
                          style={{
                            backgroundColor:
                              CLASSIFICATION_META[currentMove.classification]
                                .bgColor,
                            color:
                              CLASSIFICATION_META[currentMove.classification]
                                .color,
                            border: `1px solid ${
                              CLASSIFICATION_META[currentMove.classification]
                                .borderColor
                            }`,
                          }}
                        >
                          {
                            CLASSIFICATION_META[currentMove.classification]
                              .symbol
                          }
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-white">
                              {currentMove.moveNumber}
                              {currentMove.color === "w" ? "." : "..."}{" "}
                              {currentMove.san}
                            </span>
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-md"
                              style={{
                                backgroundColor:
                                  CLASSIFICATION_META[
                                    currentMove.classification
                                  ].bgColor,
                                color:
                                  CLASSIFICATION_META[
                                    currentMove.classification
                                  ].color,
                              }}
                            >
                              {
                                CLASSIFICATION_META[currentMove.classification]
                                  .label
                              }
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {
                              CLASSIFICATION_META[currentMove.classification]
                                .description
                            }
                          </p>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <div className="text-sm font-bold text-white">
                          {formatEvalScore(
                            currentMove.evalAfter.cp,
                            currentMove.evalAfter.mate
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Win%: {currentMove.winProbAfter.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Show comparison between played move and Stockfish best move */}
                    {!retryMode && (
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                        <div className="p-2 rounded-lg bg-slate-950/70">
                          <span className="text-[10px] text-slate-400 block">
                            Saran Terbaik Engine
                          </span>
                          <span className="font-mono font-bold text-emerald-400">
                            {currentMove.bestMoveSan}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-950/70">
                          <span className="text-[10px] text-slate-400 block">
                            Penurunan ΔWin%
                          </span>
                          <span className="font-mono font-bold text-slate-200">
                            -{currentMove.winProbLoss.toFixed(1)}%
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-950/70">
                          <span className="text-[10px] text-slate-400 block">
                            Akurasi Langkah
                          </span>
                          <span className="font-mono font-bold text-sky-400">
                            {currentMove.moveAccuracy.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                ) : customFen ? (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-sky-400" />
                      <div>
                        <div className="font-bold text-white">
                          Eksplorasi Variasi Papan Bebas
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          {isEvaluatingCustom
                            ? "Stockfish sedang menghitung posisi ini..."
                            : `Saran langkah terbaik: ${
                                activeEval.bestMoveUci || "-"
                              }`}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-sm text-sky-400">
                      {formatEvalScore(activeEval.cp, activeEval.mate)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="font-bold text-white">
                          [{analysis.opening.eco}] {analysis.opening.name}
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          Gunakan tombol panah keyboard (← / →) atau klik daftar
                          langkah di bawah untuk meninjau.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Engine Lines / MultiPV Explorer (Persona 2: Club & Tournament Player) */}
                {(!retryMode || retrySolved) && activeEval.lines.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold">
                        Jalur Variasi Stockfish (Depth {activeEval.depth})
                      </span>
                      <span className="font-mono text-[10px] text-emerald-400">
                        {analysis.engineMode === "native-exe"
                          ? "Stockfish 19 .EXE"
                          : "Stockfish WASM"}
                      </span>
                    </div>
                    {activeEval.lines.map((line) => (
                      <div
                        key={line.multipv}
                        className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/60 font-mono"
                      >
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            (line.cp ?? 0) >= 0
                              ? "bg-slate-200 text-slate-900"
                              : "bg-slate-800 text-slate-200 border border-slate-700"
                          }`}
                        >
                          {formatEvalScore(line.cp ?? 0, line.mate)}
                        </span>
                        <span className="text-slate-300 truncate">
                          {line.pv.slice(0, 7).join(" ")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Interactive Move List Table */}
              <div className="rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">
                    Daftar Langkah ({analysis.moves.length} Ply)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Klik langkah untuk melompat
                  </span>
                </div>

                <div className="max-h-[250px] overflow-y-auto divide-y divide-slate-800/50 text-xs">
                  {movePairs.map((pair) => {
                    const w = pair.white;
                    const b = pair.black;
                    const wMeta = w
                      ? CLASSIFICATION_META[w.classification]
                      : null;
                    const bMeta = b
                      ? CLASSIFICATION_META[b.classification]
                      : null;

                    return (
                      <div
                        key={pair.moveNumber}
                        className="grid grid-cols-[44px_1fr_1fr] items-center hover:bg-slate-800/30 transition"
                      >
                        <span className="py-2 px-3 font-mono text-slate-500 bg-slate-950/40">
                          {pair.moveNumber}.
                        </span>

                        {/* White Move Cell */}
                        {w && wMeta ? (
                          <button
                            type="button"
                            onClick={() => goToPly(w.ply)}
                            className={`py-2 px-3 text-left flex items-center justify-between gap-1.5 transition ${
                              currentPly === w.ply
                                ? "bg-emerald-500/20 text-white font-bold"
                                : "text-slate-200 hover:bg-slate-800/60"
                            }`}
                          >
                            <span className="font-mono flex items-center gap-1.5">
                              <span>{w.san}</span>
                              <span
                                className="text-[10px] font-bold px-1 rounded"
                                style={{
                                  color: wMeta.color,
                                  backgroundColor: wMeta.bgColor,
                                }}
                              >
                                {wMeta.symbol}
                              </span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {formatEvalScore(
                                w.evalAfter.cp,
                                w.evalAfter.mate
                              )}
                            </span>
                          </button>
                        ) : (
                          <div />
                        )}

                        {/* Black Move Cell */}
                        {b && bMeta ? (
                          <button
                            type="button"
                            onClick={() => goToPly(b.ply)}
                            className={`py-2 px-3 text-left flex items-center justify-between gap-1.5 transition ${
                              currentPly === b.ply
                                ? "bg-emerald-500/20 text-white font-bold"
                                : "text-slate-200 hover:bg-slate-800/60"
                            }`}
                          >
                            <span className="font-mono flex items-center gap-1.5">
                              <span>{b.san}</span>
                              <span
                                className="text-[10px] font-bold px-1 rounded"
                                style={{
                                  color: bMeta.color,
                                  backgroundColor: bMeta.bgColor,
                                }}
                              >
                                {bMeta.symbol}
                              </span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {formatEvalScore(
                                b.evalAfter.cp,
                                b.evalAfter.mate
                              )}
                            </span>
                          </button>
                        ) : (
                          <div />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Overall Game Review Summary Card (FR-05, FR-07, FR-08, Fase 3 Share) */}
              <SummaryCard
                analysis={analysis}
                onStartRetryMistakes={handleStartNextRetryMistake}
                mistakeAndBlunderCount={mistakeMoves.length}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

