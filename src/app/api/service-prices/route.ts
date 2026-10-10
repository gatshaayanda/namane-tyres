import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ServicePrice = { id: string; name: string; price: number };
const DEFAULT_SERVICE_PRICES: ServicePrice[] = [
  { id: "tyre-fitting", name: "Tyre fitting", price: 40 },
  { id: "tubeless-patch", name: "Tubeless patch", price: 40 },
  { id: "inside-patch", name: "Inside patch", price: 40 },
];
const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };

function validServices(value: unknown): value is ServicePrice[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 12
    && value.every((item) => item && typeof item.id === "string" && /^[a-zA-Z0-9-]{1,64}$/.test(item.id)
      && typeof item.name === "string" && item.name.trim().length > 0 && item.name.trim().length <= 80
      && typeof item.price === "number" && Number.isFinite(item.price) && item.price >= 0 && item.price <= 100000);
}

export async function GET() {
  try {
    const snapshot = await adminDb().doc("businessSettings/prices").get();
    const stored = snapshot.data()?.services;
    const services = validServices(stored) ? stored : DEFAULT_SERVICE_PRICES;
    return NextResponse.json({ services }, { headers });
  } catch {
    return NextResponse.json({ services: DEFAULT_SERVICE_PRICES, fallback: true }, { headers });
  }
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Please sign in again." }, { status: 401, headers });
    const user = await adminAuth().verifyIdToken(token);
    const role = await adminDb().doc("admins/" + user.uid).get();
    if (!role.exists || String(role.data()?.role || "") !== "owner") {
      return NextResponse.json({ error: "Only the Namane Tyres owner can publish service prices." }, { status: 403, headers });
    }

    const body = await request.json() as { services?: unknown };
    if (!validServices(body.services)) {
      return NextResponse.json({ error: "Enter valid service names and non-negative prices." }, { status: 400, headers });
    }
    const services = body.services.map((item) => ({ id: item.id, name: item.name.trim(), price: Math.round(item.price * 100) / 100 }));
    if (new Set(services.map((item) => item.id)).size !== services.length) {
      return NextResponse.json({ error: "Each service must have a unique ID." }, { status: 400, headers });
    }
    await adminDb().doc("businessSettings/prices").set({ services, updatedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true, services }, { headers });
  } catch {
    return NextResponse.json({ error: "Service prices could not be saved. Check the connection and owner access." }, { status: 500, headers });
  }
}
