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
  const embedded = /WhatsApp|Instagram|FBAN|FBAV|Messenger|Line|Twitter|TikTok|Snapchat/i.test(ua) || (android && /wv/i.test(ua));
  return { embedded, android, ios, standalone };
}

export default function PwaRegister() {
  const pathname = usePathname();
  const [environmentReady, setEnvironmentReady] = useState(false);
  const [offline, setOffline] = useState(false);
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
    setEnvironmentReady(true);

    const online = () => setOffline(false);
    const offlineNow = () => setOffline(true);
    const syncInstallPrompt = () => {
      const event = window.__namaneDeferredInstallPrompt;
      if (event) {
        setDeferredPrompt(event);
      }
    };
    const appInstalled = () => {
      setStandalone(true);
      setShowInstallHelp(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("online", online);
    window.addEventListener("offline", offlineNow);
    window.addEventListener("namane:installprompt", syncInstallPrompt);
    window.addEventListener("namane:appinstalled", appInstalled);
    syncInstallPrompt();

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
      window.removeEventListener("namane:installprompt", syncInstallPrompt);
      window.removeEventListener("namane:appinstalled", appInstalled);
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
    const prompt = deferredPrompt || window.__namaneDeferredInstallPrompt || null;
    if (!prompt) {
      setShowInstallHelp(true);
      return;
    }
    // Invoke the retained native prompt directly from the user's click gesture.
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      window.__namaneDeferredInstallPrompt = null;
      setDeferredPrompt(null);
      if (choice.outcome === "accepted") setShowInstallHelp(false);
      else setShowInstallHelp(true);
    } catch (error) {
      console.warn("[Namane Tyres] native install prompt failed", error);
      window.__namaneDeferredInstallPrompt = null;
      setDeferredPrompt(null);
      setShowInstallHelp(true);
    }
  }

  function openInBrowser() {
    const url = window.location.href;
    if (browserEnvironment.android) {
      // Chrome intent retains the complete URL, including deep route and query/hash.
      const target = url.slice(url.indexOf("://") + 3);
      window.location.href = `intent://${target}#Intent;scheme=https;package=com.android.chrome;end`;
      setHandoffMessage("If Chrome did not open, use the WhatsApp menu (⋮) and choose Open in browser, or copy this page link.");
      return;
    }
    if (browserEnvironment.ios) {
      // iOS does not permit a web page to force Safari to launch.
      const opened = window.open(url, "_blank");
      if (opened) opened.opener = null;
      const copyPromise = navigator.clipboard?.writeText(url);
      if (copyPromise) {
        void copyPromise.then(() => setHandoffMessage(opened
          ? "If the new page is still inside this app, the link is copied. Open Safari, paste it in the address bar, and go."
          : "Link copied. Open Safari, paste it in the address bar, and go. You can also use the app menu → Open in Safari."))
          .catch(() => setHandoffMessage("Use the WhatsApp menu or Share icon and choose Open in Safari. If unavailable, copy this page address and paste it into Safari."));
      } else {
        setHandoffMessage("Opening Safari is controlled by iOS. Use the WhatsApp menu or Share icon → Open in Safari; if unavailable, copy this page link into Safari.");
      }
      return;
    }
    const opened = window.open(url, "_blank");
    if (opened) opened.opener = null;
    if (!opened) setHandoffMessage("Your browser blocked a new tab. Copy this page link and open it in Chrome, Edge or your normal browser.");
  }

  async function copyCurrentLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setHandoffMessage("Link copied. Open Chrome or Safari and paste it into the address bar.");
    } catch {
      setHandoffMessage("Copy this page's address from the browser menu, then paste it into Chrome or Safari.");
    }
  }

  const showBrowserHandoff = environmentReady && browserEnvironment.embedded && !browserEnvironment.standalone;
  const privateOrAccountRoute = pathname === "/account" || pathname.startsWith("/account/") || pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/job/share/") || pathname.startsWith("/api/");
  const showInstallPromotion = environmentReady && !standalone && !showBrowserHandoff && !privateOrAccountRoute;

  return <>
    {showBrowserHandoff && <div role="alertdialog" aria-modal="true" aria-labelledby="namane-browser-title" style={{position:"fixed",inset:0,zIndex:2147483647,display:"flex",alignItems:"center",justifyContent:"center",padding:20,background:"rgba(17,24,39,.86)",backdropFilter:"blur(5px)"}}>
      <section style={{width:"100%",maxWidth:480,background:"#fff",color:"#111827",borderRadius:22,padding:24,boxShadow:"0 24px 70px rgba(0,0,0,.3)"}}>
        <div style={{fontSize:".72rem",fontWeight:900,letterSpacing:".14em",color:"#b45309"}}>NAMANE TYRES · CUSTOMER ACCESS</div>
        <h2 id="namane-browser-title" style={{fontSize:"clamp(1.8rem,7vw,2.5rem)",lineHeight:1.05,letterSpacing:"-.04em",margin:"12px 0"}}>Open Namane Tyres in your browser.</h2>
        <p style={{lineHeight:1.65,color:"#475569",margin:"0 0 18px"}}>You opened this link inside another app. Opening it in Chrome or Safari gives you the best experience for requesting tyre help, returning to your requests and optionally saving Namane Tyres to your home screen.</p>
        <button type="button" onClick={openInBrowser} style={{width:"100%",minHeight:48,border:0,borderRadius:10,background:"#d97706",color:"#fff",fontWeight:900,cursor:"pointer"}}>OPEN IN BROWSER ↗</button>
        <button type="button" onClick={() => void copyCurrentLink()} style={{width:"100%",minHeight:46,marginTop:10,border:"1px solid #d9e0e7",borderRadius:10,background:"#fff",color:"#111827",fontWeight:900,cursor:"pointer"}}>COPY LINK FOR CHROME / SAFARI</button>
        {handoffMessage && <p role="status" aria-live="polite" style={{margin:"12px 0 0",padding:12,borderRadius:10,background:"#f1f5f9",fontSize:".9rem",lineHeight:1.5}}>{handoffMessage}</p>}
        <p style={{fontSize:".8rem",color:"#64748b",lineHeight:1.5,margin:"14px 0 0"}}>You do not need to install an app to use Namane Tyres. Installation is optional after the page opens in your browser.</p>
      </section>
    </div>}
    {offline && <div className="offlineBanner" role="status">Offline mode · saved work stays on this device. New requests and job changes will sync when connection returns.</div>}
    {showInstallPromotion && <div className="pwaInstallGroup">
      <button className="pwaInstall" type="button" onClick={() => void install()}>Install Namane Tyres</button>
      {showInstallHelp && <div className="pwaInstallHelp" role="dialog" aria-label="How to save Namane Tyres">
        <button className="pwaHelpClose" type="button" aria-label="Close install instructions" onClick={() => setShowInstallHelp(false)}>×</button>
        <strong>Keep Namane Tyres one tap away</strong>
        {browserEnvironment.android ? <p><b>Android:</b> in Chrome, open the menu (⋮), then choose <b>Install app</b> or <b>Add to Home screen</b> where available.</p> : <p><b>Desktop:</b> in Chrome or Edge, use the install icon in the address bar if shown, or open the browser menu and choose <b>Install Namane Tyres</b> where available. The browser decides whether installation is eligible.</p>}
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
  interface Window {
    __namaneDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
    __namaneInstallPromptBootstrap?: boolean;
  }
}
