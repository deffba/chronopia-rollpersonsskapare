// Steg 7, särskilda förmågor: rutan för att avstå, korten, att tabellen står kvar när BP ändras,
// och flikar + rullgardin när det finns fler tabeller (testas med en påhittad tabell i stället för en expansion).
// Körs med `npm run e2e` (startar en egen server). Kör med LANG=C.UTF-8.
const { chromium } = require('playwright');
const res = []; const ok = (namn, villkor, info = '') => res.push(`${villkor ? 'PASS' : 'FAIL'} ${namn}${info ? ' — ' + info : ''}`);
const BILD = process.env.BILD; // katalog för skärmbilder (valfritt)

(async () => {
  const b = await chromium.launch();
  const ny = async (route) => {
    const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
    p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
    if (route) await p.route('**/regler/sarskilda-formagor.json', route);
    await p.goto((process.env.E2E_BAS || 'http://localhost:8766') + '/index.html?dev'); await p.waitForSelector('.raskort');
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('chronopia-dev', 'ja'); }); await p.reload(); await p.waitForSelector('.raskort');
    await p.click('#menyknapp'); await p.selectOption('#dev-lage', 'formagor'); await p.click('#dev-krigare'); await p.waitForTimeout(150);
    await p.click('#sf-las-upp'); await p.waitForTimeout(100);
    return p;
  };
  const nastaSparrad = (p) => p.locator('.steg-fot .primar').evaluate(x => x.disabled || x.classList.contains('sparrad') || x.getAttribute('aria-disabled') === 'true');
  const bp = async (p, v) => { await p.fill('#sf-bp', String(v)); await p.press('#sf-bp', 'Tab'); await p.waitForTimeout(80); };

  // ---- Bara grundreglernas tabell
  let p = await ny();
  ok('ingen gammal varningsruta', await p.locator('.varning', { hasText: 'Glöm inte' }).count() === 0);
  ok('bara en tabell: varken flikar eller rullgardin', await p.locator('#sf-flikar').count() === 0 && await p.locator('#sf-tabell').count() === 0);
  ok('78 kort med siffror', await p.locator('.formagekort-knapp').count() === 78 && (await p.locator('.formagekort-knapp').first().locator('.formagekort-slag').textContent()) === '3–4'
    && (await p.locator('.formagekort-knapp').last().locator('.formagekort-slag').textContent()) === '81+');
  ok('korten visar bara namnet', await p.locator('.formagekort-effekt').count() === 0);
  const ruta = p.locator('label.avsta');
  ok('rutan för att avstå under slaget', await ruta.count() === 1 && await ruta.locator('strong').textContent() === 'Jag vill inte lägga BP på särskilda förmågor.'
    && (await ruta.textContent()).includes('Utan BP får rollpersonen ingen särskild förmåga'));
  ok('rutan står under raden med slaget', await p.evaluate(() => document.querySelector('label.avsta').getBoundingClientRect().top > document.querySelector('#sf-bp').getBoundingClientRect().bottom));

  await bp(p, 0);
  ok('0 BP utan kryss spärrar Nästa', await nastaSparrad(p));
  ok('0 BP: tärningen går inte att slå', await p.locator('#sf-sla').isDisabled());
  ok('0 BP: korten står kvar', await p.locator('.formagekort-knapp').count() === 78);
  await p.check('#sf-avsta'); await p.waitForTimeout(80);
  ok('kryss: Nästa öppen', !(await nastaSparrad(p)));
  ok('kryss: korten står kvar', await p.locator('.formagekort-knapp').count() === 78);
  if (BILD) await p.screenshot({ path: `${BILD}/avsta.png`, fullPage: false });
  await bp(p, 3);
  ok('BP tar bort krysset', !(await p.isChecked('#sf-avsta')) && (await p.inputValue('#sf-bp')) === '3');
  ok('med BP: rutan är spärrad men står kvar', await p.locator('#sf-avsta').isDisabled() && await p.locator('label.avsta.inaktiv').count() === 1);
  ok('med BP: texten är struken', await p.locator('label.avsta span').evaluate(x => getComputedStyle(x).textDecorationLine.includes('line-through')));
  if (BILD) await p.screenshot({ path: `${BILD}/struken.png` });
  await bp(p, 0);
  ok('utan BP: rutan går att kryssa i igen', !(await p.locator('#sf-avsta').isDisabled()) && await p.locator('label.avsta.inaktiv').count() === 0);
  await bp(p, 5);
  // Knapparna för föregående och nästa steg står ovanför tabellen
  ok('stegknapparna står ovanför tabellen', await p.evaluate(() => document.querySelector('.steg-fot').getBoundingClientRect().bottom <= document.querySelector('.formagekort').getBoundingClientRect().top));

  // Korten: ett klick fäller upp över grannarna utan att rutnätet ändras, ett nytt klick fäller ihop
  const natet = () => p.locator('#sf-kort-grund').evaluate(x => { const r = x.getBoundingClientRect(); return [r.width, r.height].join(','); });
  const plats = (i) => p.locator('.formageplats').nth(i).evaluate(x => { const r = x.getBoundingClientRect(); return [r.left, r.top].join(','); });
  const fore = [await natet(), await plats(1), await plats(4)];
  await p.locator('.formagekort-knapp').nth(0).click(); await p.waitForTimeout(80);
  const oppet = p.locator('.formagekort-knapp.oppen');
  ok('kortet fälls upp med effekten', await oppet.count() === 1 && (await oppet.locator('.formagekort-effekt').textContent()).includes('sekundär färdighet'));
  ok('rutnätet och grannarna står still', JSON.stringify([await natet(), await plats(1), await plats(4)]) === JSON.stringify(fore));
  const tacker = await p.evaluate(() => { const o = document.querySelector('.formagekort-knapp.oppen').getBoundingClientRect(); const g = document.querySelectorAll('.formageplats')[1].getBoundingClientRect();
    return o.right >= g.right - 1 && getComputedStyle(document.querySelector('.formagekort-knapp.oppen')).zIndex > 0; });
  ok('det uppfällda kortet täcker kortet bredvid', tacker);
  if (BILD) await p.screenshot({ path: `${BILD}/kort.png` });
  await bp(p, 6);
  ok('kortet är kvar uppfällt när BP ändras', await p.locator('.formagekort-knapp.oppen').count() === 1 && await p.locator('.formagekort-knapp').count() === 78);
  await p.locator('.formagekort-knapp.oppen').click(); await p.waitForTimeout(80);
  ok('nytt klick fäller ihop', await p.locator('.formagekort-knapp.oppen').count() === 0);
  await p.locator('.formagekort-knapp').nth(75).click(); await p.waitForTimeout(80);
  ok('kortet nere till höger öppnar uppåt och åt vänster', await p.locator('.formagekort-knapp.oppen.vanster.uppat').count() === 1
    && await p.evaluate(() => { const o = document.querySelector('.formagekort-knapp.oppen').getBoundingClientRect(); const n = document.querySelector('#sf-kort-grund').getBoundingClientRect(); return o.right <= n.right + 1 && o.bottom <= n.bottom + 1; }));
  await p.locator('.formagekort-knapp.oppen').click();

  // Slå så att summan blir 3–4 (Talang), som kräver ett val i modalen
  await bp(p, 1); await p.evaluate(() => { Math.random = () => 0; });
  await p.click('#sf-sla'); await p.waitForTimeout(450);
  ok('modal med förmågan efter slaget', await p.locator('#sf-modal [role=dialog]').count() === 1 && (await p.locator('#sf-modal-namn').textContent()) === 'Talang'
    && (await p.locator('#sf-modal').textContent()).includes('sekundär färdighet') && (await p.locator('#sf-modal').textContent()).includes('Slaget blev 2 + 1 BP = 3'),
    await p.locator('#sf-modal').textContent().catch(() => ''));
  ok('valen finns bara i modalen', await p.locator('#sf-modal select').count() === 1 && await p.locator('select#sf-0-0-f').count() === 1);
  ok('FORTSÄTT spärrad tills valet är gjort', await p.locator('#sf-modal-fortsatt').isDisabled());
  ok('sidan bakom rullar inte', await p.evaluate(() => document.body.classList.contains('dialog-oppen')));
  if (BILD) await p.screenshot({ path: `${BILD}/modal.png` });
  // Testrollpersonen har spenderat alla EP, så alla färdigheter går inte: pröva tills en går
  let forsta = null;
  for (const v of await p.locator('#sf-0-0-f option').evaluateAll(o => o.filter(x => x.value && !x.disabled).map(x => x.value))) {
    await p.selectOption('#sf-0-0-f', v); await p.waitForTimeout(60);
    if (!(await p.locator('#sf-modal-fortsatt').isDisabled())) { forsta = v; break; }
  }
  ok('valet gjort: FORTSÄTT öppen', !(await p.locator('#sf-modal-fortsatt').isDisabled()));
  await p.click('#sf-modal-fortsatt'); await p.waitForTimeout(80);
  ok('FORTSÄTT stänger modalen, valet står kvar i steget', await p.locator('#sf-modal').count() === 0 && (await p.inputValue("#sf-0-0-f")) === forsta
    && !(await p.evaluate(() => document.body.classList.contains('dialog-oppen'))));
  const traff = await p.locator('.formagekort-knapp.markerad').count();
  ok('efter slaget: förmågan är markerad bland korten', traff === 1, String(traff));
  ok('efter slaget: rutan för att avstå är borta', await p.locator('#sf-avsta').count() === 0);
  ok('inga konsolfel (en tabell)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- Flera tabeller: grundreglerna, en påhittad tabell och en som rollpersonen inte har tillgång till
  const route = async (r) => {
    const svar = await r.fetch(); const grund = await svar.json();
    const rad = (slag, namn) => ({ slag, namn, effekt: `Effekt för ${namn}.`, sida: 1 });
    await r.fulfill({ response: svar, json: { tabeller: [
      { id: 'grund', namn: 'Grundreglerna', tarning: '2T20', sida: '30–32', rader: grund },
      { id: 'test', namn: 'Testtabell', tarning: '1T20', sida: '1', rader: [rad([1, 10], 'Testförmåga A'), rad([11, 20], 'Testförmåga B'), rad([21, null], 'Testförmåga C')] },
      { id: 'dold', namn: 'Dold tabell', tarning: '1T20', sida: '1', kraver: { expansion: 'finns-inte' }, rader: [rad([1, null], 'Dold förmåga')] },
    ] } });
  };
  p = await ny(route);
  const flikar = await p.locator('#sf-flikar [role=tab]').allTextContents();
  ok('flikar för tabellerna rollpersonen har', JSON.stringify(flikar) === '["Grundreglerna","Testtabell"]', JSON.stringify(flikar));
  const alt = await p.locator('#sf-tabell option').allTextContents();
  ok('rullgardin bredvid tärningsrutan', JSON.stringify(alt) === '["Grundreglerna (2T20)","Testtabell (1T20)"]'
    && await p.evaluate(() => document.querySelector('#sf-tabell').closest('.rad') === document.querySelector('#sf-sla').closest('.rad')), JSON.stringify(alt));
  await p.locator('#sf-flikar [data-tabell=test]').click(); await p.waitForTimeout(80);
  ok('flik: visar den andra tabellens kort', await p.locator('.formagekort-knapp').count() === 3 && (await p.inputValue('#sf-tabell')) === 'grund');
  if (BILD) await p.screenshot({ path: `${BILD}/flikar.png` });
  await p.locator('#sf-flikar [data-tabell=grund]').click(); await p.waitForTimeout(80);
  await p.selectOption('#sf-tabell', 'test'); await p.waitForTimeout(80);
  ok('val av tabell byter tärning och flik', (await p.locator('#sf-sla').textContent()).includes('1T20+5') && await p.locator('.formagekort-knapp').count() === 3);
  await p.click('#sf-sla'); await p.waitForTimeout(450);
  ok('modalen visar förmågan från den valda tabellen', /Testförmåga [ABC]/.test(await p.locator('#sf-modal-namn').textContent()) && (await p.locator('#sf-modal .eyebrow').textContent()).includes('Testtabell'));
  ok('förmåga utan val: FORTSÄTT öppen direkt', !(await p.locator('#sf-modal-fortsatt').isDisabled()));
  await p.click('#sf-modal-fortsatt'); await p.waitForTimeout(80);
  const namn = await p.locator('.formagekort-knapp.markerad').getAttribute('data-namn').catch(() => null);
  ok('slaget görs på den valda tabellen', ['Testförmåga A', 'Testförmåga B', 'Testförmåga C'].includes(namn) && (await p.locator('.resultat').textContent()).includes(namn), String(namn));
  ok('efter slaget: tabellen låst', await p.locator('select#sf-tabell').count() === 0 && (await p.inputValue('#sf-tabell')) === 'Testtabell');
  ok('en ensam T20 visas', await p.locator('#sf-slag svg.sida').count() === 1);
  ok('inga konsolfel (flera tabeller)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  console.log(res.join('\n'));
  console.log(res.every(r => r.startsWith('PASS')) ? 'Alla PASS' : 'NÅGOT FALLERADE');
  await b.close();
})();
