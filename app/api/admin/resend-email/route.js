import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendConfirmationEmailDetailed } from "@/lib/email";
import { isAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Sends the confirmation email again to paid students who never got it.
// Body: { id: "<signup id>" } for one person, or {} for everyone paid who is still missing the email.
export async function POST(request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  const rows = await prisma.signup.findMany({
    where:
      typeof body.id === "string" && body.id
        ? { id: body.id, status: "PAID" }
        : { status: "PAID", emailSentAt: null },
    orderBy: { paidAt: "desc" },
    take: 50,
  });

  const summary = { attempted: rows.length, sent: 0, failed: 0, error: null };

  for (const row of rows) {
    const result = await sendConfirmationEmailDetailed(row);
    if (result.ok) {
      await prisma.signup.update({ where: { id: row.id }, data: { emailSentAt: new Date() } });
      summary.sent++;
    } else {
      summary.failed++;
      summary.error ||= result.error;
      // Missing settings or a rejected sender will fail for everyone, so stop early.
      if (summary.failed >= 3) break;
    }
    await sleep(600); // Resend allows about 2 emails per second.
  }

  return NextResponse.json(summary);
}