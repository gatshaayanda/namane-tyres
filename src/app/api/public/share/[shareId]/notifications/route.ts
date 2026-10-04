import {createHash} from "node:crypto";
import {NextResponse} from "next/server";
import {adminDb} from "@/lib/firebase/admin";

function tokenId(token:string){return createHash("sha256").update(token).digest("hex");}

export async function POST(request:Request,{params}:{params:Promise<{shareId:string}>}){
 try{
  const {shareId}=await params;
  const body=await request.json();
  const token=String(body?.token||"").trim();
  if(!token||token.length>4096)return NextResponse.json({error:"A valid notification token is required."},{status:422});
  const ref=adminDb().collection("publicJobs").doc(shareId);
  const job=await ref.get();
  if(!job.exists)return NextResponse.json({error:"Progress link not found."},{status:404});
  await ref.collection("notificationTokens").doc(tokenId(token)).set({token,updatedAt:new Date().toISOString()},{merge:true});
  return NextResponse.json({ok:true});
 }catch(error){console.error("[public/share-notifications]",error);return NextResponse.json({error:"Could not save notification preference."},{status:500});}
}
