"use client";

import { saveJobPhoto, type JobPhoto } from "@/lib/firebase/data";
import { uploadFiles } from "@/lib/uploadthing";
import { auth } from "@/lib/firebase/client";

const DB_NAME="namane-tyres-offline";
const STORE="jobPhotoQueue";
const MAX_QUEUED_PHOTOS=40;
const MAX_IMAGE_DIMENSION=1440;
type PendingPhoto={id:string;jobId:string;shareId:string;caption:string;blob:Blob;createdAt:string};

function openDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:"id"});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function putPending(item:PendingPhoto){const current=await getPending();if(current.length>=MAX_QUEUED_PHOTOS)throw new Error("The offline photo queue is full. Connect to the internet and sync before adding more.");const db=await openDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(item);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close();}
async function getPending():Promise<PendingPhoto[]>{const db=await openDb();return await new Promise<PendingPhoto[]>((resolve,reject)=>{const tx=db.transaction(STORE,"readonly");const req=tx.objectStore(STORE).getAll();req.onsuccess=()=>{db.close();resolve(req.result as PendingPhoto[])};req.onerror=()=>{db.close();reject(req.error)}})}
async function removePending(id:string){const db=await openDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close();}

function readImageDimensions(file:File):Promise<{width:number;height:number}|null>{
  return new Promise(async resolve=>{
    try{
      const head=new Uint8Array(await file.slice(0,262144).arrayBuffer());
      if(head[0]===0xff&&head[1]===0xd8){
        let i=2;
        while(i+9<head.length){
          if(head[i]!==0xff){i++;continue}
          const marker=head[i+1]; i+=2;
          if(marker===0xd8||marker===0xd9||marker===0x01||marker>=0xd0&&marker<=0xd7)continue;
          const len=(head[i]<<8)|head[i+1];
          if(len<2||i+len>head.length)break;
          if((marker>=0xc0&&marker<=0xc3)||(marker>=0xc5&&marker<=0xc7)||(marker>=0xc9&&marker<=0xcb)||(marker>=0xcd&&marker<=0xcf)){
            resolve({height:(head[i+3]<<8)|head[i+4],width:(head[i+5]<<8)|head[i+6]});return;
          }
          i+=len;
        }
      }
      if(head[0]===0x89&&head[1]===0x50&&head[2]===0x4e&&head[3]===0x47){resolve({width:(head[16]<<24)|(head[17]<<16)|(head[18]<<8)|head[19],height:(head[20]<<24)|(head[21]<<16)|(head[22]<<8)|head[23]});return}
      if(String.fromCharCode(...head.slice(0,4))==="RIFF"&&String.fromCharCode(...head.slice(8,12))==="WEBP"){
        if(String.fromCharCode(...head.slice(12,16))==="VP8X"){resolve({width:1+head[24]+(head[25]<<8)+(head[26]<<16),height:1+head[27]+(head[28]<<8)+(head[29]<<16)});return}
      }
    }catch{}
    resolve(null);
  });
}

export async function compressJobImage(file:File){
  if(!file.type.startsWith("image/"))throw new Error("Please choose an image.");
  if(file.size<=3.5*1024*1024)return file;
  const dimensions=await readImageDimensions(file);
  if(dimensions&&typeof createImageBitmap==="function"){
    const scale=Math.min(1,MAX_IMAGE_DIMENSION/Math.max(dimensions.width,dimensions.height));
    const width=Math.max(1,Math.round(dimensions.width*scale));
    const height=Math.max(1,Math.round(dimensions.height*scale));
    const bitmap=await createImageBitmap(file,{resizeWidth:width,resizeHeight:height,resizeQuality:"high",imageOrientation:"from-image"});
    const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
    const context=canvas.getContext("2d");
    if(!context){bitmap.close();throw new Error("This phone could not prepare the picture. Please try another photo.");}
    context.drawImage(bitmap,0,0,width,height);bitmap.close();
    return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Could not prepare image.")),"image/jpeg",.78));
  }
  try{
    const bitmap=await createImageBitmap(file);
    const scale=Math.min(1,MAX_IMAGE_DIMENSION/Math.max(bitmap.width,bitmap.height));
    const width=Math.max(1,Math.round(bitmap.width*scale)),height=Math.max(1,Math.round(bitmap.height*scale));
    const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;canvas.getContext("2d")?.drawImage(bitmap,0,0,width,height);bitmap.close();
    return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Could not prepare image.")),"image/jpeg",.78));
  }catch{throw new Error("This picture is too large for this phone to prepare. Please retake it with the camera and try again.");}
}

async function uploadPending(item:PendingPhoto):Promise<JobPhoto>{
  const user=auth.currentUser;
  if(!user) throw new Error("Your Operations session has expired. Sign in again.");
  const token=await user.getIdToken();
  const file=new File([item.blob],`namane-${item.shareId}-${item.id}.jpg`,{type:"image/jpeg"});
  const result=await uploadFiles("jobProgress",{files:[file],headers:{authorization:`Bearer ${token}`}});
  const uploaded=result?.[0];
  if(!uploaded?.url) throw new Error("UploadThing did not return a usable image URL.");
  const photo:JobPhoto={id:item.id,jobId:item.jobId,shareId:item.shareId,storagePath:uploaded.key,url:uploaded.url,caption:item.caption,createdAt:item.createdAt};
  await saveJobPhoto(photo);
  await removePending(item.id);
  return photo;
}
export async function addJobPhoto(jobId:string,shareId:string,file:File,caption:string){const blob=await compressJobImage(file);const item:PendingPhoto={id:crypto.randomUUID(),jobId,shareId,caption,blob,createdAt:new Date().toISOString()};if(navigator.onLine){try{return{photo:await uploadPending(item),queued:false}}catch{await putPending(item);return{photo:null,queued:true}}}await putPending(item);return{photo:null,queued:true};}
export async function flushQueuedJobPhotos(){if(!navigator.onLine)return{uploaded:0,remaining:(await getPending()).length};let uploaded=0;const pending=await getPending();for(const item of pending){try{await uploadPending(item);uploaded++}catch{break}}return{uploaded,remaining:(await getPending()).length};}
export async function getQueuedJobPhotoCount(){return(await getPending()).length;}
