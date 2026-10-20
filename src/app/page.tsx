"use client";
import { useState } from "react";

const SAMPLE = {
  name: "Trader nickname",
  addr: "addr1q…x9f2",
  score: 78,
  curve: [92, 86, 70, 98, 84, 60, 66, 38, 24],
};
const card = "rounded-2xl border border-[#1F2A2D] bg-[#131A1C] p-4";

export default function Home() {
  const [hide, setHide] = useState(true);
  const [amount, setAmount] = useState(1000);
  const pts = SAMPLE.curve.map((y, i) => `${i * 40},${y}`).join(" ");
  const stats = [
    ["30-day PnL", "+12.6%", "text-emerald-400"],
    ["Win rate", "61%", ""],
    ["Biggest drop", "-24%", "text-amber-400"],
    ["Liquidations", "0", ""],
  ];

  return (
    <main className="min-h-screen bg-[#0B0F10] text-[#E8F1EE]">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <span className="text-xl font-extrabold">Scout</span>
          <span className="text-xs text-[#8DA09A]">Sample data</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1F2A2D] text-xl font-extrabold">T</div>
          <div>
            <div className="text-xl font-extrabold">{SAMPLE.name}</div>
            <div className="flex items-center gap-2 text-xs text-[#8DA09A]">
              {SAMPLE.addr}
              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 font-bold text-emerald-400">Verified on Strike</span>
            </div>
          </div>
        </div>

        <div className={`${card} flex items-center gap-4`}>
          <svg width="96" height="96" viewBox="0 0 96 96" role="img" aria-label={`Scout score ${SAMPLE.score} out of 100`}>
            <circle cx="48" cy="48" r="40" fill="none" stroke="#1F2A2D" strokeWidth="8" />
            <circle cx="48" cy="48" r="40" fill="none" stroke="#2EE6A6" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${(SAMPLE.score / 100) * 251} 251`} transform="rotate(-90 48 48)" />
            <text x="48" y="56" textAnchor="middle" fill="#E8F1EE" fontSize="26" fontWeight="800">{SAMPLE.score}</text>
          </svg>
          <div>
            <div className="text-xs text-[#8DA09A]">Scout score</div>
            <div className="text-base font-extrabold">Strong results, high drawdown</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map(([label, value, color]) => (
            <div key={label} className={card}>
              <div className="text-xs text-[#8DA09A]">{label}</div>
              <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        <div className={card}>
          <div className="mb-2 text-xs text-[#8DA09A]">Account value, last 90 days</div>
          <svg viewBox="0 0 320 120" className="h-28 w-full" role="img" aria-label="Account value rising with one dip">
            <polyline points={pts} fill="none" stroke="#2EE6A6" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
        </div>

        <div className={`${card} flex items-center justify-between`}>
          <div>
            <div className="font-bold">Hide copied trades</div>
            <div className="text-xs text-[#8DA09A]">See only this trader’s own decisions</div>
          </div>
          <button onClick={() => setHide(!hide)} aria-pressed={hide} aria-label="Hide copied trades"
            className={`flex h-7 w-12 items-center rounded-full px-1 ${hide ? "justify-end bg-emerald-400" : "justify-start bg-[#2A383C]"}`}>
            <span className="h-5 w-5 rounded-full bg-[#04120C]" />
          </button>
        </div>

        <div className={`${card} flex flex-col gap-2 border-emerald-400`}>
          <div className="font-extrabold">Copy simulator</div>
          <label className="text-sm text-[#8DA09A]" htmlFor="amt">If you had copied with ($)</label>
          <input id="amt" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))}
            className="h-12 rounded-xl border border-[#2A383C] bg-[#0B0F10] px-3 text-lg" />
          <div className="flex items-end justify-between">
            <span className="text-xs text-[#8DA09A]">You would have</span>
            <span className="text-3xl font-extrabold text-emerald-400">${Math.round(amount * 1.126).toLocaleString()}</span>
          </div>
          <p className="text-[11px] text-[#8DA09A]">Past results do not predict future ones. Scout shows data, not advice.</p>
        </div>

        <button className="h-12 rounded-xl bg-emerald-400 text-base font-extrabold text-[#04120C]">Copy on Strike</button>
      </div>
    </main>
  );
}