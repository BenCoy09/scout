"use client";
import { useEffect, useState } from "react";
import { DEMO, DEMO_B, EXAMPLES, archetype, copyScore, load, usd, verdict, type Report } from "@/lib/scout";

const STEPS = [
  { id: "t-verdict", title: "Trader type and verdict", body: "Scout reads the real fills and gives a plain-English type, plus a verdict on whether this wallet is realistic to copy." },
  { id: "t-stats", title: "The key numbers", body: "Fills per day shows whether a human could follow it. Leverage and PnL come from the same sample of recent fills." },
  { id: "t-chart", title: "Profit history", body: "This is Strike’s portfolio history, so you see the big drops, not just the latest day." },
  { id: "t-fee", title: "Fee saver", body: "How much of the fees were taker fees, and a rough estimate of what limit orders could save." },
];

function Stat({ label, value, cls = "", small = false }: { label: string; value: string; cls?: string; small?: boolean }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`num mt-1 font-semibold ${small ? "text-lg" : "text-2xl"} ${cls}`}>{value}</div>
    </div>
  );
}

function Spark({ curve, h = "h-40", fill = false }: { curve: number[]; h?: string; fill?: boolean }) {
  if (curve.length < 2) return null;
  const lo = Math.min(...curve);
  const span = Math.max(...curve) - lo || 1;
  const pts = curve.map((x, i) => `${(i / (curve.length - 1)) * 320},${110 - ((x - lo) / span) * 100}`).join(" ");
  return (
    <svg viewBox="0 0 320 120" preserveAspectRatio="none" className={`${h} w-full`} role="img" aria-label="Profit over time">
      {fill && <polygon points={`0,120 ${pts} 320,120`} fill="rgba(198,255,77,0.12)"></polygon>}
      <polyline points={pts} fill="none" stroke="#C6FF4D" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke"></polyline>
    </svg>
  );
}

function Side({ tag, r }: { tag: string; r: Report }) {
  const [t, tl] = archetype(r);
  const v = verdict(r);
  const sc = copyScore(r);
  return (
    <div className="panel rise flex flex-col gap-4 p-5">
      <p className="label">{tag}{r.sample ? " · sample data" : ""}</p>
      <div>
        <h3 className="text-3xl font-bold tracking-tight">{t}</h3>
        <p className="muted mt-1 text-sm">{tl}</p>
      </div>
      <p className={`font-bold ${v.tone}`}>{v.label}</p>
      <div className="grid grid-cols-2 gap-4 pt-4" style={{ borderTop: "1px solid var(--line)" }}>
        <Stat small label="Copyability" value={sc + "/100"} cls={sc >= 70 ? "acid" : sc >= 40 ? "warn" : "bad"} />
        <Stat small label="Fills per day" value={r.perDay ? Math.round(r.perDay).toLocaleString() : "n/a"} />
        <Stat small label="Avg leverage" value={r.avgLev ? r.avgLev.toFixed(1) + "x" : "n/a"} />
        <Stat small label="Win rate" value={r.winRate === null ? "n/a" : Math.round(r.winRate * 100) + "%"} />
        <Stat small label="Realized PnL (sample)" value={usd(r.pnl)} cls={r.pnl >= 0 ? "acid" : "bad"} />
        <Stat small label="Biggest profit drop" value={r.maxDD === null ? "n/a" : usd(r.maxDD)} cls="warn" />
      </div>
      <Spark curve={r.curve} fill />
      <ul className="muted list-disc pl-5 text-sm">
        {r.insights.map((i) => <li key={i.title}>{i.title}</li>)}
      </ul>
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState<"scan" | "compare">("scan");
  const [addr, setAddr] = useState("");
  const [ref, setRef] = useState("");
  const [r, setR] = useState<Report | null>(null);
  const [ca, setCa] = useState("");
  const [cb, setCb] = useState("");
  const [pair, setPair] = useState<[Report, Report] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [tour, setTour] = useState(-1);

  useEffect(() => {
    document.querySelectorAll(".tour-ring").forEach((e) => e.classList.remove("tour-ring"));
    if (tour < 0) return;
    const el = document.getElementById(STEPS[tour].id);
    if (el) {
      el.classList.add("tour-ring");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [tour]);

  function endTour() {
    try { localStorage.setItem("scout_tour", "1"); } catch {}
    setTour(-1);
  }

  function switchMode(m: "scan" | "compare") {
    setMode(m); setErr(""); setTour(-1);
  }

  async function analyze(a: string = addr) {
    if (!a.trim()) return;
    setBusy(true); setErr(""); setCopied(false);
    try {
      const rep = await load(a.trim());
      setR(rep);
      let seen = false;
      try { seen = localStorage.getItem("scout_tour") === "1"; } catch {}
      if (!seen) setTour(0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    }
    setBusy(false);
  }

  async function compare(a: string = ca, b: string = cb) {
    if (!a.trim() || !b.trim()) { setErr("Enter two wallets to compare."); return; }
    setBusy(true); setErr(""); setPair(null);
    const [x, y] = await Promise.allSettled([load(a.trim()), load(b.trim())]);
    if (x.status === "fulfilled" && y.status === "fulfilled") setPair([x.value, y.value]);
    else {
      const bad = x.status !== "fulfilled" ? x : (y as PromiseRejectedResult);
      const reason = bad.reason instanceof Error ? bad.reason.message : "Something went wrong";
      setErr(`Could not load wallet ${x.status !== "fulfilled" ? "A" : "B"}: ${reason}`);
    }
    setBusy(false);
  }

  const [type, tagline] = r ? archetype(r) : ["", ""];
  const v = r ? verdict(r) : null;

  async function share() {
    if (!r || !v) return;
    const text = `Scout says this Strike wallet is "${type}" (${v.label}). ${r.trades} fills, realized PnL ${usd(r.pnl)} in this sample.${ref ? " Trade on Strike: " + ref : ""}`;
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch {}
  }

  let winner = "";
  if (pair) {
    const sa = copyScore(pair[0]);
    const sb = copyScore(pair[1]);
    winner = Math.abs(sa - sb) < 5
      ? `Too close to call: ${sa} vs ${sb} on copyability.`
      : `Easier to copy: wallet ${sa > sb ? "A" : "B"} (${Math.max(sa, sb)} vs ${Math.min(sa, sb)} on copyability).`;
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-5 py-6 md:px-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C6FF4D" strokeWidth="2.2" aria-hidden="true"><circle cx="12" cy="12" r="7.5"></circle><path d="M12 2v5M12 17v5M2 12h5M17 12h5"></path></svg>
            Scout
          </div>
          <span className="num muted text-xs">built on Strike data</span>
        </header>

        <section className="mt-10 md:mt-16">
          <nav className="flex gap-2" aria-label="Mode">
            <button className="tab" aria-pressed={mode === "scan"} onClick={() => switchMode("scan")}>Scan a wallet</button>
            <button className="tab" aria-pressed={mode === "compare"} onClick={() => switchMode("compare")}>Compare two</button>
          </nav>

          {mode === "scan" ? (
            <>
              <h1 className="rise mt-6 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
                Know who you’re copying <span className="acid">before you copy.</span>
              </h1>
              <p className="rise muted mt-4 max-w-xl text-base md:text-lg">
                Paste any Strike wallet. Scout reads the real fills and shows how it trades, what it costs, and whether you could actually copy it.
              </p>
              <div className="panel rise mt-8 p-4 md:p-5">
                <label htmlFor="addr" className="sr-only">Wallet address or account ID</label>
                <div className="flex flex-col gap-3 md:flex-row">
                  <input id="addr" className="field num flex-1" value={addr} onChange={(e) => setAddr(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && analyze()} placeholder="addr1… / 0x… / account ID" />
                  <button className="btn btn-acid" onClick={() => analyze()} disabled={busy}>{busy ? "Scanning…" : "Scan wallet"}</button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="label">Try</span>
                  {EXAMPLES.map(([name, a]) => (
                    <button key={a} className="chip" onClick={() => { setAddr(a); analyze(a); }}>{name}</button>
                  ))}
                  <button className="chip" onClick={() => { setErr(""); setCopied(false); setR(DEMO); }}>Demo data</button>
                </div>
                <details className="mt-3">
                  <summary className="muted cursor-pointer text-sm">Add your referral link to the share text</summary>
                  <label htmlFor="ref" className="sr-only">Referral link</label>
                  <input id="ref" className="field mt-2" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="https://app.strikefinance.org/…" />
                </details>
                {err && <p role="alert" className="bad mt-3 text-sm">{err}</p>}
              </div>
            </>
          ) : (
            <>
              <h1 className="rise mt-6 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
                Two wallets. <span className="acid">One honest verdict.</span>
              </h1>
              <p className="rise muted mt-4 max-w-xl text-base md:text-lg">
                Put two Strike traders side by side and see which one is actually easier to copy.
              </p>
              <div className="panel rise mt-8 p-4 md:p-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label htmlFor="ca" className="label">Wallet A</label>
                    <input id="ca" className="field num mt-1" value={ca} onChange={(e) => setCa(e.target.value)} placeholder="addr1… / 0x… / account ID" />
                  </div>
                  <div>
                    <label htmlFor="cb" className="label">Wallet B</label>
                    <input id="cb" className="field num mt-1" value={cb} onChange={(e) => setCb(e.target.value)} placeholder="addr1… / 0x… / account ID" />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button className="btn btn-acid" onClick={() => compare()} disabled={busy}>{busy ? "Comparing…" : "Compare wallets"}</button>
                  <button className="chip" onClick={() => { setCa(EXAMPLES[0][1]); setCb(EXAMPLES[1][1]); compare(EXAMPLES[0][1], EXAMPLES[1][1]); }}>Try two examples</button>
                  <button className="chip" onClick={() => { setErr(""); setPair([DEMO, DEMO_B]); }}>Demo pair</button>
                </div>
                {err && <p role="alert" className="bad mt-3 text-sm">{err}</p>}
              </div>
            </>
          )}
        </section>

        {busy && (
          <div className="mt-8 grid gap-4 md:grid-cols-3" aria-live="polite">
            <p className="label md:col-span-3">Scouting… reading fills and portfolio history</p>
            {[0, 1, 2].map((i) => <div key={i} className="panel sweep h-32"></div>)}
          </div>
        )}

        {mode === "compare" && pair && !busy && (
          <div className="mt-8 flex flex-col gap-5">
            <div className="panel rise p-5 text-lg font-bold" style={{ borderColor: "var(--acid)" }}>{winner}</div>
            <div className="grid gap-5 md:grid-cols-2">
              <Side tag="Wallet A" r={pair[0]} />
              <Side tag="Wallet B" r={pair[1]} />
            </div>
            <p className="muted text-[11px]">Copyability is Scout’s estimate from recent fills only. It shows data, not financial advice.</p>
          </div>
        )}

        {mode === "scan" && r && v && !busy && (
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            <div className="flex flex-col gap-5 lg:col-span-2">
              <div id="t-verdict" className="panel rise p-6 md:p-8" style={{ background: "linear-gradient(135deg, #131b18, #0e1412)" }}>
                <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="label">Trader type{r.sample ? " · sample data" : ""}</p>
                    <h2 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">{type}</h2>
                    <p className="muted mt-2 max-w-md">{tagline}</p>
                  </div>
                  <div className="md:text-right">
                    <p className="label">Scout verdict</p>
                    <p className={`mt-1 text-xl font-bold ${v.tone}`}>{v.label}</p>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-4 pt-5" style={{ borderTop: "1px solid var(--line)" }}>
                  <Stat label="Realized PnL (sample)" value={usd(r.pnl)} cls={r.pnl >= 0 ? "acid" : "bad"} />
                  <Stat label="Fills per day" value={r.perDay ? Math.round(r.perDay).toLocaleString() : "n/a"} />
                  <Stat label="Avg leverage" value={r.avgLev ? r.avgLev.toFixed(1) + "x" : "n/a"} />
                </div>
              </div>

              <div id="t-stats" className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="panel p-5"><Stat label="Win rate" value={r.winRate === null ? "n/a" : Math.round(r.winRate * 100) + "%"} /></div>
                <div className="panel p-5"><Stat label="Biggest profit drop" value={r.maxDD === null ? "n/a" : usd(r.maxDD)} cls="warn" /></div>
                <div className="panel p-5"><Stat label="Liquidations" value={String(r.liqs)} cls={r.liqs > 0 ? "bad" : ""} /></div>
                <div className="panel p-5"><Stat label="Fees paid" value={usd(r.fees)} /></div>
              </div>

              {r.curve.length > 1 && (
                <div id="t-chart" className="panel rise p-5">
                  <p className="label mb-3">Profit over time (Strike portfolio history)</p>
                  <Spark curve={r.curve} h="h-56 md:h-72" fill />
                </div>
              )}

              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-bold">What Scout noticed</h3>
                {r.insights.map((i) => (
                  <div key={i.title} className="panel rise p-5" style={{ borderLeft: `3px solid var(${i.tone === "warn" ? "--warn" : "--acid"})` }}>
                    <div className="font-bold">{i.title}</div>
                    <div className="muted mt-1 text-sm">{i.body}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div id="t-fee" className="panel rise flex flex-col gap-2 p-5" style={{ borderColor: "var(--acid)" }}>
                <h3 className="text-lg font-bold">Fee saver</h3>
                <p className="muted text-sm">Fees paid in this sample: <span className="num">{usd(r.fees)}</span></p>
                <p className="muted text-sm">Taker orders: <span className="num">{Math.round(r.takerPct * 100)}%</span> of fills</p>
                <p className="muted text-sm">Maker rebates earned: <span className="num">{usd(r.rebates)}</span></p>
                <p className="label mt-3">If 25% of taker orders were maker orders</p>
                <p className="num acid text-3xl font-semibold">{usd(r.savings)}</p>
              </div>
              <div className="panel muted p-5 text-sm">
                Based on the latest {r.trades.toLocaleString()} fills{r.spanDays > 0 ? `, covering about ${r.spanDays < 1 ? "less than a day" : Math.round(r.spanDays) + " days"}` : ""}.
              </div>
              <button className="btn btn-acid w-full" onClick={share}>{copied ? "Copied!" : "Copy share text"}</button>
              <button className="chip" onClick={() => setTour(0)}>Replay the tour</button>
              <p className="muted text-[11px]">Estimates use recent fills only. Scout shows data, not financial advice.</p>
            </div>
          </div>
        )}
      </div>

      {tour >= 0 && mode === "scan" && (
        <div role="dialog" aria-label="Scout tour" className="panel fixed bottom-4 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 p-5 shadow-2xl" style={{ borderColor: "var(--acid)" }}>
          <p className="label">Step {tour + 1} of {STEPS.length}</p>
          <p className="mt-1 font-bold">{STEPS[tour].title}</p>
          <p className="muted mt-1 text-sm">{STEPS[tour].body}</p>
          <div className="mt-4 flex gap-3">
            <button className="btn btn-acid flex-1" onClick={() => (tour >= STEPS.length - 1 ? endTour() : setTour(tour + 1))}>
              {tour >= STEPS.length - 1 ? "Done" : "Next"}
            </button>
            <button className="chip" onClick={endTour}>Skip</button>
          </div>
        </div>
      )}
    </main>
  );
}
