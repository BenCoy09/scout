import { archetype, copyScore, verdict, type Report } from "./scout";

export type Saved = {
  addr: string; savedAt: number; type: string; verdict: string; tone: "bad" | "warn" | "acid";
  score: number; perDay: number; avgLev: number; pnl: number; winRate: number | null; trades: number; spanDays: number;
};

const KEY = "scout_watch";

export function getSaved(): Saved[] {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function put(list: Saved[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

export function saveReport(r: Report): void {
  if (!r.addr || r.sample) return;
  const v = verdict(r);
  const entry: Saved = {
    addr: r.addr, savedAt: Date.now(), type: archetype(r)[0], verdict: v.label, tone: v.tone,
    score: copyScore(r), perDay: r.perDay, avgLev: r.avgLev, pnl: r.pnl, winRate: r.winRate, trades: r.trades, spanDays: r.spanDays,
  };
  put([entry, ...getSaved().filter((s) => s.addr !== r.addr)]);
}

export function removeSaved(addr: string): Saved[] {
  const list = getSaved().filter((s) => s.addr !== addr);
  put(list);
  return list;
}
