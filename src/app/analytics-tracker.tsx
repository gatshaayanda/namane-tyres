"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type AnalyticsEvent = "page_view" | "call_tap" | "whatsapp_tap" | "booking_open" | "install_help_open";

function publicPath(pathname: string) {
  if (pathname === "/") return "/";
  if (pathname.startsWith("/job/share/")) return "/job/share";
  if (pathname === "/book" || pathname.startsWith("/book/")) return "/book";
  if (pathname === "/welcome" || pathname.startsWith("/welcome/")) return "/welcome";
  if (pathname === "/account" || pathname.startsWith("/account/")) return "/account";
  return "/other";
}

function isPublicPath(pathname: string) {
  return !pathname.startsWith("/admin")
    && !pathname.startsWith("/api")
    && !pathname.startsWith("/login-secret-login-for-admins97F4B2NXQ")
    && !pathname.startsWith("/_next");
}

function visitorId() {
  try {
    const key = "namane-analytics-browser-id-v1";
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const id = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "visitor-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    window.localStorage.setItem(key, id);
    return id;
  } catch {
    return typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "visitor-" + Date.now().toString(36);
  }
}

function sourceHost() {
  try {
    if (!document.referrer) return "Direct / unknown";
    const host = new URL(document.referrer).hostname.toLowerCase();
    if (!host || host === window.location.hostname || host.endsWith(".vercel.app") && window.location.hostname.endsWith(".vercel.app")) {
      return "Direct / unknown";
    }
    return host.replace(/^www\./, "").slice(0, 120);
  } catch {
    return "Direct / unknown";
  }
}

function deviceType() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? "Mobile" : "Desktop";
}

export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !isPublicPath(pathname)) return;

    const send = (event: AnalyticsEvent) => {
      const payload = {
        event,
        visitorId: visitorId(),
        path: publicPath(window.location.pathname),
        source: sourceHost(),
        device: deviceType(),
      };
      void fetch("/api/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => undefined);
    };

    send("page_view");

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a, button") : null;
      if (!target) return;

      if (target instanceof HTMLAnchorElement) {
        const href = target.getAttribute("href") || "";
        if (href.startsWith("tel:")) {
          send("call_tap");
          return;
        }
        if (/wa\.me|api\.whatsapp\.com/i.test(href)) {
          send("whatsapp_tap");
          return;
        }
        try {
          if (new URL(href, window.location.origin).pathname === "/book") {
            send("booking_open");
            return;
          }
        } catch {}
      }

      const label = (target.textContent || "").toLowerCase();
      if (label.includes("install") || label.includes("home screen")) send("install_help_open");
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  return null;
}
