// Tell IndexNow (Bing and the other participating engines) about every URL in the built sitemap.
//
//   node scripts/indexnow.mjs             POST the sitemap URLs to https://api.indexnow.org/indexnow
//   node scripts/indexnow.mjs --dry-run   print what would be sent, no network request
//   SITEMAP=path node scripts/indexnow.mjs (default dist/public/sitemap.xml)
//
// The key is the public file client/public/<32 hex>.txt (served at https://filashift.com/<key>.txt; public by
// design, IndexNow fetches it to verify the ping). deploy/release.sh runs this after the smoke test; it never fails
// a release: every problem is logged and the script exits 0.
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const HOST = "filashift.com";
const ENDPOINT = "https://api.indexnow.org/indexnow";
const dryRun = process.argv.includes("--dry-run");

try {
  const keys = readdirSync(join(ROOT, "client/public")).filter((f) => /^[0-9a-f]{32}\.txt$/.test(f));
  if (keys.length !== 1) throw new Error(`expected one client/public/<32 hex>.txt key file, found ${keys.length}`);
  const key = keys[0].slice(0, 32);
  if (readFileSync(join(ROOT, "client/public", keys[0]), "utf8").trim() !== key) throw new Error(`${keys[0]} does not contain its key`);
  const sitemap = readFileSync(resolve(ROOT, process.env.SITEMAP || "dist/public/sitemap.xml"), "utf8");
  const urlList = [...new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()))];
  const foreign = urlList.filter((u) => new URL(u).host !== HOST);
  if (!urlList.length || foreign.length || urlList.length > 10000) throw new Error(`sitemap: ${urlList.length} URLs, ${foreign.length} not on ${HOST}`);
  const body = { host: HOST, key, keyLocation: `https://${HOST}/${key}.txt`, urlList };
  if (dryRun) {
    console.log(`IndexNow dry run: would POST ${urlList.length} URLs to ${ENDPOINT}`);
    console.log(JSON.stringify({ ...body, urlList: [...urlList.slice(0, 3), `… ${urlList.length - 3} more`] }, null, 2));
  } else {
    const res = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
    // 200 = accepted, 202 = accepted, key validation pending; 4xx/429 are logged only
    console.log(`IndexNow: HTTP ${res.status} for ${urlList.length} URLs${res.ok ? "" : ` (${(await res.text()).slice(0, 200)})`}`);
  }
} catch (e) {
  console.log(`IndexNow: not sent (${e.message}); the release is not affected`);
}
