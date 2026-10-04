"use client";

import { collection, deleteDoc, doc, getDocs, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";

export const REQUEST_STATUSES = ["New","Accepted","In Progress","Ready / Awaiting Customer","Complete","Cancelled"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type AssistanceRequest = { id:string; createdAt:string; name:string; phone:string; vehicle:string; problem:string; notes:string; locationText:string; latitude?:number; longitude?:number; locationAccuracy?:number; status:RequestStatus };
export type TyreInventoryItem = { id:string; size:string; brand:string; condition:"New"|"Used"|"Retreaded"|"Other"; quantity:number; price:string; available:boolean; notes:string };
export type Contact = { id:string; name:string; phone:string; whatsapp:boolean; whatsappBusiness:boolean; businessName:string; businessDescription:string; notes:string; source:string; createdAt:string; updatedAt:string };
export type ContactInput = Omit<Contact,"id"|"createdAt"|"updatedAt">;
export const JOB_STATUSES = ["New","Accepted","In Progress","Ready / Awaiting Customer","Complete","Cancelled"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
export const PAYMENT_STATUSES = ["Unpaid","Part-paid","Paid"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type JobShareStats = { views:number; engagements:number; lastViewedAt?:string; lastEngagedAt?:string };
export type JobPhoto = { id:string; jobId:string; shareId:string; storagePath:string; url:string; caption:string; createdAt:string };
export type Job = { id:string; createdAt:string; updatedAt:string; customerName:string; phone:string; vehicle:string; service:string; problem:string; notes:string; status:JobStatus; amount:string; paymentStatus:PaymentStatus; publicShareId:string; shareStats?:JobShareStats; acceptedAt?:string; startedAt?:string; completedAt?:string };
export type JobInput = Omit<Job,"id"|"createdAt"|"updatedAt"|"publicShareId">;

const requestsCollection=collection(db,"assistanceRequests");
const inventoryCollection=collection(db,"tyreInventory");
const contactsCollection=collection(db,"contacts");
const jobsCollection=collection(db,"jobs");

export function normalizePhone(value:string){let phone=value.trim().replace(/[^\d+]/g,"");if(phone.startsWith("267")&&!phone.startsWith("+"))phone="+"+phone;if(/^7\d{7}$/.test(phone))phone="+267"+phone;return phone;}
export function createAssistanceRequest(data:Omit<AssistanceRequest,"id">){const reference=doc(requestsCollection);const writePromise=setDoc(reference,data);return{id:reference.id,writePromise};}
export async function getAssistanceRequests(){const snapshot=await getDocs(requestsCollection);return snapshot.docs.map(item=>({id:item.id,...(item.data() as Omit<AssistanceRequest,"id">)}));}
export async function updateAssistanceStatus(id:string,status:RequestStatus){await updateDoc(doc(db,"assistanceRequests",id),{status});}
export async function getTyreInventory(){const snapshot=await getDocs(inventoryCollection);return snapshot.docs.map(item=>({id:item.id,...(item.data() as Omit<TyreInventoryItem,"id">)}));}
export async function saveTyreInventoryItem(item:TyreInventoryItem){await setDoc(doc(db,"tyreInventory",item.id),item);}
export async function deleteTyreInventoryItem(id:string){await deleteDoc(doc(db,"tyreInventory",id));}
export async function getContacts(){const snapshot=await getDocs(contactsCollection);return snapshot.docs.map(item=>({id:item.id,...(item.data() as Omit<Contact,"id">)})).sort((a,b)=>a.name.localeCompare(b.name));}
export async function saveContact(input:ContactInput,id?:string){const phone=normalizePhone(input.phone);if(!phone)throw new Error("A valid Botswana phone number is required.");const contactId=id||phone;const now=new Date().toISOString();const previous=id?((await getDocs(contactsCollection)).docs.find(item=>item.id===id)?.data() as Partial<Contact>|undefined):undefined;await setDoc(doc(db,"contacts",contactId),{...input,phone,createdAt:previous?.createdAt||now,updatedAt:now},{merge:true});return contactId;}
export async function deleteContact(id:string){await deleteDoc(doc(db,"contacts",id));}
export async function importContacts(incoming:Array<Omit<Contact,"id"|"createdAt"|"updatedAt">>){const existingSnapshot=await getDocs(contactsCollection);const existingByPhone=new Map<string,Contact>();existingSnapshot.docs.forEach(item=>{const data=item.data() as Omit<Contact,"id">;existingByPhone.set(normalizePhone(data.phone),{id:item.id,...data});});const now=new Date().toISOString();const merged=new Map<string,Contact>();for(const raw of incoming){const phone=normalizePhone(raw.phone);if(!phone)continue;const existing=existingByPhone.get(phone);const next:Contact={id:existing?.id||phone,name:raw.name||existing?.name||"Unknown contact",phone,whatsapp:raw.whatsapp||existing?.whatsapp||false,whatsappBusiness:raw.whatsappBusiness||existing?.whatsappBusiness||false,businessName:raw.businessName||existing?.businessName||"",businessDescription:raw.businessDescription||existing?.businessDescription||"",notes:raw.notes||existing?.notes||"",source:raw.source||existing?.source||"whatsapp_import",createdAt:existing?.createdAt||now,updatedAt:now};merged.set(phone,next);}const batch=writeBatch(db);for(const contact of merged.values())batch.set(doc(db,"contacts",contact.id),contact,{merge:true});await batch.commit();return{imported:merged.size,totalExisting:existingSnapshot.size};}

async function adminToken(){const user=auth.currentUser;if(!user)throw new Error("Your Operations session has expired. Sign in again.");return user.getIdToken();}
const JOB_QUEUE_KEY="namane-tyres-offline-job-queue";\ntype QueuedJob={operation:"create"|"update";job:Job};\nfunction readQueuedJobs():QueuedJob[]{if(typeof window==="undefined")return[];try{return JSON.parse(localStorage.getItem(JOB_QUEUE_KEY)||"[]") as QueuedJob[]}catch{return[]}}\nfunction writeQueuedJobs(items:QueuedJob[]){localStorage.setItem(JOB_QUEUE_KEY,JSON.stringify(items));}\nfunction queueJob(operation:"create"|"update",job:Job){const items=readQueuedJobs();const existing=items.findIndex(x=>x.job.id===job.id);if(existing>=0)items[existing]={operation:items[existing].operation==="create"?"create":operation,job};else items.push({operation,job});writeQueuedJobs(items);}\nexport function getQueuedJobCount(){return readQueuedJobs().length;}\nexport async function syncQueuedJobs(){if(!navigator.onLine)return{synced:0,remaining:getQueuedJobCount()};let synced=0;const items=readQueuedJobs();for(const item of items){try{await adminRequest("/api/admin/jobs",{method:item.operation==="create"?"POST":"PATCH",body:JSON.stringify(item.job)});synced++;writeQueuedJobs(readQueuedJobs().filter(x=>x.job.id!==item.job.id));}catch{break;}}return{synced,remaining:getQueuedJobCount()};}\nasync function adminRequest(path:string,init:RequestInit={}){const token=await adminToken();const response=await fetch(path,{...init,headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,...(init.headers||{})}});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(String(body.error||`Operations request failed (${response.status}).`));return body;}

export async function getJobs(){
  if(navigator.onLine)return (await adminRequest("/api/admin/jobs")).jobs as Job[];
  const snapshot=await getDocs(jobsCollection);
  return snapshot.docs.map(item=>({id:item.id,...(item.data() as Omit<Job,"id">)})).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
export function createJob(input:JobInput){
  const id=crypto.randomUUID();const now=new Date().toISOString();const publicShareId=crypto.randomUUID().replace(/-/g,"");
  const shareStats:JobShareStats={views:0,engagements:0};
  const job:Job={id,...input,createdAt:now,updatedAt:now,publicShareId,shareStats};
  const writePromise=navigator.onLine
    ? adminRequest("/api/admin/jobs",{method:"POST",body:JSON.stringify(job)}).then(()=>undefined)
    : Promise.all([setDoc(doc(db,"jobs",id),job),setDoc(doc(db,"publicJobs",publicShareId),{customerName:job.customerName,vehicle:job.vehicle,service:job.service,status:job.status,problem:job.problem,notes:job.notes,createdAt:now,updatedAt:now,shareStats})]).then(()=>undefined);
  return{job,writePromise};
}
export async function updateJob(job:Job){
  if(navigator.onLine)return (await adminRequest("/api/admin/jobs",{method:"PATCH",body:JSON.stringify(job)})).job as Job;
  const now=new Date().toISOString();const next={...job,updatedAt:now};
  await Promise.all([setDoc(doc(db,"jobs",job.id),next,{merge:true}),setDoc(doc(db,"publicJobs",job.publicShareId),{customerName:job.customerName,vehicle:job.vehicle,service:job.service,status:job.status,problem:job.problem,notes:job.notes,createdAt:job.createdAt,updatedAt:now,shareStats:next.shareStats||{views:0,engagements:0}},{merge:true})]);
  return next;
}
export async function getJobPhotos(jobId:string){
  if(navigator.onLine)return (await adminRequest(`/api/admin/job-photos?jobId=${encodeURIComponent(jobId)}`)).photos as JobPhoto[];
  const snapshot=await getDocs(collection(db,"jobs",jobId,"photos"));
  return snapshot.docs.map(item=>({id:item.id,...(item.data() as Omit<JobPhoto,"id">)})).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
export async function saveJobPhoto(photo:JobPhoto){
  if(navigator.onLine){await adminRequest("/api/admin/job-photos",{method:"POST",body:JSON.stringify(photo)});return;}
  await Promise.all([setDoc(doc(db,"jobs",photo.jobId,"photos",photo.id),photo),setDoc(doc(db,"publicJobs",photo.shareId,"photos",photo.id),photo)]);
}
