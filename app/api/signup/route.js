import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { initializeTransaction } from "@/lib/paystack";
import { PRICE_KOBO } from "@/lib/config";
import { isValidEmail, normalizePhone, sanitizeRef } from "@/lib/utils";

export const runtime = "nodejs";

function fail(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request.");
  }

  // Honeypot: real people never fill this hidden field, bots do.
  if (body.website) return NextResponse.json({ ok: true });

  const name = String(body.name || "").trim().replace(/\s+/g, " ");
  const email = String(body.email || "").trim().toLowerCase();
  const whatsapp = normalizePhone(String(body.whatsapp || ""));
  const refCode = sanitizeRef(body.ref);

  if (name.length < 2 || name.length > 100) return fail("Please enter your real name.");
  if (!isValidEmail(email)) return fail("Please enter a valid email address.");
  if (!whatsapp) return fail("Please enter a valid WhatsApp number, e.g. 08012345678.");

  const existing = await prisma.signup.findUnique({ where: { email } });
  if (existing?.status === "PAID") {
    return fail("This email has already paid. Check your inbox for the WhatsApp group link.", 409);
  }

  // A fresh reference for every payment attempt (Paystack requires unique references).
  const reference = "crs_" + crypto.randomBytes(12).toString("hex");

  // Save before sending them to pay, so every payer is on record even if they close the tab.
  // If this email signed up before but never paid, update that record instead of duplicating it.
  await prisma.signup.upsert({
    where: { email },
    create: { name, email, whatsapp, refCode, reference, amountKobo: PRICE_KOBO },
    update: {
      name,
      whatsapp,
      reference,
      amountKobo: PRICE_KOBO,
      ...(refCode ? { refCode } : {}),
    },
  });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");

  try {
    const checkout = await initializeTransaction({
      email,
      amountKobo: PRICE_KOBO,
      reference,
      callbackUrl: `${appUrl}/success`,
      metadata: {
        name,
        whatsapp,
        ref: refCode,
        custom_fields: [
          { display_name: "Name", variable_name: "name", value: name },
          { display_name: "WhatsApp", variable_name: "whatsapp", value: whatsapp },
        ],
      },
    });

    return NextResponse.json({ authorizationUrl: checkout.authorization_url });
  } catch (err) {
    console.error("Paystack initialize error:", err);
    return fail("We couldn't start the payment. Please try again in a moment.", 502);
  }
}
