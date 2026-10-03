import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

async function requireAdmin(request: Request) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new Error("Unauthorized");
  const user = await adminAuth().verifyIdToken(token);
  const role = await adminDb().doc(`admins/${user.uid}`).get();
  if (!role.exists || !["owner", "staff"].includes(String(role.data()?.role))) throw new Error("Operations access required.");
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed.";
  const status = message === "Unauthorized" ? 401 : message === "Operations access required." ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const jobId = new URL(request.url).searchParams.get("jobId");
    if (!jobId) return NextResponse.json({ error: "jobId is required." }, { status: 422 });
    const snapshot = await adminDb().collection("jobs").doc(jobId).collection("photos").get();
    const photos = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return NextResponse.json({ photos });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const photo = await request.json();
    if (!photo?.id || !photo?.jobId || !photo?.shareId || !photo?.url) {
      return NextResponse.json({ error: "Photo identifiers and URL are required." }, { status: 422 });
    }
    const batch = adminDb().batch();
    batch.set(adminDb().doc(`jobs/${photo.jobId}/photos/${photo.id}`), photo, { merge: false });
    batch.set(adminDb().doc(`publicJobs/${photo.shareId}/photos/${photo.id}`), photo, { merge: false });
    await batch.commit();
    return NextResponse.json({ photo });
  } catch (error) {
    return errorResponse(error);
  }
}
