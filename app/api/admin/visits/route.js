import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { getVisitStats } from "@/lib/visitStats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/visits?days=7|30|90|0   (0 = all time)
export async function GET(request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const days = Number(new URL(request.url).searchParams.get("days"));
  try {
    return NextResponse.json(await getVisitStats(Number.isFinite(days) ? days : 30));
  } catch (err) {
    console.error("visit stats failed:", err?.message || err);
    return NextResponse.json({ error: "Could not load visitor stats." }, { status: 500 });
  }
}