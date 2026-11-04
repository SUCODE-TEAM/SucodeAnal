import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChessInsight — Website Analisa Pertandingan Catur Gratis (Chess.com & Stockfish)",
  description:
    "Analisa pertandingan catur Chess.com & PGN tanpa batas (Unlimited Game Review) menggunakan Stockfish 19 Native & WebAssembly.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

