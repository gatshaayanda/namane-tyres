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
 const registration=await navigator.serviceWorker.register("/firebase-messaging-sw.js");
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
