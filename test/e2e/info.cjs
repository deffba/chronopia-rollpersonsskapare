const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const alderKlar = async () => { if (await p.locator('#alder').count() && !(await p.inputValue('#alder'))) await p.click('.steg-innehall button:has-text("Enkel metod")'); }; // åldern är tom från början (steg 2)
  const nasta = async () => { await alderKlar(); if (await p.locator('#sf-modal-fortsatt:not([disabled])').count()) await p.click('#sf-modal-fortsatt'); await p.locator('.steg-fot .primar').click(); };
  await p.goto((process.env.E2E_BAS || 'http://localhost:8766') + '/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.raskort');
  await p.locator('.raskort').first().click(); await p.waitForTimeout(150); await nasta(); await nasta();
  await p.click('[data-yrke="krigare"]'); await nasta(); await p.waitForTimeout(200);
  const r = [];
  r.push(['ingen ruta från början', await p.locator('.magi-info').count() === 0]);
  await p.selectOption('#ny-extra-f', 'mentalism'); await p.waitForTimeout(150);
  r.push(['ruta under extra-listan före Lägg till', await p.locator('.magi-info').count() === 1]);
  const bb = await p.locator('.magi-info').boundingBox(); await p.screenshot({ path: process.argv[2], fullPage: true, clip: { x: bb.x - 20, y: bb.y - 140, width: bb.width + 40, height: bb.height + 220 } });
  await p.selectOption('#ny-extra-f', ''); await p.waitForTimeout(100);
  r.push(['borta när valet tas bort', await p.locator('.magi-info').count() === 0]);
  await p.selectOption('#valfri-f', 'animism'); await p.waitForTimeout(150);
  r.push(['ruta vid valfri magiskola', await p.locator('.magi-info').count() === 1]);
  await p.selectOption('#valfri-f', 'mentalism').catch(() => {}); await p.waitForTimeout(150);
  r.push(['inga konsolfel', errs.length === 0]);
  console.log(r.map(([n, v]) => (v ? 'PASS ' : 'FAIL ') + n).join('\n')); await b.close();
})();
