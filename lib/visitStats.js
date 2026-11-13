import { prisma } from "@/lib/prisma";

const LAGOS_OFFSET_MS = 60 * 60 * 1000; // Africa/Lagos is UTC+1 all year
const DAY_MS = 86400000;
export const RANGES = [7, 30, 90, 0]; // 0 = all time

function lagosMidnight(daysBack) {
  const d = new Date(Date.now() + LAGOS_OFFSET_MS);
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() - LAGOS_OFFSET_MS - daysBack * DAY_MS);
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryName(code) {
  if (!code) return "Unknown";
  try {
    return regionNames.of(code) || code;
  } catch {
    return code;
  }
}

function flag(code) {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));
}

export async function getVisitStats(days = 30) {
  const range = RANGES.includes(days) ? days : 30;
  const since = range ? lagosMidnight(range - 1) : new Date(0);

  const [totals, today, daily, countries, cities, referrers, devices] = await Promise.all([
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS views, COUNT(DISTINCT "visitorId")::int AS visitors
      FROM "Visit" WHERE "createdAt" >= ${since}`,
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT "visitorId")::int AS visitors
      FROM "Visit"
      WHERE (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Lagos')::date
          = (now() AT TIME ZONE 'Africa/Lagos')::date`,
    prisma.$queryRaw`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Lagos', 'YYYY-MM-DD') AS day,
             COUNT(*)::int AS views, COUNT(DISTINCT "visitorId")::int AS visitors
      FROM "Visit" WHERE "createdAt" >= ${since}
      GROUP BY 1`,
    prisma.$queryRaw`
      SELECT "country", COUNT(*)::int AS views, COUNT(DISTINCT "visitorId")::int AS visitors
      FROM "Visit" WHERE "createdAt" >= ${since}
      GROUP BY "country" ORDER BY visitors DESC, views DESC LIMIT 15`,
    prisma.$queryRaw`
      SELECT "country", "city", COUNT(*)::int AS views, COUNT(DISTINCT "visitorId")::int AS visitors
      FROM "Visit" WHERE "createdAt" >= ${since} AND "city" IS NOT NULL
      GROUP BY "country", "city" ORDER BY visitors DESC, views DESC LIMIT 15`,
    prisma.$queryRaw`
      SELECT COALESCE("referrer", '(direct)') AS name, COUNT(DISTINCT "visitorId")::int AS visitors
      FROM "Visit" WHERE "createdAt" >= ${since}
      GROUP BY 1 ORDER BY visitors DESC LIMIT 10`,
    prisma.$queryRaw`
      SELECT COALESCE("device", 'unknown') AS name, COUNT(DISTINCT "visitorId")::int AS visitors
      FROM "Visit" WHERE "createdAt" >= ${since}
      GROUP BY 1 ORDER BY visitors DESC`,
  ]);

  const n = range === 0 ? 90 : range;
  const byDay = Object.fromEntries(daily.map((r) => [r.day, r]));
  const series = [];
  for (let i = n - 1; i >= 0; i--) {
    const key = new Date(Date.now() + LAGOS_OFFSET_MS - i * DAY_MS).toISOString().slice(0, 10);
    series.push({ day: key, visitors: byDay[key]?.visitors ?? 0, views: byDay[key]?.views ?? 0 });
  }

  return {
    range,
    generatedAt: new Date().toISOString(),
    visitors: totals[0]?.visitors ?? 0,
    views: totals[0]?.views ?? 0,
    visitorsToday: today[0]?.visitors ?? 0,
    countryCount: countries.filter((c) => c.country).length,
    series,
    countries: countries.map((c) => ({
      code: c.country,
      label: `${flag(c.country)} ${countryName(c.country)}`,
      visitors: c.visitors,
      views: c.views,
    })),
    cities: cities.map((c) => ({
      label: `${c.city}, ${countryName(c.country)}`,
      visitors: c.visitors,
      views: c.views,
    })),
    referrers: referrers.map((r) => ({ label: r.name, visitors: r.visitors })),
    devices: devices.map((d) => ({ label: d.name, visitors: d.visitors })),
  };
}