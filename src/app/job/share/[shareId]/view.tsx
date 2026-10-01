"use client";
import {useEffect,useState} from "react";
import Image from "next/image";
import {collection,doc,getDoc,getDocs} from "firebase/firestore";
import {db} from "@/lib/firebase/client";
import type {JobPhoto} from "@/lib/firebase/data";
export default function SharedJobView({shareId}:{shareId:string}){
 const [job,setJob]=useState<Record<string,unknown>|null>(null),[photos,setPhotos]=useState<JobPhoto[]>([]),[loading,setLoading]=useState(true);
 useEffect(()=>{void (async()=>{try{const snap=await getDoc(doc(db,"publicJobs",shareId));if(!snap.exists())return;setJob(snap.data());const ps=await getDocs(collection(db,"publicJobs",shareId,"photos"));setPhotos(ps.docs.map(d=>({id:d.id,...d.data()} as JobPhoto)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))}finally{setLoading(false)}})()},[shareId]);
 if(loading)return <main className="bookPage"><div className="formWrap"><section className="formCard"><span className="kicker">Namane Tyres</span><h1>Loading job update…</h1><p>Opening the latest progress shared by Namane Tyres.</p></section></div></main>;
 if(!job)return <main className="bookPage"><div className="formWrap"><section className="formCard"><span className="kicker">Namane Tyres</span><h1>Update not available</h1><p>This progress link has not reached the server yet, or it is no longer available.</p></section></div></main>;
 return <main className="bookPage"><div className="formWrap"><section className="formCard"><span className="kicker">Namane Tyres · Job progress</span><h1>{String(job.customerName||"Customer")}</h1><p><strong>{String(job.service||"Service")}</strong> · {String(job.vehicle||"Vehicle not specified")}</p><div className="detailList"><div><dt>Status</dt><dd><strong>{String(job.status)}</strong></dd></div><div><dt>Work</dt><dd>{String(job.problem||"Service in progress")}</dd></div>{job.notes?<div><dt>Notes</dt><dd>{String(job.notes)}</dd></div>:null}<div><dt>Updated</dt><dd>{new Date(String(job.updatedAt)).toLocaleString()}</dd></div></div>{photos.length?<div className="mediaGrid">{photos.map(photo=><figure className="mediaCard" key={photo.id}><Image src={photo.url} alt={photo.caption||"Namane Tyres job progress"} width={1200} height={900} sizes="(max-width: 800px) 100vw, 50vw"/><figcaption>{photo.caption||"Job progress"}</figcaption></figure>)}</div>:<div className="emptyState"><p>No progress photos have been shared yet.</p></div>}<p className="formTruth">This page shows the job progress Namane Tyres has chosen to share. It does not expose the customer&apos;s phone number.</p></section></div></main>;
}
