// PDF-nedladdningen: rollformuläret blir en PDF-fil direkt, utan utskriftsdialog, med samma sidor i alla fönsterstorlekar.
const { tillRas } = require('./hjalp.cjs');
// Kör: node pdf.cjs <rollperson.json> <utmapp> (körs med `npm run e2e`)
const { chromium, devices } = require('playwright');
const fs = require('fs');
const res = []; const ok = (namn, villkor, info = '') => res.push(`${villkor ? 'PASS' : 'FAIL'} ${namn}${info ? ' — ' + info : ''}`);
const ut = process.argv[3] || '.';
async function kor(b, namn, opts, medRegler = false, blacksnal = false) {
  const ctx = await b.newContext({ ...opts, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  let printad = false;
  await p.goto((process.env.E2E_BAS || 'http://localhost:8766') + '/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload(); await tillRas(p);
  await p.evaluate(() => { window.print = () => { window.__printad = true; }; });
  await p.setInputFiles('#importfil', { name: 't.json', mimeType: 'application/json', buffer: fs.readFileSync(process.argv[2]) });
  await p.waitForTimeout(300);
  await p.click('#menyknapp'); await p.click('#visa-formular');
  await p.fill('input[aria-label="Spelledare"]', 'Kim'); await p.press('input[aria-label="Spelledare"]', 'Tab');
  await p.locator('input[aria-label="sm i börs"]').fill('123'); await p.locator('input[aria-label="sm i börs"]').press('Tab');
  if (medRegler) { await p.check('#med-regler'); await p.waitForTimeout(800); }
  if (blacksnal) await p.check('#blacksnal');
  const skarmsidor = await p.locator('.rf-sida').count();
  const t0 = Date.now();
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#pdf-ladda-ner')]);
  const tid = Date.now() - t0;
  const fil = `${ut}/${namn}.pdf`; await dl.saveAs(fil);
  const pdf = fs.readFileSync(fil);
  const sidor = Number(require('child_process').execSync(`pdfinfo "${fil}"`).toString().match(/Pages:\s+(\d+)/)[1]);
  ok(`${namn}: PDF laddas ner utan utskriftsdialog`, !(await p.evaluate(() => window.__printad)) && pdf.slice(0, 5).toString() === '%PDF-', `${tid} ms, ${Math.round(pdf.length / 1024)} kB`);
  ok(`${namn}: filnamnet är rollpersonens namn`, /^[^/]+\.pdf$/.test(dl.suggestedFilename()) && !dl.suggestedFilename().startsWith('Chronopia'), dl.suggestedFilename());
  ok(`${namn}: lika många sidor som på skärmen`, sidor === skarmsidor, `${sidor}/${skarmsidor}`);
  ok(`${namn}: knappen återställs`, await p.locator('#pdf-ladda-ner').isEnabled() && (await p.locator('#pdf-ladda-ner').textContent()) === 'Ladda ner som PDF');
  ok(`${namn}: inga fel i konsolen`, errs.length === 0, errs.join(' | '));
  ok(`${namn}: inga kvarlämnade element`, await p.locator('.rf-pdf-kalla').count() === 0);
  if (namn === 'dator') await p.locator('.rf-sida').first().screenshot({ path: `${ut}/skarm-1.png` }), await p.locator('.rf-sida').nth(1).screenshot({ path: `${ut}/skarm-2.png` });
  // steg 14
  await p.click('text=← Tillbaka till stegen');
  await ctx.close();
  return fil;
}
(async () => {
  const b = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8' } }) // annars heter nedladdningar med å, ä och ö bara download;
  await kor(b, 'dator', { viewport: { width: 1300, height: 900 } });
  await kor(b, 'iphone', { ...devices['iPhone 13'] });
  await kor(b, 'regler', { viewport: { width: 1300, height: 900 } }, true);
  await kor(b, 'blacksnal', { viewport: { width: 1300, height: 900 } }, false, true);
  await b.close();
  console.log(res.join('\n'));
  console.log(`${res.filter(r => r.startsWith('PASS')).length}/${res.length}`);
})();
