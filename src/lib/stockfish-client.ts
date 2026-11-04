import { Chess } from "chess.js";
import {
  EngineLine,
  EvaluatedMove,
  GameAnalysisResult,
  GameMetadata,
  PositionEvaluation,
} from "@/types/chess";
import {
  buildPositionEvaluation,
  parseUciInfoLine,
} from "@/lib/uci-parser";
import {
  classifyMove,
  computeAccuracyAndCounts,
} from "@/lib/evaluation";
import { detectOpening } from "@/lib/eco-openings";
import {
  getAnalysisFromCache,
  saveAnalysisToCache,
} from "@/lib/indexeddb";

class BrowserWasmStockfish {
  private worker: Worker | null = null;
  private isReady = false;
  private listeners: Set<(line: string) => void> = new Set();
  private queue: Promise<unknown> = Promise.resolve();
  private currentMultiPV = 1;
  public engineVariant = "Stockfish WASM (Web Worker)";

  private async ensureWorker(): Promise<Worker> {
    if (this.worker && this.isReady) {
      return this.worker;
    }

    return new Promise((resolve, reject) => {
      try {
        const supportsWasm =
          typeof WebAssembly === "object" &&
          typeof WebAssembly.validate === "function";

        const hasSharedArrayBuffer = typeof SharedArrayBuffer !== "undefined";
        this.engineVariant = hasSharedArrayBuffer
          ? "Stockfish WASM (Multi-Thread Ready)"
          : "Stockfish WASM (Single-Thread Fallback)";

        // Use stockfish.js in public/stockfish which works reliably across all browsers & Vercel
        const workerPath = supportsWasm
          ? "/stockfish/stockfish.js"
          : "/stockfish/stockfish.js";

        const worker = new Worker(workerPath);
        this.worker = worker;
        this.isReady = false;

        worker.onmessage = (e: MessageEvent) => {
          const line =
            typeof e.data === "string" ? e.data.trim() : String(e.data).trim();
          if (!line) return;
          for (const listener of this.listeners) {
            listener(line);
          }
        };

        worker.onerror = (err) => {
          this.worker = null;
          this.isReady = false;
          reject(err);
        };

        const initListener = (line: string) => {
          if (line === "uciok") {
            worker.postMessage("setoption name Hash value 32");
            worker.postMessage("isready");
          } else if (line === "readyok") {
            this.listeners.delete(initListener);
            this.isReady = true;
            resolve(worker);
          }
        };

        this.listeners.add(initListener);
        worker.postMessage("uci");
      } catch (err) {
        reject(err);
      }
    });
  }

  public evaluate(
    fen: string,
    depth: number,
    multiPV: number
  ): Promise<PositionEvaluation> {
    const task = this.queue.then(() =>
      this.runEvaluation(fen, depth, multiPV)
    );
    this.queue = task.catch(() => {});
    return task;
  }

  private async runEvaluation(
    fen: string,
    depth: number,
    multiPV: number
  ): Promise<PositionEvaluation> {
    try {
      const chess = new Chess(fen);
      if (chess.isGameOver()) {
        const turn = chess.turn();
        if (chess.isCheckmate()) {
          return {
            fen,
            depth,
            cp: turn === "w" ? -10000 : 10000,
            mate: turn === "w" ? -1 : 1,
            bestMoveUci: "",
            winProbWhite: turn === "w" ? 0 : 100,
            lines: [],
          };
        }
        return {
          fen,
          depth,
          cp: 0,
          mate: null,
          bestMoveUci: "",
          winProbWhite: 50,
          lines: [],
        };
      }
    } catch {
      // Continue to engine
    }

    const worker = await this.ensureWorker();
    const turn = (fen.split(" ")[1] as "w" | "b") || "w";
    const clampedDepth = Math.max(1, Math.min(20, depth));
    const clampedMultiPV = Math.max(1, Math.min(3, multiPV));

    return new Promise<PositionEvaluation>((resolve) => {
      const linesMap = new Map<number, EngineLine>();
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.listeners.delete(listener);
          worker.postMessage("stop");
          resolve(buildPositionEvaluation(fen, clampedDepth, linesMap, ""));
        }
      }, 10000);

      const listener = (line: string) => {
        if (line.startsWith("info ")) {
          const parsed = parseUciInfoLine(line, turn);
          if (parsed) {
            const existing = linesMap.get(parsed.multipv);
            if (!existing || parsed.depth >= existing.depth) {
              linesMap.set(parsed.multipv, parsed);
            }
          }
        } else if (line.startsWith("bestmove ")) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            this.listeners.delete(listener);
            const parts = line.split(/\s+/);
            const bestMove =
              parts[1] && parts[1] !== "(none)" ? parts[1] : "";
            resolve(
              buildPositionEvaluation(fen, clampedDepth, linesMap, bestMove)
            );
          }
        }
      };

      this.listeners.add(listener);

      if (this.currentMultiPV !== clampedMultiPV) {
        worker.postMessage(`setoption name MultiPV value ${clampedMultiPV}`);
        this.currentMultiPV = clampedMultiPV;
      }

      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(`go depth ${clampedDepth}`);
    });
  }
}

let browserWasmInstance: BrowserWasmStockfish | null = null;

function getBrowserWasmEngine(): BrowserWasmStockfish {
  if (!browserWasmInstance) {
    browserWasmInstance = new BrowserWasmStockfish();
  }
  return browserWasmInstance;
}

export async function checkNativeEngineStatus(): Promise<{
  available: boolean;
  engineName: string;
}> {
  try {
    const res = await fetch("/api/stockfish", { method: "GET" });
    if (!res.ok) return { available: false, engineName: "Stockfish WASM" };
    return await res.json();
  } catch {
    return { available: false, engineName: "Stockfish WASM" };
  }
}

export async function evaluateSinglePosition(
  fen: string,
  depth: number,
  multiPV: number,
  mode: "native-exe" | "browser-wasm"
): Promise<PositionEvaluation> {
  if (mode === "native-exe") {
    try {
      const res = await fetch("/api/stockfish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fen, depth, multiPV }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.evaluation) return data.evaluation;
      }
    } catch {
      // Fallback to WASM if native endpoint fails
    }
  }
  return getBrowserWasmEngine().evaluate(fen, depth, multiPV);
}

function uciToSan(fen: string, uciMove: string): string {
  if (!uciMove || uciMove.length < 4) return "";
  try {
    const chess = new Chess(fen);
    const from = uciMove.slice(0, 2);
    const to = uciMove.slice(2, 4);
    const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
    const moveObj = chess.move({ from, to, promotion });
    return moveObj ? moveObj.san : uciMove;
  } catch {
    return uciMove;
  }
}

export function extractMetadataFromPgn(
  pgn: string,
  fallbackId?: string
): GameMetadata {
  const getHeader = (key: string): string => {
    const regex = new RegExp(`\\[${key}\\s+"([^"]*)"\\]`, "i");
    const match = pgn.match(regex);
    return match ? match[1] : "";
  };

  const whiteName = getHeader("White") || "White Player";
  const blackName = getHeader("Black") || "Black Player";
  const whiteElo = parseInt(getHeader("WhiteElo"), 10);
  const blackElo = parseInt(getHeader("BlackElo"), 10);
  const result = getHeader("Result") || "*";
  const date = getHeader("Date") || getHeader("UTCDate") || "Unknown Date";
  const timeControl = getHeader("TimeControl") || "-";
  const link = getHeader("Link") || getHeader("Site") || "";

  // Deterministic cache ID based on moves + players
  const rawHash = `${whiteName}_${blackName}_${date}_${pgn.length}_${pgn.slice(
    -80
  )}`
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 64);

  return {
    id: fallbackId || `game_${rawHash}`,
    white: {
      username: whiteName,
      rating: !isNaN(whiteElo) ? whiteElo : undefined,
    },
    black: {
      username: blackName,
      rating: !isNaN(blackElo) ? blackElo : undefined,
    },
    result,
    date,
    timeControl,
    url: link.startsWith("http") ? link : undefined,
    pgn,
  };
}

export async function analyzeGame(params: {
  pgnOrFen: string;
  metadata?: Partial<GameMetadata>;
  depth: number;
  multiPV: number;
  engineMode: "native-exe" | "browser-wasm";
  forceReanalyze?: boolean;
  onProgress?: (currentPly: number, totalPlies: number, statusText: string) => void;
}): Promise<GameAnalysisResult> {
  const {
    pgnOrFen,
    metadata: customMeta,
    depth,
    multiPV,
    engineMode,
    forceReanalyze = false,
    onProgress,
  } = params;

  const trimmed = pgnOrFen.trim();
  const chess = new Chess();
  let isFenOnly = false;

  // Determine whether input is a raw FEN string or PGN
  const fenParts = trimmed.split(/\s+/);
  if (
    !trimmed.includes("[") &&
    fenParts.length >= 4 &&
    fenParts.length <= 6 &&
    fenParts[0].includes("/")
  ) {
    chess.load(trimmed);
    isFenOnly = true;
  } else {
    chess.loadPgn(trimmed);
  }

  const baseMeta = extractMetadataFromPgn(trimmed, customMeta?.id);
  const metadata: GameMetadata = {
    ...baseMeta,
    ...customMeta,
    white: { ...baseMeta.white, ...customMeta?.white },
    black: { ...baseMeta.black, ...customMeta?.black },
    pgn: trimmed,
  };

  const cacheId = `${metadata.id}_d${depth}_pv${multiPV}`;
  if (!forceReanalyze) {
    const cached = await getAnalysisFromCache(cacheId);
    if (cached) {
      onProgress?.(
        cached.moves.length,
        cached.moves.length,
        "Memuat hasil analisa dari cache lokal (IndexedDB)..."
      );
      return cached;
    }
  }

  const verboseHistory = chess.history({ verbose: true });
  const sanMoves = verboseHistory.map((m) => m.san);
  const { opening, bookPlyCount } = detectOpening(sanMoves);

  // Collect all FEN positions: [initialFen, afterMove1, afterMove2, ...]
  const initialFen = isFenOnly
    ? trimmed
    : verboseHistory.length > 0
    ? verboseHistory[0].before
    : chess.fen();

  const fensToEvaluate: string[] = [initialFen];
  for (const m of verboseHistory) {
    fensToEvaluate.push(m.after);
  }

  const totalPositions = fensToEvaluate.length;
  const evaluations: PositionEvaluation[] = [];

  if (engineMode === "native-exe") {
    // Evaluate in small batches of 6 positions so progress bar updates smoothly
    const batchSize = 6;
    for (let i = 0; i < totalPositions; i += batchSize) {
      const batch = fensToEvaluate.slice(i, i + batchSize);
      onProgress?.(
        i,
        totalPositions - 1,
        `Mengevaluasi langkah ${Math.min(
          i + 1,
          totalPositions - 1
        )} / ${Math.max(1, totalPositions - 1)} (Stockfish 19 Native .EXE)...`
      );

      try {
        const res = await fetch("/api/stockfish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fens: batch, depth, multiPV }),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            evaluations: PositionEvaluation[];
          };
          evaluations.push(...data.evaluations);
          continue;
        }
      } catch {
        // Fallback to browser WASM for remaining if native call failed
      }

      for (const fen of batch) {
        const ev = await getBrowserWasmEngine().evaluate(fen, depth, multiPV);
        evaluations.push(ev);
      }
    }
  } else {
    const wasmEngine = getBrowserWasmEngine();
    for (let i = 0; i < totalPositions; i++) {
      onProgress?.(
        i,
        Math.max(1, totalPositions - 1),
        `Mengevaluasi langkah ${i} / ${Math.max(
          1,
          totalPositions - 1
        )} (Stockfish WASM Web Worker)...`
      );
      const ev = await wasmEngine.evaluate(fensToEvaluate[i], depth, multiPV);
      evaluations.push(ev);
    }
  }

  const evaluatedMoves: EvaluatedMove[] = [];

  for (let i = 0; i < verboseHistory.length; i++) {
    const move = verboseHistory[i];
    const evalBefore = evaluations[i];
    const evalAfter = evaluations[i + 1];
    const color = move.color; // 'w' | 'b'
    const uciPlayed = `${move.from}${move.to}${move.promotion || ""}`;

    // Win% from the moving player's perspective
    const winProbBefore =
      color === "w" ? evalBefore.winProbWhite : 100 - evalBefore.winProbWhite;
    const winProbAfter =
      color === "w" ? evalAfter.winProbWhite : 100 - evalAfter.winProbWhite;

    // Centipawn from moving player's perspective
    const cpBeforePlayer = color === "w" ? evalBefore.cp : -evalBefore.cp;
    const cpAfterPlayer = color === "w" ? evalAfter.cp : -evalAfter.cp;
    const cpLoss = Math.max(0, cpBeforePlayer - cpAfterPlayer);

    const mateBeforePlayer =
      evalBefore.mate !== null
        ? color === "w"
          ? evalBefore.mate
          : -evalBefore.mate
        : null;
    const mateAfterPlayer =
      evalAfter.mate !== null
        ? color === "w"
          ? evalAfter.mate
          : -evalAfter.mate
        : null;

    const bestMoveUci = evalBefore.bestMoveUci || uciPlayed;
    const bestMoveSan =
      uciToSan(move.before, bestMoveUci) || move.san;

    const isBookMove = i < bookPlyCount;

    const { classification, winProbLoss, moveAccuracy } = classifyMove({
      uciPlayed,
      bestMoveUci,
      winProbBefore,
      winProbAfter,
      mateBefore: mateBeforePlayer,
      mateAfter: mateAfterPlayer,
      isBookMove,
    });

    evaluatedMoves.push({
      ply: i + 1,
      moveNumber: Math.floor(i / 2) + 1,
      color,
      san: move.san,
      uci: uciPlayed,
      from: move.from,
      to: move.to,
      fenBefore: move.before,
      fenAfter: move.after,
      evalBefore,
      evalAfter,
      bestMoveUci,
      bestMoveSan,
      winProbBefore,
      winProbAfter,
      winProbLoss,
      cpLoss,
      moveAccuracy,
      classification,
    });
  }

  const whiteStats = computeAccuracyAndCounts(evaluatedMoves, "w");
  const blackStats = computeAccuracyAndCounts(evaluatedMoves, "b");

  const result: GameAnalysisResult = {
    id: cacheId,
    analyzedAt: Date.now(),
    depth,
    multiPV,
    engineMode,
    engineName:
      engineMode === "native-exe"
        ? "Stockfish 19 Native (x86-64 Universal .EXE)"
        : getBrowserWasmEngine().engineVariant,
    metadata,
    opening,
    initialFen,
    initialEval: evaluations[0],
    moves: evaluatedMoves,
    whiteAccuracy: whiteStats.accuracy,
    blackAccuracy: blackStats.accuracy,
    whiteCounts: whiteStats.counts,
    blackCounts: blackStats.counts,
  };

  await saveAnalysisToCache(result);
  onProgress?.(
    totalPositions - 1,
    Math.max(1, totalPositions - 1),
    "Analisa selesai!"
  );

  return result;
}

