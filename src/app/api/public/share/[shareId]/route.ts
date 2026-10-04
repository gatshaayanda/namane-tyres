import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

const EVENTS = new Set(["view","request_help","directions"]);

export async function POST(request:Request,{params}:{params:Promise<{shareId:string}>}){
  try{
    const {shareId}=await params;
    if(!/^[a-f0-9]{32}$/.test(shareId))return NextResponse.json({error:"Invalid share link."},{status:400});
    const body=await request.json().catch(()=>({}));
    const event=String(body?.event||"");
    if(!EVENTS.has(event))return NextResponse.json({error:"Unsupported event."},{status:400});
    const publicRef=adminDb().doc(`publicJobs/${shareId}`);
    const snap=await publicRef.get();
    if(!snap.exists)return NextResponse.json({error:"Share link not found."},{status:404});
    const now=new Date().toISOString();
    const statsUpdate=event==="view"
      ? { "shareStats.views":FieldValue.increment(1), "shareStats.lastViewedAt":now }
      : { "shareStats.engagements":FieldValue.increment(1), "shareStats.lastEngagedAt":now };
    await publicRef.update(statsUpdate);
    const jobs=await adminDb().collection("jobs").where("publicShareId","==",shareId).limit(1).get();
    if(!jobs.empty)await jobs.docs[0].ref.update(statsUpdate);
    return NextResponse.json({ok:true});
  }catch(error){
    console.error("[public/share-event]",error);
    return NextResponse.json({error:"Could not record share activity."},{status:500});
  }
}
