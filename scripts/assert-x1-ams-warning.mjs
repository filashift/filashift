import assert from "node:assert/strict";

// Test what readers see, not the guide data that generated the page.
export async function assertX1AmsWarning(card, lang) {
  const es = lang === "es";
  const title = es ? /advertencia.*AMS original/i : /original AMS.*warning/i;
  const warning = card.getByRole("complementary", {name:title});
  const cta = card.getByRole("link", {name:es ? "Comparar bobinas de PETG" : "Compare PETG spools", exact:true});
  assert.equal(await warning.count(), 1, "X1 Carbon must have one visible, labeled original AMS warning");
  assert(await warning.getByRole("heading", {name:title}).isVisible(), "AMS warning heading is hidden");
  const text = await warning.innerText();
  for (const term of es
    ? [/50\s*(?:a|[-–])\s*68\s*mm/i, /cartón/i, /resbal/i, /TPU blando/i, /PVA húmedo/i, /atasc/i, /soporte externo/i]
    : [/50\s*[-–]\s*68\s*mm/i, /cardboard/i, /slip/i, /soft TPU/i, /damp PVA/i, /jam/i, /external spool holder/i]) {
    assert.match(text, term, `Missing visible AMS guidance (${lang}): ${term}`);
  }
  const [w, a] = await Promise.all([warning.boundingBox(), cta.boundingBox()]);
  assert(w && a && w.y + w.height <= a.y + 1, "AMS warning must appear above the X1 Carbon PETG shopping link");
  const handle = await cta.elementHandle();
  try {
    assert(await warning.evaluate((el,link)=>Boolean(el.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING), handle),
      "AMS warning must precede the PETG link in reading order");
  } finally { await handle.dispose(); }
}
