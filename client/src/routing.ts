// Real paths (filashift.com/filament) on our own server, where Caddy serves index.html for unknown paths.
// Everywhere else (previews, plain static hosting) fall back to hash routes (#/filament).
// The prerender step (scripts/prerender.mjs) sets window.__PRERENDER to capture path-routed pages.
export const PATH_ROUTING = /(^|\.)filashift\.com$/.test(window.location.hostname) || !!(window as any).__PRERENDER;
