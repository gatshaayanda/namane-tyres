"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { createAssistanceRequest } from "@/lib/firebase/data";

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "unknown";
}

export default function BookForm() {
  const [submitted, setSubmitted] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const request = {
      createdAt: new Date().toISOString(),
      name: String(form.get("name") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      vehicle: String(form.get("vehicle") ?? "").trim(),
      problem: String(form.get("problem") ?? "").trim(),
      notes: String(form.get("notes") ?? "").trim(),
      locationText: String(form.get("locationText") ?? "").trim(),
      status: "New" as const,
    };

    if (!request.name || !request.phone || !request.vehicle || !request.problem) {
      setError("Please complete your name, phone number, vehicle and what is wrong.");
      setBusy(false);
      return;
    }

    try {
      let location: { latitude?: number; longitude?: number; locationAccuracy?: number } = {};
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 7000, maximumAge: 300000 }),
          );
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            locationAccuracy: position.coords.accuracy,
          };
        } catch {
          // Location is optional; continue with the customer-entered landmark.
        }
      }

      const wasOffline = !navigator.onLine;
      const id = await createAssistanceRequest({ ...request, ...location });
      setReference(id.slice(0, 8).toUpperCase());
      setPendingSync(wasOffline);
      setSubmitted(true);
      event.currentTarget.reset();
    } catch (err) {
      console.error("[Namane Tyres] request failed", err);
      setError("We could not save your request (" + errorCode(err) + "). It was not confirmed as received. Please try again when connected or contact Namane Tyres directly.");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return <main className="bookPage"><nav className="nav"><div className="container navInner"><Link href="/" className="logo"><span className="logoMark">NT</span><span>Namane Tyres</span></Link></div></nav><div className="formWrap"><div className="formCard confirm"><div className="confirmIcon">{pendingSync ? "📥" : "✅"}</div><span className="kicker">{pendingSync ? "Offline save" : "Request sent"}</span><h1>{pendingSync ? "Saved on this phone." : "Sent to Namane Tyres."}</h1><p>{pendingSync ? "Your request is waiting to send. Reconnect this device so Firestore can synchronize it. Until that happens, the business has not received it." : "Your request has been written to the Namane Tyres request queue. The team can review it and contact you."}</p><strong>Reference #{reference}</strong><div className="actions centered"><Link className="button buttonPrimary" href="/">Back to Namane Tyres</Link><Link className="button buttonLight" href="/book">New request</Link></div></div></div></main>;
  }

  return <main className="bookPage"><nav className="nav"><div className="container navInner"><Link href="/" className="logo"><span className="logoMark">NT</span><span>Namane Tyres</span></Link><Link href="/" className="button buttonLight">Back</Link></div></nav><div className="formWrap"><div className="sectionHead"><span className="kicker">Request Assistance</span><h1>Tell us what&apos;s happening.</h1><p>Give the team enough information to understand the problem. Location sharing is optional.</p></div><div className="formCard"><form onSubmit={handleSubmit} className="formGrid"><label>Your name<input name="name" autoComplete="name" required /></label><label>Phone / WhatsApp<input name="phone" type="tel" autoComplete="tel" required /></label><label className="fieldFull">Vehicle<input name="vehicle" placeholder="e.g. Toyota Corolla, registration if useful" required /></label><label className="fieldFull">What is wrong?<textarea name="problem" placeholder="Flat tyre, puncture, needs fitting, pressure check, tyre needed..." required /></label><label className="fieldFull">Location or landmark <span>(optional)</span><input name="locationText" placeholder="Road, neighbourhood, landmark or at the shop" /></label><label className="fieldFull">Anything else? <span>(optional)</span><textarea name="notes" placeholder="Tyre size, urgency, preferred contact or other useful detail" /></label>{error && <p className="formError fieldFull" role="alert">{error}</p>}<div className="fieldFull"><button className="button buttonPrimary submitButton" type="submit" disabled={busy}>{busy ? "Saving request…" : "Send Request"}</button></div><p className="formTruth fieldFull">Online: the request is sent to the Namane Tyres queue. Offline: Firestore may save it on this device and wait for synchronization. The app will tell you which state applies.</p></form></div></div></main>;
}
