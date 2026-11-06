import { prisma } from "@/lib/prisma";
import { verifyTransaction } from "@/lib/paystack";
import { sendConfirmationEmail } from "@/lib/email";

// Sends the confirmation email at most once per student, and retries later if a send failed.
// It "claims" the send first (sets emailSentAt) so the webhook and the success page can't both send it,
// then undoes the claim if the email didn't go out so the next call tries again.
async function sendEmailOnce(signup) {
  const claimed = await prisma.signup.updateMany({
    where: { id: signup.id, status: "PAID", emailSentAt: null },
    data: { emailSentAt: new Date() },
  });
  if (claimed.count !== 1) return;

  const sent = await sendConfirmationEmail(signup);
  if (!sent) {
    await prisma.signup.update({ where: { id: signup.id }, data: { emailSentAt: null } });
  }
}

/**
 * The single place that decides whether someone has paid.
 * Called by both the success page and the webhook, so the result is always the same.
 * Safe to call many times for the same reference.
 *
 * Returns { status, signup } where status is one of:
 *   "paid"      payment verified with Paystack (amount and currency checked)
 *   "pending"   Paystack has no completed payment yet
 *   "failed"    payment was abandoned or failed
 *   "invalid"   Paystack says success but amount/currency don't match (never grant access)
 *   "not_found" we don't know this reference
 *   "error"     could not reach Paystack, try again
 */
export async function confirmPayment(reference) {
  if (!reference || typeof reference !== "string") return { status: "not_found", signup: null };

  const signup = await prisma.signup.findUnique({ where: { reference } });
  if (!signup) return { status: "not_found", signup: null };
  if (signup.status === "PAID") {
    // Already paid. If the email never went out (e.g. Resend wasn't set up yet), try again now.
    if (!signup.emailSentAt) await sendEmailOnce(signup);
    return { status: "paid", signup };
  }

  let result;
  try {
    result = await verifyTransaction(reference);
  } catch (err) {
    console.error("Paystack verify failed:", err);
    return { status: "error", signup };
  }

  const { httpStatus, data } = result;

  // Paystack returns 404 when the reference exists on our side but no payment was started.
  if (!data) {
    return { status: httpStatus === 404 ? "pending" : "error", signup };
  }

  if (data.status === "success") {
    if (data.amount !== signup.amountKobo || data.currency !== "NGN") {
      console.error("Payment amount/currency mismatch", { reference, amount: data.amount, currency: data.currency });
      return { status: "invalid", signup };
    }

    // Only the first caller flips PENDING -> PAID.
    await prisma.signup.updateMany({
      where: { reference, status: "PENDING" },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paystackTransactionId: String(data.id),
      },
    });

    const fresh = await prisma.signup.findUnique({ where: { reference } });

    await sendEmailOnce(fresh);
    return { status: "paid", signup: fresh };
  }

  if (data.status === "failed" || data.status === "abandoned") {
    return { status: "failed", signup };
  }

  return { status: "pending", signup };
}