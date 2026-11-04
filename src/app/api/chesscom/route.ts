import { NextRequest, NextResponse } from "next/server";
import { ChessComGameItem } from "@/types/chess";

const USER_AGENT =
  "ChessInsight/1.0 (Free Chess Game Analysis Platform; contact@chessinsight.app)";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username")?.trim().toLowerCase();

  if (!username) {
    return NextResponse.json(
      { error: "Username Chess.com wajib diisi." },
      { status: 400 }
    );
  }

  try {
    // 1. Fetch player archives list
    const archivesRes = await fetch(
      `https://api.chess.com/pub/player/${encodeURIComponent(
        username
      )}/games/archives`,
      {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        next: { revalidate: 60 },
      }
    );

    if (archivesRes.status === 404) {
      return NextResponse.json(
        { error: `Username "${username}" tidak ditemukan di Chess.com.` },
        { status: 404 }
      );
    }

    if (archivesRes.status === 429) {
      return NextResponse.json(
        {
          error:
            "Terlalu banyak permintaan ke API Chess.com (HTTP 429). Silakan tunggu beberapa detik.",
        },
        { status: 429 }
      );
    }

    if (!archivesRes.ok) {
      return NextResponse.json(
        { error: `Gagal mengambil data dari Chess.com (Status ${archivesRes.status}).` },
        { status: archivesRes.status }
      );
    }

    const archivesData = (await archivesRes.json()) as { archives?: string[] };
    const archives = archivesData.archives || [];

    if (archives.length === 0) {
      return NextResponse.json({ games: [], archivesCount: 0 });
    }

    // Fetch the most recent archive first; if fewer than 12 games, also fetch the previous month sequentially (rate-limit friendly)
    const latestArchiveUrl = archives[archives.length - 1];
    const latestGamesRes = await fetch(latestArchiveUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      next: { revalidate: 30 },
    });

    let allGames: ChessComGameItem[] = [];
    if (latestGamesRes.ok) {
      const latestData = (await latestGamesRes.json()) as {
        games?: ChessComGameItem[];
      };
      allGames = (latestData.games || []).filter(
        (g) => g.rules === "chess" && g.pgn
      );
    }

    if (allGames.length < 12 && archives.length >= 2) {
      const prevArchiveUrl = archives[archives.length - 2];
      const prevRes = await fetch(prevArchiveUrl, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        next: { revalidate: 120 },
      });
      if (prevRes.ok) {
        const prevData = (await prevRes.json()) as {
          games?: ChessComGameItem[];
        };
        const prevGames = (prevData.games || []).filter(
          (g) => g.rules === "chess" && g.pgn
        );
        allGames = [...prevGames, ...allGames];
      }
    }

    // Sort newest first and return up to 40 games
    allGames.sort((a, b) => (b.end_time || 0) - (a.end_time || 0));
    const recentGames = allGames.slice(0, 40);

    return NextResponse.json({
      username,
      games: recentGames,
      archivesCount: archives.length,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal menghubungi server Chess.com";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

