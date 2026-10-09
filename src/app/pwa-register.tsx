"use client";

import { useEffect, useState } from "react";

export default function PwaRegister() {
  const [offline, setOffline] = useState(false);
  const [installable, setInstallable] = useState(false);
  const [updateWaiting, setUpdateWaiting] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setOffline(!navigator.onLine);

    const online = () => setOffline(false);
    const offlineNow = () => setOffline(true);
    const installPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setInstallable(true);
    };

    window.addEventListener("online", online);
    window.addEventListener("offline", offlineNow);
    window.addEventListener("beforeinstallprompt", installPrompt);

    const controllerChanged = () => window.location.reload();
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").then(registration => {
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

    // Best-effort durable browser storage. Firebase IndexedDB persistence and
    // the job-photo outbox remain usable even when the browser declines this.
    if ("storage" in navigator && "persist" in navigator.storage) {
      void navigator.storage.persist().catch(() => false);
    }

    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offlineNow);
      window.removeEventListener("beforeinstallprompt", installPrompt);
      navigator.serviceWorker?.removeEventListener("controllerchange", controllerChanged);
    };
  }, []);

  function applyUpdate() {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.getRegistration("/").then(registration => {
      if (registration?.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
      else window.location.reload();
    });
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setInstallable(false);
  }

  return <>
    {offline && <div className="offlineBanner" role="status">Offline mode · saved work stays on this device. New requests and job changes will sync when connection returns.</div>}
    {installable && <button className="pwaInstall" type="button" onClick={() => void install()}>Install Namane Tyres</button>}
    {updateWaiting && <div className="pwaUpdate" role="status"><span>Namane Tyres has an update ready.</span><button type="button" onClick={applyUpdate}>Update app</button></div>}
  </>;
}

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  }
}
