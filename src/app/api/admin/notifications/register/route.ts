import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

async function requireAdmin(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new Error("Unauthorized");
  const user = await adminAuth().verifyIdToken(token);
  const role = await adminDb().doc("admins/" + user.uid).get();
  if (!role.exists || !["owner", "staff"].includes(String(role.data()?.role))) throw new Error("Operations access required.");
  return user.uid;
}

export async function POST(request: Request) {
  try {
    const uid = await requireAdmin(request);
    const body = await request.json().catch(() => ({})) as { token?: unknown };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token || token.length > 4096) return NextResponse.json({ error: "A valid notification token is required." }, { status: 422 });
    const id = createHash("sha256").update(token).digest("hex");
    await adminDb().collection("adminNotificationTokens").doc(uid).collection("tokens").doc(id).set({ token, updatedAt: new Date().toISOString() }, { merge: true });
    return NextResponse.json({ registered: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not register notifications.";
    const status = message === "Unauthorized" ? 401 : message === "Operations access required." ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
