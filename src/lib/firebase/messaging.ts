"use client";

import {getMessaging,isSupported,onMessage,type Messaging,getToken} from "firebase/messaging";
import {app} from "@/lib/firebase/client";

let messaging:Messaging|null=null;

async function getClientMessaging(){
 if(typeof window==="undefined"||!(await isSupported()))return null;
 if(!messaging)messaging=getMessaging(app);
 return messaging;
}

export async function enableJobNotifications(shareId:string){
 const vapidKey=process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
 if(!vapidKey)throw new Error("Push notifications are not configured yet.");
 if(!("Notification" in window))throw new Error("This browser does not support notifications.");
 const permission=await Notification.requestPermission();
 if(permission!=="granted")throw new Error("Notification permission was not granted.");
 const m=await getClientMessaging(); if(!m)throw new Error("Push notifications are not supported on this device.");
 const config=await import("./client").then(()=>({apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY,authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,storageBucket:process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,messagingSenderId:process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,appId:process.env.NEXT_PUBLIC_FIREBASE_APP_ID}));\n const query=new URLSearchParams(Object.entries(config).filter((entry):entry is [string,string]=>typeof entry[1]==="string"&&entry[1].length>0));\n const registration=await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query.toString()}`);
 const token=await getToken(m,{vapidKey,serviceWorkerRegistration:registration});
 if(!token)throw new Error("Could not register this device for notifications.");
 const response=await fetch(`/api/public/share/${shareId}/notifications`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});
 if(!response.ok)throw new Error("Could not save notification preference.");
 return token;
}

export async function listenForJobNotifications(handler:(title:string,body:string)=>void){
 const m=await getClientMessaging(); if(!m)return()=>{};
 return onMessage(m,payload=>handler(payload.notification?.title||"Namane Tyres",payload.notification?.body||"You have a new job update."));
}
