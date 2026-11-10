// Edit this file to change the course details shown on the pages.
// Copy here is matched to the promo flyer.
export const COURSE = {
  title: "Learn AI Automation in 2 Weeks",
  shortTitle: "AI Automation Course",
  headline: ["Learn AI automation", "in 2 weeks"],
  tagline: "Learn, Create and Monetize with AI. Turn Your Creativity into Income!",
  priceNaira: 2000,
  priceLabel: "Discounted fee",
  startDate: "Starting Monday, November 23rd",
  startShort: "November 23rd",
  delivery: "Using your mobile phone",
  bonus: { title: "30 Days", text: "Free CapCut Login" },
  highlightsTitle: "What You'll Learn",
  highlights: [
    "Learn Cinematic Short Films",
    "Create UGC Content",
    "Monetize Your Skill",
    "Open a Page That Leads to Monetization",
    "Sell to Brands",
    "Create Fashion Mockups for Brands",
    "Start Faceless Content for Your Channel",
    "Access to lifetime materials",
  ],
};

// Paystack amounts are in kobo (1 naira = 100 kobo).
export const PRICE_KOBO = COURSE.priceNaira * 100;

export function formatNaira(amount) {
  return "₦" + amount.toLocaleString("en-NG");
}