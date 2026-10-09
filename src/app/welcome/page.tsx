"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ensureCustomerSession } from "@/lib/firebase/client";

type SessionState = "checking" | "ready" | "limited";

export default function CustomerWelcomePage() {
  const [sessionState, setSessionState] = useState<SessionState>("checking");

  useEffect(() => {
    let cancelled = false;
    void ensureCustomerSession().then(user => {
      if (!cancelled) setSessionState(user ? "ready" : "limited");
    }).catch(() => {
      if (!cancelled) setSessionState("limited");
    });
    return () => { cancelled = true; };
  }, []);

  return <main className="site">
    <div className="topbar"><div className="container topbarInner"><span>Namane Tyres · Customer welcome</span><strong>Gaborone West Phase 1</strong></div></div>
    <nav className="nav"><div className="container navInner"><Link href="/" className="logo"><span className="logoMark">NT</span><span>Namane Tyres</span></Link><Link href="/book" className="button buttonPrimary">Request Help</Link></div></nav>

    <section className="hero"><div className="container heroGrid"><div>
      <span className="eyebrow">A welcome for our customers</span>
      <h1>Tyre help.<br/><em>Closer to you.</em></h1>
      <p>Welcome to the Namane Tyres customer space. When you need tyre fitting, puncture repair, a pressure check, tyres or roadside assistance, you can reach Thapelo here without searching through old chats.</p>
      <div className="actions">
        <Link href="/book" className="button buttonPrimary">Request Help</Link>
        <Link href="/account" className="button buttonLight">My requests</Link>
        <Link href="/#services" className="button buttonLight">Explore services</Link>
      </div>
      <p className="heroNote">No app-store download or installation is required. You can use this website now and optionally save it to your phone’s home screen for next time.</p>
    </div><div className="heroVisual"><Image src="/namane-assets/work-location.jpg" alt="Namane Tyres at its Gaborone West work location" fill priority sizes="(max-width: 800px) 100vw, 45vw" /></div></div></section>

    <section className="section"><div className="container">
      <div className="sectionHead"><span className="kicker">Your customer access</span><h2>Made for the next time you need us.</h2><p>Start with what you need today. Keep the welcome link handy, and use your individual job link whenever Thapelo shares progress on a particular job.</p></div>
      <div className="cards">
        <article className="card"><div className="cardIcon">🛞</div><h3>Request tyre help</h3><p>Tell us what is happening, add your vehicle and a useful landmark, and share your location if you choose.</p><div className="actions"><Link href="/book" className="button buttonPrimary">Start a request</Link></div></article>
        <article className="card"><div className="cardIcon">📋</div><h3>Keep your requests together</h3><p>Requests made from this browser can appear in My requests. Existing jobs still use the individual progress link sent to you.</p><div className="actions"><Link href="/account" className="button buttonLight">Open My requests</Link></div></article>
        <article className="card"><div className="cardIcon">📲</div><h3>Keep Namane one tap away</h3><p>If you return for tyre help, you can optionally save Namane Tyres to your home screen. The service works without installing it.</p><p className="formTruth">Use the “Save Namane Tyres to phone” option when you are ready.</p></article>
      </div>
    </div></section>

    <section className="requestBand"><div className="container requestBandInner"><div><span className="kicker">Your access status</span><h2>{sessionState === "ready" ? "Your customer space is ready on this device." : sessionState === "checking" ? "Preparing your customer space…" : "You can still use Namane Tyres."}</h2><p>{sessionState === "ready" ? "A lightweight customer session is active in this browser. It is not phone-number verification and does not automatically unlock an existing job." : sessionState === "checking" ? "This normally takes a moment. You can browse services while it loads." : "Your browser could not start a customer session right now. You can still browse services and send a request; try My requests again when connected."}</p></div><Link href="/book" className="button buttonPrimary">Request Assistance</Link></div></section>

    <section className="section"><div className="container"><div className="sectionHead"><span className="kicker">Job updates</span><h2>Stay connected to your work.</h2><p>If Thapelo has already sent you a job-progress link, keep that link for your specific job. On that page, you can choose to receive notifications when Namane Tyres replies. Job details and notifications are not shared across the whole customer list.</p><div className="actions"><Link href="/" className="button buttonLight">Back to Namane Tyres</Link><Link href="/#location" className="button buttonLight">Find the workshop</Link></div></div></div></section>
  </main>;
}
