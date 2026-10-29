import { COURSE } from "@/lib/config";

// Sends the "you're in" email through Resend. Does nothing if RESEND_API_KEY is not set.
// Returns true if an email was sent.
export async function sendConfirmationEmail({ name, email }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const groupLink = process.env.WHATSAPP_GROUP_LINK;
  if (!apiKey || !from || !groupLink) return false;

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
              <a href="${groupLink}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">
                Join the WhatsApp group
              </a>
            </p>
            <p style="color:#555;font-size:14px">${escapeHtml(COURSE.startDate)}</p>
            <p style="color:#999;font-size:12px">Please don't share this link. It is for paid students only.</p>
          </div>`,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("Confirmation email failed:", err);
    return false;
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
