import SignupForm from "@/components/SignupForm";
import { COURSE, formatNaira } from "@/lib/config";
import { sanitizeRef } from "@/lib/utils";

export default async function Home({ searchParams }) {
  // The influencer link looks like: https://yourdomain.com/?ref=influencername
  const params = await searchParams;
  const rawRef = Array.isArray(params?.ref) ? params.ref[0] : params?.ref;
  const refCode = sanitizeRef(rawRef);

  const price = formatNaira(COURSE.priceNaira);
  const [line1, line2] = COURSE.headline;

  return (
    <main className="landing">
      {/*
        Layout: one column on phones (hero, lessons, info, form).
        On desktop it becomes two columns: hero + lessons on the left,
        a sticky info + signup column on the right.
      */}
      <div className="landing-grid">
        <section className="hero">
          <span className="eyebrow">Starts {COURSE.startShort}</span>
          <h1 className="hero-title">
            {line1} <span className="nowrap">{line2}</span>
          </h1>
          <p className="hero-sub">
            Learn, Create and Monetize with AI.
            <br />
            Turn Your <strong className="hl">Creativity</strong> into <strong className="hl">Income!</strong>
          </p>
        </section>

        <section className="learn-card">
          <span className="pill">{COURSE.highlightsTitle}</span>
          <ul className="learn-list">
            {COURSE.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <aside className="side">
          <section className="info-panel">
            <div className="info-row">
              <div className="info-chip">
                <span className="chip-big">{COURSE.bonus.title}</span>
                <span className="chip-small">{COURSE.bonus.text}</span>
              </div>
              <div className="info-fee">
                <span className="fee-label">{COURSE.priceLabel}</span>
                <span className="fee-amount">{price}</span>
              </div>
            </div>

            <div className="info-start">
              <span className="start-label">Starting:</span>
              <span className="start-date">{COURSE.startShort}</span>
              <span className="start-device">📱 {COURSE.delivery}</span>
            </div>
          </section>

          <section className="signup-card" id="register">
            <h2>Reserve your spot</h2>
            <p className="signup-sub">Fill in your details, pay {price} and join the private WhatsApp class group.</p>
            <SignupForm refCode={refCode} priceLabel={price} />
          </section>
        </aside>
      </div>
    </main>
  );
}