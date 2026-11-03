// Utvecklarläget: testrollpersonerna byggs giltiga (efter önskemål och helt automatiskt),
const { tillRas } = require('./hjalp.cjs');
// automatiken klarar alla ras × yrke, och menyn laddar, öppnar rollformuläret, laddar ner och stängs av.
// Körs med `npm run e2e` (startar en egen server).
const { chromium } = require('playwright');
const URL = (process.env.E2E_BAS || 'http://localhost:8766') + '/index.html';
(async () => {
  const b = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8' } }) // annars heter nedladdningar med å, ä och ö bara download;
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  let fel = 0; const ok = (namn, villkor, extra = '') => { console.log(`${villkor ? 'PASS' : 'FAIL'} ${namn}${extra ? ' — ' + extra : ''}`); if (!villkor) fel++; };
  await p.goto(URL); await tillRas(p); await p.waitForTimeout(300);
  ok('inget utvecklarläge utan ?dev', await p.locator('.utvecklarlage').count() === 0);
  await p.click('.raskort'); await p.waitForTimeout(100);
  ok('ingen lås upp-knapp utan ?dev', await p.locator('.omslag').count() === 0);
  await p.goto(URL + '?dev'); await p.waitForFunction(() => window.chronopiaDev);
  for (const id of ['krigare', 'gladiator', 'magiker']) {
    const r = await p.evaluate((id) => { const x = window.chronopiaDev.bygg(id); return { fel: x.fel, avvek: x.avvek }; }, id);
    ok(`${id} enligt önskemålen`, !r.fel.length && !r.avvek, r.fel[0] || r.avvek || '');
  }
  const alla = await p.evaluate(async () => {
    const [raser, yrken] = await Promise.all(['raser', 'yrken'].map(n => fetch(`regler/${n}.json`).then(r => r.json())));
    const felLista = [];
    let antal = 0;
    for (const ras of raser.lista ?? raser) for (const y of yrken.lista) {
      if (y.villkor?.ras && !y.villkor.ras.includes(ras.id)) continue; // yrket är inte öppet för rasen (V&R)
      antal++;
      const bocker = [...new Set([ras.kalla?.bok, y.kalla?.bok].filter(Boolean))];
      const x = window.chronopiaDev.byggAuto({ id: 'x', namn: `${ras.id} ${y.id}`, kon: 'Man', ras: ras.id, alder: ras.alder.vuxen[0], yrke: y.id, bocker });
      if (x.fel.length) felLista.push(`${ras.id}/${y.id}: ${x.fel[0]}`);
    }
    return { antal, felLista };
  });
  ok(`automatiken för alla ${alla.antal} ras × yrke`, !alla.felLista.length, alla.felLista.slice(0, 3).join(' | '));
  for (const id of ['krigare', 'gladiator', 'magiker']) {
    await p.click('#menyknapp'); await p.click('#dev-' + id); await p.waitForTimeout(200);
    ok(`${id} inläst i sista steget`, (await p.locator('.steg-huvud h2').textContent()) === 'Spara och exportera' && await p.locator('.steg-knapp[disabled]').count() === 0);
  }
  const steg = await p.locator('#dev-lage optgroup[label="Steg"] option').evaluateAll(o => o.map(x => [x.value, x.textContent.replace(/^\d+\. | \(bara (magiker|med Magi)\)$/g, '')]));
  let fel_steg = [];
  for (const [id, namn] of steg) {
    await p.click('#menyknapp'); await p.selectOption('#dev-lage', id); await p.click(id === 'familjarer' ? '#dev-magi-chronomag' : '#dev-magiker'); await p.waitForTimeout(150);
    const h2 = await p.locator('.steg-huvud h2').textContent();
    if (h2 !== namn) fel_steg.push(`${id}: ${h2}`);
  }
  ok(`öppna i alla ${steg.length} steg`, steg.length >= 14 && !fel_steg.length, fel_steg.join(', '));
  await p.click('#menyknapp'); await p.selectOption('#dev-lage', 'formagor'); await p.click('#dev-krigare'); await p.waitForTimeout(150);
  await p.click('#sf-las-upp'); await p.waitForTimeout(100);
  const slaKnapp = p.locator('.steg-innehall button', { hasText: /^Slå 2T20([+−]\d+)*$/ });
  const upplast = await slaKnapp.count() === 1 && await p.locator('#sf-bp').evaluate(x => !x.readOnly);
  await slaKnapp.click(); await p.waitForTimeout(700);
  // Förmågans modal efter slaget: gör valen (om det finns några) och stäng den
  for (let i = 0; i < 40 && await p.locator('#sf-modal-fortsatt[disabled]').count(); i++) { // förmågor med val: välj något som går
    const sel = p.locator('#sf-modal select').first();
    const alt = await sel.locator('option').evaluateAll(o => o.filter(x => x.value && !x.disabled).map(x => x.value));
    await sel.selectOption(alt[i % alt.length]); await p.waitForTimeout(50);
  }
  if (await p.locator('#sf-modal-fortsatt').count()) await p.click('#sf-modal-fortsatt');
  ok('lås upp och slå om', upplast && await p.locator('#sf-slag').count() === 1);
  await p.click('#menyknapp'); await p.selectOption('#dev-lage', 'formular'); await p.check('#dev-erf'); await p.click('#dev-magiker'); await p.waitForTimeout(300);
  const erf = await p.evaluate(() => JSON.parse(localStorage.getItem('chronopia-rollperson-v2')).rp.spel.erf);
  ok('rollformuläret med erf', await p.locator('#rf-vy').isVisible() && Object.keys(erf).length > 0);
  const filer = []; p.on('download', d => filer.push(d.suggestedFilename()));
  await p.click('#menyknapp'); await p.click('#dev-ladda-ner'); await p.waitForTimeout(1000);
  ok('ladda ner alla', filer.length === 8, filer.join(', '));
  await p.goto(URL); await p.waitForSelector('.utvecklarlage', { state: 'attached' });
  ok('valet sparas i webbläsaren', true);
  await p.goto(URL + '?dev=av'); await tillRas(p); await p.waitForTimeout(300);
  ok('?dev=av stänger av', await p.locator('.utvecklarlage').count() === 0);
  ok('inga konsolfel', !errs.length, errs[0] || '');
  await b.close();
  process.exit(fel ? 1 : 0);
})();
