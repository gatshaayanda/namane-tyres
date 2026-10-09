"use client";

import { useState } from "react";
import { getToken, getMessaging, isSupported } from "firebase/messaging";
import { auth, app } from "@/lib/firebase/client";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";

async function getAdminToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Your Operations session has expired. Sign in again.");
  return user.getIdToken();
}

async function registerThisDevice() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) throw new Error("This browser does not support web push notifications.");
  if (!VAPID_KEY) throw new Error("The Firebase Web Push VAPID key is not configured.");
  if (!(await isSupported())) throw new Error("Web push is not supported in this browser.");
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications were not allowed. You can enable them later in browser settings.");
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/firebase-cloud-messaging-push-scope/" });
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) throw new Error("Firebase did not return a notification token.");
  const idToken = await getAdminToken();
  const response = await fetch("/api/admin/notifications/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + idToken },
    body: JSON.stringify({ token }),
  });
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(result.error || "This device could not be registered.");
  return token;
}

export default function AdminNotificationSettings() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function enable() {
    setBusy(true);
    setNotice("");
    try {
      const registered = await registerThisDevice();
      setToken(registered);
      setNotice("This device is registered. Send a test while Namane Tyres is in the background to check system delivery.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Notifications could not be enabled.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setNotice("");
    try {
      const registered = token || await registerThisDevice();
      setToken(registered);
      const idToken = await getAdminToken();
      const response = await fetch("/api/admin/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + idToken },
        body: JSON.stringify({ token: registered }),
      });
      const result = await response.json().catch(() => ({})) as { sent?: boolean; error?: string };
      if (!response.ok || !result.sent) throw new Error(result.error || "The test notification was not accepted.");
      setNotice("Test notification sent by Firebase. Put Namane Tyres in the background and check this device; server acceptance does not guarantee the OS displayed it.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Test notification failed.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="adminPanel" style={{ marginBottom: 18 }}>
    <div className="panelHeading"><div><span className="kicker">Alerts · This device</span><h2>New request notifications.</h2></div><span className="orderTruth">{token ? "Device registered" : "Optional"}</span></div>
    <p>Enable alerts on Thapelo’s phone to receive a notification when a new assistance request is saved online. Browser permission is requested only when you choose to enable it.</p>
    <div className="actions">
      <button className="button buttonPrimary" type="button" disabled={busy} onClick={() => void enable()}>{busy ? "Setting up…" : token ? "Refresh device registration" : "Enable request alerts"}</button>
      <button className="button buttonLight" type="button" disabled={busy} onClick={() => void test()}>{busy ? "Working…" : "Send test alert"}</button>
    </div>
    {notice && <p className="formTruth" role="status">{notice}</p>}
  </section>;
}
