import { GameAnalysisResult } from "@/types/chess";

const DB_NAME = "chessinsight_db";
const DB_VERSION = 1;
const STORE_NAME = "analyses";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available in this environment"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("analyzedAt", "analyzedAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAnalysisToCache(
  analysis: GameAnalysisResult
): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(analysis);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn("Failed to cache analysis in IndexedDB:", err);
  }
}

export async function getAnalysisFromCache(
  id: string
): Promise<GameAnalysisResult | null> {
  try {
    const db = await openDB();
    const result = await new Promise<GameAnalysisResult | null>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      }
    );
    db.close();
    return result;
  } catch {
    return null;
  }
}

export async function getAllCachedAnalyses(): Promise<GameAnalysisResult[]> {
  try {
    const db = await openDB();
    const results = await new Promise<GameAnalysisResult[]>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result || []) as GameAnalysisResult[];
          list.sort((a, b) => b.analyzedAt - a.analyzedAt);
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      }
    );
    db.close();
    return results;
  } catch {
    return [];
  }
}

export async function deleteCachedAnalysis(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn("Failed to delete cached analysis:", err);
  }
}

