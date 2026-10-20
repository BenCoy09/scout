import { NextResponse } from "next/server";

const BASE = "https://api.strikefinance.org";

export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }
  try {
    const res = await fetch(
      `${BASE}/v2/portfolio?blockchain_address=${encodeURIComponent(address)}`,
      { cache: "no-store" }
    );
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Could not reach Strike" }, { status: 502 });
  }
}
