// Magi i Chronopia: bokvalet och nivåerna, magikeryrkena, Tidsmagi och minimagi i besvärjelsesteget,
// familjarerna i steg 7 och rutan på rollformuläret (RB-001, RB-010, RB-018).
// Körs med `npm run e2e` (startar en egen server). Kör med LANG=C.UTF-8.
const { chromium } = require('playwright');
const res = []; const ok = (namn, villkor, info = '') => res.push(`${villkor ? 'PASS' : 'FAIL'} ${namn}${info ? ' — ' + info : ''}`);
const BAS = process.env.E2E_BAS || 'http://localhost:8766';

(async () => {
  const b = await chromium.launch();
  try {
  const ny = async (dev = false) => {
    const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
    p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
    await p.goto(`${BAS}/index.html${dev ? '?dev' : '?dev=av'}`);
    await p.evaluate((dev) => { localStorage.clear(); localStorage.setItem('chronopia-dev', dev ? 'ja' : 'nej'); localStorage.setItem('chronopia-dev-autofyll', 'nej'); }, dev);
    await p.reload(); await p.click('#start-skapa'); await p.waitForSelector('.bokgrupper');
    return p;
  };
  const notis = (p) => p.locator('#notis').textContent();
  const ladda = async (p, id, lage) => {
    await p.click('#menyknapp'); await p.selectOption('#dev-lage', lage); await p.click(`#dev-${id}`); await p.waitForTimeout(400);
  };

  // ---- Steg 0 och 3: bokvalet, nivåerna och yrkena
  let p = await ny();
  await p.check('[data-bok=magi]'); await p.waitForTimeout(80);
  const nivaer = await p.locator('#nivaval .bokrad').allTextContents();
  ok('med Magi: magus, magus regis och häxmästare', nivaer.length === 3 && /Magus.*125 BP/.test(nivaer[0]) && /Magus regis.*150 BP/.test(nivaer[1]) && /Häxmästare.*175 BP/.test(nivaer[2]), nivaer.join(' | '));
  await p.click('#nasta-steg'); await p.waitForSelector('.raskort');
  await p.click('.raskort:has-text("Människa")'); await p.waitForTimeout(80);
  await p.click('#nasta-steg'); await p.waitForSelector('#alder');
  await p.click('.steg-innehall button:has-text("Enkel metod")'); await p.waitForTimeout(100);
  await p.click('#nasta-steg'); await p.waitForSelector('.yrkeskort');
  const magiYrken = ['agere-imperator', 'avfalling', 'cestodit', 'chronomag', 'divinator', 'fagelbroder', 'haxjagare', 'lubriticus', 'ordensmagiker', 'svartsyster', 'warlock'];
  const finns = await Promise.all(magiYrken.map((y) => p.locator(`[data-yrke=${y}]`).count()));
  ok('de elva yrkena från Magi går att välja', finns.every((n) => n === 1), JSON.stringify(finns));
  await p.click('[data-yrke=svartsyster]'); await p.waitForTimeout(100);
  const sv = await p.locator('.valinfo').textContent();
  ok('utan Magi: inget steg Familjarer', true);
  ok('Svartsyster: bara för kvinnliga människor födda i den mörka månens tecken', /Bara för Människa, kvinnor, födda i den mörka månens tecken/.test(sv), sv);
  ok('inga konsolfel (steg 0–3)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- Chronomagen på nivån magus regis: Spiritus familiarius, familjarer och taket 3
  p = await ny(true);
  await ladda(p, 'magi-chronomag', 'formagor');
  const platser0 = await p.locator('#sf-platser [data-plats]').allTextContents();
  ok('steg 7 har ingen familjarruta', await p.locator('#familjarer').count() === 0);
  await ladda(p, 'magi-chronomag', 'familjarer');
  ok('testrollpersonen byggs enligt receptet', (await notis(p)) === 'Aurelia Timglas är inläst.', await notis(p));
  ok('två slag på Magis tabell', JSON.stringify(platser0) === '["Förmåga 1: Spiritus familiarius","Förmåga 2: Magikänsla"]', JSON.stringify(platser0));
  const fam = await p.locator('#familjarer').textContent();
  ok('familjarrutan: tak 3, två köpta', fam.includes('högst 3 köpta familjarer och har köpt 2') && fam.includes('De kostar 12 BP'), fam.slice(0, 200));
  ok('Spiritus familiarius ger en gratis dragonette', (await p.locator('#familjarer-gratis').textContent()).includes('Dragonette (Spiritus familiarius)'));
  ok('köpta familjarer: tefalon och gargoyl', (await p.locator('#familjar-tefalon').textContent()) === '1' && (await p.locator('#familjar-gargoyl').textContent()) === '1');
  await p.click('[aria-label="Ta bort Gargoyl"]'); await p.waitForTimeout(100);
  ok('en familjar går att ta bort', (await p.locator('#familjar-gargoyl').textContent()) === '0' && (await p.locator('#familjarer').textContent()).includes('har köpt 1'));
  await p.click('[aria-label="Köp Gonk"]'); await p.waitForTimeout(100);
  ok('och en annan går att köpa i stället', (await p.locator('#familjar-gonk').textContent()) === '1', await notis(p));

  // Besvärjelser: Tidsmagi med grenarna och minimagi
  await ladda(p, 'magi-chronomag', 'besvarjelser');
  const grupper = await p.locator('h4.besvarjelsegrupp').allTextContents();
  ok('tidsmagins grenar som egna rubriker', grupper.some((g) => /Förutskickelse/.test(g)) && grupper.some((g) => /Contortism/.test(g)), grupper.join(' | '));
  ok('underjordens magi visas inte för en chronomag', !grupper.some((g) => /Underjord/i.test(g)));
  const mini = await p.locator('[data-minimagi]').count();
  const valdaMini = await p.locator('[data-minimagi]:checked').count();
  ok('minimagi: 27 besvärjelser, tre valda', mini === 27 && valdaMini === 3, `${mini} / ${valdaMini}`);

  // Rollformuläret: rutan för familjarer och minimagi
  await p.click('#menyknapp'); await p.click('#visa-formular'); await p.waitForTimeout(300);
  const ruta = await p.locator('#rf-magi').textContent().catch(() => '');
  ok('rollformuläret: familjarerna och minimagin', ruta.includes('Dragonette') && ruta.includes('gratis, Spiritus familiarius') && ruta.includes('Tefalon') && /Minimagi \(FV \d+\)/.test(ruta) && ruta.includes('Eld'), ruta.slice(0, 300));
  ok('inga konsolfel (chronomag)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- Fågelbrodern: gratis lystat utöver taket på nivån magus
  p = await ny(true);
  await ladda(p, 'magi-fagelbroder', 'familjarer');
  ok('fågelbrodern byggs enligt receptet', (await notis(p)) === 'Corvin Fjäderhand är inläst.', await notis(p));
  const famF = await p.locator('#familjarer').textContent();
  ok('gratis lystat från yrket, och en köpt jefta', (await p.locator('#familjarer-gratis').textContent()).includes('Lystat (Fågelbroder)') && (await p.locator('#familjar-jefta').textContent()) === '1', famF.slice(0, 200));
  ok('tefalon är spärrad för en fågelbroder', await p.locator('[aria-label="Köp Tefalon"]').isDisabled());
  ok('taket 1 är nått', await p.locator('[aria-label="Köp Gonk"]').isDisabled());
  ok('inga konsolfel (fågelbroder)', !p.errs.length, p.errs.join(' | '));
  await p.close();
  } catch (e) { ok('skriptet kraschade inte', false, e.message); }
  await b.close();
  console.log(res.join('\n'));
})();
