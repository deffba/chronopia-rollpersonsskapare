const { chromium } = require('playwright');
const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 1300 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
const fil = process.argv[2]; const namn = fil.replace('.json','');
await p.goto((process.env.E2E_BAS || 'http://localhost:8766') + '/index.html'); await p.waitForSelector('.raskort');
await p.setInputFiles('#importfil', { name: 't.json', mimeType: 'application/json', buffer: fs.readFileSync(fil) });
await p.waitForTimeout(200); console.log(await p.locator('#notis').textContent());
await p.click('#menyknapp'); await p.click('#visa-formular'); await p.waitForTimeout(800); if (process.argv[3]) { await p.check('#med-regler'); await p.waitForTimeout(1200); }
const sidor = p.locator('.rf-sida');
for (let i = 0; i < await sidor.count(); i++) await sidor.nth(i).screenshot({ path: `${namn}-s${i+1}.png` });
await p.emulateMedia({ media: "print" }); console.log(await p.evaluate(() => [document.documentElement.scrollHeight, getComputedStyle(document.body).margin, getComputedStyle(document.body).padding]));
await p.pdf({ path: `${namn}.pdf`, format: 'A4', printBackground: true, preferCSSPageSize: true });
console.log('fel:', errs.join(' | '));
await b.close(); })();
