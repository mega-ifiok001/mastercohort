import { NextResponse } from "next/server";
import { isValidWebhookSignature } from "@/lib/paystack";
import { confirmPayment } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Paystack calls this after a payment, even if the buyer closed the tab or lost network.
// Set the URL in Paystack Dashboard > Settings > API Keys & Webhooks:
//   https://YOUR-DOMAIN/api/webhook
export async function POST(request) {
  // The signature is computed over the exact raw body, so read it as text, not JSON.
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!isValidWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  if (event.event === "charge.success" && event.data?.reference) {
    // confirmPayment re-verifies with Paystack and checks amount/currency,
    // so we never rely on the webhook body alone.
    const result = await confirmPayment(event.data.reference);
    // "error" means Paystack was unreachable. A non-200 makes Paystack retry the webhook.
    if (result.status === "error") {
      return NextResponse.json({ error: "Try again" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
