import {
  ClassificationCounts,
  EvaluatedMove,
  MoveClassification,
} from "@/types/chess";

/**
 * PRD Section 6 Formula:
 * Win% = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
 *
 * Returns Win Probability (0 to 100) from White's perspective given centipawns or mate.
 */
export function calculateWinPercentage(
  cpFromWhite: number,
  mateFromWhite: number | null
): number {
  if (mateFromWhite !== null) {
    if (mateFromWhite > 0) return 100;
    if (mateFromWhite < 0) return 0;
  }
  const clampedCp = Math.max(-4000, Math.min(4000, cpFromWhite));
  const winPct = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clampedCp)) - 1);
  return Math.max(0, Math.min(100, winPct));
}

/**
 * Classify a move according to PRD Section 6:
 * - Best / Excellent Move: deltaWin% <= 2%
 * - Good Move: deltaWin% between 2% and 5%
 * - Inaccuracy: deltaWin% between 5% and 10%
 * - Mistake: deltaWin% between 10% and 20%
 * - Blunder: deltaWin% > 20% (or turns winning position into loss/draw or allows forced mate)
 */
export function classifyMove(params: {
  uciPlayed: string;
  bestMoveUci: string;
  winProbBefore: number;
  winProbAfter: number;
  mateBefore: number | null; // from moving player's perspective
  mateAfter: number | null; // from moving player's perspective
  isBookMove: boolean;
}): {
  classification: MoveClassification;
  winProbLoss: number;
  moveAccuracy: number;
} {
  const {
    uciPlayed,
    bestMoveUci,
    winProbBefore,
    winProbAfter,
    mateBefore,
    mateAfter,
    isBookMove,
  } = params;

  const isEngineBest =
    uciPlayed.toLowerCase() === bestMoveUci.toLowerCase() &&
    bestMoveUci.length >= 4;

  // Delta Win% loss (clamped >= 0; if move matched engine best, loss is 0)
  const rawLoss = isEngineBest ? 0 : Math.max(0, winProbBefore - winProbAfter);

  // Move accuracy formula (0-100%)
  const moveAccuracy = isEngineBest
    ? 100
    : Math.max(
        0,
        Math.min(100, 103.1668 * Math.exp(-0.04354 * rawLoss) - 3.1669)
      );

  // Book move (opening theory) if within first moves and not a serious error
  if (isBookMove && rawLoss <= 5) {
    return {
      classification: "book",
      winProbLoss: rawLoss,
      moveAccuracy: Math.max(95, moveAccuracy),
    };
  }

  // Exact engine top recommendation
  if (isEngineBest) {
    return {
      classification: "best",
      winProbLoss: 0,
      moveAccuracy: 100,
    };
  }

  // Check forced mate blunder: had no mate against us before, now opponent has forced mate
  const allowedForcedMate =
    (mateBefore === null || mateBefore > 0) &&
    mateAfter !== null &&
    mateAfter < 0 &&
    winProbBefore >= 25;

  // Missed winning position into losing/draw
  if (rawLoss > 20 || allowedForcedMate) {
    return {
      classification: "blunder",
      winProbLoss: rawLoss,
      moveAccuracy,
    };
  }

  if (rawLoss <= 2) {
    return {
      classification: "excellent",
      winProbLoss: rawLoss,
      moveAccuracy,
    };
  }

  if (rawLoss <= 5) {
    return {
      classification: "good",
      winProbLoss: rawLoss,
      moveAccuracy,
    };
  }

  if (rawLoss <= 10) {
    return {
      classification: "inaccuracy",
      winProbLoss: rawLoss,
      moveAccuracy,
    };
  }

  return {
    classification: "mistake",
    winProbLoss: rawLoss,
    moveAccuracy,
  };
}

export function computeAccuracyAndCounts(
  moves: EvaluatedMove[],
  color: "w" | "b"
): {
  accuracy: number;
  counts: ClassificationCounts;
} {
  const playerMoves = moves.filter((m) => m.color === color);
  const counts: ClassificationCounts = {
    book: 0,
    best: 0,
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  };

  if (playerMoves.length === 0) {
    return { accuracy: 100, counts };
  }

  let totalAccuracy = 0;
  for (const m of playerMoves) {
    counts[m.classification]++;
    totalAccuracy += m.moveAccuracy;
  }

  const avgAccuracy = Number((totalAccuracy / playerMoves.length).toFixed(1));
  return {
    accuracy: Math.max(0, Math.min(100, avgAccuracy)),
    counts,
  };
}

export const CLASSIFICATION_META: Record<
  MoveClassification,
  {
    label: string;
    shortLabel: string;
    symbol: string;
    color: string;
    bgColor: string;
    borderColor: string;
    squareHighlight: string;
    description: string;
  }
> = {
  best: {
    label: "Best Move",
    shortLabel: "Best",
    symbol: "✓",
    color: "#95c23d",
    bgColor: "#95c23d",
    borderColor: "#82ab33",
    squareHighlight: "rgba(149, 194, 61, 0.45)",
    description: "Langkah terbaik sesuai rekomendasi utama Stockfish (ΔWin% ≤ 2%)",
  },
  excellent: {
    label: "Excellent",
    shortLabel: "Excellent",
    symbol: "!",
    color: "#96bc4b",
    bgColor: "#96bc4b",
    borderColor: "#85a73f",
    squareHighlight: "rgba(150, 188, 75, 0.4)",
    description: "Langkah sangat kuat, hampir setara langkah terbaik (ΔWin% ≤ 2%)",
  },
  good: {
    label: "Good Move",
    shortLabel: "Good",
    symbol: "👍",
    color: "#96af8b",
    bgColor: "#96af8b",
    borderColor: "#819976",
    squareHighlight: "rgba(150, 175, 139, 0.35)",
    description: "Langkah solid yang menjaga posisi dengan baik (ΔWin% 2%–5%)",
  },
  book: {
    label: "Book Move",
    shortLabel: "Book",
    symbol: "📖",
    color: "#d5a47d",
    bgColor: "#d5a47d",
    borderColor: "#bc8e68",
    squareHighlight: "rgba(213, 164, 125, 0.35)",
    description: "Langkah teori pembukaan standar (ECO Opening Book)",
  },
  inaccuracy: {
    label: "Inaccuracy",
    shortLabel: "Inaccuracy",
    symbol: "?!",
    color: "#f7c631",
    bgColor: "#f7c631",
    borderColor: "#dfb027",
    squareHighlight: "rgba(247, 198, 49, 0.45)",
    description: "Langkah kurang akurat yang mengurangi peluang menang (ΔWin% 5%–10%)",
  },
  mistake: {
    label: "Mistake",
    shortLabel: "Mistake",
    symbol: "?",
    color: "#ffa43d",
    bgColor: "#ffa43d",
    borderColor: "#e58e2d",
    squareHighlight: "rgba(255, 164, 61, 0.5)",
    description: "Kesalahan yang memperburuk posisi secara signifikan (ΔWin% 10%–20%)",
  },
  blunder: {
    label: "Blunder",
    shortLabel: "Blunder",
    symbol: "??",
    color: "#fa412d",
    bgColor: "#fa412d",
    borderColor: "#de3422",
    squareHighlight: "rgba(250, 65, 45, 0.55)",
    description: "Kesalahan fatal yang kehilangan materi atau kemenangan (ΔWin% > 20%)",
  },
};

