"use client";

import { useState } from "react";

export default function SignupForm({ refCode, priceLabel }) {
  const [form, setForm] = useState({ name: "", email: "", whatsapp: "", website: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ref: refCode }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      if (data.authorizationUrl) {
        // Hand off to Paystack's checkout page. Keep the button disabled while redirecting.
        window.location.href = data.authorizationUrl;
        return;
      }

      setError("Something went wrong. Please try again.");
      setLoading(false);
    } catch {
      setError("Network problem. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="name">Full name</label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Your real name"
          value={form.name}
          onChange={update("name")}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={update("email")}
          required
        />
        <div className="hint">Use an active email. Your confirmation is sent here.</div>
      </div>

      <div className="field">
        <label htmlFor="whatsapp">WhatsApp number</label>
        <input
          id="whatsapp"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="08012345678"
          value={form.whatsapp}
          onChange={update("whatsapp")}
          required
        />
        <div className="hint">The number you use on WhatsApp.</div>
      </div>

      {/* Honeypot: hidden from people, bots fill it in. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={update("website")}
        />
      </div>

      {error && <div className="error">{error}</div>}

      <button className="btn" type="submit" disabled={loading}>
        {loading ? "Taking you to payment..." : `Pay ${priceLabel} & Join`}
      </button>

      <p className="fine">Secure payment by Paystack. No refunds after you join the group.</p>
    </form>
  );
}
