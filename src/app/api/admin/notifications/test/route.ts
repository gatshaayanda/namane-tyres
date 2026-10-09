import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { adminAuth, adminDb, adminMessaging } from "@/lib/firebase/admin";

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
    if (!token) return NextResponse.json({ sent: false, error: "Register this device first." }, { status: 422 });
    const tokenId = createHash("sha256").update(token).digest("hex");
    const saved = await adminDb().collection("adminNotificationTokens").doc(uid).collection("tokens").doc(tokenId).get();
    if (!saved.exists || saved.data()?.token !== token) return NextResponse.json({ sent: false, error: "This device is not registered. Enable request alerts first." }, { status: 403 });
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://namane-tyres.vercel.app";
    const messageId = await adminMessaging().send({
      token,
      notification: { title: "Namane Tyres · Test alert", body: "This device is ready to receive new assistance request alerts." },
      data: { link: baseUrl + "/admin" },
      webpush: { fcmOptions: { link: baseUrl + "/admin" }, notification: { icon: "/icon.svg", badge: "/icon.svg", tag: "namane-admin-test" } },
    });
    return NextResponse.json({ sent: true, messageId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Test notification failed.";
    const status = message === "Unauthorized" ? 401 : message === "Operations access required." ? 403 : 500;
    return NextResponse.json({ sent: false, error: message }, { status });
  }
}
