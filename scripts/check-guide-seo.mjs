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
    assert.equal(await groups.count(),3);
    assert.equal(await groups.nth(0).locator("li").count(),1);
    assert.equal(await groups.nth(1).locator("li").count(),6);
    await groups.nth(2).locator("li a").click();
    const cards = page.locator("article section[id]");
    await cards.first().waitFor();
    assert.equal(await cards.count(),5);
    const warning=page.locator("#bambu-lab-x1-carbon aside");
    assert.match(await warning.locator("h3").innerText(),lang==="es"?/AMS original/:/Original AMS/);
    const caution=await warning.innerText();
    for(const term of (lang==="es"?["50 a 68 mm","cartón","TPU blando","PVA húmedo","soporte externo"]:["50–68 mm","cardboard","soft TPU","damp PVA","external spool holder"])) assert(caution.includes(term));
    assert(await warning.evaluate(el=>Boolean(el.compareDocumentPosition(el.parentElement.querySelector('a[href*="pack=single"]')) & Node.DOCUMENT_POSITION_FOLLOWING)));
    assert.equal(await cards.first().locator("h2").innerText(),"Flashforge Creator 5 Pro");
    const jumps=page.locator("article nav button");
    assert.equal(await jumps.count(),5);
    await jumps.last().click();
    assert.equal(await page.evaluate(()=>document.activeElement.id),"snapmaker-u1");
    assert.match(await page.locator("article h1").innerText(),lang==="es"?/filamento/:/buying guide/);
    assert(sitemap.includes("/guides/filament-buying-guide-five-printers</loc>"));
    assert(await page.locator("article").evaluate(el=>el.scrollWidth<=el.clientWidth));
    for(const [i, material] of ["PLA","PLA","PETG","PETG","PLA"].entries()){
      const card=cards.nth(i);
      assert.match(await card.locator('a[href^="https:"]').first().getAttribute("href"),/^https:/);
      assert.equal(await card.locator('a[href^="/filament"]').getAttribute("href"),`/filament?pack=single&d=1.75&f=${material}&t=${material}`);
    }
    for(const [i,material] of [[0,"PLA"],[2,"PETG"]]){
      await cards.nth(i).locator('a[href^="/filament"]').click();
      await page.getByTestId("offer-1").waitFor();
      assert.equal(await page.getByTestId("select-type").innerText(),material);
      assert.match(await page.getByTestId("select-pack").innerText(),/Single spool|Una bobina/);
      assert.match(await page.getByTestId("select-sort").innerText(),/Lowest total price|Menor precio total/);
      await page.goBack();
    }
    await page.goto(`${base}/guides?lang=${lang}`);
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
