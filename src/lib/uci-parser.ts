import { EngineLine, PositionEvaluation } from "@/types/chess";
import { calculateWinPercentage } from "@/lib/evaluation";

export function parseUciInfoLine(
  line: string,
  turn: "w" | "b"
): EngineLine | null {
  if (!line.startsWith("info ") || !line.includes(" score ")) {
    return null;
  }
  // Ignore upperbound/lowerbound intermediate aspiration lines if pv is missing
  if (!line.includes(" pv ")) {
    return null;
  }

  const depthMatch = line.match(/\bdepth\s+(\d+)/);
  const multipvMatch = line.match(/\bmultipv\s+(\d+)/);
  const cpMatch = line.match(/\bscore\s+cp\s+(-?\d+)/);
  const mateMatch = line.match(/\bscore\s+mate\s+(-?\d+)/);
  const pvIndex = line.indexOf(" pv ");

  if (!depthMatch || pvIndex === -1) return null;

  const depth = parseInt(depthMatch[1], 10);
  const multipv = multipvMatch ? parseInt(multipvMatch[1], 10) : 1;
  const pvString = line.slice(pvIndex + 4).trim();
  const pv = pvString.split(/\s+/).filter(Boolean);
  const bestMoveUci = pv[0] || "";

  const perspectiveMultiplier = turn === "w" ? 1 : -1;

  let cp: number | null = null;
  let mate: number | null = null;

  if (mateMatch) {
    const rawMate = parseInt(mateMatch[1], 10);
    mate = rawMate * perspectiveMultiplier;
    cp = (mate > 0 ? 10000 - Math.abs(mate) * 10 : -10000 + Math.abs(mate) * 10);
  } else if (cpMatch) {
    const rawCp = parseInt(cpMatch[1], 10);
    cp = rawCp * perspectiveMultiplier;
  } else {
    return null;
  }

  return {
    multipv,
    depth,
    cp,
    mate,
    pv,
    bestMoveUci,
  };
}

export function buildPositionEvaluation(
  fen: string,
  targetDepth: number,
  linesMap: Map<number, EngineLine>,
  fallbackBestMove: string
): PositionEvaluation {
  const turn = (fen.split(" ")[1] as "w" | "b") || "w";
  const sortedLines = Array.from(linesMap.values()).sort(
    (a, b) => a.multipv - b.multipv
  );

  const primaryLine = sortedLines[0];
  if (!primaryLine) {
    return {
      fen,
      depth: targetDepth,
      cp: 0,
      mate: null,
      bestMoveUci: fallbackBestMove || "",
      winProbWhite: turn === "w" ? 50 : 50,
      lines: [],
    };
  }

  const cp = primaryLine.cp ?? 0;
  const mate = primaryLine.mate;
  const winProbWhite = calculateWinPercentage(cp, mate);

  return {
    fen,
    depth: primaryLine.depth || targetDepth,
    cp,
    mate,
    bestMoveUci: primaryLine.bestMoveUci || fallbackBestMove || "",
    winProbWhite,
    lines: sortedLines,
  };
}

