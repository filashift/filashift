// FilaShift service worker: lets the installed app open offline.
// Pages: network first, cached copy when offline. Hashed assets, fonts and printer profiles: cache first.
// Prices (/data) and reports (/api) always go to the network. Project files are never touched.
const V = "filashift-v3";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(["/", "/favicon.svg", "/fonts/fonts.css", "/profiles/index.json"])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin !== location.origin || u.pathname.startsWith("/api/") || u.pathname.startsWith("/data/")) return;
  if (r.mode === "navigate") {
    e.respondWith(
      fetch(r)
        .then((res) => {
          const copy = res.clone();
          if (res.ok) caches.open(V).then((c) => c.put(u.pathname, copy));
          return res;
        })
        .catch(async () => (await caches.match(u.pathname)) || caches.match("/")),
    );
    return;
  }
  const immutable = u.pathname.startsWith("/assets/") || u.pathname.startsWith("/fonts/");
  const profile = u.pathname.startsWith("/profiles/");
  if (!immutable && !profile) return;
  e.respondWith(
    caches.open(V).then(async (c) => {
      const hit = await c.match(r);
      if (hit && immutable) return hit;
      const net = fetch(r).then((res) => {
        if (res.ok) c.put(r, res.clone());
        return res;
      });
      // profiles refresh in the background so new printer data arrives on the next visit
      if (hit) {
        if (profile) net.catch(() => {});
        return hit;
      }
      return net;
    }),
  );
});
