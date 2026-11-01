// Utvecklarlägets autofyll och poänglogg. Körs med `npm run e2e` (startar en egen server).
// Autofyll: dvärg tjuv går att klicka igenom till sista steget utan att fylla i något (utom BP på särskild förmåga),
// alla särskilda förmågor med val fylls i. Loggen: ras som byts ut försvinner, saldot stämmer för testrollpersonerna,
// filter, dra högre (aldrig lägre än standard), helskärm och Esc.
const { chromium } = require('playwright');
const URL = (process.env.E2E_BAS || 'http://localhost:8766') + '/index.html';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1490, height: 882 }, reducedMotion: 'reduce' });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  let fel = 0; const ok = (namn, villkor, extra = '') => { console.log(`${villkor ? 'PASS' : 'FAIL'} ${namn}${extra ? ' — ' + extra : ''}`); if (!villkor) fel++; };
  const rader = () => p.locator('.pl-rad .pl-text').allTextContents();
  const alderKlar = async () => { if (await p.locator('#alder').count() && !(await p.inputValue('#alder'))) await p.click('.steg-innehall button:has-text("Enkel metod")'); }; // åldern är tom från början (steg 2)
  const nasta = async () => { await alderKlar(); if (await p.locator('#sf-modal-fortsatt:not([disabled])').count()) await p.click('#sf-modal-fortsatt'); await p.click('.steg-fot .knapp.primar'); await p.waitForTimeout(200); return p.locator('.steg-huvud h2').textContent(); };
  await p.goto(URL + '?dev'); await p.waitForSelector('#poanglogg');
  await p.evaluate(() => { localStorage.setItem('chronopia-dev-autofyll', 'nej'); localStorage.removeItem('chronopia-dev-logg'); localStorage.setItem('chronopia-manuella-slag', 'nej'); });
  await p.reload(); await p.waitForSelector('#poanglogg');
  const rail = await p.locator('.stegrail').boundingBox(); const box = await p.locator('#poanglogg').boundingBox();
  ok('loggen ligger under stegen', Math.abs(box.x - rail.x) < 1 && Math.abs(box.width - rail.width) < 1 && box.y > rail.y + rail.height, JSON.stringify(box));
  ok('filter från början: Slag och Vikt av, resten på', JSON.stringify(await p.locator('.pl-filter input').evaluateAll(i => i.map(x => x.checked))) === JSON.stringify([true, true, true, true, false, false, true]));
  await p.click('#pl-autofyll');
  ok('Auto på', await p.getAttribute('#pl-autofyll', 'aria-pressed') === 'true' && await p.isChecked('#dev-autofyll'));
  await p.click('.raskort:has-text("Dimalv")'); await p.waitForTimeout(150);
  await p.click('.raskort:has-text("Dvärg")'); await p.waitForTimeout(150);
  const r = await rader();
  ok('bytt ras: bara den nya i loggen', r.some(t => t.includes('Ras: Dvärg')) && !r.some(t => t.includes('Dimalv')));
  await nasta(); await nasta(); await p.click('[data-yrke="tjuv"]'); await nasta(); await p.waitForTimeout(250);
  ok('yrkets val ifyllda', await p.locator('.saknaslista li:not(:has-text("steg"))').count() === 0);
  let h = '';
  for (let i = 0; i < 12 && h !== 'Spara och exportera'; i++) {
    h = await nasta();
    if (h === 'Särskilda förmågor') { await p.fill('#sf-bp', '10'); await p.press('#sf-bp', 'Enter'); await p.waitForTimeout(250); }
  }
  ok('dvärg tjuv klickad till sista steget', h === 'Spara och exportera' && await p.locator('.saknaslista').count() === 0);
  ok('inga EP fördelade automatiskt', !(await rader()).some(t => /: FV \d+ → /.test(t)));
  ok('saldot stämmer', await p.locator('.pl-fot').isHidden());
  // Särskilda förmågor med val, med manuella slag
  await p.evaluate(() => localStorage.setItem('chronopia-manuella-slag', 'ja')); await p.reload(); await p.waitForSelector('#poanglogg');
  await p.click('.raskort:has-text("Människa")'); await p.waitForTimeout(150);
  for (let i = 0; i < 6 && await p.locator('.steg-huvud h2').textContent() !== 'Särskilda förmågor'; i++) {
    if (await p.locator('.steg-huvud h2').textContent() === 'Yrke') { await p.click('[data-yrke="krigare"]'); await p.waitForTimeout(100); } // inget yrke är förvalt
    await nasta();
  }
  await p.fill('#sf-bp', '1'); await p.press('#sf-bp', 'Enter'); await p.waitForTimeout(80);
  const sf = await p.evaluate(() => fetch('regler/sarskilda-formagor.json').then(r => r.json()));
  const ofyllda = [];
  for (const x of sf.filter(x => x.regel?.some(r => r.valj))) {
    const sum = x.slag[0], bp = Math.max(1, sum - 40), slag = sum - bp;
    if (await p.locator('#sf-las-upp').count()) { await p.click('#sf-las-upp'); await p.waitForTimeout(80); }
    await p.fill('#sf-bp', String(bp)); await p.press('#sf-bp', 'Enter'); await p.waitForTimeout(80);
    await p.fill('#sf-slag', String(slag)); await p.click('#sf-sla'); await p.waitForTimeout(250);
    const kvar = (await p.locator('.saknaslista li').allTextContents()).filter(k => !/steg (8|9|10)\)/.test(k));
    if (await p.locator('#sf-modal-fortsatt:not([disabled])').count()) await p.click('#sf-modal-fortsatt');
    if (kvar.length || !(await p.locator('.resultat .summering').textContent()).includes(x.namn)) ofyllda.push(`${x.namn}: ${kvar[0] ?? 'fel förmåga'}`);
  }
  ok('särskilda förmågors val fylls i', !ofyllda.length, ofyllda.join(' | '));
  await p.evaluate(() => localStorage.setItem('chronopia-manuella-slag', 'nej'));
  for (const id of ['krigare', 'gladiator', 'magiker']) {
    await p.click('#menyknapp'); await p.selectOption('#dev-lage', 'export'); await p.click('#dev-' + id); await p.waitForTimeout(200);
    ok(`${id}: saldot stämmer med sidan`, await p.locator('.pl-fot').isHidden(), await p.locator('.pl-fot').textContent());
  }
  await p.check('#pl-filter-Slag'); await p.check('#pl-filter-Vikt');
  const typer = await p.locator('.pl-rad').evaluateAll(r => r.map(x => x.dataset.typ));
  ok('grundegenskaper, slag och vikt i loggen', ['GE', 'Slag', 'Vikt'].every(t => typer.includes(t)));
  ok('slutvärde för alla sju grundegenskaper', (await p.locator('.pl-rad[data-typ="GE"] .pl-kvar').allTextContents()).filter(Boolean).length === 7);
  await p.click('.steg-knapp >> nth=5'); await p.waitForTimeout(150);
  await p.fill('#ge-STY', '18'); await p.press('#ge-STY', 'Enter'); await p.waitForTimeout(200);
  ok('stoppad ändring loggas i rött', (await p.locator('.pl-rad.nekad').count()) === 1 && /för mycket/.test(await p.locator('.pl-rad.nekad').textContent()));
  ok('saldot stämmer efter stoppet', await p.locator('.pl-fot').isHidden());
  for (const t of ['GE', 'Slag', 'Vikt', 'Nekad', 'BP', 'EP']) await p.uncheck('#pl-filter-' + t);
  ok('filter: bara guld', (await p.locator('.pl-rad').evaluateAll(r => r.map(x => x.dataset.typ))).every(t => t === 'Guld'));
  await p.check('#pl-filter-BP'); await p.check('#pl-filter-EP');
  const fore = await p.locator('#poanglogg').boundingBox();
  const hand = await p.locator('.pl-handtag').boundingBox();
  await p.mouse.move(hand.x + 30, hand.y + 4); await p.mouse.down(); await p.mouse.move(hand.x + 30, hand.y - 150, { steps: 4 }); await p.mouse.up();
  const hogre = await p.locator('#poanglogg').boundingBox();
  ok('dras högre', Math.abs(hogre.height - fore.height - 154) < 3, `${fore.height} → ${hogre.height}`);
  await p.mouse.move(hand.x + 30, hogre.y + 4); await p.mouse.down(); await p.mouse.move(hand.x + 30, hogre.y + 500, { steps: 4 }); await p.mouse.up();
  ok('aldrig lägre än standard', Math.abs((await p.locator('#poanglogg').boundingBox()).height - fore.height) < 1);
  await p.click('#pl-hel'); ok('helskärm', (await p.locator('#poanglogg').boundingBox()).width > 1400);
  await p.keyboard.press('Escape'); ok('Esc lämnar helskärm', (await p.locator('#poanglogg').boundingBox()).width < 300);
  await p.click('#menyknapp'); await p.uncheck('#dev-logg'); ok('loggen kan döljas', await p.locator('#poanglogg').isHidden());
  await p.check('#dev-logg'); ok('och visas igen', await p.locator('#poanglogg').isVisible());
  ok('inga fel i konsolen', !errs.length, errs.join(' | '));
  await b.close();
  console.log(fel ? `${fel} FAIL` : 'Alla PASS');
  process.exit(fel ? 1 : 0);
})();
