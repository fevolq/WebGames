const KEY = 'snake:best:v1';
export function readBest() {
  try { const value = Number(localStorage.getItem(KEY)); return Number.isSafeInteger(value) && value >= 0 ? value : 0; } catch { return 0; }
}
export function writeBest(value: number) {
  try { localStorage.setItem(KEY, String(Math.max(value, readBest()))); return true; } catch { return false; }
}
