import {createHash} from "node:crypto";
import {NextResponse} from "next/server";
import {adminDb} from "@/lib/firebase/admin";

export async function POST(request:Request,{params}:{params:Promise<{shareId:string}>}){
 try{
  const {shareId}=await params;
  const body=await request.json();
  const token=String(body?.token||"").trim();
  if(!token||token.length>4096)return NextResponse.json({error:"Valid notification token is required."},{status:422});
  const job=await adminDb().collection("publicJobs").doc(shareId).get();
  if(!job.exists)return NextResponse.json({error:"Progress link not found."},{status:404});
  const id=createHash("sha256").update(token).digest("hex");
  await adminDb().collection("publicJobs").doc(shareId).collection("notificationTokens").doc(id).set({token,createdAt:new Date().toISOString()},{merge:true});
  return NextResponse.json({ok:true});
 }catch(error){console.error("[public/share-notifications]",error);return NextResponse.json({error:"Could not enable notifications."},{status:500});}
}
