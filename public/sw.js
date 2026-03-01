// SchoolZone Digital Twin — Service Worker
// Handles push notifications and basic offline caching

const CACHE_NAME = "schoolzone-v1";
const STATIC_ASSETS = ["/", "/operations/dashboard", "/analytics"];

// ---------------------------------------------------------------------------
// Install — pre-cache key pages
// ---------------------------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ---------------------------------------------------------------------------
// Activate — clean up old caches
// ---------------------------------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ---------------------------------------------------------------------------
// Fetch — network first, fall back to cache for navigation requests
// ---------------------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ---------------------------------------------------------------------------
// Push — show notification when a zone alert arrives
// ---------------------------------------------------------------------------
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "SchoolZone Alert", body: event.data.text(), severity: "info" };
  }

  const icon  = "/icons/icon-192.png";
  const badge = "/icons/icon-192.png";
  const tag   = `schoolzone-${payload.zoneId ?? "alert"}`;

  const options = {
    body:    payload.body   ?? "Zone status update",
    icon,
    badge,
    tag,
    renotify:  true,
    requireInteraction: payload.severity === "critical",
    data: { url: payload.url ?? "/operations/dashboard" },
    actions: [
      { action: "view",    title: "View Dashboard" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(payload.title ?? "SchoolZone Alert", options));
});

// ---------------------------------------------------------------------------
// Notification click — open / focus the dashboard
// ---------------------------------------------------------------------------
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const url = event.notification.data?.url ?? "/operations/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
