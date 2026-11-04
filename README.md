# ♟️ ChessInsight — Website Analisa Pertandingan Catur Gratis (Chess.com & Stockfish)

Platform analisa pertandingan catur gratis tanpa batas (*Unlimited Game Review*) berbasis **Next.js (React) + TypeScript + Tailwind CSS** yang mengintegrasikan **Chess.com Published-Data API** dan **Stockfish Engine (Hybrid Native `.EXE` & Browser WebAssembly)**.

## ✨ Fitur Utama (Sesuai PRD v1.0)

1. **Integrasi API Chess.com (`FR-01`)**: Ambil daftar pertandingan terbaru dari username publik Chess.com dalam waktu < 2 detik lengkap dengan header `User-Agent` resmi.
2. **Input PGN & FEN Manual (`FR-02`)**: Tempelkan teks PGN atau posisi FEN secara langsung, atau pilih dari partai contoh klasik.
3. **Hybrid Stockfish Engine (`FR-03` & Vercel-Ready)**:
   - **Mode Lokal (`Stockfish 19 Native .EXE`)**: Menggunakan langsung binary [`stockfish/stockfish-windows-x86-64-universal.exe`](./stockfish/stockfish-windows-x86-64-universal.exe) yang sudah disediakan melalui endpoint `/api/stockfish` dengan protokol UCI multi-thread.
   - **Mode Cloud / Vercel (`Stockfish WASM Web Worker`)**: Menjalankan [`public/stockfish/stockfish.js`](./public/stockfish/stockfish.js) & [`public/stockfish/stockfish.wasm`](./public/stockfish/stockfish.wasm) di dalam *Web Worker* browser (beban server 0%, siap di-hosting gratis di **Vercel**).
4. **Papan Catur Interaktif 2D (`FR-04`)**: Navigasi tombol panah keyboard (`←`, `→`, `↑`, `↓`), *drag-and-drop* eksplorasi langkah bebas, balik papan (*flip board*), dan panah visual rekomendasi langkah terbaik Stockfish.
5. **Klasifikasi Langkah & Skor Akurasi (`FR-05`)**: Menghitung $\text{Win\%} = 50 + 50 \times \left(\frac{2}{1 + e^{-0.00368208 \times \text{cp}}} - 1\right)$ dan $\Delta\text{Win\%}$ untuk melabeli langkah (**Book**, **Best**, **Excellent**, **Good**, **Inaccuracy**, **Mistake**, **Blunder**) serta akurasi pemain (0–100%).
6. **Evaluation Bar & Grafik Evaluasi Interaktif (`FR-06`)**: Bar evaluasi vertikal dinamis dan grafik kurva evaluasi di sepanjang partai yang bisa diklik untuk melompat ke langkah mana pun.
7. **Deteksi Pembukaan / Opening ECO (`FR-07`)**: Mencocokkan langkah awal dengan database *Encyclopedia of Chess Openings (ECO)*.
8. **Mode Latihan Interaktif "Retry Mistake" (`FR-08`)**: Menyembunyikan saran engine saat tiba di langkah *Mistake* / *Blunder* dan menantang pengguna menebak langkah terbaik di atas papan.
9. **Penyimpanan Cache Lokal IndexedDB & Fitur Bagikan (`Fase 3`)**: Menyimpan riwayat pertandingan yang sudah dianalisa di IndexedDB browser agar tidak perlu dihitung ulang.

## 🚀 Cara Menjalankan secara Lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000` di browser.

## ☁️ Cara Deploy ke Vercel

Proyek ini sudah dilengkapi dengan [`vercel.json`](./vercel.json), header `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`, serta [`.vercelignore`](./.vercelignore) sehingga siap di-deploy langsung ke **Vercel**:

1. Push repositori ini ke GitHub / GitLab, atau jalankan `npx vercel`.
2. Saat berjalan di Vercel, aplikasi otomatis menggunakan **Stockfish WebAssembly (WASM) di Web Worker browser** sehingga 100% gratis dan bebas limit CPU serverless.

