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
      { next: { revalidate: 60 } }
    );
    if (!res.ok) {
      return NextResponse.json({ error: `Strike returned ${res.status}` }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "Could not reach Strike" }, { status: 502 });
  }
}