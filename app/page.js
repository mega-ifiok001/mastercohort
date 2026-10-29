import SignupForm from "@/components/SignupForm";
import { COURSE, formatNaira } from "@/lib/config";
import { sanitizeRef } from "@/lib/utils";

export default async function Home({ searchParams }) {
  // The influencer link looks like: https://yourdomain.com/?ref=influencername
  const params = await searchParams;
  const rawRef = Array.isArray(params?.ref) ? params.ref[0] : params?.ref;
  const refCode = sanitizeRef(rawRef);

  return (
    <main className="page">
      <div className="card">
        <span className="badge">{formatNaira(COURSE.priceNaira)} only</span>
        <h1>{COURSE.title}</h1>
        <p className="tagline">{COURSE.tagline}</p>

        <ul className="highlights">
          {COURSE.highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <SignupForm refCode={refCode} priceLabel={formatNaira(COURSE.priceNaira)} />
      </div>
    </main>
  );
}
