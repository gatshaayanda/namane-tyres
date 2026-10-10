import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" };

async function requireOwner(request: Request) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new Error("Unauthorized");
  const user = await adminAuth().verifyIdToken(token);
  const role = await adminDb().doc(`admins/${user.uid}`).get();
  if (!role.exists || String(role.data()?.role) !== "owner") throw new Error("Owner access required.");
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Analytics could not be loaded.";
  const status = message === "Unauthorized" ? 401 : message === "Owner access required." ? 403 : 500;
  console.error("[admin/analytics]", error);
  return NextResponse.json({ error: status === 500 ? "Analytics are temporarily unavailable." : message }, { status, headers });
}

function countBy(items: Array<Record<string, unknown>>, key: string, valueKey = "event") {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = String(item[key] ?? "Unknown");
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 6);
}

function numeric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function GET(request: Request) {
  try {
    await requireOwner(request);
    const url = new URL(request.url);
    const rangeDays = url.searchParams.get("range") === "30" ? 30 : 7;
    const sinceDate = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);
    const since = sinceDate.toISOString();
    const until = new Date().toISOString();
    const db = adminDb();

    const [eventSnapshot, requestSnapshot, jobSnapshot, publicJobSnapshot] = await Promise.all([
      db.collection("siteAnalyticsEvents").where("createdAt", ">=", since).limit(10000).get(),
      db.collection("assistanceRequests").where("createdAt", ">=", since).limit(5000).get(),
      db.collection("jobs").limit(5000).get(),
      db.collection("publicJobs").limit(5000).get(),
    ]);

    const events = eventSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>);
    const pageViews = events.filter((event) => event.event === "page_view");
    const visitors = new Set(pageViews.map((event) => String(event.visitorId || "")).filter(Boolean));
    const bookingPageViews = pageViews.filter((event) => event.path === "/book").length;
    const eventCount = (name: string) => events.filter((event) => event.event === name).length;
    const requests = requestSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>);
    const jobs = jobSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>);
    const publicJobs = publicJobSnapshot.docs.map((doc) => doc.data() as Record<string, unknown>);
    const jobsCreatedInRange = jobs.filter((job) => typeof job.createdAt === "string" && job.createdAt >= since).length;
    const requestsByStatus = countBy(requests, "status");
    const topPages = countBy(pageViews, "path");
    const sources = countBy(pageViews.filter((event) => event.source !== "Direct / unknown"), "source");
    const devices = countBy(pageViews, "device");
    const sharedViews = publicJobs.reduce((sum, job) => sum + numeric((job.shareStats as Record<string, unknown> | undefined)?.views), 0);
    const sharedActions = publicJobs.reduce((sum, job) => sum + numeric((job.shareStats as Record<string, unknown> | undefined)?.engagements), 0);
    const earliestEvent = events.map((event) => String(event.createdAt || "")).filter(Boolean).sort()[0] || null;

    return NextResponse.json({
      ok: true,
      rangeDays,
      since: since.slice(0, 10),
      until: until.slice(0, 10),
      trackingStartedAt: earliestEvent,
      web: {
        visitors: visitors.size,
        pageViews: pageViews.length,
        bookingPageViews,
        callTaps: eventCount("call_tap"),
        whatsappTaps: eventCount("whatsapp_tap"),
        bookingOpens: eventCount("booking_open"),
        installHelpOpens: eventCount("install_help_open"),
        topPages,
        sources,
        devices,
        partial: eventSnapshot.size >= 10000,
      },
      business: {
        requestsReceived: requests.length,
        requestsByStatus,
        jobsCreated: jobsCreatedInRange,
        jobsCompletedTotal: jobs.filter((job) => job.status === "Complete").length,
        jobsPaidTotal: jobs.filter((job) => job.paymentStatus === "Paid").length,
        sharedLinkViewsTotal: sharedViews,
        sharedLinkActionsTotal: sharedActions,
        partialJobs: jobSnapshot.size >= 5000 || publicJobSnapshot.size >= 5000,
      },
    }, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}
