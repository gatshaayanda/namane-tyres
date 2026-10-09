import { NextResponse } from "next/server";
import { adminDb, adminMessaging } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { requestId?: unknown };
    const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
    if (!requestId || requestId.length > 160) return NextResponse.json({ sent: false, error: "A valid request reference is required." }, { status: 422 });

    const db = adminDb();
    const requestSnapshot = await db.collection("assistanceRequests").doc(requestId).get();
    if (!requestSnapshot.exists) return NextResponse.json({ sent: false, error: "Saved request not found." }, { status: 404 });
    const work = requestSnapshot.data() || {};
    const admins = await db.collection("admins").get();
    const tokenSnapshots = await Promise.all(admins.docs.map(admin => db.collection("adminNotificationTokens").doc(admin.id).collection("tokens").get()));
    const recipients = tokenSnapshots.flatMap(snapshot => snapshot.docs.map(tokenDoc => ({ ref: tokenDoc.ref, token: String(tokenDoc.data().token || "") }))).filter(item => item.token);
    if (!recipients.length) return NextResponse.json({ sent: false, reason: "no-admin-device" });

    const deliveryRef = db.collection("notificationDeliveries").doc("assistance-" + requestId);
    const claimed = await db.runTransaction(async transaction => {
      const previous = await transaction.get(deliveryRef);
      if (previous.exists) return false;
      transaction.create(deliveryRef, { requestId, status: "sending", claimedAt: new Date().toISOString() });
      return true;
    });
    if (!claimed) return NextResponse.json({ sent: false, reason: "already-sent" });

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://namane-tyres.vercel.app";
      const result = await adminMessaging().sendEachForMulticast({
        tokens: recipients.map(item => item.token),
        notification: {
          title: "New assistance request",
          body: [work.name, work.vehicle, work.problem].filter(value => typeof value === "string" && value).join(" · ").slice(0, 160) || "A customer has requested tyre assistance.",
        },
        data: { requestId, link: baseUrl + "/admin" },
        webpush: { fcmOptions: { link: baseUrl + "/admin" }, notification: { icon: "/icon.svg", badge: "/icon.svg", tag: "namane-request-" + requestId } },
      });
      await Promise.all(result.responses.map((response, index) => {
        const code = response.error?.code || "";
        if (!response.success && /registration-token-not-registered|invalid-registration-token|unregistered/i.test(code)) return recipients[index].ref.delete();
        return Promise.resolve();
      }));
      if (!result.successCount) {
        await deliveryRef.delete();
        return NextResponse.json({ sent: false, successCount: 0, failureCount: result.failureCount });
      }
      await deliveryRef.set({ status: "sent", sentAt: new Date().toISOString(), successCount: result.successCount }, { merge: true });
      return NextResponse.json({ sent: true, successCount: result.successCount, failureCount: result.failureCount });
    } catch (error) {
      await deliveryRef.delete().catch(() => undefined);
      throw error;
    }
  } catch (error) {
    console.error("[public/requests/notify]", error);
    return NextResponse.json({ sent: false, error: "The request was saved, but the owner alert could not be sent." }, { status: 500 });
  }
}
