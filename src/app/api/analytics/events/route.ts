import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EVENTS = new Set([
  "page_view",
  "call_tap",
  "whatsapp_tap",
  "booking_open",
  "install_help_open",
]);
const ALLOWED_PATHS = new Set(["/", "/book", "/welcome", "/account", "/job/share", "/other"]);
const recentByVisitor = new Map<string, { startedAt: number; count: number }>();

function safeText(value: unknown, fallback: string, max = 120) {
  if (typeof value !== "string") return fallback;
  const clean = value.trim().slice(0, max);
  return clean || fallback;
}

function validVisitorId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9-]{12,100}$/.test(value);
}

function response(status: number) {
  return new NextResponse(null, {
    status,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin) {
      try {
        if (new URL(origin).host !== new URL(request.url).host) return response(403);
      } catch {
        return response(403);
      }
    }

    const length = Number(request.headers.get("content-length") || "0");
    if (length > 2048) return response(413);

    const body = await request.json() as Record<string, unknown>;
    if (typeof body.event !== "string" || !ALLOWED_EVENTS.has(body.event) || !validVisitorId(body.visitorId)) {
      return response(400);
    }

    const now = Date.now();
    const current = recentByVisitor.get(body.visitorId);
    if (current && now - current.startedAt < 10 * 60 * 1000 && current.count >= 120) return response(429);
    if (!current || now - current.startedAt >= 10 * 60 * 1000) recentByVisitor.set(body.visitorId, { startedAt: now, count: 1 });
    else recentByVisitor.set(body.visitorId, { ...current, count: current.count + 1 });
    if (recentByVisitor.size > 5000) {
      for (const [key, value] of recentByVisitor) if (now - value.startedAt >= 10 * 60 * 1000) recentByVisitor.delete(key);
    }

    const path = safeText(body.path, "/other", 40);
    const device = body.device === "Mobile" ? "Mobile" : "Desktop";
    const rawSource = safeText(body.source, "Direct / unknown", 120);
    const source = /^[a-z0-9.-]+$/i.test(rawSource) ? rawSource.toLowerCase() : "Direct / unknown";

    await adminDb().collection("siteAnalyticsEvents").add({
      event: body.event,
      visitorId: body.visitorId,
      path: ALLOWED_PATHS.has(path) ? path : "/other",
      source,
      device,
      createdAt: new Date().toISOString(),
    });

    return response(204);
  } catch {
    return response(500);
  }
}
