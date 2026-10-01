const CACHE_VERSION = "v5";
const SHELL_CACHE = `namane-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `namane-static-${CACHE_VERSION}`;
const PUBLIC_CACHE = `namane-public-${CACHE_VERSION}`;
const PREFIX = "namane-";
const APP_SHELL = ["/", "/book", "/offline", "/admin", "/admin/jobs", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(precacheShell());
});

async function precacheShell() {
  const shell = await caches.open(SHELL_CACHE);
  const staticCache = await caches.open(STATIC_CACHE);
  const discovered = new Set();
  for (const path of APP_SHELL) {
    try {
      const request = new Request(path, { cache: "reload" });
      const response = await fetch(request);
      if (!response.ok) continue;
      await shell.put(request, response.clone());
      if ((response.headers.get("content-type") || "").includes("text/html")) {
        const html = await response.text();
        for (const match of html.matchAll(/(?:src|href)=["'](\/_next\/static\/[^"']+)["']/g)) discovered.add(match[1]);
      }
    } catch {}
  }
  await Promise.all([...discovered].map(async (path) => {
    try {
      const response = await fetch(new Request(path, { cache: "reload" }));
      if (response.ok) await staticCache.put(path, response);
    } catch {}
  }));
  await trimCache(STATIC_CACHE, 120);
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(PREFIX) && ![SHELL_CACHE, STATIC_CACHE, PUBLIC_CACHE].includes(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  const isNavigation = request.mode === "navigate" || request.headers.get("accept")?.includes("text/html");

  // APIs and Firebase responses are network-only. Private operational data is
  // persisted by Firestore's own offline cache, never by Cache Storage.
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/namane-assets/") ||
      url.pathname.startsWith("/images/") || url.pathname.startsWith("/fonts/") ||
      url.pathname === "/manifest.webmanifest" || url.pathname === "/icon.svg" ||
      /\.(?:css|woff2?|ttf|otf|png|jpe?g|webp|svg|ico|avif)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE, 120));
    return;
  }

  // Cache the safe application HTML shell, including admin route shells. The
  // HTML contains no private Firestore records; auth and Firestore still gate
  // and populate Operations. Never cache the private rendered data response.
  if (isNavigation && (url.pathname === "/admin" || url.pathname.startsWith("/admin/"))) {
    event.respondWith(fetch(request).catch(() => caches.match(request).then((cached) =>
      cached || caches.match("/admin").then((fallback) => fallback || caches.match("/offline"))
    )));
    return;
  }

  // Public job progress can be viewed from a previously loaded link while
  // offline. It contains only customer-safe projection data.
  if (isNavigation && url.pathname.startsWith("/job/share/")) {
    event.respondWith(networkFirst(request, PUBLIC_CACHE, 24));
    return;
  }

  if (isNavigation) event.respondWith(networkFirst(request, PUBLIC_CACHE, 24));
});

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      await trimCache(cacheName, maxEntries);
    }
    return response;
  } catch {
    return Response.error();
  }
}

async function networkFirst(request, cacheName, maxEntries) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
      await trimCache(cacheName, maxEntries);
    }
    return response;
  } catch {
    return (await caches.match(request)) || (await caches.match("/offline")) || Response.error();
  }
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((request) => cache.delete(request)));
}
