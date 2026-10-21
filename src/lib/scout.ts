/* eslint-disable @typescript-eslint/no-explicit-any */
export type Insight = { title: string; body: string; tone: "warn" | "good" };
export type Report = {
  sample: boolean; pnl: number; fees: number; takerFees: number; rebates: number; savings: number;
  winRate: number | null; liqs: number; avgLev: number; trades: number; spanDays: number; perDay: number;
  takerPct: number; maxDD: number | null; curve: number[]; insights: Insight[];
};

export const n = (v: any) => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0; };
export const usd = (v: number) => (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

export const EXAMPLES: [string, string][] = [
  ["Example wallet 1", "0x6139192a58152932e6f8052ef0de2ad197fb1937"],
  ["Example wallet 2", "0x47b7d72611a756b867e029d21bcf96871fad157b"],
];

export function buildReport(pf: any, fr: any): Report {
  const fills: any[] = [...(fr?.fills ?? [])].sort((a, b) => a.timestamp - b.timestamp);
  const fees = fills.reduce((s, f) => s + Math.max(n(f.fee), 0), 0);
  const rebates = fills.reduce((s, f) => s + Math.max(-n(f.fee), 0), 0);
  const takerFees = fills.filter((f) => f.role === "taker").reduce((s, f) => s + Math.max(n(f.fee), 0), 0);
  const pnl = fills.reduce((s, f) => s + n(f.realized_pnl), 0);
  const wins = fills.filter((f) => n(f.realized_pnl) > 0).length;
  const losses = fills.filter((f) => n(f.realized_pnl) < 0).length;
  const liqs = fills.filter((f) => f.auto_close_type === "liquidation").length;
  const levs = fills.map((f) => n(f.leverage)).filter((l) => l > 0);
  const half = Math.floor(levs.length / 2);
  const hist: any[][] = pf?.history_perp_only ?? [];
  const curve: number[] = hist.map((p) => n(p[2]) + n(p[3]));
  const eq = n(hist.slice(-1)[0]?.[1]);
  let peak = -Infinity, dd = 0;
  for (const v of curve) {
    if (v > peak) peak = v;
    dd = Math.min(dd, v - peak);
  }
  const tier = (pf?.fee_tiers ?? []).find((t: any) => t.Tier === pf?.fee_tier);
  const ratioRaw = tier && n(tier.TakerRate) > 0 ? 1 - n(tier.MakerRate) / n(tier.TakerRate) : 0;
  const savings = takerFees * 0.25 * Math.min(Math.max(ratioRaw, 0), 2);
  const spanDays = fills.length > 1 ? (fills[fills.length - 1].timestamp - fills[0].timestamp) / 86400000 : 0;
  const perDay = spanDays > 0 ? fills.length / Math.max(spanDays, 1 / 24) : 0;
  const takerPct = fills.length ? fills.filter((f) => f.role === "taker").length / fills.length : 0;
  let revenge = 0;
  for (let i = 0; i < fills.length - 1; i++) {
    if (n(fills[i].realized_pnl) < 0) {
      const next = fills.slice(i + 1, i + 6).find((f) => n(f.realized_pnl) === 0);
      if (next && next.timestamp - fills[i].timestamp < 300000) revenge++;
    }
  }
  const insights: Insight[] = [];
  if (fills.length >= 500 && perDay > 300)
    insights.push({ tone: "warn", title: "Looks like a bot or high-frequency trader", body: `About ${Math.round(perDay).toLocaleString()} fills per day in this sample. Copying a wallet like this is usually not realistic, because your copies would arrive after the trades.` });
  if (fees > 0 && takerFees / fees > 0.6)
    insights.push({ tone: "warn", title: "Most fees are taker fees", body: `About ${Math.round((takerFees / fees) * 100)}% of fees come from taker orders. Using limit orders more often could save roughly ${usd(savings)} (estimate).` });
  if (revenge >= 3)
    insights.push({ tone: "warn", title: "Possible revenge trades", body: `${revenge} times a new trade opened within 5 minutes of a losing close. Pausing after a loss may help.` });
  if (half >= 5 && avg(levs.slice(half)) > avg(levs.slice(0, half)) * 1.25)
    insights.push({ tone: "warn", title: "Leverage is creeping up", body: `Recent trades use about ${avg(levs.slice(half)).toFixed(1)}x vs ${avg(levs.slice(0, half)).toFixed(1)}x earlier.` });
  if (liqs > 0)
    insights.push({ tone: "warn", title: "Liquidations found", body: `${liqs} fill(s) in this sample were liquidations.` });
  if (curve.length > 1 && eq > 0 && -dd > eq * 0.3)
    insights.push({ tone: "warn", title: "Big drop from the profit peak", body: `Profit fell by about ${usd(-dd)} from its peak (estimate).` });
  if (insights.length === 0)
    insights.push({ tone: "good", title: "No red flags in this sample", body: "Nothing unusual showed up in the fills we checked." });
  return {
    sample: false, pnl, fees, takerFees, rebates, savings,
    winRate: wins + losses > 0 ? wins / (wins + losses) : null,
    liqs, avgLev: avg(levs), trades: fills.length, spanDays, perDay, takerPct,
    maxDD: curve.length > 1 ? dd : null, curve, insights,
  };
}

export function archetype(r: Report): [string, string] {
  if (r.trades >= 500 && r.perDay > 300) return ["The Machine", "Fills faster than a human can click. Copying it is not realistic."];
  if (r.liqs > 0 || r.avgLev >= 20) return ["The Degen", "High leverage, high drama. Fun to watch, risky to follow."];
  if (r.takerPct < 0.35 && r.trades > 20) return ["The Market Maker", "Mostly resting orders. Patient and fee-smart."];
  if ((r.winRate ?? 0) >= 0.6 && r.avgLev < 10) return ["The Sniper", "Picks its spots, wins often, keeps leverage moderate."];
  return ["The Everyday Trader", "A balanced mix. Nothing wild, nothing flawless."];
}

export function verdict(r: Report): { label: string; tone: "bad" | "warn" | "acid" } {
  if (r.insights.some((i) => i.title.startsWith("Looks like a bot"))) return { label: "Hard to copy", tone: "bad" };
  if (r.insights.some((i) => i.tone === "warn")) return { label: "Proceed with care", tone: "warn" };
  return { label: "No red flags in this sample", tone: "acid" };
}

export function copyScore(r: Report): number {
  let s = 100;
  const bot = r.insights.some((i) => i.title.startsWith("Looks like a bot"));
  if (bot) s -= 50; else if (r.perDay > 100) s -= 15;
  if (r.avgLev > 10) s -= Math.min((r.avgLev - 10) * 1.5, 20);
  if (r.liqs > 0) s -= 15;
  s -= r.insights.filter((i) => i.tone === "warn" && !i.title.startsWith("Looks like a bot")).length * 5;
  return Math.max(0, Math.min(100, Math.round(s)));
}

export const DEMO: Report = {
  sample: true, pnl: 1840.5, fees: 412.3, takerFees: 301.2, rebates: 22.4, savings: 38.6,
  winRate: 0.61, liqs: 0, avgLev: 6.4, trades: 142, spanDays: 21, perDay: 7, takerPct: 0.7, maxDD: -240,
  curve: [0, 40, 120, 5, 90, 210, 180, 330, 420, 500],
  insights: [
    { tone: "warn", title: "Most fees are taker fees", body: "About 73% of fees come from taker orders. Using limit orders more often could save roughly $38.60 (estimate)." },
    { tone: "warn", title: "Possible revenge trades", body: "4 times a new trade opened within 5 minutes of a losing close. Pausing after a loss may help." },
  ],
};

export const DEMO_B: Report = {
  sample: true, pnl: 159.47, fees: 85.64, takerFees: 85.64, rebates: 0, savings: 25.2,
  winRate: 0.52, liqs: 0, avgLev: 3.2, trades: 1000, spanDays: 0.12, perDay: 8400, takerPct: 1, maxDD: -1995.9,
  curve: [0, 300, 900, 1500, 1700, 1750, 1800, 1790, 1820, 1850],
  insights: [
    { tone: "warn", title: "Looks like a bot or high-frequency trader", body: "About 8,400 fills per day in this sample. Copying a wallet like this is usually not realistic, because your copies would arrive after the trades." },
  ],
};

export async function load(addr: string) {
  const get = async (path: string) => {
    const res = await fetch(`/api/strike?path=${path}&address=${encodeURIComponent(addr)}`);
    const text = await res.text();
    if (!res.ok) throw new Error(`Strike returned ${res.status}: ${text.slice(0, 120)}`);
    return JSON.parse(text);
  };
  const [pf, fr] = await Promise.all([get("portfolio"), get("fills")]);
  return buildReport(pf, fr);
}
