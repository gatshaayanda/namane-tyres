"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminGate from "@/app/admin/admin-gate";
import { getAssistanceRequests, getTyreInventory, saveTyreInventoryItem, deleteTyreInventoryItem, updateAssistanceStatus, type AssistanceRequest, type RequestStatus, type TyreInventoryItem, REQUEST_STATUSES } from "@/lib/firebase/data";

function Dashboard() {
  const [tab, setTab] = useState<"requests" | "inventory">("requests");
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [inventory, setInventory] = useState<TyreInventoryItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<TyreInventoryItem | null>(null);

  async function load() {
    setLoading(true);
    try {
      const result = await Promise.all([getAssistanceRequests(), getTyreInventory()]);
      setRequests(result[0]); setInventory(result[1]);
    } catch {
      setNotice("Operations data could not be loaded. If you are offline, only data already cached on this device may be available.");
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const current = requests.find(r => r.id === selected) ?? null;

  async function changeStatus(id: string, next: RequestStatus) {
    try {
      await updateAssistanceStatus(id, next);
      setRequests(items => items.map(r => r.id === id ? { ...r, status: next } : r));
      setNotice("Request updated.");
    } catch { setNotice("That status could not be saved. Check the connection and try again."); }
  }

  async function saveInventory() {
    if (!draft || !draft.size.trim() || !draft.brand.trim()) return;
    try {
      await saveTyreInventoryItem(draft);
      setInventory(items => items.some(i => i.id === draft.id) ? items.map(i => i.id === draft.id ? draft : i) : [draft, ...items]);
      setDraft(null); setNotice("Inventory saved.");
    } catch { setNotice("Inventory could not be saved. Check the connection."); }
  }

  return <main className="adminPage"><div className="adminShell">
    <header className="adminHeader"><div><span className="kicker">Namane Tyres · Operations</span><h1>Keep the work moving.</h1><p>Requests first. Inventory when you need it.</p></div><div className="adminHeaderActions"><Link className="button buttonLight" href="/">Public site</Link><Link className="button buttonPrimary" href="/book">Request form</Link></div></header>
    <div className="adminStats"><article><span>Requests</span><strong>{loading ? "—" : requests.length}</strong></article><article><span>New</span><strong>{loading ? "—" : requests.filter(r => r.status === "New").length}</strong></article><article><span>Active jobs</span><strong>{loading ? "—" : requests.filter(r => ["Accepted","In Progress","Ready / Awaiting Customer"].includes(r.status)).length}</strong></article><article><span>Available tyres</span><strong>{loading ? "—" : inventory.filter(i => i.available && i.quantity > 0).length}</strong></article></div>
    <nav className="adminTabs" aria-label="Operations sections"><button className={tab === "requests" ? "active" : ""} onClick={() => setTab("requests")}>Requests</button><button className={tab === "inventory" ? "active" : ""} onClick={() => setTab("inventory")}>Tyre inventory</button></nav>
    {notice && <div className="adminToast" role="status">{notice}</div>}
    {tab === "requests" && <section className="adminContent twoColumn"><div className="adminPanel"><div className="panelHeading"><div><span className="kicker">Incoming</span><h2>Assistance requests</h2></div><span>{requests.length} total</span></div>{loading ? <div className="emptyState">Loading…</div> : requests.length === 0 ? <div className="emptyState"><h3>No requests yet</h3><p>New customer requests will appear here.</p></div> : <div className="requestList">{[...requests].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(r => <button className={selected === r.id ? "requestRow selected" : "requestRow"} key={r.id} onClick={() => setSelected(r.id)}><div><strong>{r.name}</strong><span>{r.vehicle}</span></div><div><strong>{r.status}</strong><span>{r.problem.slice(0,70)}</span></div></button>)}</div>}</div>
      <div className="adminPanel detailPanel">{current ? <><div className="panelHeading"><div><span className="kicker">Request details</span><h2>{current.name}</h2></div><select value={current.status} onChange={e => void changeStatus(current.id, e.target.value as RequestStatus)}>{REQUEST_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div><dl className="detailList"><div><dt>Phone</dt><dd><a href={"tel:" + current.phone}>{current.phone}</a></dd></div><div><dt>Vehicle</dt><dd>{current.vehicle}</dd></div><div><dt>Problem</dt><dd>{current.problem}</dd></div><div><dt>Location</dt><dd>{current.locationText || (current.latitude !== undefined ? String(current.latitude) + ", " + String(current.longitude) : "Not provided")}</dd></div><div><dt>Notes</dt><dd>{current.notes || "None"}</dd></div></dl><div className="actions"><a className="button buttonPrimary" href={"https://wa.me/" + current.phone.replace(/\D/g, "")}>WhatsApp</a><a className="button buttonLight" href={"tel:" + current.phone}>Call</a></div></> : <div className="emptyState"><h3>Select a request</h3><p>Open a request to see the customer brief and move it through the real work.</p></div>}</div></section>}
    {tab === "inventory" && <section className="adminContent"><div className="adminPanel"><div className="panelHeading"><div><span className="kicker">Tyre stock</span><h2>Inventory</h2></div><button className="button buttonPrimary" onClick={() => setDraft({id: crypto.randomUUID(), size:"", brand:"", condition:"New", quantity:1, price:"", available:true, notes:""})}>Add tyre</button></div>{inventory.length === 0 ? <div className="emptyState"><p>No tyre inventory has been added yet.</p></div> : <div className="inventoryGrid">{inventory.map(item => <article key={item.id}><div><strong>{item.size}</strong><span>{item.brand} · {item.condition}</span></div><b>{item.quantity} · {item.price || "Price not set"}</b><span>{item.available ? "Available" : "Not available"}</span><div className="actions"><button className="button buttonLight" onClick={() => setDraft({...item})}>Edit</button><button className="button buttonLight" onClick={() => void deleteTyreInventoryItem(item.id).then(() => setInventory(items => items.filter(i => i.id !== item.id))).catch(() => setNotice("Could not delete inventory item."))}>Delete</button></div></article>)}</div>}{draft && <div className="adminPanel nested"><h3>{inventory.some(i => i.id === draft.id) ? "Edit" : "Add"} tyre</h3><div className="formGrid"><label>Size<input value={draft.size} onChange={e => setDraft({...draft,size:e.target.value})}/></label><label>Brand<input value={draft.brand} onChange={e => setDraft({...draft,brand:e.target.value})}/></label><label>Condition<select value={draft.condition} onChange={e => setDraft({...draft,condition:e.target.value as TyreInventoryItem["condition"]})}><option>New</option><option>Used</option><option>Retreaded</option><option>Other</option></select></label><label>Quantity<input type="number" min="0" value={draft.quantity} onChange={e => setDraft({...draft,quantity:Number(e.target.value)})}/></label><label>Price<input value={draft.price} onChange={e => setDraft({...draft,price:e.target.value})}/></label><label>Available<select value={String(draft.available)} onChange={e => setDraft({...draft,available:e.target.value === "true"})}><option value="true">Yes</option><option value="false">No</option></select></label><label className="fieldFull">Notes<textarea value={draft.notes} onChange={e => setDraft({...draft,notes:e.target.value})}/></label></div><div className="actions"><button className="button buttonPrimary" onClick={() => void saveInventory()}>Save</button><button className="button buttonLight" onClick={() => setDraft(null)}>Cancel</button></div></div>}</div></section>}
  </div></main>;
}

export default function AdminPage() { return <AdminGate><Dashboard /></AdminGate>; }
