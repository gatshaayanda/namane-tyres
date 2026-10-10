"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminGate from "@/app/admin/admin-gate";
import { auth } from "@/lib/firebase/client";

type BreakdownRow = { label: string; count: number };
type AnalyticsSummary = {
  ok: true;
  rangeDays: 7 | 30;
  since: string;
  until: string;
  trackingStartedAt: string | null;
  web: {
    visitors: number;
    pageViews: number;
    bookingPageViews: number;
    callTaps: number;
    whatsappTaps: number;
    bookingOpens: number;
    installHelpOpens: number;
    topPages: BreakdownRow[];
    sources: BreakdownRow[];
    devices: BreakdownRow[];
    partial: boolean;
  };
  business: {
    requestsReceived: number;
    requestsByStatus: BreakdownRow[];
    jobsCreated: number;
    jobsCompletedTotal: number;
    jobsPaidTotal: number;
    sharedLinkViewsTotal: number;
    sharedLinkActionsTotal: number;
    partialJobs: boolean;
  };
};

function friendlyPage(path: string) {
  const labels: Record<string, string> = {
    "/": "Homepage",
    "/book": "Booking page",
    "/welcome": "Customer welcome",
    "/account": "Customer account",
    "/job/share": "Job progress links",
    "/other": "Other public pages",
  };
  return labels[path] || path;
}

function Metric({ label, value, note }: { label: string; value: number | string; note: string }) {
  return <article><span>{label}</span><strong>{typeof value === "number" ? value.toLocaleString("en-US") : value}</strong><small>{note}</small></article>;
}

function Breakdown({ title, rows, emptyText }: { title: string; rows: BreakdownRow[]; emptyText: string }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section className="adminPanel">
      <div className="panelHeading"><div><span className="kicker">At a glance</span><h2>{title}</h2></div></div>
      {rows.length === 0 ? <div className="emptyState"><p>{emptyText}</p></div> : (
        <div className="detailList">
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label.startsWith("/") ? friendlyPage(row.label) : row.label}</dt>
              <dd>
                <strong>{row.count.toLocaleString("en-US")}</strong>
                <span aria-hidden="true" style={{ display: "block", height: 7, marginTop: 7, background: "#e5e7eb", borderRadius: 99, overflow: "hidden" }}>
                  <span style={{ display: "block", width: Math.max(3, row.count / max * 100) + "%", height: "100%", background: "#15803d", borderRadius: 99 }} />
                </span>
              </dd>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AnalyticsDashboard() {
  const [range, setRange] = useState<7 | 30>(7);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    setError("");
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Please sign in to the Namane Tyres owner account again.");
      const response = await fetch(`/api/admin/analytics?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Analytics could not be loaded.");
      setData(body as AnalyticsSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analytics could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="adminPage">
      <div className="adminShell">
        <header className="adminHeader">
          <div>
            <span className="kicker">Namane Tyres · Owner report</span>
            <h1>How is the business doing?</h1>
            <p>Website activity, customer requests and job progress in one place.</p>
          </div>
          <div className="adminHeaderActions">
            <Link className="button buttonLight" href="/admin">Operations</Link>
            <Link className="button buttonLight" href="/admin/jobs">Jobs &amp; progress</Link>
            <button className="button buttonPrimary" type="button" onClick={() => void load(true)} disabled={refreshing}>
              {refreshing ? "Refreshing…" : "Refresh report"}
            </button>
          </div>
        </header>

        <nav className="adminTabs" aria-label="Analytics reporting period">
          <button className={range === 7 ? "active" : ""} onClick={() => setRange(7)} type="button">Last 7 days</button>
          <button className={range === 30 ? "active" : ""} onClick={() => setRange(30)} type="button">Last 30 days</button>
          {data && <span className="adminTabLink">{data.since} – {data.until}</span>}
        </nav>

        {error && <div className="adminToast" role="alert">{error}</div>}
        {loading && !data ? <div className="adminPanel"><div className="emptyState"><p>Loading your business report…</p></div></div> : null}

        {data && (
          <>
            <div className="adminStats">
              <Metric label="Website visitors" value={data.web.visitors} note="Unique browsers seen in this period" />
              <Metric label="Page views" value={data.web.pageViews} note="Public pages opened" />
              <Metric label="Booking page views" value={data.web.bookingPageViews} note="People reached the booking form" />
              <Metric label="Customer requests" value={data.business.requestsReceived} note={`Requests received in ${range} days`} />
              <Metric label="WhatsApp taps" value={data.web.whatsappTaps} note="Recorded taps to contact you" />
              <Metric label="Call taps" value={data.web.callTaps} note="Recorded taps to call" />
            </div>

            <div className="adminContent twoColumn">
              <Breakdown title="Pages customers visit" rows={data.web.topPages.map((row) => ({ ...row, label: friendlyPage(row.label) }))} emptyText="Page activity will appear here after customers start using the website with analytics enabled." />
              <Breakdown title="Where visits come from" rows={data.web.sources} emptyText="Referring websites will appear here when a visitor arrives from another site." />
            </div>

            <div className="adminContent twoColumn">
              <Breakdown title="Devices used" rows={data.web.devices} emptyText="Device information will appear after tracked visits are recorded." />
              <section className="adminPanel">
                <div className="panelHeading"><div><span className="kicker">Work and customers</span><h2>Business activity</h2></div></div>
                <div className="detailList">
                  <div><dt>Jobs created in this period</dt><dd><strong>{data.business.jobsCreated}</strong></dd></div>
                  <div><dt>Jobs currently marked complete</dt><dd><strong>{data.business.jobsCompletedTotal}</strong></dd></div>
                  <div><dt>Jobs marked paid</dt><dd><strong>{data.business.jobsPaidTotal}</strong></dd></div>
                  <div><dt>Job-progress link opens (all time)</dt><dd><strong>{data.business.sharedLinkViewsTotal}</strong></dd></div>
                  <div><dt>Customer actions on job links (all time)</dt><dd><strong>{data.business.sharedLinkActionsTotal}</strong></dd></div>
                </div>
                <div className="nested">
                  <h3>Request status</h3>
                  {data.business.requestsByStatus.length ? (
                    <div className="detailList">{data.business.requestsByStatus.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.count}</dd></div>)}</div>
                  ) : <p>No requests were recorded in this period.</p>}
                </div>
              </section>
            </div>

            <section className="adminPanel">
              <div className="panelHeading"><div><span className="kicker">How to read this report</span><h2>A few important notes</h2></div></div>
              <div className="detailList">
                <div><dt>Website tracking</dt><dd>These visitor and page-view counts start when this analytics update goes live. They do not import older Vercel Analytics totals.</dd></div>
                <div><dt>Visitor count</dt><dd>Counts distinct random browser identifiers, so the same person on two devices may count twice and clearing browser data may create a new count.</dd></div>
                <div><dt>Bookings and enquiries</dt><dd>Customer requests are counted from saved request records, not from someone merely opening the booking page. Calls and WhatsApp figures are recorded taps, not confirmed conversations.</dd></div>
                <div><dt>Privacy</dt><dd>The dashboard stores no customer names, phone numbers, job-share IDs or IP addresses in website analytics events.</dd></div>
              </div>
            </section>

            {(data.web.partial || data.business.partialJobs) && <p className="formTruth">This report reached a safety limit while reading records, so some totals may be incomplete.</p>}
            {data.trackingStartedAt && <p className="formTruth">Tracked website activity first recorded in this report: {new Date(data.trackingStartedAt).toLocaleString()}.</p>}
          </>
        )}
      </div>
    </main>
  );
}

export default function AnalyticsPage() {
  return <AdminGate><AnalyticsDashboard /></AdminGate>;
}
