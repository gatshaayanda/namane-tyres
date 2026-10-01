"use client";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase/client";
import { saveJobPhoto, type JobPhoto } from "@/lib/firebase/data";

const DB_NAME="namane-tyres-offline";
const STORE="jobPhotoQueue";
const MAX_QUEUED_PHOTOS=40;
type PendingPhoto={id:string;jobId:string;shareId:string;caption:string;blob:Blob;createdAt:string};

function openDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:"id"});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function putPending(item:PendingPhoto){const current=await getPending();if(current.length>=MAX_QUEUED_PHOTOS)throw new Error("The offline photo queue is full. Connect to the internet and sync before adding more.");const db=await openDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(item);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close();}
async function getPending():Promise<PendingPhoto[]>{const db=await openDb();return await new Promise<PendingPhoto[]>((resolve,reject)=>{const tx=db.transaction(STORE,"readonly");const req=tx.objectStore(STORE).getAll();req.onsuccess=()=>{db.close();resolve(req.result as PendingPhoto[])};req.onerror=()=>{db.close();reject(req.error)}})}
async function removePending(id:string){const db=await openDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close();}
export async function compressJobImage(file:File){if(!file.type.startsWith("image/"))throw new Error("Please choose an image.");const bitmap=await createImageBitmap(file);const max=1600;const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext("2d")?.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Could not prepare image.")),"image/jpeg",.82));}
async function uploadPending(item:PendingPhoto):Promise<JobPhoto>{const path=`jobProgress/${item.shareId}/${item.id}.jpg`;const snapshot=await uploadBytes(ref(storage,path),item.blob,{contentType:"image/jpeg",cacheControl:"public,max-age=31536000,immutable"});const url=await getDownloadURL(snapshot.ref);const photo:JobPhoto={id:item.id,jobId:item.jobId,shareId:item.shareId,storagePath:path,url,caption:item.caption,createdAt:item.createdAt};await saveJobPhoto(photo);await removePending(item.id);return photo;}
export async function addJobPhoto(jobId:string,shareId:string,file:File,caption:string){const blob=await compressJobImage(file);const item:PendingPhoto={id:crypto.randomUUID(),jobId,shareId,caption,blob,createdAt:new Date().toISOString()};if(navigator.onLine){try{return{photo:await uploadPending(item),queued:false}}catch{await putPending(item);return{photo:null,queued:true}}}await putPending(item);return{photo:null,queued:true};}
export async function flushQueuedJobPhotos(){if(!navigator.onLine)return{uploaded:0,remaining:(await getPending()).length};let uploaded=0;const pending=await getPending();for(const item of pending){try{await uploadPending(item);uploaded++}catch{break}}return{uploaded,remaining:(await getPending()).length};}
export async function getQueuedJobPhotoCount(){return(await getPending()).length;}
