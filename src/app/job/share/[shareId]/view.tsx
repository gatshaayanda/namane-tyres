"use client";

import {useEffect,useState} from "react";
import Image from "next/image";
import Link from "next/link";
import {collection,doc,getDoc,getDocs} from "firebase/firestore";
import {db} from "@/lib/firebase/client";
import type {JobPhoto} from "@/lib/firebase/data";
import {enableJobNotifications,listenForJobNotifications} from "@/lib/firebase/messaging";

type JobMessage={id:string;name:string;message:string;from:string;createdAt:string};

async function recordShareEvent(shareId:string,event:"view"|"request_help"|"directions"){
 try{await fetch(`/api/public/share/${shareId}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event})});}catch{}
}

export default function SharedJobView({shareId}:{shareId:string}){
 const [job,setJob]=useState<Record<string,unknown>|null>(null),[photos,setPhotos]=useState<JobPhoto[]>([]),[messages,setMessages]=useState<JobMessage[]>([]),[message,setMessage]=useState(""),[sending,setSending]=useState(false),[loading,setLoading]=useState(true),[notice,setNotice]=useState(""),[notifications,setNotifications]=useState<"idle"|"enabled">("idle");

 const messageKey=`namane-share-messages:${shareId}`;
 const queueKey=`namane-share-message-queue:${shareId}`;

 const cacheMessages=(items:JobMessage[])=>{try{localStorage.setItem(messageKey,JSON.stringify(items))}catch{}};
 const readCachedMessages=():JobMessage[]=>{try{return JSON.parse(localStorage.getItem(messageKey)||"[]")}catch{return[]}};
 const flushMessages=async()=>{
  if(!navigator.onLine)return;
  let pending:Array<{id:string;message:string;name:string}>=[];
  try{pending=JSON.parse(localStorage.getItem(queueKey)||"[]")}catch{}
  for(const item of pending){
   try{
    const r=await fetch(`/api/public/share/${shareId}/messages`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:item.message,name:item.name})});
    if(!r.ok)break;
    const body=await r.json() as JobMessage;
    setMessages(x=>{const next=[...x.filter(m=>m.id!==item.id),body];cacheMessages(next);return next});
    pending=pending.filter(x=>x.id!==item.id);
    localStorage.setItem(queueKey,JSON.stringify(pending));
   }catch{break}
  }
 };

 useEffect(()=>{
  const key=`namane-share-view:${shareId}`;
  if(!sessionStorage.getItem(key)){sessionStorage.setItem(key,"1");void recordShareEvent(shareId,"view");}
  const on=()=>void flushMessages();
  addEventListener("online",on);
  void (async()=>{
   try{
    const snap=await getDoc(doc(db,"publicJobs",shareId));
    if(!snap.exists())return;
    setJob(snap.data());
    const ps=await getDocs(collection(db,"publicJobs",shareId,"photos"));
    setPhotos(ps.docs.map(d=>({id:d.id,...d.data()} as JobPhoto)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));
    if(navigator.onLine){
     const mr=await fetch(`/api/public/share/${shareId}/messages`);
     if(mr.ok){const md=await mr.json();const incoming=(md.messages||[]) as JobMessage[];setMessages(incoming);cacheMessages(incoming);}
     else setMessages(readCachedMessages());
    }else setMessages(readCachedMessages());
    await flushMessages();
   }catch{setMessages(readCachedMessages())}
   finally{setLoading(false)}
  })();
  return()=>removeEventListener("online",on);
 },[shareId]);

 useEffect(()=>{
  let stop:(()=>void)|undefined;
  void listenForJobNotifications((title,body)=>setNotice(`${title}: ${body}`)).then(unsubscribe=>{stop=unsubscribe});
  return()=>{stop?.()};
 },[]);

 if(loading)return <main className="bookPage"><div className="formWrap"><section className="formCard"><span className="kicker">Namane Tyres</span><h1>Loading job update…</h1><p>Opening the latest progress shared by Namane Tyres.</p></section></div></main>;
 if(!job)return <main className="bookPage"><div className="formWrap"><section className="formCard"><span className="kicker">Namane Tyres</span><h1>Update not available</h1><p>This progress link has not reached the server yet, or it is no longer available.</p><Link className="button buttonPrimary" href="/book">Request help</Link></section></div></main>;

 const engage=(event:"request_help"|"directions")=>{void recordShareEvent(shareId,event)};
 const quick=(text:string)=>{setMessage(text);setNotice("")};
 const notify=async()=>{
  try{await enableJobNotifications(shareId);setNotifications("enabled");setNotice("Notifications are on. We’ll alert you when Namane Tyres replies.");}
  catch(e){setNotice(e instanceof Error?e.message:"Could not enable notifications.")}
 };
 const sendMessage=async()=>{
  if(!message.trim()||sending)return;
  setSending(true);setNotice("");
  try{
   const text=message.trim();
   if(!navigator.onLine){
    const item={id:`offline-${crypto.randomUUID()}`,message:text,name:"Customer"};
    let pending=[];try{pending=JSON.parse(localStorage.getItem(queueKey)||"[]")}catch{}
    pending.push(item);localStorage.setItem(queueKey,JSON.stringify(pending));
    const next=[...messages,{...item,from:"customer",createdAt:new Date().toISOString()} as JobMessage];
    setMessages(next);cacheMessages(next);setMessage("");setNotice("Saved on this phone. It will send automatically when you are back online.");return;
   }
   const r=await fetch(`/api/public/share/${shareId}/messages`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text})});
   const body=await r.json();if(!r.ok)throw new Error(body.error||"Could not send message.");
   setMessages(x=>{const next=[...x,body];cacheMessages(next);return next});setMessage("");setNotice("Sent to Namane Tyres.");void recordShareEvent(shareId,"request_help");
  }catch(e){setNotice(e instanceof Error?e.message:"Could not send message.")}finally{setSending(false)}
 };

 return <main className="bookPage"><div className="formWrap"><section className="formCard">
  <span className="kicker">Namane Tyres · Job progress</span>
  <h1>{String(job.customerName||"Customer")}</h1>
  <p><strong>{String(job.service||"Service")}</strong> · {String(job.vehicle||"Vehicle not specified")}</p>
  <div className="detailList"><div><dt>Status</dt><dd><strong>{String(job.status)}</strong></dd></div><div><dt>Work</dt><dd>{String(job.problem||"Service in progress")}</dd></div>{job.notes?<div><dt>Notes</dt><dd>{String(job.notes)}</dd></div>:null}<div><dt>Updated</dt><dd>{new Date(String(job.updatedAt)).toLocaleString()}</dd></div></div>
  {photos.length?<div className="mediaGrid">{photos.map(photo=><figure className="mediaCard" key={photo.id}><Image src={photo.url} alt={photo.caption||"Namane Tyres job progress"} width={1200} height={900} sizes="(max-width: 800px) 100vw, 50vw"/><figcaption>{photo.caption||"Job progress"}</figcaption></figure>)}</div>:<div className="emptyState"><p>No progress photos have been shared yet.</p></div>}

  <div className="formCard" style={{marginTop:"1.25rem"}}>
   <span className="kicker">Stay connected</span>
   <h2>Talk to Namane Tyres</h2>
   <p>Send a quick update about this job, payment, an eWallet transfer, or anything you need them to know. Messages can be written offline and will send when the connection returns.</p>
   <div className="actions">{["I sent the eWallet","I have a question","Please call me","Something else"].map(item=><button type="button" className="button buttonLight" key={item} onClick={()=>quick(item)}>{item}</button>)}</div>
   <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Tell Namane Tyres anything about this job…" rows={4} maxLength={1000} aria-label="Message Namane Tyres"/>
   <button type="button" className="button buttonPrimary" disabled={!message.trim()||sending} onClick={()=>void sendMessage()}>{sending?"Sending…":"Send to Namane Tyres"}</button>
   <div className="actions"><button type="button" className="button buttonLight" onClick={()=>void notify()}>{notifications==="enabled"?"🔔 Notifications on":"🔔 Get reply notifications"}</button></div>
   {notice?<p className="formTruth" role="status">{notice}</p>:null}
   {messages.length?<div className="detailList">{messages.map(item=><div key={item.id}><dt>{item.from==="admin"?"Namane Tyres":"You"} · {new Date(item.createdAt).toLocaleString()}</dt><dd>{item.message}</dd></div>)}</div>:null}
  </div>

  <div className="requestBand"><div><span className="kicker">Need anything else?</span><h2>We can help.</h2><p>Need something else? You can start another request without losing this progress link.</p></div><Link href="/book" className="button buttonPrimary" onClick={()=>engage("request_help")}>Request help</Link></div>
  <div className="actions"><a className="button buttonLight" href="https://www.google.com/maps/search/?api=1&query=Plot%2016739%20Gaborone%20West%20Phase%201%20Gaborone%20Botswana" target="_blank" rel="noreferrer" onClick={()=>engage("directions")}>Find Namane Tyres</a></div>
  <p className="formTruth">This is your private job link. Check the latest progress, message Namane Tyres, or start another request. Your phone number is not shown here.</p>
 </section></div></main>;
}
