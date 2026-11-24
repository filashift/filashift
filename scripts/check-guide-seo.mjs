// Run against production or a path-routed local preview: BASE=https://filashift.com node scripts/check-guide-seo.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
const base = process.env.BASE || "https://filashift.com";
const browser = await chromium.launch({executablePath: process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`});
try {
  const ctx = await browser.newContext({serviceWorkers:"block"});
  if (["localhost","127.0.0.1"].includes(new URL(base).hostname)) {
    await ctx.addInitScript(() => { window.__PRERENDER = true; });
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  const results = await (await ctx.request.get(`${base}/profiles/tested.json`)).json();
  const count = Object.values(results.printers).filter(r => r.ok).length;
  const sitemap = await (await ctx.request.get(`${base}/sitemap.xml`)).text();
  for (const lang of ["en", "es"]) {
    await page.setViewportSize({width:lang==="es"?375:1280,height:850});
    await page.goto(`${base}/guides?lang=${lang}`);
    const groups = page.locator('[data-testid="list-guides"] section');
    await groups.first().waitFor();
    assert.equal(await groups.count(),2);
    assert.equal(await groups.nth(0).locator("li").count(),1);
    assert.equal(await groups.nth(1).locator("li").count(),6);
    assert.match(await groups.nth(1).locator("h2").innerText(),lang==="es"?/entre laminadores e impresoras/:/between slicers and printers/);
    await page.goto(`${base}/guides/3mf-to-stl?lang=${lang}`, {waitUntil:"networkidle"});
    const answer = await page.locator("dt").filter({hasText:lang==="es"?"límite de tamaño":"size limit"}).locator("+ dd").innerText();
    assert.match(answer,/2 GB/);
    assert.match(answer,lang==="es"?/descomprimirse/:/expand beyond/);
    const date = await page.locator("article time").getAttribute("datetime");
    assert(sitemap.includes(`/guides/3mf-to-stl</loc><lastmod>${date}</lastmod>`));
    await page.goto(`${base}/?lang=${lang}`, {waitUntil:"networkidle"});
    const faq = JSON.parse(await page.locator("#ld-faq").textContent()).mainEntity;
    assert(faq.some(x=>x.acceptedAnswer.text===answer));
    const record = faq.find(x=>x.acceptedAnswer.text.includes(results.date))?.acceptedAnswer.text;
    assert(record?.includes(String(count)) && Object.values(results.slicers).every(v=>record.includes(v)));
    await page.getByTestId("faq-7").click();
    assert((await page.locator('[data-state=open][role=region]').innerText()).includes(record));
    console.log(`${lang}: guide groups, matching size guidance, editorial date and profile-test evidence passed.`);
  }
  assert.deepEqual(errors,[]);
} finally { await browser.close(); }
