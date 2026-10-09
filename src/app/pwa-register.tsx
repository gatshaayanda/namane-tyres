"use client";

import { useEffect, useState } from "react";

export default function PwaRegister() {
  const [offline, setOffline] = useState(false);
  const [installable, setInstallable] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [updateWaiting, setUpdateWaiting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const installed = window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setStandalone(installed);

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

  return <>
    {offline && <div className="offlineBanner" role="status">Offline mode · saved work stays on this device. New requests and job changes will sync when connection returns.</div>}
    {!standalone && <div className="pwaInstallGroup">
      <button className="pwaInstall" type="button" onClick={() => void install()}>{installable ? "Install Namane Tyres" : "Save Namane Tyres to phone"}</button>
      {showInstallHelp && <div className="pwaInstallHelp" role="dialog" aria-label="How to save Namane Tyres">
        <button className="pwaHelpClose" type="button" aria-label="Close install instructions" onClick={() => setShowInstallHelp(false)}>×</button>
        <strong>Keep Namane Tyres one tap away</strong>
        <p><b>Android:</b> open your browser menu (⋮), then choose <b>Install app</b> or <b>Add to Home screen</b>. If the Install button appeared above, use it.</p>
        <p><b>iPhone:</b> open this page in Safari, tap <b>Share</b>, then <b>Add to Home Screen</b>.</p>
        <p>You can still use the website without installing it.</p>
      </div>}
    </div>}
    <button className="pwaRefresh" type="button" onClick={() => void refreshApp()} disabled={refreshing} aria-label="Check for updates and refresh Namane Tyres">
      {refreshing ? "Checking…" : "Refresh app ↻"}
    </button>
    {refreshMessage && !refreshing && <span className="pwaRefreshStatus" role="status">{refreshMessage}</span>}
    {updateWaiting && <div className="pwaUpdate" role="status"><span>Namane Tyres has an update ready.</span><button type="button" onClick={applyUpdate}>Update app</button></div>}
  </>;
}

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  }
}
