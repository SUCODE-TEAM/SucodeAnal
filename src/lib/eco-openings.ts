import { OpeningInfo } from "@/types/chess";

/**
 * FR-07: Encyclopedia of Chess Openings (ECO) Database
 * Ordered from more specific to general, matched by longest prefix of SAN moves.
 */
export const ECO_OPENINGS: OpeningInfo[] = [
  // Open Games (1.e4 e5)
  { eco: "C00", name: "King's Pawn Game", moves: "e4" },
  { eco: "C20", name: "Open Game (King's Pawn)", moves: "e4 e5" },
  { eco: "C21", name: "Center Game", moves: "e4 e5 d4 exd4" },
  { eco: "C21", name: "Danish Gambit", moves: "e4 e5 d4 exd4 c3" },
  { eco: "C23", name: "Bishop's Opening", moves: "e4 e5 Bc4" },
  { eco: "C25", name: "Vienna Game", moves: "e4 e5 Nc3" },
  { eco: "C29", name: "Vienna Gambit", moves: "e4 e5 Nc3 Nf6 f4" },
  { eco: "C30", name: "King's Gambit", moves: "e4 e5 f4" },
  { eco: "C33", name: "King's Gambit Accepted", moves: "e4 e5 f4 exf4" },
  { eco: "C40", name: "King's Knight Opening", moves: "e4 e5 Nf3" },
  { eco: "C41", name: "Philidor Defense", moves: "e4 e5 Nf3 d6" },
  { eco: "C42", name: "Petrov's Defense (Russian Game)", moves: "e4 e5 Nf3 Nf6" },
  { eco: "C42", name: "Stafford Gambit", moves: "e4 e5 Nf3 Nf6 Nxe5 Nc6" },
  { eco: "C44", name: "Scotch Game", moves: "e4 e5 Nf3 Nc6 d4" },
  { eco: "C45", name: "Scotch Game: Classical", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4" },
  { eco: "C46", name: "Three Knights Game", moves: "e4 e5 Nf3 Nc6 Nc3" },
  { eco: "C47", name: "Four Knights Game", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6" },
  { eco: "C50", name: "Italian Game", moves: "e4 e5 Nf3 Nc6 Bc4" },
  { eco: "C50", name: "Giuoco Piano", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5" },
  { eco: "C51", name: "Evans Gambit", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4" },
  { eco: "C53", name: "Giuoco Pianissimo", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3" },
  { eco: "C55", name: "Two Knights Defense", moves: "e4 e5 Nf3 Nc6 Bc4 Nf6" },
  { eco: "C57", name: "Fried Liver Attack", moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7" },
  { eco: "C60", name: "Ruy Lopez (Spanish Game)", moves: "e4 e5 Nf3 Nc6 Bb5" },
  { eco: "C65", name: "Ruy Lopez: Berlin Defense", moves: "e4 e5 Nf3 Nc6 Bb5 Nf6" },
  { eco: "C68", name: "Ruy Lopez: Exchange Variation", moves: "e4 e5 Nf3 Nc6 Bb5 a6 Bxc6" },
  { eco: "C78", name: "Ruy Lopez: Morphy Defense", moves: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O" },
  { eco: "C88", name: "Ruy Lopez: Closed", moves: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3" },
  { eco: "C89", name: "Ruy Lopez: Marshall Attack", moves: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5" },

  // Semi-Open Games (1.e4 ...)
  { eco: "B00", name: "Nimzowitsch Defense", moves: "e4 Nc6" },
  { eco: "B01", name: "Scandinavian Defense", moves: "e4 d5" },
  { eco: "B01", name: "Scandinavian Defense: Main Line", moves: "e4 d5 exd5 Qxd5 Nc3 Qa5" },
  { eco: "B02", name: "Alekhine's Defense", moves: "e4 Nf6" },
  { eco: "B06", name: "Modern Defense", moves: "e4 g6" },
  { eco: "B07", name: "Pirc Defense", moves: "e4 d6 d4 Nf6 Nc3 g6" },
  { eco: "B10", name: "Caro-Kann Defense", moves: "e4 c6" },
  { eco: "B12", name: "Caro-Kann Defense: Advance Variation", moves: "e4 c6 d4 d5 e5" },
  { eco: "B13", name: "Caro-Kann Defense: Exchange Variation", moves: "e4 c6 d4 d5 exd5 cxd5" },
  { eco: "B18", name: "Caro-Kann Defense: Classical Variation", moves: "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5" },
  { eco: "C00", name: "French Defense", moves: "e4 e6" },
  { eco: "C01", name: "French Defense: Exchange Variation", moves: "e4 e6 d4 d5 exd5 exd5" },
  { eco: "C02", name: "French Defense: Advance Variation", moves: "e4 e6 d4 d5 e5" },
  { eco: "C03", name: "French Defense: Tarrasch Variation", moves: "e4 e6 d4 d5 Nd2" },
  { eco: "C11", name: "French Defense: Classical", moves: "e4 e6 d4 d5 Nc3 Nf6" },
  { eco: "C15", name: "French Defense: Winawer Variation", moves: "e4 e6 d4 d5 Nc3 Bb4" },

  // Sicilian Defense (1.e4 c5)
  { eco: "B20", name: "Sicilian Defense", moves: "e4 c5" },
  { eco: "B21", name: "Sicilian Defense: Smith-Morra Gambit", moves: "e4 c5 d4 cxd4 c3" },
  { eco: "B22", name: "Sicilian Defense: Alapin Variation", moves: "e4 c5 c3" },
  { eco: "B23", name: "Sicilian Defense: Closed", moves: "e4 c5 Nc3" },
  { eco: "B27", name: "Sicilian Defense: Hyperaccelerated Dragon", moves: "e4 c5 Nf3 g6" },
  { eco: "B30", name: "Sicilian Defense: Rossolimo Variation", moves: "e4 c5 Nf3 Nc6 Bb5" },
  { eco: "B32", name: "Sicilian Defense: Kalashnikov / Loewenthal", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 e5" },
  { eco: "B33", name: "Sicilian Defense: Sveshnikov Variation", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5" },
  { eco: "B35", name: "Sicilian Defense: Accelerated Dragon", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6" },
  { eco: "B40", name: "Sicilian Defense: French Variation", moves: "e4 c5 Nf3 e6" },
  { eco: "B42", name: "Sicilian Defense: Kan Variation", moves: "e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6" },
  { eco: "B44", name: "Sicilian Defense: Taimanov Variation", moves: "e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6" },
  { eco: "B50", name: "Sicilian Defense: Modern Variations", moves: "e4 c5 Nf3 d6" },
  { eco: "B70", name: "Sicilian Defense: Dragon Variation", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6" },
  { eco: "B80", name: "Sicilian Defense: Scheveningen Variation", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6" },
  { eco: "B90", name: "Sicilian Defense: Najdorf Variation", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6" },

  // Queen's Pawn Games (1.d4)
  { eco: "A40", name: "Queen's Pawn Game", moves: "d4" },
  { eco: "A40", name: "Englund Gambit", moves: "d4 e5" },
  { eco: "A45", name: "Trompowsky Attack", moves: "d4 Nf6 Bg5" },
  { eco: "D00", name: "Queen's Pawn Game", moves: "d4 d5" },
  { eco: "D00", name: "Blackmar-Diemer Gambit", moves: "d4 d5 e4 dxe4 Nc3" },
  { eco: "D02", name: "London System", moves: "d4 d5 Nf3 Nf6 Bf4" },
  { eco: "A46", name: "London System", moves: "d4 Nf6 Nf3 e6 Bf4" },
  { eco: "D02", name: "London System: Jobava", moves: "d4 Nf6 Nc3 d5 Bf4" },
  { eco: "D04", name: "Colle System", moves: "d4 d5 Nf3 Nf6 e3" },
  { eco: "D06", name: "Queen's Gambit", moves: "d4 d5 c4" },
  { eco: "D07", name: "Queen's Gambit: Chigorin Defense", moves: "d4 d5 c4 Nc6" },
  { eco: "D08", name: "Queen's Gambit: Albin Countergambit", moves: "d4 d5 c4 e5" },
  { eco: "D10", name: "Slav Defense", moves: "d4 d5 c4 c6" },
  { eco: "D15", name: "Slav Defense: Main Line", moves: "d4 d5 c4 c6 Nf3 Nf6 Nc3" },
  { eco: "D20", name: "Queen's Gambit Accepted (QGA)", moves: "d4 d5 c4 dxc4" },
  { eco: "D30", name: "Queen's Gambit Declined (QGD)", moves: "d4 d5 c4 e6" },
  { eco: "D35", name: "Queen's Gambit Declined: Exchange Variation", moves: "d4 d5 c4 e6 Nc3 Nf6 cxd5 exd5" },
  { eco: "D43", name: "Semi-Slav Defense", moves: "d4 d5 c4 c6 Nf3 Nf6 Nc3 e6" },
  { eco: "D80", name: "Grünfeld Defense", moves: "d4 Nf6 c4 g6 Nc3 d5" },
  { eco: "E00", name: "Catalan Opening", moves: "d4 Nf6 c4 e6 g3" },
  { eco: "E12", name: "Queen's Indian Defense", moves: "d4 Nf6 c4 e6 Nf3 b6" },
  { eco: "E20", name: "Nimzo-Indian Defense", moves: "d4 Nf6 c4 e6 Nc3 Bb4" },
  { eco: "E60", name: "King's Indian Defense (KID)", moves: "d4 Nf6 c4 g6" },
  { eco: "E90", name: "King's Indian Defense: Classical", moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O" },
  { eco: "A56", name: "Benoni Defense", moves: "d4 Nf6 c4 c5" },
  { eco: "A57", name: "Benko Gambit", moves: "d4 Nf6 c4 c5 d5 b5" },
  { eco: "A80", name: "Dutch Defense", moves: "d4 f5" },

  // Flank Openings
  { eco: "A01", name: "Nimzowitsch-Larsen Attack", moves: "b3" },
  { eco: "A02", name: "Bird's Opening", moves: "f4" },
  { eco: "A04", name: "Zukertort / Réti Opening", moves: "Nf3" },
  { eco: "A07", name: "King's Indian Attack (KIA)", moves: "Nf3 d5 g3" },
  { eco: "A09", name: "Réti Opening", moves: "Nf3 d5 c4" },
  { eco: "A10", name: "English Opening", moves: "c4" },
  { eco: "A20", name: "English Opening: King's English", moves: "c4 e5" },
  { eco: "A30", name: "English Opening: Symmetrical Variation", moves: "c4 c5" },
];

/**
 * Matches the longest opening line from ECO_OPENINGS against the game's SAN moves.
 * Also returns the number of plies that belong to the matched book line.
 */
export function detectOpening(sanMoves: string[]): {
  opening: OpeningInfo;
  bookPlyCount: number;
} {
  if (sanMoves.length === 0) {
    return {
      opening: { eco: "A00", name: "Starting Position", moves: "" },
      bookPlyCount: 0,
    };
  }

  let bestMatch: OpeningInfo = {
    eco: "A00",
    name: "Uncommon Opening",
    moves: sanMoves[0] || "",
  };
  let bestPlyCount = 0;

  for (const entry of ECO_OPENINGS) {
    const entryMoves = entry.moves.trim().split(/\s+/);
    if (entryMoves.length > sanMoves.length) continue;

    let matches = true;
    for (let i = 0; i < entryMoves.length; i++) {
      // Strip check/mate symbols (+, #) for comparison
      const cleanPlayed = sanMoves[i].replace(/[+#]/g, "");
      const cleanBook = entryMoves[i].replace(/[+#]/g, "");
      if (cleanPlayed !== cleanBook) {
        matches = false;
        break;
      }
    }

    if (matches && entryMoves.length > bestPlyCount) {
      bestMatch = entry;
      bestPlyCount = entryMoves.length;
    }
  }

  return {
    opening: bestMatch,
    bookPlyCount: bestPlyCount,
  };
}

