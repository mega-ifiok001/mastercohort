import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { confirmPayment } from "@/lib/payments";
import { isAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Asks Paystack about unpaid signups and marks them PAID if the payment really went through.
// Body: { reference: "crs_..." } to check one person, or {} to check every unpaid signup.
export async function POST(request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  let references;
  if (typeof body.reference === "string" && body.reference) {
    references = [body.reference];
  } else {
    const pending = await prisma.signup.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { reference: true },
    });
    references = pending.map((p) => p.reference);
  }

  const summary = { checked: references.length, confirmed: 0, stillPending: 0, failed: 0, problems: 0 };

  // A few at a time so we don't hammer Paystack.
  for (let i = 0; i < references.length; i += 5) {
    const batch = references.slice(i, i + 5);
    const results = await Promise.all(batch.map((ref) => confirmPayment(ref)));
    for (const r of results) {
      if (r.status === "paid") summary.confirmed++;
      else if (r.status === "pending") summary.stillPending++;
      else if (r.status === "failed") summary.failed++;
      else summary.problems++; // "invalid", "error", "not_found"
    }
  }

  return NextResponse.json(summary);
}