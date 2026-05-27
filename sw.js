const CACHE = "famitask-v1";
const PRECACHE = [
  "/", "/index.html", "/employee.html", "/manager.html", "/collaborator.html",
  "/styles.css", "/app.js", "/i18n.js", "/config.js", "/api.js", "/auth.js",
  "/assets/logo.png", "/assets/icon-192.png", "/favicon.ico"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      if (resp.ok && e.request.url.startsWith(self.location.origin)) {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return resp;
    }))
  );
});

self.addEventListener("push", e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || "FamiTask", {
      body: data.body || "Nouvelle notification",
      icon: "/assets/icon-192.png",
      badge: "/assets/icon-192.png",
      tag: data.tag || "famitask",
      renotify: true,
      data: { url: data.url || "/manager.html" }
    })
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window" }).then(list => {
      const target = e.notification.data?.url || "/manager.html";
      const existing = list.find(c => c.url.includes(target) && "focus" in c);
      return existing ? existing.focus() : clients.openWindow(target);
    })
  );
});
