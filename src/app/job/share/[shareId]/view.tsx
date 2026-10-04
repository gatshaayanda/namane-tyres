"use client";

import {useEffect,useState} from "react";
import Image from "next/image";
import Link from "next/link";
import {collection,doc,getDoc,getDocs} from "firebase/firestore";
import {db} from "@/lib/firebase/client";
import type {JobPhoto} from "@/lib/firebase/data";

async function recordShareEvent(shareId:string,event:"view"|"request_help"|"directions"){
  try{await fetch(`/api/public/share/${shareId}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event})});}catch{}
}

export default function SharedJobView({shareId}:{shareId:string}){
 const [job,setJob]=useState<Record<string,unknown>|null>(null),[photos,setPhotos]=useState<JobPhoto[]>([]),[loading,setLoading]=useState(true);
 useEffect(()=>{
   const key=`namane-share-view:${shareId}`;
   if(!sessionStorage.getItem(key)){sessionStorage.setItem(key,"1");void recordShareEvent(shareId,"view");}
   void (async()=>{try{const snap=await getDoc(doc(db,"publicJobs",shareId));if(!snap.exists())return;setJob(snap.data());const ps=await getDocs(collection(db,"publicJobs",shareId,"photos"));setPhotos(ps.docs.map(d=>({id:d.id,...d.data()} as JobPhoto)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))}finally{setLoading(false)}})();
 },[shareId]);
 if(loading)return <main className="bookPage"><div className="formWrap"><section className="formCard"><span className="kicker">Namane Tyres</span><h1>Loading job update…</h1><p>Opening the latest progress shared by Namane Tyres.</p></section></div></main>;
 if(!job)return <main className="bookPage"><div className="formWrap"><section className="formCard"><span className="kicker">Namane Tyres</span><h1>Update not available</h1><p>This progress link has not reached the server yet, or it is no longer available.</p><Link className="button buttonPrimary" href="/book">Request help</Link></section></div></main>;
 const engage=(event:"request_help"|"directions")=>{void recordShareEvent(shareId,event)};
 const stats=(job.shareStats||{}) as {views?:number;engagements?:number};
 return <main className="bookPage"><div className="formWrap"><section className="formCard"><span className="kicker">Namane Tyres · Job progress</span><h1>{String(job.customerName||"Customer")}</h1><p><strong>{String(job.service||"Service")}</strong> · {String(job.vehicle||"Vehicle not specified")}</p><div className="detailList"><div><dt>Status</dt><dd><strong>{String(job.status)}</strong></dd></div><div><dt>Work</dt><dd>{String(job.problem||"Service in progress")}</dd></div>{job.notes?<div><dt>Notes</dt><dd>{String(job.notes)}</dd></div>:null}<div><dt>Updated</dt><dd>{new Date(String(job.updatedAt)).toLocaleString()}</dd></div></div>{photos.length?<div className="mediaGrid">{photos.map(photo=><figure className="mediaCard" key={photo.id}><Image src={photo.url} alt={photo.caption||"Namane Tyres job progress"} width={1200} height={900} sizes="(max-width: 800px) 100vw, 50vw"/><figcaption>{photo.caption||"Job progress"}</figcaption></figure>)}</div>:<div className="emptyState"><p>No progress photos have been shared yet.</p></div>}<div className="requestBand"><div><span className="kicker">Need anything else?</span><h2>We can help.</h2><p>If the vehicle needs another service, send Namane Tyres a request.</p></div><Link href="/book" className="button buttonPrimary" onClick={()=>engage("request_help")}>Request help</Link></div><div className="actions"><a className="button buttonLight" href="https://www.google.com/maps/search/?api=1&query=Plot%2016739%20Gaborone%20West%20Phase%201%20Gaborone%20Botswana" target="_blank" rel="noreferrer" onClick={()=>engage("directions")}>Find Namane Tyres</a></div><p className="formTruth">This page shows the job progress Namane Tyres has chosen to share. It does not expose the customer&apos;s phone number.</p></section></div></main>;
}
