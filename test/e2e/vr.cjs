// Vapen & rustningar i Chronopia: bokvalet i steg 0, erfarenhetsnivåerna, de nya raserna, flera särskilda förmågor,
// V&R:s förmågetabell och hjältepoäng (RB-001, RB-003, RB-005, RB-006, RB-008).
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
  const bpKvar = (p) => p.locator('.steg-potter dd').first().textContent();
  const nastaSparrad = (p) => p.locator('.steg-fot .primar').evaluate(x => x.disabled || x.classList.contains('sparrad') || x.getAttribute('aria-disabled') === 'true');
  const notis = (p) => p.locator('#notis').textContent();

  // ---- Steg 0 och 1: bokvalet, nivåerna och raserna
  let p = await ny();
  ok('utan V&R: ingen nivåväljare', await p.locator('#nivaval').count() === 0);
  await p.click('#nasta-steg'); await p.waitForSelector('.raskort');
  ok('utan V&R: grundreglernas tolv raser', await p.locator('.raskort').count() === 12);
  await p.click('.steg-knapp >> nth=0'); await p.waitForSelector('.bokgrupper');
  await p.check('[data-bok=vr]'); await p.waitForTimeout(80);
  const nivaer = await p.locator('#nivaval .bokrad').allTextContents();
  ok('med V&R: krigare, veteran och hjälte', nivaer.length === 3 && /Krigare.*125 BP · 1 särskild förmåga/.test(nivaer[0]) && /Veteran.*150 BP · 2 särskilda förmågor/.test(nivaer[1]) && /Hjälte.*175 BP · 3/.test(nivaer[2]), nivaer.join(' | '));
  ok('krigare är förvald: 125 BP', await p.isChecked('[data-niva="0"]') && (await bpKvar(p)) === '125');
  await p.check('[data-niva="1"]'); await p.waitForTimeout(80);
  ok('veteran: 150 BP', (await bpKvar(p)) === '150');
  await p.uncheck('[data-bok=vr]'); await p.waitForTimeout(80);
  ok('V&R bortvald: tillbaka till 125 BP och ingen nivåväljare', (await bpKvar(p)) === '125' && await p.locator('#nivaval').count() === 0);
  await p.check('[data-bok=vr]'); await p.check('[data-niva="1"]'); await p.waitForTimeout(80);
  await p.click('#nasta-steg'); await p.waitForSelector('.raskort');
  const raser = await p.locator('.raskort').allTextContents();
  ok('med V&R: femton raser i bokstavsordning', raser.length === 15 && ['Latracier', 'Mulvak', 'Sabran'].every(r => raser.includes(r))
    && JSON.stringify(raser) === JSON.stringify([...raser].sort((a, c) => a.localeCompare(c, 'sv'))), raser.join(','));
  await p.click('.raskort:has-text("Latracier")'); await p.waitForTimeout(100);
  const info = await p.locator('.valinfo').textContent();
  ok('Latracier: 30 BP, STO 10–20 och sidhänvisning till V&R', info.includes('30') && info.includes('STY +2 · FYS +3 · SMI +1') && info.includes('10–20 (normalt 15)') && info.includes('Vapen & rustningar i Chronopia s. 3'), info);
  ok('Latracier talar högländska', (await p.locator('.rutor').first().textContent()).includes('Talar: Högländska'));
  await p.click('.steg-knapp >> nth=0'); await p.waitForTimeout(80);
  ok('böcker och nivå låses när skapandet har börjat', await p.locator('[data-bok]:not([disabled])').count() === 0 && await p.locator('[data-niva]:not([disabled])').count() === 0);
  const sparad = await p.evaluate(() => JSON.parse(localStorage.getItem('chronopia-rollperson-v2')).rp);
  ok('böckerna och nivån sparas i rollpersonen', JSON.stringify(sparad.bocker) === '["grund","vr"]' && sparad.niva === 1, JSON.stringify([sparad.bocker, sparad.niva]));
  ok('inga konsolfel (steg 0–1)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- Testrollpersonen på hjältenivån: tre förmågor och hjältepoäng
  p = await ny(true);
  await p.click('#menyknapp'); await p.selectOption('#dev-lage', 'formagor'); await p.click('#dev-vr-hjalte'); await p.waitForTimeout(300);
  ok('testrollpersonen byggs enligt receptet', (await notis(p)) === 'Zahra Ökenvind är inläst.', await notis(p));
  const platser = await p.locator('#sf-platser [data-plats]').allTextContents();
  ok('tre slag med sina förmågor', JSON.stringify(platser) === '["Förmåga 1: Hjälte","Förmåga 2: Blodshämnd","Förmåga 3: Vapenvan"]', JSON.stringify(platser));
  ok('hjältepoäng: 33, 13 kvar', (await p.locator('#hjaltepoang').textContent()).includes('33 hjältepoäng. 13 är kvar'));
  const smi = async () => Number(await p.locator('.formular .gv').nth(2).textContent().catch(() => 'NaN'));
  await p.click('#hp-STY-upp'); await p.waitForTimeout(80);
  ok('5 HP höjer STY ett poäng', (await p.locator('#hp-STY').textContent()) === '+1' && (await p.locator('#hjaltepoang').textContent()).includes('8 är kvar'));
  await p.click('#hp-STY-upp'); await p.waitForTimeout(80);
  ok('för få HP kvar: knapparna spärras', await p.locator('#hp-KAR-upp').isDisabled() && (await p.locator('#hjaltepoang').textContent()).includes('3 är kvar'));
  ok('STO kan inte köpas', await p.locator('#hp-STO-upp').count() === 0);
  await p.click('#hp-STY-ner'); await p.click('#hp-STY-ner'); await p.waitForTimeout(80);
  ok('köpen går att ångra', (await p.locator('#hp-STY').textContent()) === '0' && (await p.locator('#hjaltepoang').textContent()).includes('13 är kvar'));

  // Slag 2: lås upp, för många BP på V&R:s tabell, och Vapenmästare med ett val i modalen
  await p.click('[data-plats="1"]'); await p.waitForTimeout(80);
  ok('slag 2 visas med sina egna fält', (await p.inputValue('#sf2-bp')) === '5' && (await p.inputValue('#sf2-tabell')) === 'Vapen & rustningar');
  await p.click('#sf2-las-upp'); await p.waitForTimeout(80);
  ok('tabellval per slag: V&R högst 20 BP', (await p.locator('#sf2-tabell option').allTextContents()).join('|') === 'Grundreglerna (2T20, högst 40 BP)|Vapen & rustningar (1T20, högst 20 BP)');
  await p.fill('#sf2-bp', '25'); await p.press('#sf2-bp', 'Tab'); await p.waitForTimeout(80);
  ok('25 BP på V&R:s tabell går inte', (await p.inputValue('#sf2-bp')) === '5' && (await notis(p)).includes('Högst 20 BP per slag'), await notis(p));
  // Alla EP är spenderade, så slaget görs med samma 5 BP som förut
  await p.fill('#sf2-bp', '5'); await p.press('#sf2-bp', 'Tab'); await p.waitForTimeout(80);
  await p.evaluate(() => { Math.random = () => 0.75; });
  await p.click('#sf2-sla'); await p.waitForTimeout(450);
  ok('16 + 5 = 21: Vapenmästare i modalen', (await p.locator('#sf-modal-namn').textContent()) === 'Vapenmästare' && (await p.locator('#sf-modal .eyebrow').textContent()).includes('Särskild förmåga 2'));
  ok('FORTSÄTT spärrad tills vapnet är valt', await p.locator('#sf-modal-fortsatt').isDisabled());
  const vapen = await p.locator('#sf-modal select').first().evaluate(s => [...s.options].filter(o => o.value && !o.disabled).map(o => o.value));
  await p.locator('#sf-modal select').first().selectOption(vapen.find(v => v.includes('Långsvärd')) ?? vapen[0]); await p.waitForTimeout(80);
  ok('vapnet valt: FORTSÄTT öppen', !(await p.locator('#sf-modal-fortsatt').isDisabled()));
  await p.click('#sf-modal-fortsatt'); await p.waitForTimeout(80);
  ok('Vapenmästare står i rollformuläret', (await p.locator('#formular').textContent()).includes('Vapenmästare'));

  // Slag 3: ett slag utan BP måste avstås uttryckligen
  await p.click('[data-plats="2"]'); await p.waitForTimeout(80);
  await p.click('#sf3-las-upp'); await p.waitForTimeout(80);
  await p.fill('#sf3-bp', '0'); await p.press('#sf3-bp', 'Tab'); await p.waitForTimeout(80);
  ok('slag 3 utan BP spärrar Nästa', await nastaSparrad(p) && (await p.locator('#arbetsyta .saknaslista').textContent()).includes('särskild förmåga 3'));
  await p.check('#sf3-avsta'); await p.waitForTimeout(80);
  ok('avstått slag 3: Nästa öppen', !(await nastaSparrad(p)) && (await p.locator('#sf-platser [data-plats="2"]').textContent()) === 'Förmåga 3: avstår');

  ok('inga konsolfel (förmågorna)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- En ny veteran: två slag, V&R:s tabell och hjältepoängen som slås i modalen. Autofyll tar rollpersonen till steg 7.
  p = await ny(true);
  await p.evaluate(() => localStorage.setItem('chronopia-dev-autofyll', 'ja')); await p.reload(); await p.click('#start-skapa'); await p.waitForSelector('.bokgrupper');
  await p.check('[data-bok=vr]'); await p.check('[data-niva="1"]'); await p.waitForTimeout(80);
  await p.click('#nasta-steg'); await p.waitForSelector('.raskort'); await p.click('.raskort:has-text("Mulvak")'); await p.waitForTimeout(150);
  for (let i = 0; i < 10 && (await p.locator('.steg-huvud h2').textContent()) !== 'Särskilda förmågor'; i++) {
    if ((await p.locator('.steg-huvud h2').textContent()) === 'Yrke') { await p.click('[data-yrke="krigare"]'); await p.waitForTimeout(150); }
    await p.waitForTimeout(150); await p.click('#nasta-steg'); await p.waitForTimeout(150);
  }
  await p.click('#pl-autofyll'); await p.waitForTimeout(80); // autofyll av, så att slagen görs här
  ok('veteranen: två slag', JSON.stringify(await p.locator('#sf-platser [data-plats]').allTextContents()) === '["Förmåga 1: avstår","Förmåga 2: avstår"]',
    JSON.stringify(await p.locator('#sf-platser [data-plats]').allTextContents()));
  await p.selectOption('#sf-tabell', 'vr'); await p.waitForTimeout(80);
  await p.fill('#sf-bp', '20'); await p.press('#sf-bp', 'Tab'); await p.waitForTimeout(80);
  ok('V&R:s tabell: 1T20 och 30 kort', (await p.locator('#sf-sla').textContent()).includes('1T20+20') && await p.locator('#sf-kort-vr .formagekort-knapp').count() === 30);
  await p.evaluate(() => { Math.random = () => 0.7; });
  await p.click('#sf-sla'); await p.waitForTimeout(450);
  ok('15 + 20 = 35: Hjälte', (await p.locator('#sf-modal-namn').textContent()) === 'Hjälte');
  ok('hjältepoängen ska slås: FORTSÄTT spärrad', await p.locator('#sf-hp-0-sla').count() === 1 && await p.locator('#sf-modal-fortsatt').isDisabled());
  await p.click('#sf-hp-0-sla'); await p.waitForTimeout(450);
  ok('3T20 = 45 hjältepoäng, visas som tre T20', (await p.locator('#sf-modal').textContent()).includes('45 hjältepoäng') && await p.locator('#sf-hp-0-slag svg.sida').count() === 3);
  await p.click('#sf-modal-fortsatt'); await p.waitForTimeout(80);
  ok('45 hjältepoäng att använda', (await p.locator('#hjaltepoang').textContent()).includes('45 hjältepoäng. 45 är kvar'));
  await p.click('#hp-STY-upp'); await p.click('#hp-STY-upp'); await p.waitForTimeout(80);
  ok('10 HP: STY +2', (await p.locator('#hp-STY').textContent()) === '+2' && (await p.locator('#hjaltepoang').textContent()).includes('35 är kvar'));
  ok('slag 2 avstått av autofyll: Nästa öppen', !(await nastaSparrad(p)) && (await p.locator('#sf-platser [data-plats="1"]').textContent()) === 'Förmåga 2: avstår');
  ok('inga konsolfel (veteranen)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- Rollformuläret: alla förmågor och de hjältepoäng som blev över
  p = await ny(true);
  await p.click('#menyknapp'); await p.selectOption('#dev-lage', 'formular'); await p.click('#dev-vr-hjalte'); await p.waitForTimeout(400);
  const rf = await p.locator('.rf-formagor').textContent();
  ok('formuläret har alla tre förmågorna', ['Hjälte', 'Blodshämnd', 'Vapenvan'].every(n => rf.includes(n)), rf.slice(0, 200));
  ok('formuläret har 13 hjältepoäng', (await p.inputValue('[aria-label="Hjältepoäng"]')) === '13');
  ok('inga konsolfel (formuläret)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- En rollperson med bara grundreglerna har en förmåga som förut
  p = await ny(true);
  await p.click('#menyknapp'); await p.selectOption('#dev-lage', 'formagor'); await p.click('#dev-krigare'); await p.waitForTimeout(300);
  ok('grundreglerna: ett slag, ingen tabellväljare och inga hjältepoäng', await p.locator('#sf-platser').count() === 0 && await p.locator('#sf-tabell').count() === 0 && await p.locator('#hjaltepoang').count() === 0);
  await p.close();

  } catch (e) { ok('testet kördes klart', false, e.message.split('\n')[0]); }
  console.log(res.join('\n'));
  await b.close();
})();
