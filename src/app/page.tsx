"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DEMO, DEMO_B, EXAMPLES, archetype, checkInput, copyScore, load, simulate, usd, verdict, why, type Report } from "@/lib/scout";
import { saveReport } from "@/lib/watch";

const STEPS = [
  { id: "t-verdict", title: "Trader type and verdict", body: "Scout reads the real fills and gives a plain-English type, a verdict, and one line explaining why." },
  { id: "t-stats", title: "The key numbers", body: "Win rate, profit drop, liquidations, fees and funding, all from this wallet’s own history." },
  { id: "t-chart", title: "Profit history", body: "This is Strike’s portfolio history, so you see the big drops, not just the latest day." },
  { id: "t-fee", title: "Fee saver and copy estimate", body: "A rough estimate of what limit orders could save, and what copying this wallet might have done. Assumptions are shown." },
];

function Tip({ text }: { text: string }) {
  const [o, setO] = useState(false);
  return (
    <span className="inline-block align-middle">
      <button type="button" aria-expanded={o} aria-label="What’s this?" onClick={() => setO(!o)}
        className="-my-3.5 inline-flex h-11 w-11 items-center justify-center">
        <span className="muted inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]" style={{ border: "1px solid var(--line)" }}>?</span>
      </button>
      {o && <span className="muted mt-1 block text-xs normal-case tracking-normal">{text}</span>}
    </span>
  );
}

function Stat({ label, value, cls = "", tip, sub }: { label: string; value: string; cls?: string; tip?: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <div className="label">{label}{tip && <Tip text={tip} />}</div>
      <div className={`num mt-1 text-2xl font-semibold ${cls}`}>{value}</div>
      {sub && <div className="muted mt-0.5 text-xs">{sub}</div>}
    </div>
  );
}

function SampleBadge() {
  return <span className="num rounded-full px-3 py-1 text-xs" style={{ border: "1px solid var(--warn)", color: "var(--warn)" }}>Sample data</span>;
}

function Spark({ curve, h = "h-40" }: { curve: number[]; h?: string }) {
  if (curve.length < 2) return null;
  const lo = Math.min(...curve);
  const span = Math.max(...curve) - lo || 1;
  const pts = curve.map((x, i) => `${(i / (curve.length - 1)) * 320},${110 - ((x - lo) / span) * 100}`).join(" ");
  return (
    <svg viewBox="0 0 320 120" preserveAspectRatio="none" className={`${h} w-full`} role="img" aria-label="Profit over time">
      <polygon points={`0,120 ${pts} 320,120`} fill="rgba(198,255,77,0.12)"></polygon>
      <polyline points={pts} fill="none" stroke="#C6FF4D" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke"></polyline>
    </svg>
  );
}

function Sim({ r }: { r: Report }) {
  const [amt, setAmt] = useState(1000);
  const s = simulate(r, amt);
  return (
    <div className="panel rise flex flex-col gap-2 p-5">
      <h3 className="text-lg font-bold">Copy estimate</h3>
      <label htmlFor="amt" className="label">If you copied with ($)</label>
      <input id="amt" type="number" min={1} className="field num" value={amt} onChange={(e) => setAmt(Number(e.target.value) || 0)} />
      {s ? (
        <>
          <p className="label mt-2">Rough result for this sample (estimate)</p>
          <p className={`num text-3xl font-semibold ${s.net >= 0 ? "acid" : "bad"}`}>{usd(s.net)}</p>
          <ul className="muted num text-xs">
            <li>Profit scaled to your size: {usd(s.gross)}</li>
            <li>Fees: {usd(-s.feesCost)}</li>
            <li>Delay cost (assumed): {usd(-s.slip)}</li>
            <li>Funding: {usd(s.funding)}</li>
          </ul>
          <p className="muted text-[11px]">
            Assumptions: your size is {(s.ratio * 100).toFixed(1)}% of this wallet’s current account value; fees are charged separately from realized PnL; delay costs 0.03% of traded value per fill (a guess, not measured). Past results do not predict future ones.
          </p>
        </>
      ) : (
        <p className="muted text-sm">Not enough data to estimate. This needs the wallet’s account value and at least one fill.</p>
      )}
    </div>
  );
}

function downloadCard(r: Report, type: string, v: string, score: number, ref: string) {
  const c = document.createElement("canvas");
  c.width = 1080; c.height = 1080;
  const x = c.getContext("2d");
  if (!x) return;
  x.fillStyle = "#0a0d0c"; x.fillRect(0, 0, 1080, 1080);
  x.fillStyle = "#c6ff4d"; x.fillRect(80, 80, 120, 8);
  x.fillStyle = "#e9f2ee"; x.font = "bold 44px sans-serif"; x.fillText("Scout", 80, 150);
  x.fillStyle = "#8a9c95"; x.font = "28px sans-serif"; x.fillText(r.sample ? "TRADER TYPE (SAMPLE DATA)" : "TRADER TYPE", 80, 290);
  x.fillStyle = "#e9f2ee"; x.font = "bold 84px sans-serif"; x.fillText(type, 80, 390);
  x.fillStyle = score >= 70 ? "#c6ff4d" : score >= 40 ? "#ffb84d" : "#ff6b6b";
  x.font = "bold 220px sans-serif"; x.fillText(String(score), 80, 650);
  x.fillStyle = "#8a9c95"; x.font = "30px sans-serif"; x.fillText("COPYABILITY SCORE / 100", 80, 700);
  x.fillStyle = "#e9f2ee"; x.font = "bold 44px sans-serif"; x.fillText(v, 80, 790);
  x.fillStyle = "#8a9c95"; x.font = "28px sans-serif";
  x.fillText(`${Math.round(r.perDay).toLocaleString()} fills/day  |  ${r.avgLev.toFixed(1)}x avg leverage`, 80, 850);
  x.fillText(ref ? `Trade on Strike: ${ref}`.slice(0, 60) : "scout-six-swart.vercel.app", 80, 980);
  x.fillText("Data, not financial advice.", 80, 1020);
  c.toBlob((b) => {
    if (!b) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = "scout-scorecard.png";
    a.click();
  });
}

function Side({ tag, r }: { tag: string; r: Report }) {
  const [t, tl] = archetype(r);
  const v = verdict(r);
  const sc = copyScore(r);
  return (
    <div className="panel rise flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2"><p className="label">{tag}</p>{r.sample && <SampleBadge />}</div>
      <div>
        <h3 className="text-3xl font-bold tracking-tight">{t}</h3>
        <p className="muted mt-1 text-sm">{tl}</p>
      </div>
      <p className={`font-bold ${v.tone}`}>{v.label}</p>
      <p className="muted text-sm">{why(r)}</p>
      <div className="grid grid-cols-2 gap-4 pt-4" style={{ borderTop: "1px solid var(--line)" }}>
        <Stat label="Copyability" value={sc + "/100"} cls={sc >= 70 ? "acid" : sc >= 40 ? "warn" : "bad"} tip="How realistic this wallet is to copy, from 0 to 100. Fast bots, high leverage and liquidations lower it." />
        <Stat label="Fills per day" value={r.perDay ? Math.round(r.perDay).toLocaleString() : "n/a"} />
        <Stat label="Avg leverage" value={r.avgLev ? r.avgLev.toFixed(1) + "x" : "n/a"} tip="Leverage multiplies gains and losses. 10x means a 10% move against you wipes the position." />
        <Stat label="Win rate" value={r.winRate === null ? "n/a" : Math.round(r.winRate * 100) + "%"} />
        <Stat label="Realized PnL (sample)" value={usd(r.pnl)} cls={r.pnl >= 0 ? "acid" : "bad"} />
        <Stat label="Biggest profit drop" value={r.maxDD === null ? "n/a" : usd(r.maxDD)} cls="warn" />
      </div>
      <Spark curve={r.curve} />
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
  const [savedAddr, setSavedAddr] = useState("");

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
  function switchMode(m: "scan" | "compare") { setMode(m); setErr(""); setTour(-1); }

  async function analyze(a: string = addr) {
    const bad = checkInput(a);
    if (bad) { setErr(bad); return; }
    setBusy(true); setErr(""); setCopied(false); setR(null);
    try {
      setR(await load(a.trim()));
      let seen = false;
      try { seen = localStorage.getItem("scout_tour") === "1"; } catch {}
      if (!seen) setTour(0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Try again.");
    }
    setBusy(false);
  }

  async function compare(a: string = ca, b: string = cb) {
    const bad = checkInput(a) ?? checkInput(b);
    if (bad) { setErr(bad); return; }
    setBusy(true); setErr(""); setPair(null);
    const [x, y] = await Promise.allSettled([load(a.trim()), load(b.trim())]);
    if (x.status === "fulfilled" && y.status === "fulfilled") setPair([x.value, y.value]);
    else {
      const f = x.status !== "fulfilled" ? x : (y as PromiseRejectedResult);
      const reason = f.reason instanceof Error ? f.reason.message : "Something went wrong.";
      setErr(`Wallet ${x.status !== "fulfilled" ? "A" : "B"}: ${reason}`);
    }
    setBusy(false);
  }

  const [type, tagline, cheer] = r ? archetype(r) : ["", "", ""];
  const v = r ? verdict(r) : null;
  const score = r ? copyScore(r) : 0;

  async function share() {
    if (!r || !v) return;
    const text = `Scout says this Strike wallet is "${type}" (${v.label}, copyability ${score}/100).${r.sample ? " Sample data." : ""}${ref ? " Trade on Strike: " + ref : ""}`;
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
          <div className="flex items-center gap-3">
            <Link href="/board" className="chip inline-flex items-center">Scout Board</Link>
            <span className="num muted hidden text-xs sm:inline">built on Strike data</span>
          </div>
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
                Paste any Strike wallet. Scout reads the real fills and tells you how it trades, what it costs, and whether you could actually copy it.
              </p>
              <div className="panel rise mt-8 p-4 md:p-5">
                <label htmlFor="addr" className="sr-only">Wallet address or account ID</label>
                <div className="flex flex-col gap-3 md:flex-row">
                  <input id="addr" className="field num flex-1" value={addr} onChange={(e) => setAddr(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && analyze()} placeholder="addr1… / 0x… / account ID" />
                  <button className="btn btn-acid" onClick={() => analyze()} disabled={busy}>{busy ? "Scanning…" : "Scan wallet"}</button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="label">Try a real wallet</span>
                  {EXAMPLES.map(([name, a]) => (
                    <button key={a} className="chip" onClick={() => { setAddr(a); analyze(a); }}>{name}</button>
                  ))}
                </div>
                <details className="mt-3">
                  <summary className="muted cursor-pointer text-sm">Add your referral link to the share text</summary>
                  <label htmlFor="ref" className="sr-only">Referral link</label>
                  <input id="ref" className="field mt-2" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="https://app.strikefinance.org/…" />
                </details>
                {err && <p role="alert" className="bad mt-3 text-sm">{err}</p>}
                <button className="muted mt-3 min-h-[44px] text-sm underline" onClick={() => { setErr(""); setCopied(false); setR(DEMO); }}>
                  Or look at a sample result (sample data)
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="rise mt-6 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
                Two wallets. <span className="acid">One honest verdict.</span>
              </h1>
              <p className="rise muted mt-4 max-w-xl text-base md:text-lg">
                Put two Strike traders side by side and see which one is easier to copy.
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
                  <button className="chip" onClick={() => { setCa(EXAMPLES[0][1]); setCb(EXAMPLES[1][1]); compare(EXAMPLES[0][1], EXAMPLES[1][1]); }}>Try two real wallets</button>
                </div>
                {err && <p role="alert" className="bad mt-3 text-sm">{err}</p>}
                <button className="muted mt-3 min-h-[44px] text-sm underline" onClick={() => { setErr(""); setPair([DEMO, DEMO_B]); }}>
                  Or look at a sample pair (sample data)
                </button>
              </div>
            </>
          )}
        </section>

        {busy && (
          <div className="mt-8 grid gap-4 md:grid-cols-3" aria-live="polite">
            <p className="label md:col-span-3">Scouting… reading fills, funding and portfolio history. This usually takes a few seconds.</p>
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
            <div className="flex min-w-0 flex-col gap-5 lg:col-span-2">
              <div id="t-verdict" className="panel rise p-6 md:p-8" style={{ background: "linear-gradient(135deg, #131b18, #0e1412)" }}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="label">Trader type</p>
                  {r.sample && <SampleBadge />}
                </div>
                <h2 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">{type}</h2>
                <p className="acid mt-2 text-sm font-semibold">{cheer}</p>
                <p className="muted mt-1 max-w-lg">{tagline}</p>
                <p className="mt-5 text-sm"><span className="label mr-2">Scout verdict</span><span className={`text-lg font-bold ${v.tone}`}>{v.label}</span></p>
                <p className="muted mt-1 max-w-xl text-sm">{why(r)}</p>
                <div className="mt-6 grid grid-cols-1 gap-5 pt-5 sm:grid-cols-3" style={{ borderTop: "1px solid var(--line)" }}>
                  <Stat label="Copyability" value={score + "/100"} cls={score >= 70 ? "acid" : score >= 40 ? "warn" : "bad"} tip="How realistic this wallet is to copy, from 0 to 100. Fast bots, high leverage and liquidations lower it." />
                  <Stat label="Fills per day" value={r.perDay ? Math.round(r.perDay).toLocaleString() : "n/a"} tip="How many trades it makes per day. Hundreds a day means a person can’t follow it." />
                  <Stat label="Avg leverage" value={r.avgLev ? r.avgLev.toFixed(1) + "x" : "n/a"} tip="Leverage multiplies gains and losses. 10x means a 10% move against you wipes the position." />
                </div>
              </div>

              <div id="t-stats" className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div className="panel p-5"><Stat label="Realized PnL (sample)" value={usd(r.pnl)} cls={r.pnl >= 0 ? "acid" : "bad"} /></div>
                <div className="panel p-5"><Stat label="Win rate" value={r.winRate === null ? "n/a" : Math.round(r.winRate * 100) + "%"} sub={`of ${r.closed.toLocaleString()} closing fills, after fees`} /></div>
                <div className="panel p-5"><Stat label="Biggest profit drop" value={r.maxDD === null ? "n/a" : usd(r.maxDD)} cls="warn" sub={r.maxDDPct === null ? undefined : `about ${Math.round(r.maxDDPct * 100)}% of peak account value (estimate)`} /></div>
                <div className="panel p-5"><Stat label="Liquidations" value={String(r.liqs)} cls={r.liqs > 0 ? "bad" : ""} tip="A liquidation is when the exchange closes a position by force because the losses ate the margin." /></div>
                <div className="panel p-5"><Stat label="Fees paid" value={usd(r.fees)} /></div>
                <div className="panel p-5"><Stat label="Funding (net)" value={r.funding === null ? "n/a" : usd(r.funding)} sub={r.funding === null ? "not available" : "latest 1,000 funding payments; plus means received, minus means paid"} /></div>
              </div>

              {r.curve.length > 1 && (
                <div id="t-chart" className="panel rise p-5">
                  <p className="label mb-3">Profit over time (Strike portfolio history)</p>
                  <Spark curve={r.curve} h="h-56 md:h-72" />
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

            <div className="flex min-w-0 flex-col gap-5">
              <div id="t-fee" className="panel rise flex flex-col gap-2 p-5" style={{ borderColor: "var(--acid)" }}>
                <h3 className="text-lg font-bold">Fee saver <span className="muted text-xs font-normal">(estimate)</span></h3>
                <p className="muted text-sm">Fees paid in this sample: <span className="num">{usd(r.fees)}</span></p>
                <p className="muted text-sm">Taker orders: <span className="num">{Math.round(r.takerPct * 100)}%</span> of fills<Tip text="A taker order trades right away at the market price and pays a higher fee. A maker order waits on the book and pays less." /></p>
                <p className="muted text-sm">Maker rebates earned: <span className="num">{usd(r.rebates)}</span></p>
                <p className="label mt-2">Possible saving</p>
                <p className="num acid text-3xl font-semibold">{usd(r.savings)}</p>
                <p className="muted text-[11px]">
                  Assumes 25% of taker fills become maker fills. Saving = taker fees ({usd(r.takerFees)}) x 25% x the maker discount on this wallet’s fee tier ({r.savingsPct}% cheaper than taker).
                </p>
              </div>
              <Sim r={r} />
              <div className="panel muted p-5 text-sm">
                Based on the latest {r.trades.toLocaleString()} fills{r.spanDays > 0 ? `, covering about ${r.spanDays < 1 ? "less than a day" : Math.round(r.spanDays) + " days"}` : ""}.
              </div>
              <button className="btn btn-acid w-full" onClick={share}>{copied ? "Copied!" : "Copy share text"}</button>
              {r.addr && !r.sample && (
                <button className="btn w-full" style={{ border: "1px solid var(--line)" }}
                  onClick={() => { saveReport(r); setSavedAddr(r.addr ?? ""); }}>
                  {savedAddr === r.addr ? "Saved to Scout Board" : "Save to Scout Board"}
                </button>
              )}
              {savedAddr === r.addr && r.addr && <Link href="/board" className="chip inline-flex items-center justify-center">Open Scout Board</Link>}
              <button className="btn w-full" style={{ border: "1px solid var(--line)" }} onClick={() => downloadCard(r, type, v.label, score, ref)}>Download scorecard image</button>
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
