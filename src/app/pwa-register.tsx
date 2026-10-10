"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ensureCustomerSession } from "@/lib/firebase/client";

type BrowserEnvironment = { embedded: boolean; android: boolean; ios: boolean; standalone: boolean };

function detectBrowserEnvironment(): BrowserEnvironment {
  if (typeof window === "undefined") return { embedded: false, android: false, ios: false, standalone: false };
  const ua = navigator.userAgent || "";
  const android = /Android/i.test(ua);
  const ios = /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const embedded = /WhatsApp|Instagram|FBAN|FBAV|Messenger|Line\\/|Twitter|TikTok|Snapchat/i.test(ua) ||
    (android && /; wv\\)/i.test(ua));
  return { embedded, android, ios, standalone };
}

export default function PwaRegister() {
  const pathname = usePathname();
  const [offline, setOffline] = useState(false);
  const [installable, setInstallable] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [updateWaiting, setUpdateWaiting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [browserEnvironment, setBrowserEnvironment] = useState<BrowserEnvironment>({ embedded: false, android: false, ios: false, standalone: false });
  const [handoffMessage, setHandoffMessage] = useState("");

  useEffect(() => {
    if (pathname === "/admin" || pathname.startsWith("/admin/")) return;
    void ensureCustomerSession().catch((error) => console.warn("[Namane Tyres] customer session unavailable", error));
  }, [pathname]);

  useEffect(() => {
    const env = detectBrowserEnvironment();
    setBrowserEnvironment(env);
    setOffline(!navigator.onLine);
    setStandalone(env.standalone);

    const online = () => setOffline(false);
    const offlineNow = () => setOffline(true);
    const installPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setInstallable(true);
    };
    const appInstalled = () => {
      setStandalone(true);
      setInstallable(false);
      setShowInstallHelp(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("online", online);
    window.addEventListener("offline", offlineNow);
    window.addEventListener("beforeinstallprompt", installPrompt);
    window.addEventListener("appinstalled", appInstalled);

    const controllerChanged = () => window.location.reload();
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then(registration => {
        if (registration.waiting && navigator.serviceWorker.controller) setUpdateWaiting(true);
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          installing?.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) setUpdateWaiting(true);
          });
        });
        void registration.update().catch(() => undefined);
      }).catch(() => undefined);
      navigator.serviceWorker.addEventListener("controllerchange", controllerChanged);
    }

    if ("storage" in navigator && "persist" in navigator.storage) {
      void navigator.storage.persist().catch(() => false);
    }

    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offlineNow);
      window.removeEventListener("beforeinstallprompt", installPrompt);
      window.removeEventListener("appinstalled", appInstalled);
      navigator.serviceWorker?.removeEventListener("controllerchange", controllerChanged);
    };
  }, []);

  async function refreshApp() {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshMessage("Checking for the latest version…");
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration("/");
        if (registration) {
          await registration.update();
          const candidate = registration.installing;
          if (candidate) {
            await new Promise<void>(resolve => {
              const finish = () => {
                if (["installed", "activated", "redundant"].includes(candidate.state)) {
                  candidate.removeEventListener("statechange", finish);
                  resolve();
                }
              };
              candidate.addEventListener("statechange", finish);
              finish();
              window.setTimeout(resolve, 6000);
            });
          }
          const current = await navigator.serviceWorker.getRegistration("/");
          if (current?.waiting && navigator.serviceWorker.controller) {
            setUpdateWaiting(true);
            current.waiting.postMessage({ type: "SKIP_WAITING" });
            return;
          }
        }
      }
      setRefreshMessage("Refreshing Namane Tyres…");
      window.location.reload();
    } catch {
      setRefreshMessage("Could not check automatically. Reloading the page…");
      window.location.reload();
    }
  }

  function applyUpdate() {
    if (!("serviceWorker" in navigator)) {
      window.location.reload();
      return;
    }
    void navigator.serviceWorker.getRegistration("/").then(registration => {
      if (registration?.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
      else void refreshApp();
    });
  }

  async function install() {
    if (!deferredPrompt) {
      setShowInstallHelp(value => !value);
      return;
    }
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setInstallable(false);
    if (choice.outcome === "accepted") setShowInstallHelp(false);
    else setShowInstallHelp(true);
  }

  function openInBrowser() {
    const url = window.location.href;
    if (browserEnvironment.android) {
      window.location.href = "intent://" + url.replace(/^https?:\\/\\//, "") + "#Intent;scheme=https;package=com.android.chrome;end";
      setHandoffMessage("If Chrome did not open, use the ⋮ menu in WhatsApp and choose Open in browser.");
      return;
    }
    if (browserEnvironment.ios) {
      setHandoffMessage("Tap the menu or Share icon in WhatsApp, then choose Open in Browser or Open in Safari. If that option is unavailable, copy the link and paste it into Safari.");
      return;
    }
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) setHandoffMessage("Use this app's menu to open the link in your normal browser.");
  }

  async function copyCurrentLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setHandoffMessage("Link copied. Open Chrome or Safari and paste it into the address bar.");
    } catch {
      setHandoffMessage("Copy this page's address from the browser menu, then paste it into Chrome or Safari.");
    }
  }

  const showBrowserHandoff = browserEnvironment.embedded && !browserEnvironment.standalone;

  return <>
    {showBrowserHandoff && <div role="alertdialog" aria-modal="true" aria-labelledby="namane-browser-title" style={{position:"fixed",inset:0,zIndex:2147483647,display:"flex",alignItems:"center",justifyContent:"center",padding:20,background:"rgba(17,24,39,.86)",backdropFilter:"blur(5px)"}}>
      <section style={{width:"100%",maxWidth:480,background:"#fff",color:"#111827",borderRadius:22,padding:24,boxShadow:"0 24px 70px rgba(0,0,0,.3)"}}>
        <div style={{fontSize:".72rem",fontWeight:900,letterSpacing:".14em",color:"#b45309"}}>NAMANE TYRES · CUSTOMER ACCESS</div>
        <h2 id="namane-browser-title" style={{fontSize:"clamp(1.8rem,7vw,2.5rem)",lineHeight:1.05,letterSpacing:"-.04em",margin:"12px 0"}}>Open Namane Tyres in your browser.</h2>
        <p style={{lineHeight:1.65,color:"#475569",margin:"0 0 18px"}}>You opened this link inside another app. Opening it in Chrome or Safari gives you the best experience for requesting tyre help, returning to your requests and optionally saving Namane Tyres to your home screen.</p>
        {browserEnvironment.android ? <button type="button" onClick={openInBrowser} style={{width:"100%",minHeight:48,border:0,borderRadius:10,background:"#d97706",color:"#fff",fontWeight:900,cursor:"pointer"}}>OPEN IN CHROME ↗</button> : <button type="button" onClick={openInBrowser} style={{width:"100%",minHeight:48,border:0,borderRadius:10,background:"#d97706",color:"#fff",fontWeight:900,cursor:"pointer"}}>HOW TO OPEN IN BROWSER</button>}
        <button type="button" onClick={() => void copyCurrentLink()} style={{width:"100%",minHeight:46,marginTop:10,border:"1px solid #d9e0e7",borderRadius:10,background:"#fff",color:"#111827",fontWeight:900,cursor:"pointer"}}>COPY LINK FOR CHROME / SAFARI</button>
        {handoffMessage && <p role="status" aria-live="polite" style={{margin:"12px 0 0",padding:12,borderRadius:10,background:"#f1f5f9",fontSize:".9rem",lineHeight:1.5}}>{handoffMessage}</p>}
        <p style={{fontSize:".8rem",color:"#64748b",lineHeight:1.5,margin:"14px 0 0"}}>You do not need to install an app to use Namane Tyres. Installation is optional after the page opens in your browser.</p>
      </section>
    </div>}
    {offline && <div className="offlineBanner" role="status">Offline mode · saved work stays on this device. New requests and job changes will sync when connection returns.</div>}
    {!standalone && !showBrowserHandoff && <div className="pwaInstallGroup">
      <button className="pwaInstall" type="button" onClick={() => void install()}>{installable ? "Install Namane Tyres" : "Save Namane Tyres to phone"}</button>
      {showInstallHelp && <div className="pwaInstallHelp" role="dialog" aria-label="How to save Namane Tyres">
        <button className="pwaHelpClose" type="button" aria-label="Close install instructions" onClick={() => setShowInstallHelp(false)}>×</button>
        <strong>Keep Namane Tyres one tap away</strong>
        <p><b>Android:</b> open Chrome's menu (⋮), then choose <b>Install app</b> or <b>Add to Home screen</b>. If the Install button appeared above, use it.</p>
        <p><b>iPhone:</b> open this page in Safari, tap <b>Share</b>, then <b>Add to Home Screen</b>.</p>
        <p>You can still use the website without installing it.</p>
      </div>}
    </div>}
    {!showBrowserHandoff && <button className="pwaRefresh" type="button" onClick={() => void refreshApp()} disabled={refreshing} aria-label="Check for updates and refresh Namane Tyres">
      {refreshing ? "Checking…" : "Refresh app ↻"}
    </button>}
    {refreshMessage && !refreshing && <span className="pwaRefreshStatus" role="status">{refreshMessage}</span>}
    {updateWaiting && !showBrowserHandoff && <div className="pwaUpdate" role="status"><span>Namane Tyres has an update ready.</span><button type="button" onClick={applyUpdate}>Update app</button></div>}
  </>;
}

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  }
}
