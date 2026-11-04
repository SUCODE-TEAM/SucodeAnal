import { NextRequest, NextResponse } from "next/server";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import { Chess } from "chess.js";
import { EngineLine, PositionEvaluation } from "@/types/chess";
import {
  buildPositionEvaluation,
  parseUciInfoLine,
} from "@/lib/uci-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STOCKFISH_EXE_PATH = path.join(
  process.cwd(),
  "stockfish",
  "stockfish-windows-x86-64-universal.exe"
);

function isNativeBinaryAvailable(): boolean {
  try {
    return fs.existsSync(STOCKFISH_EXE_PATH);
  } catch {
    return false;
  }
}

class NativeStockfishWorker {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private isReady = false;
  private lineListeners: Set<(line: string) => void> = new Set();
  private buffer = "";
  private queue: Promise<unknown> = Promise.resolve();
  private currentMultiPV = 1;

  private async ensureProcess(): Promise<ChildProcessWithoutNullStreams> {
    if (this.proc && !this.proc.killed && this.isReady) {
      return this.proc;
    }

    return new Promise((resolve, reject) => {
      try {
        const proc = spawn(STOCKFISH_EXE_PATH, [], {
          stdio: ["pipe", "pipe", "pipe"],
        });

        this.proc = proc;
        this.isReady = false;
        this.buffer = "";

        proc.stdout.on("data", (chunk: Buffer) => {
          this.buffer += chunk.toString("utf8");
          const lines = this.buffer.split(/\r?\n/);
          this.buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
              for (const listener of this.lineListeners) {
                listener(trimmed);
              }
            }
          }
        });

        proc.on("error", (err) => {
          this.proc = null;
          this.isReady = false;
          reject(err);
        });

        proc.on("exit", () => {
          this.proc = null;
          this.isReady = false;
        });

        const threads = Math.max(1, Math.min(4, os.cpus().length));
        const initListener = (line: string) => {
          if (line === "uciok") {
            proc.stdin.write(`setoption name Threads value ${threads}\n`);
            proc.stdin.write(`setoption name Hash value 64\n`);
            proc.stdin.write(`isready\n`);
          } else if (line === "readyok") {
            this.lineListeners.delete(initListener);
            this.isReady = true;
            resolve(proc);
          }
        };

        this.lineListeners.add(initListener);
        proc.stdin.write("uci\n");
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
    // Check terminal game state first via chess.js
    try {
      const chess = new Chess(fen);
      if (chess.isGameOver()) {
        const turn = chess.turn();
        if (chess.isCheckmate()) {
          const cp = turn === "w" ? -10000 : 10000;
          const mate = turn === "w" ? -1 : 1;
          return {
            fen,
            depth,
            cp,
            mate,
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
      // Proceed to Stockfish if FEN is custom
    }

    const proc = await this.ensureProcess();
    const turn = (fen.split(" ")[1] as "w" | "b") || "w";
    const clampedDepth = Math.max(1, Math.min(22, depth));
    const clampedMultiPV = Math.max(1, Math.min(3, multiPV));

    return new Promise<PositionEvaluation>((resolve) => {
      const linesMap = new Map<number, EngineLine>();
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.lineListeners.delete(listener);
          proc.stdin.write("stop\n");
          resolve(buildPositionEvaluation(fen, clampedDepth, linesMap, ""));
        }
      }, 8000);

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
            this.lineListeners.delete(listener);
            const parts = line.split(/\s+/);
            const bestMove =
              parts[1] && parts[1] !== "(none)" ? parts[1] : "";
            resolve(
              buildPositionEvaluation(fen, clampedDepth, linesMap, bestMove)
            );
          }
        }
      };

      this.lineListeners.add(listener);

      if (this.currentMultiPV !== clampedMultiPV) {
        proc.stdin.write(
          `setoption name MultiPV value ${clampedMultiPV}\n`
        );
        this.currentMultiPV = clampedMultiPV;
      }

      proc.stdin.write(`position fen ${fen}\n`);
      proc.stdin.write(`go depth ${clampedDepth}\n`);
    });
  }
}

// Global singleton worker for dev & production server
const globalForStockfish = globalThis as unknown as {
  stockfishWorker?: NativeStockfishWorker;
};

function getWorker(): NativeStockfishWorker {
  if (!globalForStockfish.stockfishWorker) {
    globalForStockfish.stockfishWorker = new NativeStockfishWorker();
  }
  return globalForStockfish.stockfishWorker;
}

export async function GET() {
  const available = isNativeBinaryAvailable();
  return NextResponse.json({
    available,
    engineName: available
      ? "Stockfish 19 Native (stockfish-windows-x86-64-universal.exe)"
      : "Stockfish 16 WebAssembly (Browser Web Worker)",
    binaryPath: available
      ? "stockfish/stockfish-windows-x86-64-universal.exe"
      : null,
  });
}

export async function POST(req: NextRequest) {
  if (!isNativeBinaryAvailable()) {
    return NextResponse.json(
      {
        error:
          "Native Stockfish binary is not available on this host. Use Browser WASM mode.",
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const depth = Number(body.depth) || 14;
    const multiPV = Number(body.multiPV) || 1;

    const worker = getWorker();

    if (Array.isArray(body.fens)) {
      const results: PositionEvaluation[] = [];
      for (const fen of body.fens) {
        const res = await worker.evaluate(String(fen), depth, multiPV);
        results.push(res);
      }
      return NextResponse.json({ evaluations: results });
    }

    if (typeof body.fen === "string") {
      const evaluation = await worker.evaluate(body.fen, depth, multiPV);
      return NextResponse.json({ evaluation });
    }

    return NextResponse.json(
      { error: "Missing 'fen' or 'fens' parameter" },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Engine error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

