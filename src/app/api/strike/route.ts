import { NextResponse } from "next/server";

const BASE = "https://api.strikefinance.org";
const PATHS: Record<string, string> = {
  portfolio: "/v2/portfolio",
  fills: "/v2/history/fill",
  funding: "/v2/history/funding",
};

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const key = p.get("path") ?? "";
  const path = PATHS[key];
  const id = (p.get("address") ?? "").trim();
  if (!path || !id) {
    return NextResponse.json({ error: "path and address required" }, { status: 400 });
  }
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const qs = new URLSearchParams(isUuid ? { account_id: id } : { blockchain_address: id });
  if (key === "fills" || key === "funding") qs.set("limit", "1000");
  let detail = "";
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(`${BASE}${path}?${qs}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
      const text = await res.text();
      return new NextResponse(text, { status: res.status, headers: { "content-type": "application/json" } });
    } catch (e) {
      const cause = e instanceof Error && "cause" in e ? String((e as { cause?: unknown }).cause) : "";
      detail = e instanceof Error ? `${e.message} ${cause}` : "unknown error";
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return NextResponse.json({ error: "Could not reach Strike", detail }, { status: 502 });
}
