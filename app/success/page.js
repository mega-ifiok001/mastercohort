import Link from "next/link";
import { confirmPayment } from "@/lib/payments";
import { COURSE } from "@/lib/config";

// Never cache this page: it must verify the payment on every visit.
export const dynamic = "force-dynamic";
export const metadata = { title: `You're in | ${COURSE.title}` };

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SuccessPage({ searchParams }) {
  const params = await searchParams;
  // Paystack redirects back with ?reference=...&trxref=...
  const reference = first(params?.reference) || first(params?.trxref);

  const { status, signup } = await confirmPayment(reference);

  if (status === "paid") {
    const groupLink = process.env.WHATSAPP_GROUP_LINK;
    const firstName = signup.name.split(" ")[0];

    return (
      <main className="page">
        <div className="card center">
          <div className="emoji">🎉</div>
          <h1>You're in, {firstName}!</h1>
          <p className="tagline">
            Your payment is confirmed. Click the button below to join the WhatsApp group. That's where the
            course happens.
          </p>

          {groupLink ? (
            <a className="btn" href={groupLink} target="_blank" rel="noopener noreferrer">
              Join the WhatsApp group
            </a>
          ) : (
            <div className="error">The group link isn't set up yet. Please contact support.</div>
          )}

          <div className="notice">
            Join now and use the same WhatsApp number you registered with:{" "}
            <strong>{signup.whatsapp}</strong>
          </div>
          <p className="fine">{COURSE.startDate}</p>
          <p className="fine">Please don't share the group link. It's for paid students only.</p>
        </div>
      </main>
    );
  }

  if (status === "pending" || status === "error") {
    return (
      <main className="page">
        <div className="card center">
          <div className="emoji">⏳</div>
          <h1>Confirming your payment</h1>
          <p className="tagline">
            We haven't received confirmation yet. If you were charged, wait a minute and refresh this page.
            Your access is saved and won't be lost.
          </p>
          <div className="stack">
            <Link className="btn" href={`/success?reference=${encodeURIComponent(reference || "")}`}>
              Refresh
            </Link>
            <Link className="btn btn-secondary" href="/">
              Back to the form
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (status === "failed") {
    return (
      <main className="page">
        <div className="card center">
          <div className="emoji">⚠️</div>
          <h1>Payment didn't go through</h1>
          <p className="tagline">No worries, you can try again. If money left your account, it will be returned by your bank.</p>
          <div className="stack">
            <Link className="btn" href="/">
              Try again
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // not_found or invalid
  return (
    <main className="page">
      <div className="card center">
        <div className="emoji">🔒</div>
        <h1>We couldn't verify this payment</h1>
        <p className="tagline">
          This link isn't valid or the payment couldn't be confirmed. If you paid, please contact support with
          your payment receipt.
        </p>
        <div className="stack">
          <Link className="btn btn-secondary" href="/">
            Back to the form
          </Link>
        </div>
      </div>
    </main>
  );
}
