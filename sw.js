const CACHE = "famitask-v3";

// Only cache static assets that never change
const STATIC = [
  "/assets/logo.png",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
  "/favicon.ico"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  // Delete ALL old caches
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // API calls and HTML/JS/CSS always go to network (never serve stale)
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname === "/"
  ) {
    return; // Let the browser handle normally
  }

  // Only cache-first for images/icons
  if (e.request.method === "GET") {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});

self.addEventListener("push", e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || "FamiTask", {
      body: data.body || "Nouvelle notification",
      icon: "/assets/icon-192.png",
      badge: "/assets/icon-192.png",
      tag: data.tag || "famitask",
      data: { url: data.url || "/manager.html" }
    })
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window" }).then(list => {
      const target = e.notification.data?.url || "/manager.html";
      const existing = list.find(c => c.url.includes(target));
      return existing ? existing.focus() : clients.openWindow(target);
    })
  );
});
