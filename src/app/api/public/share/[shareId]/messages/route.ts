import {NextResponse} from "next/server";
import {adminDb} from "@/lib/firebase/admin";

export async function GET(_request:Request,{params}:{params:Promise<{shareId:string}>}){
 try{const {shareId}=await params;const snap=await adminDb().collection("publicJobs").doc(shareId).collection("messages").orderBy("createdAt","asc").get();return NextResponse.json({messages:snap.docs.map(d=>({id:d.id,...d.data()}))});}
 catch(error){console.error("[public/share-messages]",error);return NextResponse.json({error:"Could not load messages."},{status:500});}
}
export async function POST(request:Request,{params}:{params:Promise<{shareId:string}>}){
 try{const {shareId}=await params;const body=await request.json();const message=String(body?.message||"").trim();const name=String(body?.name||"Customer").trim().slice(0,80);if(!message)return NextResponse.json({error:"Message is required."},{status:422});if(message.length>1000)return NextResponse.json({error:"Message is too long."},{status:422});const job=await adminDb().collection("publicJobs").doc(shareId).get();if(!job.exists)return NextResponse.json({error:"Progress link not found."},{status:404});const ref=adminDb().collection("publicJobs").doc(shareId).collection("messages").doc();const item={message,name,from:"customer",createdAt:new Date().toISOString()};await ref.set(item);await adminDb().collection("publicJobs").doc(shareId).set({lastCustomerMessageAt:item.createdAt},{merge:true});return NextResponse.json({id:ref.id,...item});}
 catch(error){console.error("[public/share-messages]",error);return NextResponse.json({error:"Could not send message."},{status:500});}
}