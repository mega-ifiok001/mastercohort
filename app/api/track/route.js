import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "vid";
const ONE_YEAR = 60 * 60 * 24 * 365;
const DEDUPE_MS = 30 * 60 * 1000; // same person + same page within 30 min = one visit
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch/i;

function safeDecode(v) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function clean(v, max) {
  if (!v || typeof v !== "string") return null;
  const t = safeDecode(v).trim().slice(0, max);
  return t || null;
}

function deviceType(ua) {
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}

function referrerHost(raw, ownHost) {
  if (!raw || typeof raw !== "string") return null;
  try {
    const host = new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
    if (!host || host === ownHost.replace(/^www\./, "").split(":")[0]) return null;
    return host.slice(0, 100);
  } catch {
    return null;
  }
}

export async function POST(request) {
  const ua = request.headers.get("user-agent") || "";
  if (!ua || BOT.test(ua)) return new NextResponse(null, { status: 204 });
  if (await isAdmin()) return new NextResponse(null, { status: 204 }); // don't count yourself

  const body = await request.json().catch(() => ({}));
  const path =
    typeof body.path === "string" && body.path.startsWith("/") ? body.path.split("?")[0].slice(0, 200) : "/";
  if (path.startsWith("/admin") || path.startsWith("/api")) return new NextResponse(null, { status: 204 });

  const h = request.headers;
  const country = (h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || "").toUpperCase();
  const countryCode = /^[A-Z]{2}$/.test(country) ? country : null;
  const city = clean(h.get("x-vercel-ip-city"), 80);
  const region = clean(h.get("x-vercel-ip-country-region"), 80);

  let visitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  const isNew = !visitorId || !/^[0-9a-f-]{36}$/.test(visitorId);
  if (isNew) visitorId = crypto.randomUUID();

  try {
    const recent = isNew
      ? null
      : await prisma.visit.findFirst({
          where: { visitorId, path, createdAt: { gte: new Date(Date.now() - DEDUPE_MS) } },
          select: { id: true },
        });

    if (!recent) {
      await prisma.visit.create({
        data: {
          visitorId,
          path,
          country: countryCode,
          region,
          city,
          referrer: referrerHost(body.referrer, h.get("host") || ""),
          device: deviceType(ua),
        },
      });
    }
  } catch (err) {
    console.error("track failed:", err?.message || err);
  }

  const res = new NextResponse(null, { status: 204 });
  if (isNew) {
    res.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ONE_YEAR,
    });
  }
  return res;
}