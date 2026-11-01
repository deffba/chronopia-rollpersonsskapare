// Magiförmågeslaget i modalen: misslyckat (skolan tas bort och döljs), lyckat (gäller globalt), manuellt och vanligt slag.
const { tillRas } = require('./hjalp.cjs');
const { chromium } = require('playwright');
const fs = require('fs');
const BILDER = process.argv[2] || null;
(async () => {
  const b = await chromium.launch();
  const ok = []; const fel = [];
  const koll = (namn, villkor, info = '') => (villkor ? ok : fel).push(namn + (villkor ? '' : ' ' + info));
  const errs = [];
  // Krigaren utan fördelade EP och utan sekundära färdigheter, så att en magiskola går att köpa
  const fil = JSON.parse(fs.readFileSync('Högländare-krigare.json', 'utf8'));
  fil.rollperson.fardigheter = {}; fil.rollperson.sekundara = []; fil.rollperson.magiformaga = { slag: null };
  async function sida(reducerad, manuell) {
    const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, reducedMotion: reducerad ? 'reduce' : 'no-preference' });
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await p.goto((process.env.E2E_BAS || 'http://localhost:8766') + '/index.html');
    await p.evaluate((m) => { localStorage.clear(); localStorage.setItem('chronopia-manuella-slag', m ? 'ja' : 'nej'); }, manuell);
    await p.reload(); await tillRas(p);
    await p.setInputFiles('#importfil', { name: 'rp.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fil)) });
    await p.waitForTimeout(300);
    await p.locator('.steg-knapp', { has: p.locator('.steg-namn', { hasText: /^Färdigheter$/ }) }).click();
    return p;
  }
  const skolor = (p) => p.locator('#ny-sek-f option').evaluateAll(o => o.filter(x => ['animism', 'elementarmagi', 'mentalism'].includes(x.value.split(':')[0])).map(x => x.value));
  const laggTill = async (p, v) => { await p.selectOption('#ny-sek-f', v); await p.locator('.steg-innehall button', { hasText: 'Lägg till' }).last().click(); };

  // 1. Manuellt slag 100: misslyckat
  let p = await sida(true, true);
  const alla = await skolor(p);
  koll('magiskolor går att välja före slaget', alla.length === 3, JSON.stringify(alla));
  koll('inget magislag i steget', (await p.locator('.magislag, #magiformaga-slag').count()) === 0);
  await laggTill(p, 'animism');
  await p.waitForSelector('#magimodal');
  koll('modalen öppnas direkt', true);
  await p.waitForSelector('#magiformaga-sla:not([disabled])');
  koll('manuellt: inmatning och ledtext', (await p.locator('#magiformaga-varde').count()) === 1 && (await p.locator('.magi-ledtext').textContent()).includes('tryck på tärningen'));
  await p.click('#magiformaga-sla');
  koll('ogiltigt värde slår inte', !(await p.locator('#magimodal.rullar').count()));
  await p.fill('#magiformaga-varde', '100'); await p.click('#magiformaga-sla');
  await p.waitForSelector('#magimodal.klar');
  koll('siffran visas', (await p.locator('.magi-siffra span').textContent()) === '100');
  koll('rubrik misslyckat', (await p.locator('.magi-utfall h2').textContent()) === 'SLAGET MISSLYCKADES!');
  koll('brödtext misslyckat', (await p.locator('.magi-brodtext').textContent()) === 'Magins vindar blåser ej åt ditt håll ...');
  koll('knapp FÖRLIKAS MED ÖDET', (await p.locator('#magimodal-forlikas').textContent()) === 'FÖRLIKAS MED ÖDET');
  await p.keyboard.press('Escape');
  koll('Escape stänger inte', (await p.locator('#magimodal').count()) === 1);
  if (BILDER) await p.screenshot({ path: `${BILDER}/misslyckat.png` });
  await p.click('#magimodal-forlikas');
  await p.waitForSelector('#magimodal.byte');
  koll('bytet även i steg 11', (await p.locator('.magi-byte-rubrik').textContent()) === 'FÖRLIKAS MED ÖDET');
  koll('etikett sekundär', (await p.locator('.magi-byte-plats label').textContent()) === 'Ny sekundär färdighet');
  const har = await p.evaluate(() => JSON.parse(localStorage.getItem('chronopia-rollperson-v2')).rp);
  const bytAlt = await p.locator('#magibyte-0-f option').evaluateAll(o => o.map(x => x.value).filter(Boolean));
  koll('inga magiskolor i bytet', !bytAlt.some(v => ['animism', 'elementarmagi', 'mentalism'].includes(v)));
  koll('inga färdigheter rollpersonen redan har', !bytAlt.includes('dra-vapen') && !bytAlt.some(v => (har.extraYrkesfardigheter || []).includes(v)), bytAlt.join(','));
  await p.selectOption('#magibyte-0-f', 'stridskonster'); await p.waitForTimeout(150);
  if (BILDER) await p.screenshot({ path: `${BILDER}/stridskonst.png` });
  koll('stridskonstrutan i modalen', (await p.locator('#magimodal .stridskonst-info').count()) === 1);
  for (let i = 0; i < 6 && await p.locator('#magimodal-ga-vidare').isDisabled(); i++) {
    const t = await p.locator('#magimodal input[type=text]').evaluateAll(s => s.filter(x => !x.value).map(x => x.id));
    if (t.length) { await p.fill('#' + t[0], 'Testkonst'); await p.press('#' + t[0], 'Tab'); continue; }
    const sel = await p.locator('#magimodal select').evaluateAll(s => s.filter(x => !x.value).map(x => ({ id: x.id, v: [...x.options].find(o => o.value && !o.disabled)?.value })));
    if (sel.length) { await p.selectOption('#' + sel[0].id, sel[0].v); continue; }
  }
  await p.click('#magimodal-ga-vidare');
  await p.waitForSelector('#magimodal', { state: 'detached' });
  koll('kvar i steg 11', (await p.locator('.steg-huvud h2').textContent()) === 'Färdigheter');
  koll('skolan borttagen', !(await p.locator('.steg-innehall').textContent()).includes('Animism'));
  koll('stridskonst tillagd i stället', (await p.evaluate(() => JSON.parse(localStorage.getItem('chronopia-rollperson-v2')).rp.sekundara)).some(k => k.startsWith('stridskonster')));
  koll('inga magiskolor i listan', (await skolor(p)).length === 0, JSON.stringify(await skolor(p)));
  const sparat = await p.evaluate(() => JSON.parse(localStorage.getItem('chronopia-rollperson-v2')));
  const rpS = sparat.rp;
  koll('slaget är sparat en gång för alla', rpS.magiformaga?.slag === 100 && !rpS.sekundara.includes('animism'), JSON.stringify(rpS.magiformaga));
  await p.close();

  // 2. Manuellt slag 1: lyckat, och en andra skola kräver inget nytt slag
  p = await sida(true, true);
  await laggTill(p, 'animism');
  await p.waitForSelector('#magiformaga-sla:not([disabled])');
  await p.fill('#magiformaga-varde', '1'); await p.press('#magiformaga-varde', 'Enter');
  await p.waitForSelector('#magimodal.klar');
  koll('rubrik lyckat', (await p.locator('.magi-utfall h2').textContent()) === 'SLAGET LYCKADES!');
  koll('brödtext lyckat', (await p.locator('.magi-brodtext').textContent()) === 'Du känner magins kraft i hela ditt väsen.');
  if (BILDER) await p.screenshot({ path: `${BILDER}/lyckat.png` });
  await p.click('#magimodal-fortsatt');
  await p.waitForSelector('#magimodal', { state: 'detached' });
  koll('skolan finns kvar', (await p.locator('.steg-innehall').textContent()).includes('Animism'));
  await laggTill(p, 'mentalism'); await p.waitForTimeout(200);
  koll('ingen ny modal för en andra skola', (await p.locator('#magimodal').count()) === 0);
  await p.close();

  // 3. Vanligt slag med animation: tärningen snurrar i ungefär fyra sekunder
  p = await sida(false, false);
  await laggTill(p, 'elementarmagi');
  await p.waitForSelector('#magiformaga-sla:not([disabled])', { timeout: 3000 });
  koll('ledtext', (await p.locator('.magi-ledtext').textContent()) === 'tryck på tärningen');
  if (BILDER) await p.screenshot({ path: `${BILDER}/redo.png` });
  const t0 = Date.now();
  await p.click('#magiformaga-sla');
  await p.waitForTimeout(1500);
  if (BILDER) await p.screenshot({ path: `${BILDER}/rullar.png` });
  await p.waitForSelector('#magimodal.klar', { timeout: 8000 });
  const tid = Date.now() - t0;
  koll('snurrar cirka 4 s', tid > 3600 && tid < 5000, String(tid));
  const tal = Number(await p.locator('.magi-siffra span').textContent());
  koll('talet 1–100', tal >= 1 && tal <= 100, String(tal));
  await p.waitForTimeout(1200);
  if (BILDER) await p.screenshot({ path: `${BILDER}/klar.png` });
  await p.click('#magimodal-fortsatt, #magimodal-forlikas');
  await p.waitForTimeout(900);
  if (await p.locator('#magimodal.byte').count()) { await p.selectOption('#magibyte-0-f', 'akrobatik'); await p.click('#magimodal-ga-vidare'); }
  await p.waitForSelector('#magimodal', { state: 'detached' });
  await p.close();

  koll('inga konsolfel', errs.length === 0, errs.join(' | '));
  console.log('OK:', ok.length, '\n' + (fel.length ? 'FEL:\n' + fel.join('\n') : 'inga fel'));
  await b.close();
})();
