// Copies the full (non-lite) Stockfish 19 WASM engines from node_modules into
// public/stockfish so they can be served as static Web Worker files.
// The .wasm files are ~95 MB each, so they are not committed to git.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const binDir = path.join(path.dirname(require.resolve("stockfish/package.json")), "bin");
const outDir = path.join(process.cwd(), "public", "stockfish");

const files = [
  "stockfish-19.js",
  "stockfish-19.wasm",
  "stockfish-19-single.js",
  "stockfish-19-single.wasm",
];

mkdirSync(outDir, { recursive: true });
for (const file of files) {
  copyFileSync(path.join(binDir, file), path.join(outDir, file));
}
console.log(`Stockfish 19 (full) copied to ${path.relative(process.cwd(), outDir)}`);

