export interface SampleGame {
  id: string;
  title: string;
  subtitle: string;
  white: string;
  black: string;
  whiteElo: number;
  blackElo: number;
  result: string;
  timeClass: string;
  pgn: string;
}

export const SAMPLE_GAMES: SampleGame[] = [
  {
    id: "sample_opera_game",
    title: "Paul Morphy vs Duke Karl / Count Isouard",
    subtitle: "The Opera Game (Paris, 1858) — Kombinasi Pengorbanan Klasik",
    white: "Paul Morphy",
    black: "Duke of Brunswick",
    whiteElo: 2690,
    blackElo: 1950,
    result: "1-0",
    timeClass: "rapid",
    pgn: `[Event "Paris Opera"]
[Site "Paris FRA"]
[Date "1858.11.02"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]
[WhiteElo "2690"]
[BlackElo "1950"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`,
  },
  {
    id: "sample_kasparov_topalov",
    title: "Garry Kasparov vs Veselin Topalov",
    subtitle: "Kasparov's Immortal (Wijk aan Zee, 1999) — Taktik Pirc Defense",
    white: "Garry Kasparov",
    black: "Veselin Topalov",
    whiteElo: 2812,
    blackElo: 2700,
    result: "1-0",
    timeClass: "rapid",
    pgn: `[Event "Hoogovens"]
[Site "Wijk aan Zee NED"]
[Date "1999.01.20"]
[White "Garry Kasparov"]
[Black "Veselin Topalov"]
[Result "1-0"]
[WhiteElo "2812"]
[BlackElo "2700"]

1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0`,
  },
  {
    id: "sample_tactical_blunders",
    title: "Club Match: Italian Game Traps & Blunders",
    subtitle: "Contoh Partai dengan Blunder & Mistake untuk Latihan Retry Mistake",
    white: "TacticalPlayer_ID",
    black: "ChessImprover99",
    whiteElo: 1420,
    blackElo: 1385,
    result: "1-0",
    timeClass: "blitz",
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.11.01"]
[White "TacticalPlayer_ID"]
[Black "ChessImprover99"]
[Result "1-0"]
[WhiteElo "1420"]
[BlackElo "1385"]
[TimeControl "180+2"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 Nxe4 8. O-O Nxc3 9. bxc3 Bxc3 10. Ba3 Bxa1 11. Re1+ Ne7 12. Bxe7 Qxe7 13. Rxe7+ Kxe7 14. Qxa1 Rd8 15. Qe1+ Kf8 16. Ng5 d5 17. Nxh7+ Kg8 18. Bd3 Be6 19. Ng5 Re8 20. Qd1 g6 21.Qf3 Kg7 22. Nxe6+ Rxe6 23. Qxd5 Rd6 24. Qe5+ Kg8 25. Bc4 Rad8 26. d5 c6 27. h4 cxd5 28. Bd3 Re6 29. Qg5 Rde8 30. h5 Re5 31. Qf6 Rxh5 32. Bxg6 Re1# 0-1`,
  },
];

