import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

async function requireAdmin(request: Request) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new Error("Unauthorized");
  const user = await adminAuth().verifyIdToken(token);
  const role = await adminDb().doc(`admins/${user.uid}`).get();
  if (!role.exists || !["owner", "staff"].includes(String(role.data()?.role))) throw new Error("Operations access required.");
  return user;
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed.";
  const status = message === "Unauthorized" ? 401 : message === "Operations access required." ? 403 : 500;
  console.error("[admin/jobs]", error);
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const snapshot = await adminDb().collection("jobs").get();
    const jobs = snapshot.docs.map((item) => { const data = item.data() as Record<string, unknown>; return { id: item.id, data }; }).sort((a, b) => String(b.data.createdAt ?? "").localeCompare(String(a.data.createdAt ?? ""))).map(({ id, data }) => ({ id, ...data }));
    return NextResponse.json({ jobs });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const job = await request.json();
    if (!job?.id || !job?.publicShareId || !job?.customerName || !job?.phone || !job?.service) {
      return NextResponse.json({ error: "Customer, phone, service and job identifiers are required." }, { status: 422 });
    }
    const batch = adminDb().batch();
    batch.set(adminDb().doc(`jobs/${job.id}`), job, { merge: false });
    batch.set(adminDb().doc(`publicJobs/${job.publicShareId}`), {
      customerName: job.customerName, vehicle: job.vehicle, service: job.service, status: job.status,
      problem: job.problem, notes: job.notes, createdAt: job.createdAt, updatedAt: job.updatedAt,
    }, { merge: false });
    await batch.commit();
    return NextResponse.json({ job });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);
    const job = await request.json();
    if (!job?.id || !job?.publicShareId) return NextResponse.json({ error: "Job identifiers are required." }, { status: 422 });
    const now = new Date().toISOString();
    const existing = await adminDb().doc(`jobs/${job.id}`).get();
    const next = { ...job, shareStats: existing.data()?.shareStats ?? job.shareStats ?? { views: 0, engagements: 0 }, updatedAt: now };
    const batch = adminDb().batch();
    batch.set(adminDb().doc(`jobs/${job.id}`), next, { merge: true });
    batch.set(adminDb().doc(`publicJobs/${job.publicShareId}`), {
      customerName: next.customerName, vehicle: next.vehicle, service: next.service, status: next.status,
      problem: next.problem, notes: next.notes, createdAt: next.createdAt, updatedAt: now,
    }, { merge: true });
    await batch.commit();
    return NextResponse.json({ job: next });
  } catch (error) {
    return errorResponse(error);
  }
}
