import { COURSE } from "@/lib/config";

// Env values pasted into dashboards often carry stray spaces or quotes. Clean them up.
function env(name) {
  const v = process.env[name];
  return v ? v.trim().replace(/^["']|["']$/g, "").trim() : "";
}

// Sends the "you're in" email through Resend.
// Returns { ok: true } or { ok: false, error: "plain-English reason" }, and logs the reason.
export async function sendConfirmationEmailDetailed({ name, email }) {
  const apiKey = env("RESEND_API_KEY");
  const from = env("EMAIL_FROM");
  const groupLink = env("WHATSAPP_GROUP_LINK");

  const missing = [
    ["RESEND_API_KEY", apiKey],
    ["EMAIL_FROM", from],
    ["WHATSAPP_GROUP_LINK", groupLink],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    const error = `Missing environment variable(s): ${missing.join(", ")}`;
    console.error("Confirmation email not sent:", error);
    return { ok: false, error };
  }

  const firstName = name.split(" ")[0];

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: `You're in! Join the ${COURSE.title} WhatsApp group`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;line-height:1.6;color:#111">
            <h2>Welcome, ${escapeHtml(firstName)}!</h2>
            <p>Your payment for the <strong>${escapeHtml(COURSE.title)}</strong> is confirmed.</p>
            <p>Click the button below to join the WhatsApp group. All lessons, updates and support happen there.</p>
            <p>
              <a href="${escapeHtml(groupLink)}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">
                Join the WhatsApp group
              </a>
            </p>
            <p style="color:#555;font-size:14px">${escapeHtml(COURSE.startDate)}</p>
            <p style="color:#999;font-size:12px">Please don't share this link. It is for paid students only.</p>
          </div>`,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      const error = json?.message || `Resend returned status ${res.status}`;
      console.error("Resend rejected the email:", res.status, json);
      return { ok: false, error };
    }
    return { ok: true };
  } catch (err) {
    console.error("Confirmation email failed:", err);
    return { ok: false, error: "Could not reach Resend. Try again." };
  }
}

// Same as above but returns just true/false (used by lib/payments.js).
export async function sendConfirmationEmail(signup) {
  const result = await sendConfirmationEmailDetailed(signup);
  return result.ok;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}