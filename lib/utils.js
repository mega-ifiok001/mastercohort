// Influencer / partner code from the ad link (?ref=name). Keep it short and safe.
export function sanitizeRef(value) {
  if (!value || typeof value !== "string") return null;
  const cleaned = value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  return cleaned || null;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

// Normalises to +234XXXXXXXXXX for Nigerian numbers. Accepts 0803..., 803..., 234803..., +234803...
// Other international numbers are accepted if they start with + and have 8-15 digits.
export function normalizePhone(input) {
  if (!input || typeof input !== "string") return null;
  const cleaned = input.replace(/[\s\-().]/g, "");

  if (cleaned.startsWith("+")) {
    const digits = cleaned.slice(1);
    return /^\d{8,15}$/.test(digits) ? "+" + digits : null;
  }
  if (!/^\d+$/.test(cleaned)) return null;

  if (cleaned.startsWith("234") && cleaned.length === 13) return "+" + cleaned;
  if (cleaned.startsWith("0") && cleaned.length === 11) return "+234" + cleaned.slice(1);
  if (cleaned.length === 10 && /^[789]/.test(cleaned)) return "+234" + cleaned;
  return null;
}
