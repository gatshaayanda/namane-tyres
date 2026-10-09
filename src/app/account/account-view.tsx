"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, ensureCustomerSession } from "@/lib/firebase/client";
import type { AssistanceRequest } from "@/lib/firebase/data";

export default function CustomerAccountView() {
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const user = await ensureCustomerSession();
        if (!user) throw new Error("Customer access is unavailable.");
        const snapshot = await getDocs(query(collection(db, "assistanceRequests"), where("customerUid", "==", user.uid)));
        const items = snapshot.docs.map(item => ({ id: item.id, ...item.data() } as AssistanceRequest));
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        if (!cancelled) setRequests(items);
      } catch {
        if (!cancelled) setNotice("Your customer session could not be opened. Check your connection and try again. You can still browse Namane Tyres or use Request Help.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return <main className="bookPage">
    <nav className="nav"><div className="container navInner">
      <Link href="/" className="logo"><span className="logoMark">NT</span><span>Namane Tyres</span></Link>
      <Link href="/book" className="button buttonPrimary">Request Help</Link>
    </div></nav>
    <div className="formWrap">
      <section className="sectionHead">
        <span className="kicker">Your customer access</span>
        <h1>My requests.</h1>
        <p>Requests submitted from this browser appear here. For an existing job, open the private progress link Thapelo sent you.</p>
      </section>
      {notice && <section className="formCard" role="status"><p>{notice}</p><Link href="/book" className="button buttonPrimary">Request Help</Link></section>}
      {loading ? <section className="formCard"><p>Opening your customer access…</p></section> : null}
      {!loading && !notice && requests.length === 0 ? <section className="formCard">
        <h2>No requests from this device yet.</h2>
        <p>You can browse the services first. When you need help, send a request and it will appear here after it is saved.</p>
        <div className="actions"><Link href="/book" className="button buttonPrimary">Request Help</Link><Link href="/" className="button buttonLight">Browse services</Link></div>
      </section> : null}
      {!loading && !notice && requests.map(item => <article className="formCard" key={item.id} style={{ marginBottom: 14 }}>
        <div className="panelHeading"><div><span className="kicker">Request · {item.id.slice(0, 8).toUpperCase()}</span><h2>{item.problem}</h2></div><strong>{item.status}</strong></div>
        <p>{item.vehicle} · Submitted {new Date(item.createdAt).toLocaleString()}</p>
        {item.locationText ? <p>Location: {item.locationText}</p> : null}
        <p className="formTruth">A request is not an accepted job until Namane Tyres confirms it.</p>
      </article>)}
      <p className="formTruth">This account is saved on this browser. It does not verify your phone number or automatically connect older jobs. Keep your job-specific progress link safe.</p>
    </div>
  </main>;
}
