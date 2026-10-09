"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function WorkVideo() {
  const [online, setOnline] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!online || failed) {
    return <div className="workVideoFallback">
      <Image src="/namane-assets/work-location.jpg" alt="Namane Tyres work location" width={1600} height={900} />
      <p role="status">{!online ? "Video playback needs an internet connection. The rest of Namane Tyres remains available offline." : "The tyre-work video could not load. Check your connection and try again."}</p>
      {online && <button type="button" className="button buttonLight" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>Try video again</button>}
    </div>;
  }

  return <video key={attempt} controls preload="metadata" playsInline width={1600} height={900} poster="/namane-assets/work-location.jpg" aria-label="Tyre work at the Namane Tyres business" onError={() => setFailed(true)}>
    <source src="/namane-assets/zoom-in-work-on-tyres.mp4" type="video/mp4" />
    Your browser does not support this video.
  </video>;
}
