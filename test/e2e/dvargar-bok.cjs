// Dvärgar i Chronopia: bokvalet och nivåerna, steget Klan med klanförmågan, dvärgyrkena (Präst bara för Mindir),
// Atums väg i besvärjelsesteget, bärsärkens tatueringar och rollformuläret (RB-001, RB-014, RB-021).
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
  const stegNamn = (p) => p.locator('#steg .steg-namn').allTextContents();

  // ---- Steg 0: bokvalet (Dvärgar kräver V&R) och nivåerna
  let p = await ny();
  await p.check('[data-bok=dvargar]'); await p.waitForTimeout(80);
  ok('Dvärgar bockar i V&R', await p.locator('[data-bok=vr]').isChecked());
  const nivaer = await p.locator('#nivaval .bokrad').allTextContents();
  ok('nivåerna dvärg, veteran och hjälte', nivaer.length === 3 && /Dvärg.*125 BP/.test(nivaer[0]) && /Veteran.*150 BP/.test(nivaer[1]) && /Hjälte.*175 BP/.test(nivaer[2]), nivaer.join(' | '));
  await p.click('#nasta-steg'); await p.waitForSelector('.raskort');
  ok('utan ras: inget steg Klan', !(await stegNamn(p)).includes('Klan'));
  await p.click('.raskort:has-text("Dvärg")'); await p.waitForTimeout(80);
  ok('dvärg: steget Klan efter Ras', (await stegNamn(p))[2] === 'Klan', (await stegNamn(p)).join(','));
  // Hantverket som dvärgen har som primär färdighet
  await p.selectOption('#rasval-hantverk', 'Smide'); await p.waitForTimeout(80);
  await p.click('#nasta-steg'); await p.waitForTimeout(150);
  ok('steg 2 är Klan med klantabellen', /Klan/.test(await p.locator('h2').first().textContent()) && (await p.locator('.steg-innehall table').first().textContent()).includes('Mindir'));
  ok('Nästa är spärrad innan klanen är vald', /sparrad/.test(await p.locator('#nasta-steg').getAttribute('class')) || await p.locator('#nasta-steg').isDisabled());
  ok('saknaslistan nämner klanen', (await p.locator('.steg-innehall + .saknaslista').textContent()).includes('Klan'));
  await p.selectOption('#klan-val', 'mindir'); await p.waitForTimeout(100);
  ok('klan Mindir vald', (await p.locator('#klan-namn').textContent()).includes('Mindir'));
  await p.click('#klanformaga-sla'); await p.waitForTimeout(700);
  const kf = await p.locator('#klanformaga').textContent();
  ok('klanförmågan är slagen', /Ingenting särskilt|Prästbakgrund|Krigarbakgrund|Fanatiker|Magikerbakgrund/.test(kf), kf);
  // Krigarbakgrund kräver ett val: välj det första som går
  if (await p.locator('#klan-0-f').count()) { await p.selectOption('#klan-0-f', 'avvapna'); await p.waitForTimeout(100); }
  ok('klanen går inte att byta efter slaget', await p.locator('#klan-byt').count() === 0);
  await p.click('#nasta-steg'); await p.waitForSelector('#alder');
  await p.click('.steg-innehall button:has-text("Enkel metod")'); await p.waitForTimeout(100);
  await p.click('#nasta-steg'); await p.waitForSelector('.yrkeskort');
  const dvYrken = ['advokat', 'agent', 'argolisbroder', 'barsark', 'fiskare', 'gravare', 'ingenjor', 'klankrigare', 'medicus', 'portvaktare', 'prast', 'stubbgardist', 'svinryttare', 'vardshusvard', 'alderman'];
  const finns = await Promise.all(dvYrken.map((y) => p.locator(`[data-yrke=${y}]`).count()));
  ok('de femton dvärgyrkena går att välja, Präst med', finns.every((n) => n === 1), JSON.stringify(finns));
  await p.click('[data-yrke=prast]'); await p.waitForTimeout(100);
  ok('Präst: bara för dvärgar i klan Mindir', /Bara för Dvärg, i klan Mindir/.test(await p.locator('.valinfo').textContent()));
  await p.click('#nasta-steg'); await p.waitForTimeout(150);
  ok('steg 4: Atums väg utan magiförmågeslag', /Atums väg \(prästmagi\)/.test(await p.locator('.yrkeslista').textContent()) && /inget magiförmågeslag/.test(await p.locator('.yrkeslista').textContent()));
  // Tillbaka till klanen: byter dvärgen klan går Präst inte längre
  ok('inga konsolfel (manuellt flöde)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- En dvärg i en annan klan som väljer Präst byter till Mindir och slår klanförmågan på nytt
  p = await ny();
  await p.check('[data-bok=dvargar]'); await p.click('#nasta-steg'); await p.waitForSelector('.raskort');
  await p.click('.raskort:has-text("Dvärg")'); await p.selectOption('#rasval-hantverk', 'Smide'); await p.waitForTimeout(80);
  await p.click('#nasta-steg'); await p.waitForTimeout(150);
  await p.selectOption('#klan-val', 'zodan'); await p.waitForTimeout(100);
  await p.click('#klanformaga-sla'); await p.waitForTimeout(700);
  if (await p.locator('#klan-0-f').count()) { await p.selectOption('#klan-0-f', 'avvapna'); await p.waitForTimeout(100); }
  await p.click('#nasta-steg'); await p.waitForSelector('#alder');
  await p.click('.steg-innehall button:has-text("Enkel metod")'); await p.waitForTimeout(100);
  await p.click('#nasta-steg'); await p.waitForSelector('.yrkeskort');
  ok('Präst syns för en dvärg i Zodan, med klankravet', /Kräver klan Mindir/.test(await p.locator('[data-yrke=prast]').textContent()));
  const rp = () => p.evaluate(() => JSON.parse(localStorage.getItem('chronopia-rollperson-v2')).rp);
  // Nej på frågan: ingenting ändras och yrkeslistan står kvar
  await p.click('[data-yrke=prast]'); await p.waitForTimeout(150);
  ok('frågan visas i en dialog', await p.locator('#klanbyte-modal').isVisible());
  await p.click('#klanbyte-nej'); await p.waitForTimeout(150);
  ok('nej stänger dialogen', await p.locator('#klanbyte-modal').count() === 0);
  const kvar = await rp();
  ok('nej: klan och yrke oförändrade', kvar.klan.id === 'zodan' && kvar.yrke === '' && /Yrke/.test(await p.locator('h2').first().textContent()), `${kvar.klan.id} ${kvar.yrke}`);
  // Ja: klanen byts till Mindir, klanförmågan slås om och appen stannar i yrkessteget
  await p.click('[data-yrke=prast]'); await p.waitForTimeout(150);
  const fraga = await p.locator('#klanbyte-modal').textContent();
  await p.click('#klanbyte-ja'); await p.waitForTimeout(200);
  if (await p.locator('#klanbyte-klar').count()) { // Krigarbakgrund: valet görs i dialogen
    ok('Fortsätt är spärrad innan valet', await p.locator('#klanbyte-klar').isDisabled());
    await p.selectOption('#klanbyte-0-f', 'avvapna'); await p.waitForTimeout(100);
    await p.click('#klanbyte-klar'); await p.waitForTimeout(200);
  }
  ok('frågar innan klanen byts', /Präst kräver klan Mindir.*Zodan.*Byt till Mindir/.test(fraga), fraga);
  ok('appen stannar i yrkessteget med Präst vald', /Yrke/.test(await p.locator('h2').first().textContent()) && await p.locator('[data-yrke=prast][aria-pressed=true]').count() === 1, (await p.locator('h2').first().textContent()) + ' ' + await notis(p));
  ok('notisen: klanen är Mindir med en ny klanförmåga', /Klanen är nu Mindir\. Nya klanförmågan:/.test(await notis(p)), await notis(p));
  const ja = await rp();
  ok('klanförmågan är omslagen', ja.klan.id === 'mindir' && ja.klan.formagaSlag >= 1 && ja.klan.formagaSlag <= 10 && ja.yrke === 'prast', JSON.stringify(ja.klan));
  ok('inga konsolfel (klanbyte)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- En människa får varken klan eller dvärgyrken
  p = await ny();
  await p.check('[data-bok=dvargar]'); await p.click('#nasta-steg'); await p.waitForSelector('.raskort');
  await p.click('.raskort:has-text("Människa")'); await p.waitForTimeout(80);
  ok('människa: inget steg Klan', !(await stegNamn(p)).includes('Klan'));
  await p.click('#nasta-steg'); await p.waitForSelector('#alder');
  await p.click('.steg-innehall button:has-text("Enkel metod")'); await p.waitForTimeout(100);
  await p.click('#nasta-steg'); await p.waitForSelector('.yrkeskort');
  ok('människa: inga dvärgyrken', await p.locator('[data-yrke=ingenjor]').count() === 0);
  await p.close();

  // ---- Prästen: klan Mindir, Atums väg och besvärjelserna
  p = await ny(true);
  await ladda(p, 'dvarg-prast', 'besvarjelser');
  ok('prästen byggs enligt receptet', (await notis(p)) === 'Thrain Atumsord är inläst.', await notis(p));
  const besv = await p.locator('.steg-innehall').textContent();
  ok('besvärjelsesteget visar Atums väg', besv.includes('Atums välsignelse') && besv.includes('Himmelsk eld'), besv.slice(0, 200));
  await ladda(p, 'dvarg-prast', 'klan');
  ok('klanen: Mindir med Magikerbakgrund', (await p.locator('#klanformaga').textContent()).includes('Magikerbakgrund'));
  await p.click('#menyknapp'); await p.click('#visa-formular'); await p.waitForTimeout(300);
  const rf = await p.locator('#rf-vy').textContent();
  ok('rollformuläret: ras med klan och klanförmågan', rf.includes('Dvärg (Mindir)') && rf.includes('Magikerbakgrund (klan Mindir)'), rf.slice(0, 200));
  ok('inga konsolfel (präst)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- Bärsärken: två tatueringar som veteran, och en till från förmågan Bärsärk
  p = await ny(true);
  await ladda(p, 'dvarg-barsark', 'extra');
  ok('bärsärken byggs enligt receptet', (await notis(p)) === 'Grimvar Lothansson är inläst.', await notis(p));
  ok('två tatueringar valda, taket nått', await p.locator('#tatueringar input:checked').count() === 2 && await p.locator('#tatuering-rus').isDisabled());
  await p.uncheck('#tatuering-fjallhud'); await p.waitForTimeout(100);
  ok('en tatuering går att byta', await p.locator('#tatuering-rus').isEnabled());
  await p.check('#tatuering-rus'); await p.waitForTimeout(100);
  await p.click('#menyknapp'); await p.click('#visa-formular'); await p.waitForTimeout(300);
  const rfB = await p.locator('#rf-vy').textContent();
  ok('rollformuläret: tre tatueringar och Smärttålig', rfB.includes('Tatuering: Lothans märke') && rfB.includes('Tatuering: Rus') && rfB.includes('Tatuering: Hjälpare') && rfB.includes('Smärttålig'), rfB.slice(0, 300));
  ok('inga konsolfel (bärsärk)', !p.errs.length, p.errs.join(' | '));
  await p.close();
  } catch (e) { ok('skriptet kraschade inte', false, e.message); }
  await b.close();
  console.log(res.join('\n'));
})();
