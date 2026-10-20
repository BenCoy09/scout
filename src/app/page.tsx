"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";

type Insight = { title: string; body: string; tone: "warn" | "good" };
type Report = {
  sample: boolean; pnl: number; fees: number; takerFees: number; rebates: number; savings: number;
  winRate: number | null; liqs: number; avgLev: number; trades: number; spanDays: number; takerPct: number;
  maxDD: number | null; curve: number[]; insights: Insight[];
};

const n = (v: any) => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0; };
const usd = (v: number) => (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
const card = "rounded-2xl border border-[#1F2A2D] bg-[#131A1C] p-5";
const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

function buildReport(pf: any, fr: any): Report {
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
  const perDay = fills.length / Math.max(spanDays, 1 / 24);
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
    liqs, avgLev: avg(levs), trades: fills.length, spanDays, takerPct: fills.length ? fills.filter((f) => f.role === "taker").length / fills.length : 0,
    maxDD: curve.length > 1 ? dd : null, curve, insights,
  };
}

const DEMO: Report = {
  sample: true, pnl: 1840.5, fees: 412.3, takerFees: 301.2, rebates: 22.4, savings: 38.6,
  winRate: 0.61, liqs: 0, avgLev: 6.4, trades: 142, spanDays: 21, takerPct: 0.7, maxDD: -240,
  curve: [0, 40, 120, 5, 90, 210, 180, 330, 420, 500],
  insights: [
    { tone: "warn", title: "Most fees are taker fees", body: "About 73% of fees come from taker orders. Using limit orders more often could save roughly $38.60 (estimate)." },
    { tone: "warn", title: "Possible revenge trades", body: "4 times a new trade opened within 5 minutes of a losing close. Pausing after a loss may help." },
  ],
};

async function load(addr: string) {
  const get = async (path: string) => {
    const res = await fetch(`/api/strike?path=${path}&address=${encodeURIComponent(addr)}`);
    const text = await res.text();
    if (!res.ok) throw new Error(`Strike returned ${res.status}: ${text.slice(0, 120)}`);
    return JSON.parse(text);
  };
  const [pf, fr] = await Promise.all([get("portfolio"), get("fills")]);
  return buildReport(pf, fr);
}

export default function Home() {
  const [addr, setAddr] = useState("");
  const [ref, setRef] = useState("");
  const [r, setR] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  async function analyze() {
    if (!addr.trim()) return;
    setBusy(true); setErr(""); setCopied(false);
    try { setR(await load(addr.trim())); }
    catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong"); }
    setBusy(false);
  }

  async function share() {
    if (!r) return;
    const text = `My Strike report from Scout: ${r.trades} fills, realized PnL ${usd(r.pnl)}, fees paid ${usd(r.fees)}.${ref ? " Trade on Strike: " + ref : ""}`;
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch {}
  }

  const c = r?.curve ?? [];
  const lo = c.length ? Math.min(...c) : 0;
  const span = (c.length ? Math.max(...c) : 0) - lo || 1;
  const pts = c.length > 1 ? c.map((v, i) => `${(i / (c.length - 1)) * 320},${110 - ((v - lo) / span) * 100}`).join(" ") : "";
  const stats = r ? [
    ["Realized PnL (sample)", usd(r.pnl), r.pnl >= 0 ? "text-emerald-400" : "text-red-400"],
    ["Win rate", r.winRate === null ? "n/a" : Math.round(r.winRate * 100) + "%", ""],
    ["Biggest profit drop", r.maxDD === null ? "n/a" : usd(r.maxDD), "text-amber-400"],
    ["Liquidations", String(r.liqs), r.liqs > 0 ? "text-red-400" : ""],
    ["Fees paid", usd(r.fees), ""],
    
["Fills per day", r.spanDays > 0 ? Math.round(r.trades / Math.max(r.spanDays, 1 / 24)).toLocaleString() : "n/a", ""],
  ] : [];

  return (
    <main className="min-h-screen bg-[#0B0F10] text-[#E8F1EE]">
      <div className="mx-auto w-full max-w-6xl p-5 md:p-8">
        <div className="text-2xl font-extrabold">Scout</div>
        <h1 className="mt-6 text-3xl font-extrabold md:text-4xl">Paste a Strike wallet. See how it really trades.</h1>
        <p className="mt-2 max-w-2xl text-[#8DA09A]">Real fills, real fees, plain-English red flags. Wallet address or account ID.</p>

        <div className={`${card} mt-6 flex flex-col gap-3`}>
          <label htmlFor="addr" className="text-sm text-[#8DA09A]">Wallet address or account ID</label>
          <div className="flex flex-col gap-3 md:flex-row">
            <input id="addr" value={addr} onChange={(e) => setAddr(e.target.value)} onKeyDown={(e) => e.key === "Enter" && analyze()}
              placeholder="addr1… / 0x… / account ID"
              className="h-12 flex-1 rounded-xl border border-[#2A383C] bg-[#0B0F10] px-4" />
            <button onClick={analyze} disabled={busy}
              className="h-12 rounded-xl bg-emerald-400 px-6 font-extrabold text-[#04120C] disabled:opacity-60">{busy ? "Analyzing…" : "Analyze"}</button>
            <button onClick={() => { setErr(""); setCopied(false); setR(DEMO); }}
              className="h-12 rounded-xl border border-[#2A383C] px-6 font-bold">Try demo</button>
          </div>
          <label htmlFor="ref" className="mt-1 text-sm text-[#8DA09A]">Your Strike referral link (optional, added to the share text)</label>
          <input id="ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="https://app.strikefinance.org/…"
            className="h-12 rounded-xl border border-[#2A383C] bg-[#0B0F10] px-4" />
          {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
        </div>

        {r && (
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <div className="flex flex-col gap-5 lg:col-span-2">
              {r.sample && <p className="text-xs text-[#8DA09A]">Sample data</p>}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {stats.map(([label, value, color]) => (
                  <div key={label} className={card}>
                    <div className="text-xs text-[#8DA09A]">{label}</div>
                    <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
                  </div>
                ))}
              </div>
              {pts && (
                <div className={card}>
                  <div className="mb-3 text-sm text-[#8DA09A]">Profit over time (Strike portfolio history)</div>
                  <svg viewBox="0 0 320 120" preserveAspectRatio="none" className="h-56 w-full" role="img" aria-label="Profit over time">
                    <polyline points={pts} fill="none" stroke="#2EE6A6" strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>
              )}
              <div className="flex flex-col gap-3">
                <div className="text-lg font-extrabold">What Scout noticed</div>
                {r.insights.map((i) => (
                  <div key={i.title} className={`${card} ${i.tone === "warn" ? "border-amber-400/60" : "border-emerald-400/60"}`}>
                    <div className="font-bold">{i.title}</div>
                    <div className="mt-1 text-sm text-[#8DA09A]">{i.body}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-5">
              <div className={`${card} flex flex-col gap-2 border-emerald-400`}>
                <div className="text-lg font-extrabold">Fee saver</div>
                <div className="text-sm text-[#8DA09A]">Fees paid in this sample: {usd(r.fees)}</div>
                <div className="text-sm text-[#8DA09A]">Taker orders: {Math.round(r.takerPct * 100)}% of fills</div>
                <div className="text-sm text-[#8DA09A]">Maker rebates earned: {usd(r.rebates)}</div>
                <div className="mt-2 text-xs text-[#8DA09A]">Estimated saving if 25% of taker orders were maker orders</div>
                <div className="text-3xl font-extrabold text-emerald-400">{usd(r.savings)}</div>
              </div>
              <div className={`${card} text-sm text-[#8DA09A]`}>
                Based on the latest {r.trades.toLocaleString()} fills{r.spanDays > 0 ? `, covering about ${r.spanDays < 1 ? "less than a day" : Math.round(r.spanDays) + " days"}` : ""}.
              </div>
              <button onClick={share} className="h-12 rounded-xl bg-emerald-400 font-extrabold text-[#04120C]">{copied ? "Copied!" : "Copy share text"}</button>
              <p className="text-[11px] text-[#8DA09A]">Estimates are based on recent fills only. Scout shows data, not financial advice.</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
