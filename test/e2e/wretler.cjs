// Widunder och Wretler (wretler.js): knappen i steg 0, Knapadel, lånet, inget startpaket och skulden på rollformuläret.
// Kör: node wretler.cjs (körs med `npm run e2e`)
const { chromium } = require('playwright');
const res = []; const ok = (namn, villkor, info = '') => res.push(`${villkor ? 'PASS' : 'FAIL'} ${namn}${info ? ' — ' + info : ''}`);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const rubrik = () => p.locator('.steg-huvud h2').textContent();
  const rp = () => p.evaluate(() => JSON.parse(localStorage.getItem('chronopia-rollperson-v2')).rp);
  const alderKlar = async () => { if (await p.locator('#alder').count() && !(await p.inputValue('#alder'))) await p.click('.steg-innehall button:has-text("Enkel metod")'); };
  const nasta = async () => {
    await alderKlar();
    if (await p.locator('#sf-modal-fortsatt:not([disabled])').count()) await p.click('#sf-modal-fortsatt');
    await p.locator('.steg-fot .primar').click(); await p.waitForTimeout(250);
  };
  try {
    await p.goto((process.env.E2E_BAS || 'http://localhost:8766') + '/index.html?dev');
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('chronopia-dev', 'ja'); localStorage.setItem('chronopia-dev-autofyll', 'ja'); });
    await p.reload(); await p.waitForSelector('#start-skapa');
    ok('ingen Widunder och Wretler-knapp på startsidan', await p.locator('#start-vy').getByText('Wretler').count() === 0);
    await p.click('#start-skapa');

    // Steg 0: knappen
    const ww = p.locator('#wretler-knapp');
    ok('steg 0 har knappen', await ww.isVisible() && /^Widunder och Wretler/.test(await ww.textContent()) && (await ww.getAttribute('aria-pressed')) === 'false');
    ok('knappen har texten och bilden', /Väl mött! Skapa en rollperson enligt den gode Adams anvisningar och anmaningar\./.test(await ww.textContent())
      && await ww.locator('img.wretler-bild').evaluate(i => i.complete && i.naturalWidth > 0));
    await ww.click(); await p.waitForTimeout(200);
    ok('knappen går direkt till steg 1', (await rubrik()) === 'Ras', await rubrik());
    let r = await rp();
    ok('alla inlagda böcker', JSON.stringify(r.bocker) === '["grund","vr","magi","dvargar","alver"]', JSON.stringify(r.bocker));
    ok('lägsta nivån, Syn och hörsel och Detaljerad strid', r.niva === 0 && JSON.stringify(r.valfriaRegler) === '["syn-och-horsel","detaljerad-strid"]' && r.wretler === true);
    await p.click('.steg-knapp >> nth=0');
    ok('böcker, nivå och valfria regler är låsta', await p.locator('[data-bok]:not([disabled]), [data-niva]:not([disabled]), [data-regel]:not([disabled])').count() === 0);
    ok('ingen lista med husregler', !/husregl/i.test(await p.locator('.steg-innehall').first().textContent()));
    await ww.click(); await p.waitForTimeout(200);
    r = await rp();
    ok('ett nytt tryck slår av läget och stannar i steg 0', (await rubrik()) === 'Böcker' && r.wretler === false && JSON.stringify(r.bocker) === '["grund"]');
    await ww.click(); await p.waitForTimeout(200);

    // Genom stegen med autofyll, som krigare
    await p.locator('.raskort').first().click(); await p.waitForTimeout(150); await nasta();
    await nasta(); await p.click('[data-yrke="krigare"]'); await nasta();
    const sett = {};
    for (let i = 0; i < 20 && !sett.Utrustning; i++) {
      const h = await rubrik();
      sett[h] = await p.locator('.steg-innehall').first().textContent();
      if (h === 'Utrustning') break;
      await nasta();
    }
    ok('Socialt stånd: Knapadel och texten, utan slag', /Din rollperson har det sociala ståndet Knapadel\./.test(sett['Socialt stånd'] ?? '')
      && /Du må vara en ädling/.test(sett['Socialt stånd']) && !/2T6|Slå/.test(sett['Socialt stånd']), (sett['Socialt stånd'] ?? 'steget visades inte').slice(0, 120));
    ok('Startkapital: lånetexten, utan slag eller bonusar', /Senast har du lånat 5000 sm, av vilka en icke obetydlig del - kanske allt! -/.test(sett.Startkapital ?? '') && !/2T6|Tak för startkapital/.test(sett.Startkapital),
      (sett.Startkapital ?? 'steget visades inte').slice(0, 120));
    ok('Utrustning nådd', Boolean(sett.Utrustning));
    ok('inget startpaket', await p.locator('#startpaket').count() === 0);
    ok('startkapitalet är hela lånet', /5\s000 sm/.test(await p.locator('.steg-innehall').first().textContent()));
    r = await rp();
    ok('inga slag för stånd och kapital', r.socialtStand.slag === null && r.startkapital.slag === null);
    ok('låst efter ras: knappen visar läget', await p.click('.steg-knapp >> nth=0').then(() => ww.isDisabled()) && (await ww.getAttribute('aria-pressed')) === 'true');

    // Rollformuläret
    await p.click('#menyknapp'); await p.click('#visa-formular'); await p.waitForTimeout(300);
    const rf = await p.locator('#rf-vy').textContent();
    ok('skulden står på rollformuläret', /Skuld om 5000 sm/.test(rf));
    ok('Knapadel på rollformuläret', /Knapadel/.test(rf));
    ok('inga fel i konsolen', errs.length === 0, errs.join(' | '));
  } catch (e) {
    res.push('FAIL UNDANTAG ' + e.message.split('\n')[0]);
  }
  console.log(res.join('\n'));
  await b.close();
})();
