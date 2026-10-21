/* eslint-disable @typescript-eslint/no-explicit-any */
export type Insight = { title: string; body: string; tone: "warn" | "good" };
export type Report = {
  sample: boolean; pnl: number; fees: number; takerFees: number; rebates: number; savings: number; savingsPct: number;
  winRate: number | null; closed: number; liqs: number; avgLev: number; trades: number; spanDays: number; perDay: number;
  takerPct: number; maxDD: number | null; maxDDPct: number | null; curve: number[]; insights: Insight[];
  funding: number | null; notional: number; equity: number;
};

export const n = (v: any) => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0; };
export const usd = (v: number) => (v < 0 ? "\u2212$" : "$") + Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

export const EXAMPLES: [string, string][] = [
  ["Example wallet 1", "0x6139192a58152932e6f8052ef0de2ad197fb1937"],
  ["Example wallet 2", "0x47b7d72611a756b867e029d21bcf96871fad157b"],
];

export function checkInput(s: string): string | null {
  const t = s.trim();
  if (!t) return "Paste a wallet address or account ID to start.";
  const ok =
    /^addr1[0-9a-z]{20,}$/i.test(t) ||
    /^0x[0-9a-fA-F]{40}$/.test(t) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t) ||
    /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(t);
  return ok ? null : "That doesn’t look like a wallet address. Cardano starts with addr1, Ethereum with 0x, and Solana is 32 to 44 letters and numbers.";
}

export function buildReport(pf: any, fr: any, fu: any): Report {
  const fills: any[] = [...(fr?.fills ?? [])].sort((a, b) => a.timestamp - b.timestamp);
  const fees = fills.reduce((s, f) => s + Math.max(n(f.fee), 0), 0);
  const rebates = fills.reduce((s, f) => s + Math.max(-n(f.fee), 0), 0);
  const takerFees = fills.filter((f) => f.role === "taker").reduce((s, f) => s + Math.max(n(f.fee), 0), 0);
  const pnl = fills.reduce((s, f) => s + n(f.realized_pnl), 0);
  const closing = fills.filter((f) => n(f.realized_pnl) !== 0);
  const wins = closing.filter((f) => n(f.realized_pnl) - Math.max(n(f.fee), 0) > 0).length;
  const liqs = fills.filter((f) => f.auto_close_type === "liquidation").length;
  const levs = fills.map((f) => n(f.leverage)).filter((l) => l > 0);
  const half = Math.floor(levs.length / 2);
  const hist: any[][] = pf?.history_perp_only ?? [];
  const curve: number[] = hist.map((p) => n(p[2]) + n(p[3]));
  const equity = n(hist.slice(-1)[0]?.[1]);
  const peakVal = Math.max(0, ...hist.map((p) => n(p[1])));
  let peak = -Infinity, dd = 0;
  for (const v of curve) {
    if (v > peak) peak = v;
    dd = Math.min(dd, v - peak);
  }
  const tier = (pf?.fee_tiers ?? []).find((t: any) => t.Tier === pf?.fee_tier);
  const ratioRaw = tier && n(tier.TakerRate) > 0 ? 1 - n(tier.MakerRate) / n(tier.TakerRate) : 0;
  const ratio = Math.min(Math.max(ratioRaw, 0), 1);
  const savings = takerFees * 0.25 * ratio;
  const spanDays = fills.length > 1 ? (fills[fills.length - 1].timestamp - fills[0].timestamp) / 86400000 : 0;
  const perDay = spanDays > 0 ? fills.length / Math.max(spanDays, 1 / 24) : 0;
  const takerPct = fills.length ? fills.filter((f) => f.role === "taker").length / fills.length : 0;
  const notional = fills.reduce((s, f) => s + Math.abs(n(f.price) * n(f.size)), 0);
  const t0 = fills[0]?.timestamp ?? 0;
  const funding = fu && Array.isArray(fu.funding)
    ? fu.funding.filter((f: any) => f.timestamp >= t0).reduce((s: number, f: any) => s + n(f.amount), 0)
    : null;
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
  if (curve.length > 1 && equity > 0 && -dd > equity * 0.3)
    insights.push({ tone: "warn", title: "Big drop from the profit peak", body: `Profit fell by about ${usd(-dd)} from its peak (estimate).` });
  if (insights.length === 0)
    insights.push({ tone: "good", title: "No red flags in this sample", body: "Nothing unusual showed up in the fills we checked." });
  return {
    sample: false, pnl, fees, takerFees, rebates, savings, savingsPct: Math.round(ratio * 100),
    winRate: closing.length > 0 ? wins / closing.length : null, closed: closing.length,
    liqs, avgLev: avg(levs), trades: fills.length, spanDays, perDay, takerPct,
    maxDD: curve.length > 1 ? dd : null,
    maxDDPct: curve.length > 1 && peakVal > 0 ? -dd / peakVal : null,
    curve, insights, funding, notional, equity,
  };
}

export function archetype(r: Report): [string, string, string] {
  if (r.trades >= 500 && r.perDay > 300) return ["The Machine", "Fills faster than a human can click. Copying it is not realistic.", "Nice catch. You just spotted a machine."];
  if (r.liqs > 0 || r.avgLev >= 20) return ["The Degen", "High leverage, high drama. Fun to watch, risky to follow.", "Now you know exactly what you’re looking at."];
  if (r.takerPct < 0.35 && r.trades > 20) return ["The Market Maker", "Mostly resting orders. Patient and fee-smart.", "A patient one. Good find."];
  if ((r.winRate ?? 0) >= 0.6 && r.avgLev < 10) return ["The Sniper", "Picks its spots, wins often, keeps leverage moderate.", "A sharp one. Worth a closer look."];
  return ["The Everyday Trader", "A balanced mix. Nothing wild, nothing flawless.", "A clear picture in seconds. Nicely done."];
}

export function verdict(r: Report): { label: string; tone: "bad" | "warn" | "acid" } {
  if (r.insights.some((i) => i.title.startsWith("Looks like a bot"))) return { label: "Hard to copy", tone: "bad" };
  if (r.insights.some((i) => i.tone === "warn")) return { label: "Proceed with care", tone: "warn" };
  return { label: "No red flags in this sample", tone: "acid" };
}

export function why(r: Report): string {
  if (r.insights.some((i) => i.title.startsWith("Looks like a bot")))
    return `${Math.round(r.perDay).toLocaleString()} fills a day is faster than a person can follow, so your copies would land after the price has moved.`;
  const lev = `${r.avgLev.toFixed(1)}x average leverage and ${r.liqs} liquidation${r.liqs === 1 ? "" : "s"}`;
  const warn = r.insights.find((i) => i.tone === "warn");
  if (warn) return `Worth a closer look: ${warn.title.toLowerCase()}. This sample shows ${lev}.`;
  return `${r.trades.toLocaleString()} fills, ${lev}. Nothing unusual stood out.`;
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

export function simulate(r: Report, amount: number) {
  if (r.equity <= 0 || r.trades === 0 || amount <= 0) return null;
  const ratio = Math.min(amount / r.equity, 1);
  const gross = r.pnl * ratio;
  const feesCost = (r.fees - r.rebates) * ratio;
  const slip = r.notional * 0.0003 * ratio;
  const funding = (r.funding ?? 0) * ratio;
  return { ratio, gross, feesCost, slip, funding, net: gross - feesCost - slip + funding };
}

export const DEMO: Report = {
  sample: true, pnl: 1840.5, fees: 412.3, takerFees: 301.2, rebates: 22.4, savings: 38.6, savingsPct: 60,
  winRate: 0.61, closed: 90, liqs: 0, avgLev: 6.4, trades: 142, spanDays: 21, perDay: 7, takerPct: 0.7,
  maxDD: -240, maxDDPct: 0.24, curve: [0, 40, 120, 5, 90, 210, 180, 330, 420, 500],
  funding: -18.4, notional: 210000, equity: 3200,
  insights: [
    { tone: "warn", title: "Most fees are taker fees", body: "About 73% of fees come from taker orders. Using limit orders more often could save roughly $38.60 (estimate)." },
    { tone: "warn", title: "Possible revenge trades", body: "4 times a new trade opened within 5 minutes of a losing close. Pausing after a loss may help." },
  ],
};

export const DEMO_B: Report = {
  sample: true, pnl: 159.47, fees: 85.64, takerFees: 85.64, rebates: 0, savings: 25.2, savingsPct: 60,
  winRate: 0.52, closed: 700, liqs: 0, avgLev: 3.2, trades: 1000, spanDays: 0.12, perDay: 8400, takerPct: 1,
  maxDD: -1995.9, maxDDPct: 0.05, curve: [0, 300, 900, 1500, 1700, 1750, 1800, 1790, 1820, 1850],
  funding: 2.1, notional: 4200000, equity: 43000,
  insights: [
    { tone: "warn", title: "Looks like a bot or high-frequency trader", body: "About 8,400 fills per day in this sample. Copying a wallet like this is usually not realistic, because your copies would arrive after the trades." },
  ],
};

function friendly(status: number): string {
  if (status === 404) return "Strike has no trading history for this wallet. Check the address, or try one of the example wallets.";
  if (status === 400) return "Strike couldn’t read that address. Check it and try again.";
  if (status === 429) return "Too many requests right now. Wait a few seconds and try again.";
  if (status >= 500) return "Strike isn’t responding right now. Try again in a minute, or look at the sample result.";
  return `Something went wrong (code ${status}). Try again, or use an example wallet.`;
}

export async function load(addr: string): Promise<Report> {
  const get = async (path: string) => {
    const res = await fetch(`/api/strike?path=${path}&address=${encodeURIComponent(addr)}`);
    const text = await res.text();
    if (!res.ok) throw new Error(friendly(res.status));
    return JSON.parse(text);
  };
  const [pf, fr, fu] = await Promise.all([get("portfolio"), get("fills"), get("funding").catch(() => null)]);
  const rep = buildReport(pf, fr, fu);
  if (rep.trades === 0) throw new Error("This wallet exists but has no trades yet, so there is nothing to scan.");
  return rep;
}
