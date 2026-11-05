"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  SlidersHorizontal,
  Target,
  Eye,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  Compass,
  BookOpen,
} from "lucide-react";
import { ChessComBadge } from "@/components/ChessComBadge";
import { gsap, useGSAP, SplitText, MOTION_OK } from "@/lib/gsap";

export default function HomePage() {
  // Engine Settings (NFR 8.2: Depth 12 Cepat, 16 Standar, 20 Mendalam, MultiPV 1-3)
  const [depth, setDepth] = useState<number>(14);
  const [multiPV, setMultiPV] = useState<number>(2);
  const [nativeAvailable, setNativeAvailable] = useState<boolean>(false);
  const [engineMode, setEngineMode] = useState<"native-exe" | "browser-wasm">(
    "browser-wasm"
  );
  const [engineLabel, setEngineLabel] = useState<string>(
    "Stockfish 19 WASM"
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

  // GSAP Refs
  const pageRef = useRef<HTMLDivElement>(null);
  const brandTitleRef = useRef<HTMLHeadingElement>(null);
  const boardStageRef = useRef<HTMLDivElement>(null);
  const coachPanelRef = useRef<HTMLDivElement>(null);
  const moveListRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);

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

  // Masthead SplitText & workspace entrance choreography
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const tl = gsap.timeline();
        if (brandTitleRef.current) {
          const split = SplitText.create(brandTitleRef.current, {
            type: "chars",
          });
          tl.from(split.chars, {
            yPercent: 110,
            opacity: 0,
            stagger: 0.025,
            duration: 0.65,
            ease: "expo.out",
          });
        }
        tl.from(
          ".gsap-masthead-item",
          {
            y: 14,
            opacity: 0,
            stagger: 0.05,
            duration: 0.55,
            clearProps: "transform,opacity",
          },
          0.15
        );
      });
      return () => mm.revert();
    },
    { scope: pageRef }
  );

  // Animate workspace columns when a new game analysis loads
  useGSAP(
    () => {
      if (!analysis) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(".gsap-stage-block", {
          y: 22,
          opacity: 0,
          stagger: 0.07,
          duration: 0.65,
          ease: "expo.out",
          clearProps: "transform,opacity",
        });
      });
      return () => mm.revert();
    },
    { scope: pageRef, dependencies: [analysis?.id] }
  );

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

  // Displayed board FEN
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

  // GSAP reaction on ply change: coach badge pop, blunder tactile shake, and auto-scroll move list
  useGSAP(
    () => {
      if (!analysis) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        if (coachPanelRef.current) {
          gsap.fromTo(
            ".gsap-coach-badge",
            { scale: 0.65, rotate: -10 },
            {
              scale: 1,
              rotate: 0,
              duration: 0.55,
              ease: "elastic.out(1, 0.55)",
              overwrite: true,
            }
          );
          gsap.fromTo(
            ".gsap-coach-line",
            { x: 10, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              stagger: 0.04,
              duration: 0.35,
              ease: "expo.out",
              overwrite: true,
            }
          );
        }

        // Tactile board recoil when stepping onto a blunder
        if (
          currentMove?.classification === "blunder" &&
          !retryMode &&
          boardStageRef.current
        ) {
          gsap.fromTo(
            boardStageRef.current,
            { x: 0 },
            {
              keyframes: [
                { x: -6, duration: 0.05 },
                { x: 6, duration: 0.06 },
                { x: -4, duration: 0.06 },
                { x: 4, duration: 0.06 },
                { x: 0, duration: 0.08 },
              ],
              ease: "power2.out",
              clearProps: "transform",
              overwrite: true,
            }
          );
        }
      });

      // Smoothly scroll the active ply into view inside the scoresheet container
      if (moveListRef.current && currentPly > 0) {
        const activeBtn = moveListRef.current.querySelector<HTMLElement>(
          `[data-ply="${currentPly}"]`
        );
        if (activeBtn) {
          gsap.to(moveListRef.current, {
            scrollTo: { y: activeBtn, offsetY: 72 },
            duration: 0.4,
            ease: "power3.out",
            overwrite: true,
          });
        }
      }

      return () => mm.revert();
    },
    { scope: pageRef, dependencies: [currentPly, retryMode] }
  );

  // GSAP 3D perspective pulse when flipping board orientation
  useGSAP(
    () => {
      if (!boardStageRef.current) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo(
          boardStageRef.current,
          { opacity: 0.6, scale: 0.98 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.35,
            ease: "power2.out",
            clearProps: "all",
          }
        );
      });
      return () => mm.revert();
    },
    { dependencies: [boardOrientation] }
  );

  const progressPercent = Math.min(
    100,
    Math.round((progressPly / Math.max(1, progressTotal)) * 100)
  );

  // GSAP smooth progress bar width tween
  useGSAP(
    () => {
      if (!progressFillRef.current || !isAnalyzing) return;
      gsap.to(progressFillRef.current, {
        width: `${progressPercent}%`,
        duration: 0.35,
        ease: "power2.out",
        overwrite: true,
      });
    },
    { dependencies: [progressPercent, isAnalyzing] }
  );

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
      }). Tarik buah catur di papan untuk menemukan langkah terbaik Stockfish 19!`,
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
            message: `Tepat sekali! ${moveAttempt.san} adalah langkah terbaik rekomendasi Stockfish 19.`,
          });
          return true;
        } else {
          setRetryFeedback({
            type: "error",
            message: `Belum tepat (${moveAttempt.san}). Itu bukan langkah terbaik di posisi ini. Coba lagi atau klik "Lihat Petunjuk".`,
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
        arrows.push([from, to, "rgba(255, 91, 46, 0.9)"]);
      }
      return arrows;
    }

    // If user is exploring a custom position, show engine best move for that custom position
    if (customFen && customEval && customEval.bestMoveUci.length >= 4) {
      const from = customEval.bestMoveUci.slice(0, 2) as Square;
      const to = customEval.bestMoveUci.slice(2, 4) as Square;
      arrows.push([from, to, "rgba(255, 91, 46, 0.9)"]);
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
        arrows.push([bestFrom, bestTo, "rgba(34, 197, 94, 0.88)"]);
      }

      // 2. Also show next best reply in the current position
      if (
        currentMove.evalAfter.bestMoveUci &&
        currentMove.evalAfter.bestMoveUci.length >= 4
      ) {
        const nextFrom = currentMove.evalAfter.bestMoveUci.slice(
          0,
          2
        ) as Square;
        const nextTo = currentMove.evalAfter.bestMoveUci.slice(2, 4) as Square;
        arrows.push([nextFrom, nextTo, "rgba(255, 91, 46, 0.72)"]);
      }
    } else if (
      analysis &&
      analysis.initialEval.bestMoveUci &&
      analysis.initialEval.bestMoveUci.length >= 4
    ) {
      const initFrom = analysis.initialEval.bestMoveUci.slice(0, 2) as Square;
      const initTo = analysis.initialEval.bestMoveUci.slice(2, 4) as Square;
      arrows.push([initFrom, initTo, "rgba(34, 197, 94, 0.82)"]);
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
        backgroundColor: "rgba(255, 91, 46, 0.45)",
        boxShadow: "inset 0 0 0 3px #ff5b2e",
      };
      return styles;
    }

    if (currentMove && !retryMode) {
      const meta = CLASSIFICATION_META[currentMove.classification];
      styles[currentMove.from] = {
        backgroundColor: "rgba(255, 255, 255, 0.16)",
      };
      styles[currentMove.to] = {
        backgroundColor: meta.squareHighlight,
      };
    }
    return styles;
  }, [currentMove, customFen, retryMode, retrySolved, showRetryHint]);

  // Render Chess.com classification badge on the target square of the played move
  const customSquareRenderer = useCallback(
    ({
      square,
      children,
      style,
    }: {
      square: Square;
      children: React.ReactNode;
      style: Record<string, string | number>;
    }) => {
      const isTargetSquare =
        !customFen &&
        !retryMode &&
        currentMove &&
        currentMove.to === square;

      return (
        <div style={{ ...style, position: "relative" }}>
          {children}
          {isTargetSquare && (
            <div
              className="absolute top-0.5 right-0.5 z-20 pointer-events-none drop-shadow"
              style={{ transform: "translate(15%, -15%)" }}
            >
              <ChessComBadge
                classification={currentMove.classification}
                size={22}
              />
            </div>
          )}
        </div>
      );
    },
    [customFen, retryMode, currentMove]
  );

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

  const topPlayer =
    boardOrientation === "white"
      ? analysis?.metadata.black
      : analysis?.metadata.white;
  const bottomPlayer =
    boardOrientation === "white"
      ? analysis?.metadata.white
      : analysis?.metadata.black;
  const topAccuracy =
    boardOrientation === "white"
      ? analysis?.blackAccuracy
      : analysis?.whiteAccuracy;
  const bottomAccuracy =
    boardOrientation === "white"
      ? analysis?.whiteAccuracy
      : analysis?.blackAccuracy;

  return (
    <div ref={pageRef} className="min-h-screen flex flex-col bg-ink-950 text-paper-100">
      {/* Editorial Masthead */}
      <header className="border-b border-ink-700 bg-ink-950/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-baseline gap-4">
            <h1
              ref={brandTitleRef}
              className="font-display text-2xl sm:text-3xl tracking-tight text-paper-100 leading-none overflow-hidden"
            >
              ChessInsight
            </h1>
            <span className="gsap-masthead-item hidden md:inline-block text-xs font-mono text-paper-400">
              Stockfish 19 Full NNUE · Meja Analisa Catur
            </span>
          </div>

          {/* Engine & Depth Controls (NFR 8.2) */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Engine Mode Selector */}
            <div className="gsap-masthead-item flex items-center gap-1.5 h-8 px-2.5 rounded-[3px] bg-ink-900 ring-1 ring-ink-700">
              <Cpu className="w-3.5 h-3.5 text-signal" />
              <span className="text-paper-400 hidden sm:inline">Engine:</span>
              <select
                value={engineMode}
                onChange={(e) => {
                  const val = e.target.value as "native-exe" | "browser-wasm";
                  setEngineMode(val);
                }}
                className="bg-transparent text-paper-100 font-mono text-xs focus:outline-none cursor-pointer"
                title={engineLabel}
              >
                {nativeAvailable && (
                  <option value="native-exe">
                    SF 19 Native (.EXE)
                  </option>
                )}
                <option value="browser-wasm">
                  SF 19 Full WASM (NNUE)
                </option>
              </select>
            </div>

            {/* Depth Selector */}
            <div className="gsap-masthead-item flex items-center gap-1.5 h-8 px-2.5 rounded-[3px] bg-ink-900 ring-1 ring-ink-700">
              <SlidersHorizontal className="w-3.5 h-3.5 text-paper-300" />
              <select
                value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
                className="bg-transparent text-paper-100 font-mono text-xs focus:outline-none cursor-pointer"
                aria-label="Kedalaman kalkulasi Stockfish"
              >
                <option value={12}>Depth 12 · Cepat</option>
                <option value={14}>Depth 14 · Seimbang</option>
                <option value={16}>Depth 16 · Standar</option>
                <option value={20}>Depth 20 · Mendalam</option>
              </select>
            </div>

            {/* MultiPV Selector */}
            <div className="gsap-masthead-item flex items-center gap-1.5 h-8 px-2.5 rounded-[3px] bg-ink-900 ring-1 ring-ink-700">
              <select
                value={multiPV}
                onChange={(e) => setMultiPV(Number(e.target.value))}
                className="bg-transparent text-paper-100 font-mono text-xs focus:outline-none cursor-pointer"
                aria-label="Jumlah jalur variasi MultiPV"
              >
                <option value={1}>MultiPV 1</option>
                <option value={2}>MultiPV 2</option>
                <option value={3}>MultiPV 3</option>
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
                className="gsap-masthead-item h-8 px-3 rounded-[3px] bg-paper-100 hover:bg-signal text-ink-950 font-semibold transition flex items-center gap-1.5 disabled:opacity-40"
                title="Hitung ulang analisa dengan Depth / Engine saat ini"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hitung Ulang</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 space-y-6">
        {/* Top Game Importer */}
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

        {/* Progress Bar during Stockfish 19 Calculation */}
        {isAnalyzing && (
          <div className="p-4 border border-signal/50 bg-ink-900 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-paper-100 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-signal" />
                {progressText || "Menjalankan evaluasi Stockfish 19..."}
              </span>
              <span className="font-mono font-semibold text-signal tabular">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-ink-800 overflow-hidden">
              <div
                ref={progressFillRef}
                className="h-full bg-signal"
                style={{ width: "0%" }}
              />
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 border border-signal bg-ink-900 text-xs text-paper-100">
            {errorMessage}
          </div>
        )}

        {/* Analysis Workspace Grid */}
        {analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* LEFT COLUMN: Interactive Chessboard + EvalBar + Controls + EvalGraph */}
            <div className="lg:col-span-7 space-y-4">
              {/* Top Player Strip */}
              <div className="gsap-stage-block flex items-center justify-between py-2 border-b border-ink-700">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-3 h-3 rounded-full ring-1 ${
                      boardOrientation === "white"
                        ? "bg-ink-950 ring-paper-400"
                        : "bg-paper-100 ring-paper-300"
                    }`}
                  />
                  <span className="font-display text-lg text-paper-100 leading-none">
                    {topPlayer?.username}
                  </span>
                  {topPlayer?.rating && (
                    <span className="text-xs text-paper-400 font-mono tabular">
                      {topPlayer.rating}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 text-xs">
                  <span className="text-paper-400">Akurasi</span>
                  <span className="font-mono font-semibold text-sm text-paper-100 tabular">
                    {topAccuracy}%
                  </span>
                </div>
              </div>

              {/* EvalBar + Interactive 2D Chessboard (FR-04 & FR-06) */}
              <div
                ref={boardStageRef}
                className="gsap-stage-block grid grid-cols-[auto_1fr] gap-3 sm:gap-4 items-stretch"
              >
                <EvalBar
                  cp={activeEval.cp}
                  mate={activeEval.mate}
                  winProbWhite={activeEval.winProbWhite}
                  orientation={boardOrientation}
                />

                <div className="relative w-full max-w-[560px] mx-auto aspect-square rounded-[3px] overflow-hidden ring-1 ring-ink-700 shadow-[0_18px_40px_rgba(0,0,0,0.55)] bg-ink-900">
                  <Chessboard
                    id="ChessInsightBoard"
                    position={displayedFen}
                    onPieceDrop={onPieceDrop}
                    boardOrientation={boardOrientation}
                    customArrows={customArrows}
                    customSquareStyles={customSquareStyles}
                    customSquare={customSquareRenderer}
                    customDarkSquareStyle={{ backgroundColor: "#6e5844" }}
                    customLightSquareStyle={{ backgroundColor: "#e2d9c5" }}
                    animationDuration={180}
                  />
                </div>
              </div>

              {/* Bottom Player Strip */}
              <div className="gsap-stage-block flex items-center justify-between py-2 border-b border-ink-700">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-3 h-3 rounded-full ring-1 ${
                      boardOrientation === "white"
                        ? "bg-paper-100 ring-paper-300"
                        : "bg-ink-950 ring-paper-400"
                    }`}
                  />
                  <span className="font-display text-lg text-paper-100 leading-none">
                    {bottomPlayer?.username}
                  </span>
                  {bottomPlayer?.rating && (
                    <span className="text-xs text-paper-400 font-mono tabular">
                      {bottomPlayer.rating}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 text-xs">
                  <span className="text-paper-400">Akurasi</span>
                  <span className="font-mono font-semibold text-sm text-paper-100 tabular">
                    {bottomAccuracy}%
                  </span>
                </div>
              </div>

              {/* Board Navigation Toolbar */}
              <div className="gsap-stage-block flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => goToPly(0)}
                    disabled={currentPly === 0 && !customFen}
                    className="h-9 w-9 flex items-center justify-center rounded-[3px] bg-ink-900 ring-1 ring-ink-700 hover:ring-paper-300 disabled:opacity-35 text-paper-100 transition"
                    title="Ke Awal Pertandingan (ArrowUp)"
                  >
                    <ChevronFirst className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPly(currentPly - 1)}
                    disabled={currentPly === 0 && !customFen}
                    className="h-9 w-9 flex items-center justify-center rounded-[3px] bg-ink-900 ring-1 ring-ink-700 hover:ring-paper-300 disabled:opacity-35 text-paper-100 transition"
                    title="Langkah Sebelumnya (ArrowLeft)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPly(currentPly + 1)}
                    disabled={currentPly >= analysis.moves.length}
                    className="h-9 w-9 flex items-center justify-center rounded-[3px] bg-ink-900 ring-1 ring-ink-700 hover:ring-paper-300 disabled:opacity-35 text-paper-100 transition"
                    title="Langkah Selanjutnya (ArrowRight)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPly(analysis.moves.length)}
                    disabled={currentPly >= analysis.moves.length}
                    className="h-9 w-9 flex items-center justify-center rounded-[3px] bg-ink-900 ring-1 ring-ink-700 hover:ring-paper-300 disabled:opacity-35 text-paper-100 transition"
                    title="Ke Akhir Pertandingan (ArrowDown)"
                  >
                    <ChevronLast className="w-4 h-4" />
                  </button>
                  <span className="ml-2 font-mono text-xs text-paper-400 tabular">
                    Ply {currentPly} / {analysis.moves.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {customFen && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomFen(null);
                        setCustomEval(null);
                      }}
                      className="h-9 px-3 rounded-[3px] bg-ink-900 ring-1 ring-signal text-paper-100 text-xs font-medium flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-signal" />
                      <span>Kembali ke Partai</span>
                    </button>
                  )}

                  {mistakeMoves.length > 0 && (
                    <button
                      type="button"
                      onClick={handleStartNextRetryMistake}
                      className={`h-9 px-3 rounded-[3px] text-xs font-semibold flex items-center gap-1.5 transition ${
                        retryMode
                          ? "bg-signal text-ink-950"
                          : "bg-ink-900 ring-1 ring-ink-700 hover:ring-signal text-paper-100"
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
                    className="h-9 px-3 rounded-[3px] bg-ink-900 ring-1 ring-ink-700 hover:ring-paper-300 text-paper-100 text-xs font-medium flex items-center gap-1.5 transition"
                    title="Putar Papan (Flip Board)"
                  >
                    <FlipVertical2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Balik Papan</span>
                  </button>
                </div>
              </div>

              {/* FR-08: Retry Mistake Interactive Banner */}
              {retryMode && currentMove && (
                <div className="p-4 border border-signal bg-ink-900 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-mono font-semibold text-paper-100">
                      {retryFeedback?.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-signal shrink-0" />
                      ) : retryFeedback?.type === "error" ? (
                        <XCircle className="w-4 h-4 text-signal shrink-0" />
                      ) : (
                        <Target className="w-4 h-4 text-signal shrink-0" />
                      )}
                      <span>
                        Latihan Koreksi Langkah {currentMove.moveNumber}
                        {currentMove.color === "w" ? "." : "..."}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!retrySolved && (
                        <button
                          type="button"
                          onClick={() => setShowRetryHint(true)}
                          className="h-7 px-2.5 rounded-[3px] bg-ink-950 ring-1 ring-ink-700 hover:ring-paper-300 text-xs font-medium text-paper-100 flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Petunjuk</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleStartNextRetryMistake}
                        className="h-7 px-2.5 rounded-[3px] bg-paper-100 text-ink-950 text-xs font-semibold"
                      >
                        Kesalahan Berikutnya →
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-paper-200 leading-relaxed">
                    {retryFeedback?.message}
                  </p>
                </div>
              )}

              {/* Evaluation Graph (FR-06) */}
              <div className="gsap-stage-block">
                <EvalGraph
                  initialEval={analysis.initialEval}
                  moves={analysis.moves}
                  currentPly={currentPly}
                  onSelectPly={goToPly}
                />
              </div>
            </div>

            {/* RIGHT COLUMN: Move Classification Coach + Engine Lines (MultiPV) + Scoresheet + Summary */}
            <div className="lg:col-span-5 space-y-6">
              {/* Current Move Classification & Engine Lines (FR-05) */}
              <section
                ref={coachPanelRef}
                className="gsap-stage-block border-t-2 border-paper-100 pt-4 space-y-4"
              >
                {currentMove && !customFen ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="gsap-coach-badge shrink-0 pt-0.5">
                          <ChessComBadge
                            classification={currentMove.classification}
                            size={36}
                          />
                        </div>
                        <div>
                          <div className="flex items-baseline gap-2.5">
                            <span className="font-display text-2xl text-paper-100 leading-none">
                              {currentMove.moveNumber}
                              {currentMove.color === "w" ? "." : "..."}{" "}
                              {currentMove.san}
                            </span>
                            <span
                              className="font-mono text-xs font-semibold"
                              style={{
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
                          <p className="text-xs text-paper-300 mt-1 leading-relaxed">
                            {
                              CLASSIFICATION_META[currentMove.classification]
                                .description
                            }
                          </p>
                        </div>
                      </div>

                      <div className="text-right font-mono tabular shrink-0">
                        <div className="text-lg font-semibold text-paper-100 leading-none">
                          {formatEvalScore(
                            currentMove.evalAfter.cp,
                            currentMove.evalAfter.mate
                          )}
                        </div>
                        <div className="text-[11px] text-paper-400 mt-1">
                          Win {currentMove.winProbAfter.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Comparison strip between played move and Stockfish best move */}
                    {!retryMode && (
                      <div className="grid grid-cols-3 divide-x divide-ink-700 border-y border-ink-700 py-2.5 text-xs">
                        <div className="pr-3">
                          <span className="text-[11px] text-paper-400 block">
                            Saran Stockfish
                          </span>
                          <span className="font-mono font-semibold text-paper-100">
                            {currentMove.bestMoveSan}
                          </span>
                        </div>
                        <div className="px-3">
                          <span className="text-[11px] text-paper-400 block">
                            Selisih Win%
                          </span>
                          <span className="font-mono font-semibold text-paper-200 tabular">
                            -{currentMove.winProbLoss.toFixed(1)}%
                          </span>
                        </div>
                        <div className="pl-3">
                          <span className="text-[11px] text-paper-400 block">
                            Akurasi Langkah
                          </span>
                          <span className="font-mono font-semibold text-paper-100 tabular">
                            {currentMove.moveAccuracy.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                ) : customFen ? (
                  <div className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2.5">
                      <Compass className="w-4 h-4 text-signal shrink-0" />
                      <div>
                        <div className="font-display text-lg text-paper-100 leading-none">
                          Eksplorasi Posisi Bebas
                        </div>
                        <div className="text-paper-300 text-xs mt-1 font-mono">
                          {isEvaluatingCustom
                            ? "Stockfish 19 sedang menghitung posisi ini..."
                            : `Rekomendasi utama: ${
                                activeEval.bestMoveUci || "-"
                              }`}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono font-semibold text-base text-signal tabular">
                      {formatEvalScore(activeEval.cp, activeEval.mate)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 text-xs py-1">
                    <BookOpen className="w-4 h-4 text-signal shrink-0 mt-0.5" />
                    <div>
                      <div className="font-display text-lg text-paper-100 leading-snug">
                        <span className="font-mono text-sm text-signal mr-1.5">
                          {analysis.opening.eco}
                        </span>
                        {analysis.opening.name}
                      </div>
                      <p className="text-paper-300 text-xs mt-1">
                        Gunakan tombol panah keyboard (← / →) atau klik notasi di
                        bawah untuk menelusuri tiap langkah.
                      </p>
                    </div>
                  </div>
                )}

                {/* Engine Lines / MultiPV Explorer */}
                {(!retryMode || retrySolved) && activeEval.lines.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-paper-400">
                      <span>Jalur Variasi · Depth {activeEval.depth}</span>
                      <span className="text-paper-300">
                        {analysis.engineName}
                      </span>
                    </div>
                    {activeEval.lines.map((line) => (
                      <div
                        key={line.multipv}
                        className="gsap-coach-line flex items-center gap-2.5 text-xs py-1.5 px-2.5 bg-ink-900 ring-1 ring-ink-700 font-mono"
                      >
                        <span
                          className={`px-1.5 py-0.5 rounded-[2px] text-[11px] font-semibold tabular shrink-0 ${
                            (line.cp ?? 0) >= 0
                              ? "bg-paper-100 text-ink-950"
                              : "bg-ink-800 text-paper-100 ring-1 ring-ink-600"
                          }`}
                        >
                          {formatEvalScore(line.cp ?? 0, line.mate)}
                        </span>
                        <span className="text-paper-200 truncate">
                          {line.pv.slice(0, 8).join(" ")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Scoresheet Move List Table */}
              <section className="gsap-stage-block border-t border-ink-700 pt-4">
                <div className="flex items-baseline justify-between mb-2.5">
                  <h3 className="font-display text-xl leading-none">
                    Lembar Notasi
                  </h3>
                  <span className="font-mono text-xs text-paper-400 tabular">
                    {analysis.moves.length} ply
                  </span>
                </div>

                <div
                  ref={moveListRef}
                  className="max-h-[260px] overflow-y-auto border-y border-ink-700 divide-y divide-ink-800 text-xs"
                >
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
                        className="grid grid-cols-[44px_1fr_1fr] items-center"
                      >
                        <span className="py-2 px-2.5 font-mono text-paper-400 tabular bg-ink-900/60">
                          {pair.moveNumber}.
                        </span>

                        {/* White Move Cell */}
                        {w && wMeta ? (
                          <button
                            type="button"
                            data-ply={w.ply}
                            onClick={() => goToPly(w.ply)}
                            className={`py-2 px-3 text-left flex items-center justify-between gap-1.5 transition ${
                              currentPly === w.ply
                                ? "bg-paper-100 text-ink-950 font-semibold"
                                : "text-paper-100 hover:bg-ink-900"
                            }`}
                          >
                            <span className="font-mono flex items-center gap-1.5">
                              <span>{w.san}</span>
                              <ChessComBadge
                                classification={w.classification}
                                size={14}
                                className="shrink-0"
                              />
                            </span>
                            <span
                              className={`text-[10px] font-mono tabular ${
                                currentPly === w.ply
                                  ? "text-ink-800"
                                  : "text-paper-400"
                              }`}
                            >
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
                            data-ply={b.ply}
                            onClick={() => goToPly(b.ply)}
                            className={`py-2 px-3 text-left flex items-center justify-between gap-1.5 transition ${
                              currentPly === b.ply
                                ? "bg-paper-100 text-ink-950 font-semibold"
                                : "text-paper-100 hover:bg-ink-900"
                            }`}
                          >
                            <span className="font-mono flex items-center gap-1.5">
                              <span>{b.san}</span>
                              <ChessComBadge
                                classification={b.classification}
                                size={14}
                                className="shrink-0"
                              />
                            </span>
                            <span
                              className={`text-[10px] font-mono tabular ${
                                currentPly === b.ply
                                  ? "text-ink-800"
                                  : "text-paper-400"
                              }`}
                            >
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
              </section>

              {/* Overall Game Review Summary Card */}
              <div className="gsap-stage-block">
                <SummaryCard
                  analysis={analysis}
                  onStartRetryMistakes={handleStartNextRetryMistake}
                  mistakeAndBlunderCount={mistakeMoves.length}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
