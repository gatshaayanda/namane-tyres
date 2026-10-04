importScripts("https://www.gstatic.com/firebasejs/11.9.0/firebase-app-compat.js","https://www.gstatic.com/firebasejs/11.9.0/firebase-messaging-compat.js");

const params=new URL(self.location.href).searchParams;
firebase.initializeApp({
 apiKey:params.get("apiKey")||"",
 authDomain:params.get("authDomain")||"",
 projectId:params.get("projectId")||"",
 storageBucket:params.get("storageBucket")||"",
 messagingSenderId:params.get("messagingSenderId")||"",
 appId:params.get("appId")||""
});
const messaging=firebase.messaging();
messaging.onBackgroundMessage(payload=>{
 const title=payload.notification?.title||"Namane Tyres";
 const body=payload.notification?.body||"You have a new job update.";
 self.registration.showNotification(title,{body,icon:"/icon.svg",data:{url:payload.fcmOptions?.link||"/"}});
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 const url=event.notification.data?.url||"/";
 event.waitUntil(clients.openWindow(url));
});
