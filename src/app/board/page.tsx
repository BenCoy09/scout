"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EXAMPLES, checkInput, load, usd } from "@/lib/scout";
import { getSaved, removeSaved, saveReport, type Saved } from "@/lib/watch";

const short = (a: string) => (a.length > 16 ? a.slice(0, 8) + "…" + a.slice(-6) : a);

export default function Board() {
  const [items, setItems] = useState<Saved[]>([]);
  const [addr, setAddr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { setItems(getSaved()); }, []);

  async function add(a: string = addr) {
    const bad = checkInput(a);
    if (bad) { setErr(bad); return; }
    setBusy(true); setErr("");
    try {
      saveReport(await load(a.trim()));
      setItems(getSaved());
      setAddr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Try again.");
    }
    setBusy(false);
  }

  async function addExamples() {
    setBusy(true); setErr("");
    const res = await Promise.allSettled(EXAMPLES.map(([, a]) => load(a)));
    res.forEach((x) => { if (x.status === "fulfilled") saveReport(x.value); });
    setItems(getSaved());
    if (res.some((x) => x.status === "rejected")) setErr("One of the examples couldn’t load. Try again in a minute.");
    setBusy(false);
  }

  async function rescan() {
    setBusy(true); setErr("");
    const res = await Promise.allSettled(getSaved().map((s) => load(s.addr)));
    res.forEach((x) => { if (x.status === "fulfilled") saveReport(x.value); });
    setItems(getSaved());
    if (res.some((x) => x.status === "rejected")) setErr("Some wallets couldn’t refresh. They keep their last saved numbers.");
    setBusy(false);
  }

  const ranked = [...items].sort((a, b) => b.score - a.score);

  return (
    <main className="min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-5 py-6 md:px-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C6FF4D" strokeWidth="2.2" aria-hidden="true"><circle cx="12" cy="12" r="7.5"></circle><path d="M12 2v5M12 17v5M2 12h5M17 12h5"></path></svg>
            Scout
          </Link>
          <Link href="/" className="chip inline-flex items-center">Back to scanner</Link>
        </header>

        <h1 className="rise mt-10 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
          Your <span className="acid">Scout Board.</span>
        </h1>
        <p className="rise muted mt-4 max-w-xl text-base md:text-lg">
          Wallets you saved, ranked by how realistic they are to copy. Saved in this browser only.
        </p>

        <div className="panel rise mt-8 p-4 md:p-5">
          <label htmlFor="add" className="sr-only">Wallet address or account ID</label>
          <div className="flex flex-col gap-3 md:flex-row">
            <input id="add" className="field num flex-1" value={addr} onChange={(e) => setAddr(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()} placeholder="addr1… / 0x… / account ID" />
            <button className="btn btn-acid" onClick={() => add()} disabled={busy}>{busy ? "Working…" : "Scan and save"}</button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button className="chip" onClick={addExamples} disabled={busy}>Add the two example wallets</button>
            {ranked.length > 0 && <button className="chip" onClick={rescan} disabled={busy}>Refresh all</button>}
          </div>
          {err && <p role="alert" className="bad mt-3 text-sm">{err}</p>}
        </div>

        {ranked.length === 0 ? (
          <div className="panel mt-6 p-6">
            <p className="font-bold">Nothing saved yet.</p>
            <p className="muted mt-1 text-sm">Scan a wallet and press “Save to Scout Board”, paste one above, or add the two example wallets to see how ranking works.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {ranked.map((s, i) => {
              const cls = s.score >= 70 ? "acid" : s.score >= 40 ? "warn" : "bad";
              return (
                <div key={s.addr} className="panel rise flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="label num">#{i + 1} · {short(s.addr)}</p>
                      <h3 className="mt-1 text-2xl font-bold tracking-tight">{s.type}</h3>
                      <p className={`font-bold ${s.tone}`}>{s.verdict}</p>
                    </div>
                    <div className="text-right">
                      <p className="label">Copyability</p>
                      <p className={`num text-3xl font-semibold ${cls}`}>{s.score}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
                    <div><p className="label">Fills/day</p><p className="num mt-1 font-semibold">{s.perDay ? Math.round(s.perDay).toLocaleString() : "n/a"}</p></div>
                    <div><p className="label">Leverage</p><p className="num mt-1 font-semibold">{s.avgLev ? s.avgLev.toFixed(1) + "x" : "n/a"}</p></div>
                    <div><p className="label">PnL (sample)</p><p className={`num mt-1 font-semibold ${s.pnl >= 0 ? "acid" : "bad"}`}>{usd(s.pnl)}</p></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="muted text-xs">Saved {new Date(s.savedAt).toLocaleDateString()}</p>
                    <button className="chip" onClick={() => setItems(removeSaved(s.addr))}>Remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="muted mt-6 text-[11px]">Copyability is Scout’s estimate from recent fills only. It shows data, not financial advice.</p>
      </div>
    </main>
  );
}
