import { prisma } from "@/lib/prisma";
import { verifyTransaction } from "@/lib/paystack";
import { sendConfirmationEmail } from "@/lib/email";

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
  if (signup.status === "PAID") return { status: "paid", signup };

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

    // Only the first caller flips PENDING -> PAID, so the email is sent exactly once
    // even if the webhook and the success page arrive at the same moment.
    const updated = await prisma.signup.updateMany({
      where: { reference, status: "PENDING" },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paystackTransactionId: String(data.id),
      },
    });

    const fresh = await prisma.signup.findUnique({ where: { reference } });

    if (updated.count === 1) {
      const sent = await sendConfirmationEmail(fresh);
      if (sent) {
        await prisma.signup.update({ where: { reference }, data: { emailSentAt: new Date() } });
      }
    }
    return { status: "paid", signup: fresh };
  }

  if (data.status === "failed" || data.status === "abandoned") {
    return { status: "failed", signup };
  }

  return { status: "pending", signup };
}
