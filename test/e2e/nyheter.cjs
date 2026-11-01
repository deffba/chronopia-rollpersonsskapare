// Backlogpunkterna 1, 2, 4, 6 och 8: PDF-filnamn, PDF direkt från steg 14, bakåtknappen, kortens storlek, inget förvalt yrke.
const { tillRas } = require('./hjalp.cjs');
// Körs med `npm run e2e` (startar en egen server).
const { chromium } = require('playwright');
const fs = require('fs');
const URL = (process.env.E2E_BAS || 'http://localhost:8766') + '/index.html';
(async () => {
  const b = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8' } }) // annars heter nedladdningar med å, ä och ö bara download;
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  let fel = 0; const ok = (namn, villkor, extra = '') => { console.log(`${villkor ? 'PASS' : 'FAIL'} ${namn}${extra ? ' — ' + extra : ''}`); if (!villkor) fel++; };
  const rubrik = () => p.locator('.steg-huvud h2').textContent();
  const alderKlar = async () => { if (await p.locator('#alder').count() && !(await p.inputValue('#alder'))) await p.click('.steg-innehall button:has-text("Enkel metod")'); }; // åldern är tom från början (steg 2)
  const nasta = async () => { await alderKlar(); if (await p.locator('#sf-modal-fortsatt:not([disabled])').count()) await p.click('#sf-modal-fortsatt'); await p.click('.steg-fot .knapp.primar'); await p.waitForTimeout(150); };

  await p.goto(URL + '?dev=av'); await p.evaluate(() => localStorage.clear()); await p.reload(); await tillRas(p);
  // 6: korten är större, texten centrerad, yrkena fyra i bredd
  const ras = await p.locator('.raskort').first().evaluate(e => ({ w: e.getBoundingClientRect().width, align: getComputedStyle(e).textAlign }));
  ok('raskorten bredare (rutnätet 468 px) och centrerade', ras.w > 140 && ras.align === 'center', JSON.stringify(ras));
  await p.click('.raskort:has-text("Människa")'); await nasta(); await nasta();
  ok('steg 3 är Yrke', await rubrik() === 'Yrke');
  // 8: inget yrke förvalt
  ok('inget yrkeskort valt', await p.locator('.yrkeskort.valt').count() === 0);
  ok('nästa steg spärrat utan yrke', await p.locator('.steg-fot .knapp.primar').isDisabled());
  ok('yrke saknas i listan', (await p.locator('.saknaslista li').allTextContents()).some(t => t.startsWith('Yrke')));
  ok('formulärets rubrik nämner inget yrke', !(await p.locator('.formular-huvud p').textContent()).includes('Krigare'));
  ok('ingen yrkesförmåga i formuläret', !(await p.locator('.formular').textContent()).includes('Yrkesförmåga'));
  const kolumner = await p.locator('.valkort-rutnat.fyra').evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length);
  ok('yrkena fyra i bredd', kolumner === 4, String(kolumner));
  const yrkeAlign = await p.locator('.yrkeskort').first().evaluate(e => getComputedStyle(e).textAlign);
  ok('yrkeskorten centrerade', yrkeAlign === 'center');
  const spill = [];
  for (const [w, stil] of [[1400, 'klassisk'], [1400, 'modern'], [1000, 'klassisk'], [1000, 'modern'], [800, 'klassisk'], [400, 'klassisk']]) {
    await p.setViewportSize({ width: w, height: 1000 }); await p.evaluate((s) => { if (s === 'klassisk') document.documentElement.dataset.stil = s; else delete document.documentElement.dataset.stil; }, stil); await p.waitForTimeout(500);
    spill.push(...await p.locator('.yrkeskort').evaluateAll((n, t) => n.filter(x => x.scrollWidth > x.clientWidth + 1 || x.querySelector('.valkort-namn').getBoundingClientRect().width > x.clientWidth).map(x => t + x.textContent), `${w}/${stil}: `));
  }
  await p.setViewportSize({ width: 1400, height: 1000 }); await p.evaluate(() => { document.documentElement.dataset.stil = 'klassisk'; });
  ok('yrkesnamnen får plats', !spill.length, spill.join(', '));
  await p.click('[data-yrke="tjuv"]');
  ok('yrket valt och nästa öppen', await p.locator('.yrkeskort.valt').count() === 1 && !(await p.locator('.steg-fot .knapp.primar').isDisabled()));
  await p.click('[data-yrke="tjuv"]'); await p.waitForTimeout(100);
  ok('ett tryck på valt yrke avmarkerar det', await p.locator('.yrkeskort.valt').count() === 0 && await p.locator('.valinfo').count() === 0
    && await p.locator('.steg-fot .knapp.primar').isDisabled());
  await p.click('[data-yrke="tjuv"]'); await p.waitForTimeout(100);
  await nasta();
  ok('steg 4 Yrkesfärdigheter', await rubrik() === 'Yrkesfärdigheter');

  // 4: bakåtknappen går till föregående steg
  await p.goBack(); await p.waitForTimeout(150);
  ok('bakåt till Yrke', await rubrik() === 'Yrke' && p.url().startsWith(URL));
  await p.goBack(); await p.waitForTimeout(150);
  ok('bakåt till Ålder', await rubrik() === 'Ålder');
  await p.goForward(); await p.waitForTimeout(150);
  ok('framåt till Yrke', await rubrik() === 'Yrke');
  ok('valen finns kvar', await p.locator('.yrkeskort.valt[data-yrke="tjuv"]').count() === 1);

  // 4 med utvecklarläget: det är kvar efter bakåt
  await p.goto(URL + '?dev'); await p.waitForFunction(() => window.chronopiaDev); await tillRas(p);
  await p.click('#menyknapp'); await p.selectOption('#dev-lage', 'export'); await p.click('#dev-krigare'); await p.waitForTimeout(300);
  ok('testrollpersonen på steg 14', /Spara|Exportera/.test(await rubrik()) || await p.locator('#pdf-direkt').count() === 1, await rubrik());
  const steg14 = await rubrik();
  await p.click('.steg-fot .knapp:not(.primar)'); await p.waitForTimeout(150);
  const steg13 = await rubrik();
  await p.goBack(); await p.waitForTimeout(150);
  ok('bakåt till steget innan (steg 14)', await rubrik() === steg14, `${steg13} → ${await rubrik()}`);
  ok('utvecklarläget kvar efter bakåt', await p.locator('.utvecklarlage').count() > 0 && p.url().includes('?dev'));
  // Rollformuläret och tillbaka med bakåtknappen
  await p.click('#menyknapp'); await p.click('#visa-formular'); await p.waitForTimeout(200);
  ok('rollformuläret öppet', await p.locator('#rf-vy').isVisible());
  await p.goBack(); await p.waitForTimeout(200);
  ok('bakåt stänger rollformuläret', await p.locator('#rf-vy').isHidden() && await rubrik() === steg14);

  // 1 och 2: PDF direkt från steg 14 med rollpersonens namn som filnamn. Filen skapas med pdf-lib, utan utskriftsdialog.
  const namn = await p.inputValue('#formular-namn');
  await p.evaluate(() => { window.__printad = false; window.print = () => { window.__printad = true; }; });
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#pdf-direkt')]);
  const pdfFil = fs.readFileSync(await dl.path());
  ok('PDF direkt: en PDF-fil laddas ner', pdfFil.slice(0, 5).toString() === '%PDF-', `${Math.round(pdfFil.length / 1024)} kB`);
  ok('PDF direkt: ingen utskriftsdialog', !(await p.evaluate(() => window.__printad)));
  ok('PDF direkt: filnamnet är rollpersonens namn', dl.suggestedFilename() === `${namn}.pdf`, `${dl.suggestedFilename()} / ${namn}`);
  ok('PDF direkt: steg 14 ligger kvar', await rubrik() === steg14 && await p.locator('#rf-vy').isHidden() && await p.locator('.rf-pdf-kalla').count() === 0);
  // Knappen i rollformuläret laddar också ner PDF:en
  await p.click('#menyknapp'); await p.click('#visa-formular'); await p.waitForTimeout(200);
  const [dl2] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#pdf-ladda-ner')]);
  ok('rollformulärets knapp: PDF med namnet', dl2.suggestedFilename() === `${namn}.pdf`, dl2.suggestedFilename());
  // Ctrl+P (beforeprint) ger också namnet
  await p.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  ok('Ctrl+P: titeln är namnet', await p.title() === namn);
  await p.evaluate(() => window.dispatchEvent(new Event('afterprint')));

  ok('inga konsolfel', !errs.length, errs.join(' | '));
  console.log(fel ? `${fel} FEL` : 'Alla PASS');
  await b.close();
  process.exit(fel ? 1 : 0);
})();
