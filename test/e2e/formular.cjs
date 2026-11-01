// Rollformuläret: fält som fylls i sparas, följer med i filen och läses in igen; utskriften blir A4-sidor.
const { tillRas } = require('./hjalp.cjs');
// Kör med en sparad rollperson: node formular.cjs Dimalv-magi.json (körs med `npm run e2e`)
const { chromium } = require('playwright');
const fs = require('fs');
const res = []; const ok = (namn, villkor, info = '') => res.push(`${villkor ? 'PASS' : 'FAIL'} ${namn}${info ? ' — ' + info : ''}`);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1300, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto((process.env.E2E_BAS || 'http://localhost:8766') + '/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload(); await tillRas(p);
  await p.setInputFiles('#importfil', { name: 't.json', mimeType: 'application/json', buffer: fs.readFileSync(process.argv[2]) });
  await p.waitForTimeout(200);
  await p.click('#menyknapp'); await p.click('#visa-formular');
  const grundsidor = await p.locator('.rf-sida').count();
  ok('formuläret visas med två sidor, tre om något inte får plats', grundsidor === 2 || grundsidor === 3, `${grundsidor}`);
  ok('stegen döljs', !(await p.locator('.layout').isVisible()));
  const forsta = p.locator('.rf-fardigheter .rf-rad:not(.kat-b) .rf-erf input').first();
  const forstaNamn = (await forsta.getAttribute('aria-label')).replace('erf för ', '');
  await forsta.fill('4'); await forsta.press('Tab');
  await p.fill('input[aria-label="Spelledare"]', 'Kim'); await p.press('input[aria-label="Spelledare"]', 'Tab');
  await p.fill('input[aria-label="Hjältepoäng"]', '3'); await p.press('input[aria-label="Hjältepoäng"]', 'Tab');
  const egen = p.locator('input[aria-label="Utrustning"]').first();
  await egen.fill('Rep (10 m)'); await egen.press('Tab');
  await p.locator('input[aria-label="sm i börs"]').fill('123'); await p.locator('input[aria-label="sm i börs"]').press('Tab');
  await p.locator('textarea[aria-label="Utseende och bakgrund"]').fill('Skuld till Kim: 5 sm'); await p.locator('textarea[aria-label="Utseende och bakgrund"]').press('Tab');
  // tillbaka och fram igen
  await p.click('text=← Tillbaka till stegen');
  ok('tillbaka visar stegen', await p.locator('.layout').isVisible());
  await p.click('#menyknapp'); await p.click('#visa-formular');
  ok('erf finns kvar', await p.locator(`input[aria-label="erf för ${forstaNamn}"]`).first().inputValue() === '4');
  ok('spelledare finns kvar', await p.locator('input[aria-label="Spelledare"]').inputValue() === 'Kim');
  // nedladdning
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.rf-verktyg button:has-text(".json")')]);
  const fil = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  ok('filen har format och version', fil.format === 'chronopia-rollperson' && fil.version === 2);
  const spel = fil.rollperson.spel;
  ok('filen har spelfälten', spel.spelledare === 'Kim' && spel.hjaltepoang === 3 && spel.utrustning[0]?.namn === 'Rep (10 m)' && spel.pengar?.bors?.sm === '123' && fil.rollperson.anteckningar.startsWith('Skuld'), JSON.stringify(spel));
  ok('erf sparas per färdighetsnyckel', Object.values(spel.erf).includes(4), JSON.stringify(spel.erf));
  // läs in den nedladdade filen i en ny sida
  await p.evaluate(() => localStorage.clear()); await p.reload(); await tillRas(p);
  await p.setInputFiles('#importfil', { name: 'ny.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fil)) });
  await p.waitForTimeout(200);
  ok('nedladdad fil läses in', (await p.locator('#notis').textContent()).includes('inläst'));
  await p.click('#menyknapp'); await p.click('#visa-formular');
  ok('inläst fil visar erf och pengar', await p.locator(`input[aria-label="erf för ${forstaNamn}"]`).first().inputValue() === '4' && await p.locator('input[aria-label="sm i börs"]').inputValue() === '123');
  // äldre fil utan version
  const gammal = { ...fil.rollperson }; delete gammal.spel;
  await p.setInputFiles('#importfil', { name: 'gammal.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(gammal)) });
  await p.waitForTimeout(200);
  ok('fil från före versionen läses in', (await p.locator('#notis').textContent()).includes('inläst'));
  // utskrift
  await p.emulateMedia({ media: 'print' });
  const pdf = await p.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  const sidor = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  ok('utskriften blir lika många A4-sidor', sidor === grundsidor, `${sidor} sidor`);
  await p.emulateMedia({ media: 'screen' });
  // valfria sidor med färdigheterna i korthet
  await p.check('#med-regler'); await p.waitForTimeout(800);
  const regelsidor = await p.locator('.rf-regelsida').count();
  const poster = await p.locator('.rf-regel').count();
  const overfull = await p.evaluate(() => [...document.querySelectorAll('.rf-regelkolumn')].some(k => k.scrollHeight > k.clientHeight + 1));
  ok('färdigheterna i korthet: bara egna färdigheter, inget kapas', regelsidor >= 1 && poster > 5 && poster < 74 && !overfull, `${regelsidor} sidor, ${poster} poster`);
  await p.emulateMedia({ media: 'print' });
  const pdf2 = await p.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  const sidor2 = (pdf2.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  ok('utskriften med regelsidor', sidor2 === grundsidor + regelsidor, `${sidor2} sidor`);
  await p.emulateMedia({ media: 'screen' });
  await p.uncheck('#med-regler'); await p.waitForTimeout(200);
  ok('utan regelsidor igen', await p.locator('.rf-sida').count() === grundsidor);
  // smal skärm: ingen sidledsskroll på sidan (formuläret skrollar inom sin ruta)
  await p.setViewportSize({ width: 400, height: 800 });
  ok('ingen sidledsskroll på 400 px', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  ok('inga konsolfel', errs.length === 0, errs.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})();
