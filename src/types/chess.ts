export type MoveClassification =
  | "book"
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export interface EngineLine {
  multipv: number;
  depth: number;
  cp: number | null; // centipawns from White's perspective
  mate: number | null; // moves to mate from White's perspective (+ for White, - for Black)
  pv: string[]; // UCI moves e.g. ["e2e4", "e7e5"]
  bestMoveUci: string;
}

export interface PositionEvaluation {
  fen: string;
  depth: number;
  cp: number; // normalized cp from White's perspective (mate converted to +-10000)
  mate: number | null; // from White's perspective
  bestMoveUci: string;
  winProbWhite: number; // 0 to 100
  lines: EngineLine[];
}

export interface EvaluatedMove {
  ply: number; // 1-indexed (1 = White's 1st move, 2 = Black's 1st move)
  moveNumber: number; // 1, 1, 2, 2...
  color: "w" | "b";
  san: string;
  uci: string; // e.g. "e2e4"
  from: string;
  to: string;
  fenBefore: string;
  fenAfter: string;
  evalBefore: PositionEvaluation;
  evalAfter: PositionEvaluation;
  bestMoveUci: string;
  bestMoveSan: string;
  winProbBefore: number; // moving player's win% before move
  winProbAfter: number; // moving player's win% after move
  winProbLoss: number; // delta Win% (>= 0)
  cpLoss: number; // centipawn loss (>= 0)
  moveAccuracy: number; // 0 - 100
  classification: MoveClassification;
}

export interface ClassificationCounts {
  book: number;
  best: number;
  excellent: number;
  good: number;
  inaccuracy: number;
  mistake: number;
  blunder: number;
}

export interface OpeningInfo {
  eco: string;
  name: string;
  moves: string;
}

export interface GameMetadata {
  id: string;
  white: {
    username: string;
    rating?: number;
    result?: string;
  };
  black: {
    username: string;
    rating?: number;
    result?: string;
  };
  result: string; // "1-0", "0-1", "1/2-1/2", "*"
  date: string;
  timeControl: string;
  timeClass?: string;
  url?: string;
  pgn: string;
}

export interface GameAnalysisResult {
  id: string;
  analyzedAt: number;
  depth: number;
  multiPV: number;
  engineMode: "native-exe" | "browser-wasm";
  engineName: string;
  metadata: GameMetadata;
  opening: OpeningInfo;
  initialFen: string;
  initialEval: PositionEvaluation;
  moves: EvaluatedMove[];
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteCounts: ClassificationCounts;
  blackCounts: ClassificationCounts;
}

export interface ChessComGameItem {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  time_class: "bullet" | "blitz" | "rapid" | "daily";
  rules: string;
  white: {
    rating: number;
    result: string;
    username: string;
    "@id": string;
  };
  black: {
    rating: number;
    result: string;
    username: string;
    "@id": string;
  };
}

