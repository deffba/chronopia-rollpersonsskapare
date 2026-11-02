// Vapen & rustningar i Chronopia: de 15 yrkena (rasvillkor, +3 initiativ, startutrustning, gratis FV),
// de nya färdigheterna och Vapentekniker med svärdsskolornas stridskonster (V&R s. 4–16, 32–33; RB-004, RB-009, RB-011).
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
  const steg = (p, n) => p.click(`.steg-knapp >> nth=${n}`).then(() => p.waitForTimeout(120));
  // Från steg 1: välj rasen, åldern med enkel metod och gå till steg 3 (Yrke)
  const tillYrke = async (p, ras) => {
    if (ras) await p.click(`.raskort:has-text("${ras}")`);
    // Högländare och dvärgar väljer en primär vapenfärdighet eller ett hantverk i steg 1
    for (const id of ['#rasval-vapen', '#rasval-hantverk']) if (await p.locator(id).count()) await p.selectOption(id, await p.locator(`${id} option:not([disabled])`).nth(1).getAttribute('value'));
    await p.waitForTimeout(80);
    await p.click('#nasta-steg'); await p.waitForSelector('#alder');
    await p.click('.steg-innehall button:has-text("Enkel metod")'); await p.waitForTimeout(100);
    await p.click('#nasta-steg'); await p.waitForSelector('.yrkeskort');
  };

  // ---- Utan V&R: bara grundreglernas 16 yrken
  let p = await ny();
  await p.click('#nasta-steg'); await p.waitForSelector('.raskort');
  await tillYrke(p, 'Människa');
  ok('utan V&R: 16 yrken', await p.locator('.yrkeskort').count() === 16);
  ok('utan V&R: inga V&R-yrken', await p.locator('[data-yrke=vapenmastare]').count() === 0);
  await p.close();

  // ---- Med V&R: 31 yrken i bokstavsordning, rasvillkor
  p = await ny();
  await p.check('[data-bok=vr]'); await p.click('#nasta-steg'); await p.waitForSelector('.raskort');
  await tillYrke(p, 'Människa');
  const yrken = await p.locator('.yrkeskort .valkort-namn').allTextContents();
  ok('med V&R: 31 yrken i bokstavsordning', yrken.length === 31
    && JSON.stringify(yrken) === JSON.stringify([...yrken].sort((a, c) => a.localeCompare(c, 'sv'))), yrken.length + ': ' + yrken.join(','));
  const sparrade = await p.locator('.yrkeskort.ej-valbar').evaluateAll((x) => x.map((k) => k.dataset.yrke).sort());
  ok('människa: sex yrken är spärrade av rasvillkor', JSON.stringify(sparrade) === JSON.stringify(['adling', 'ceriansk-ulv', 'hedersvakt', 'ordenskrigare', 'sabransk-okenriddare', 'svartgardist']), sparrade.join(','));
  ok('det spärrade kortet förklarar varför', (await p.locator('[data-yrke=hedersvakt]').textContent()).includes('Bara för Dvärg'));
  await p.click('[data-yrke=hedersvakt]', { force: true }); await p.waitForTimeout(80);
  ok('ett spärrat yrke går inte att välja', (await notis(p)).includes('Hedersvakt: bara för Dvärg') && await p.locator('.yrkeskort.valt').count() === 0, await notis(p));

  // Vapenmästare: +3 initiativ, startutrustning, gratis FV 10 i tre vapen
  await p.click('[data-yrke=vapenmastare]'); await p.waitForTimeout(100);
  const info = await p.locator('.valinfo').textContent();
  ok('Vapenmästare: yrkesförmåga med +3 på initiativet', info.includes('+3 på initiativet.'), info);
  ok('Vapenmästare: startutrustning och sidhänvisning till V&R', info.includes('Startutrustning') && info.includes('Sina vapen') && info.includes('Vapen & rustningar i Chronopia s. 12'));
  const punkter = await p.locator('.rutor .punkter').textContent();
  ok('Vapenmästare: tre vapen med FV 10 gratis', /Vapenfärdighet \(3\)i? – FV 10 gratis, som primära/.test(punkter) && punkter.includes('Vapentekniker (2)') && punkter.includes('Strid i mörker'), punkter);
  await p.click('#nasta-steg'); await p.waitForTimeout(120);
  ok('steg 4 förklarar de gratis FV', (await p.locator('.yrkeslista').textContent()).includes('FV 10 gratis, som primära (Vapen & rustningar i Chronopia s. 12)'));
  const forslag = await p.locator('datalist[id$="-skolor"] option').first().getAttribute('value').catch(() => null);
  ok('Vapentekniker: svärdsskolornas stridskonster föreslås', forslag === 'Klohanden', String(forslag));

  // Byter rasen till en som inte får yrket: yrket väljs bort
  await steg(p, 3); await p.click('[data-yrke=ordenskrigare]', { force: true }); await p.waitForTimeout(80);
  ok('högländare krävs för ordenskrigare', await p.locator('[data-yrke=ordenskrigare].valt').count() === 0);
  await steg(p, 1); await tillYrke(p, 'Högländare');
  await p.click('[data-yrke=ordenskrigare]'); await p.waitForTimeout(80);
  ok('högländare kan bli ordenskrigare', await p.locator('[data-yrke=ordenskrigare].valt').count() === 1);
  await steg(p, 1); await p.click('.raskort:has-text("Dvärg")'); await p.waitForTimeout(80);
  const efter = await p.evaluate(() => JSON.parse(localStorage.getItem('chronopia-rollperson-v2')).rp);
  ok('ny ras som inte får yrket: yrket väljs bort', efter.ras === 'dvarg' && efter.yrke === '', JSON.stringify([efter.ras, efter.yrke]));
  await tillYrke(p, null);
  ok('dvärg: Hedersvakt går att välja', await p.locator('[data-yrke=hedersvakt]:not(.ej-valbar)').count() === 1);
  ok('inga konsolfel (steg 3–4)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- Testrollpersonen: latraciansk svartgardist med Kejsarens hand
  p = await ny(true);
  await p.click('#menyknapp'); await p.selectOption('#dev-lage', 'fardigheter'); await p.click('#dev-vr-svartgardist'); await p.waitForTimeout(300);
  ok('testrollpersonen byggs enligt receptet', (await notis(p)) === 'Kael Nattvakt är inläst.', await notis(p));
  const skola = p.locator('.stridskonst[data-skola=svarta-gardet]');
  const skolText = await skola.textContent().catch(() => '');
  ok('Kejsarens hand: Svarta gardets stridsskola med sina sex tekniker', skolText.includes('Svarta gardets stridsskola') && ['Bryta vapen', 'Fint', 'Krafthugg', 'Låsning', 'Stålsättning', 'Stöt'].every((t) => skolText.includes(t)), skolText);
  ok('Kejsarens hand som yrkesfärdighet: 3 EP per FV', skolText.includes('3 EP per FV, som en vanlig yrkesfärdighet'));
  const tabell = await p.locator('.fardighetstabell').allTextContents();
  ok('Taktik är den valfria yrkesfärdigheten', tabell.join(' ').includes('Taktik'));

  // En egen stil av Vapentekniker som sekundär färdighet (Taktik sänks för att frigöra EP)
  await p.fill('[id="fv-taktik"]', '4'); await p.press('[id="fv-taktik"]', 'Tab'); await p.waitForTimeout(100);
  await p.selectOption('#ny-sek-f', 'vapentekniker'); await p.waitForTimeout(80);
  await p.fill('#ny-sek-d', 'Nattens stil'); await p.locator('#ny-sek-d').dispatchEvent('change'); await p.waitForTimeout(80);
  await p.click('button:has-text("Lägg till")'); await p.waitForTimeout(150);
  const egen = p.locator('.stridskonst:has(h3:has-text("Nattens stil"))');
  const egenText = await egen.textContent().catch(() => '');
  ok('egen stil: vapentekniker och obeväpnade tekniker att välja', egenText.includes('Vapentekniker (Vapen & rustningar s. 16)') && egenText.includes('Obeväpnade tekniker') && egenText.includes('Sabranskt dubbelhugg') && egenText.includes('Initiativbonus'), egenText.slice(0, 200));
  await egen.locator('label:has-text("Krafthugg") input').check(); await p.waitForTimeout(80);
  await egen.locator('label:has-text("Distrahera") input').check(); await p.waitForTimeout(80);
  ok('egen stil: 1 + 0,5 avrundat uppåt, inga +2', (await egen.locator('.summering').textContent()).includes('Grundkostnad 1,5, avrundat uppåt 2 EP per FV.'), await egen.locator('.summering').textContent());

  // Startutrustningen i steg 13 och på rollformuläret
  await p.click('#menyknapp'); await p.selectOption('#dev-lage', 'utrustning'); await p.click('#dev-vr-svartgardist'); await p.waitForTimeout(300);
  const utr = await p.locator('#startutrustning').textContent().catch(() => '');
  ok('steg 13: yrkets startutrustning', utr.includes('Metallring om fotleden') && utr.includes('Gratis'), utr);
  await p.click('#menyknapp'); await p.selectOption('#dev-lage', 'formular'); await p.click('#dev-vr-svartgardist'); await p.waitForTimeout(400);
  const rf = await p.locator('#rf-vy').textContent();
  ok('rollformuläret: startutrustning och yrkesförmåga med initiativ', rf.includes('Metallring om fotleden') && rf.includes('+3 på initiativet'));
  ok('inga konsolfel (testrollpersonen)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- Krigarmunk: två paketval (RB-016)
  p = await ny();
  await p.check('[data-bok=vr]'); await p.click('#nasta-steg'); await p.waitForSelector('.raskort');
  await tillYrke(p, 'Människa');
  await p.click('[data-yrke=krigarmunk]'); await p.waitForTimeout(100);
  const munk = await p.locator('.rutor .punkter').textContent();
  ok('krigarmunk: valen visas i steg 3', munk.includes('Lärdomsfärdigheter (2) eller Hantera fällor och Låsdyrkning') && munk.includes('Vapenfärdigheter (2) eller Två valfria färdigheter'), munk);
  await p.click('#nasta-steg'); await p.waitForTimeout(120);
  await p.click('#yrke-4 [data-varde="1"]'); await p.waitForTimeout(100);
  ok('krigarmunk: fällor och lås som paket', (await p.locator('.yrkeslista').textContent()).includes('Yrkesfärdigheter: Hantera fällor och Låsdyrkning.'));
  await p.click('#yrke-6 [data-varde="1"]'); await p.waitForTimeout(100);
  await p.selectOption('#yrke-6-v0-f', 'simma'); await p.waitForTimeout(80);
  await p.selectOption('#yrke-6-v1-f', 'akrobatik'); await p.waitForTimeout(80);
  const munkVal = (await p.evaluate(() => JSON.parse(localStorage.getItem('chronopia-rollperson-v2')).rp.yrkesval));
  ok('krigarmunk: två valfria färdigheter i stället för vapen', JSON.stringify(munkVal[4]) === '{"paket":1,"val":[]}' && JSON.stringify(munkVal[6]) === '{"paket":1,"val":["simma","akrobatik"]}', JSON.stringify(munkVal));
  await p.click('#yrke-6 [data-varde="0"]'); await p.waitForTimeout(100);
  ok('krigarmunk: byte till vapen ger två vapenval', await p.locator('#yrke-6-0').count() + await p.locator('#yrke-6-1').count() >= 2);
  ok('inga konsolfel (krigarmunk)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- Ädling: Heraldik med V&R är allmän eller för en grupp (RB-016)
  p = await ny();
  await p.check('[data-bok=vr]'); await p.click('#nasta-steg'); await p.waitForSelector('.raskort');
  await tillYrke(p, 'Ljusalv');
  await p.click('[data-yrke=adling]'); await p.waitForTimeout(100);
  await p.click('#nasta-steg'); await p.waitForTimeout(120);
  const grupper = await p.locator('#yrke-3-grupper option').evaluateAll((o) => o.map((x) => x.value));
  ok('ädling: heraldik föreslår allmän och grupper', grupper[0] === 'Allmän' && grupper.includes('Högländare') && grupper.includes('Gatugäng'), grupper.join());
  ok('ädling: hjälptext om fyra steg lägre', (await p.locator('.yrkeslista').textContent()).includes('B-nivån räknas fyra steg lägre'));
  await p.fill('#yrke-3', 'Allmän'); await p.dispatchEvent('#yrke-3', 'change'); await p.waitForTimeout(100);
  const adelVal = (await p.evaluate(() => JSON.parse(localStorage.getItem('chronopia-rollperson-v2')).rp.yrkesval));
  ok('ädling: allmän heraldik sparas', adelVal[3] === 'Allmän', JSON.stringify(adelVal));
  ok('inga konsolfel (ädling)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- Sabransk ökenriddare: magiskolan utan magiförmågeslag
  p = await ny();
  await p.check('[data-bok=vr]'); await p.click('#nasta-steg'); await p.waitForSelector('.raskort');
  await tillYrke(p, 'Sabran');
  await p.click('[data-yrke=sabransk-okenriddare]'); await p.waitForTimeout(100);
  const okenPunkter = await p.locator('.rutor .punkter').textContent();
  ok('ökenriddare: Hypnotisera FV 10 gratis', /Hypnotiserai? – FV 10 gratis, som primär/.test(okenPunkter), okenPunkter);
  await p.click('#nasta-steg'); await p.waitForTimeout(120);
  ok('ökenriddare: skolan högst FV 10, inget magiförmågeslag', (await p.locator('.yrkeslista').textContent()).includes('Högst FV 10 vid start, inget magiförmågeslag'));
  const sista = p.locator('#yrke-7'); // valet mellan de tre magiskolorna
  await sista.locator('[data-varde=mentalism]').click(); await p.waitForTimeout(100);
  const r = await p.evaluate(() => JSON.parse(localStorage.getItem('chronopia-rollperson-v2')).rp.yrkesval);
  ok('ökenriddare: mentalism vald som yrkesfärdighet', JSON.stringify(r).includes('mentalism'), JSON.stringify(r));
  ok('ökenriddare: inget magiförmågeslag behövs', !(await p.locator('#nasta-steg').textContent()).includes('MAGIFÖRMÅGESLAG') && !(await p.locator('#nasta-steg').textContent()).toLowerCase().includes('magiförmågeslag'));
  ok('inga konsolfel (ökenriddare)', !p.errs.length, p.errs.join(' | '));
  await p.close();
  } catch (e) { res.push(`FAIL körningen avbröts — ${e.message.split('\n').slice(0, 3).join(' ')}`); }
  await b.close();
  console.log(res.join('\n'));
})();
