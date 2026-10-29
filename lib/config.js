// Edit this file to change the course details shown on the pages.
export const COURSE = {
  title: "2-Week AI Automation Course",
  tagline: "Learn to build AI automations that save time and make money.",
  priceNaira: 2000,
  startDate: "Starts soon. Details are shared in the WhatsApp group.",
  highlights: [
    "2 weeks of guided, step-by-step training",
    "Hands-on AI automation projects you build yourself",
    "Private WhatsApp group for lessons, updates and support",
  ],
};

// Paystack amounts are in kobo (1 naira = 100 kobo).
export const PRICE_KOBO = COURSE.priceNaira * 100;

export function formatNaira(amount) {
  return "₦" + amount.toLocaleString("en-NG");
}
