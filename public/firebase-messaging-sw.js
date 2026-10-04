importScripts("https://www.gstatic.com/firebasejs/11.9.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.9.0/firebase-messaging-compat.js");

self.addEventListener("notificationclick",(event)=>{
 event.notification.close();
 const target=event.notification?.data?.link||event.notification?.data?.fcm_options?.link||"/";
 event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
  const existing=list.find(client=>client.url.startsWith(self.location.origin));
  if(existing){existing.focus();return existing.navigate(target);}
  return clients.openWindow(target);
 }));
});

fetch("/api/public/firebase-config").then(response=>response.json()).then(config=>{
 if(!config.projectId||!config.messagingSenderId||!config.appId)return;
 firebase.initializeApp(config);
 const messaging=firebase.messaging();
 messaging.onBackgroundMessage(payload=>{
  const title=payload.notification?.title||"Namane Tyres";
  const body=payload.notification?.body||"You have a new job update.";
  const link=payload.fcmOptions?.link||payload.data?.link||"/";
  return self.registration.showNotification(title,{body,icon:"/icon.svg",data:{link}});
 });
}).catch(()=>{});
