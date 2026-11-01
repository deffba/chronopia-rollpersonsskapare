// Spelmötesdelen: spelmöte, träning, förbättring, logg och ångra, export och import.
const { tillRas } = require('./hjalp.cjs');
const { chromium } = require('playwright');
const fs = require('fs');
const FIL = process.argv[2] || 'Högländare-krigare.json';
const BILDER = process.argv[3] || null;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const ok = []; const fel = [];
  const koll = (namn, villkor, info = '') => (villkor ? ok : fel).push(namn + (villkor ? '' : ' ' + info));
  const bild = async (namn) => { if (BILDER) await p.screenshot({ path: `${BILDER}/${namn}.png`, fullPage: true }); };
  const notis = async () => (await p.locator('#notis').textContent()).trim();
  await p.goto((process.env.E2E_BAS || 'http://localhost:8766') + '/index.html?dev=av'); await tillRas(p);
  koll('knappen dold utan utvecklarläge', await p.locator('#visa-spel').isHidden());
  await p.goto((process.env.E2E_BAS || 'http://localhost:8766') + '/index.html?dev'); await tillRas(p);
  await p.evaluate(() => localStorage.clear());
  const json = fs.readFileSync(FIL, 'utf8');
  await p.setInputFiles('#importfil', { name: 'rp.json', mimeType: 'application/json', buffer: Buffer.from(json) });
  await p.waitForTimeout(300);
  await p.click('#menyknapp'); await p.click('#visa-spel');
  koll('spelvyn öppnas', (await p.locator('.steg-huvud h2').textContent()) === 'Översikt');
  await bild('1-oversikt');
  const fvPa = async (namn) => {
    const rad = p.locator('#formular .fardighetsrader li', { hasText: namn }).first();
    return Number((await rad.locator('.num').textContent()).trim());
  };

  // Spelmöte
  await p.click('text=För in ett spelmöte');
  await p.selectOption('#session-ep-egen', { label: 'Smyga' });
  await p.fill('#ep-smyga', '3'); await p.press('#ep-smyga', 'Tab');
  // kategori B går inte att välja
  const bOpt = await p.locator('#session-ep-egen option').evaluateAll(o => o.filter(x => x.textContent.includes('kategori B')).map(x => x.disabled));
  koll('kategori B är spärrad för äventyrs-EP', bOpt.length > 0 && bOpt.every(Boolean), JSON.stringify(bOpt));
  await p.check('#session-avslutat');
  await p.fill('#bonus-smyga', '4'); await p.press('#bonus-smyga', 'Tab');
  await p.selectOption('#session-ep-egen', { label: 'Klättra' });
  await p.fill('#bonus-klattra', '7'); await p.press('#bonus-klattra', 'Tab');
  koll('bonus över 10 visas som fel', await p.locator('.felrad', { hasText: 'Bonuspoäng: 11 av 10' }).count() === 1);
  await p.click('#spara-session');
  koll('bonus över 10 stoppas', (await notis()).includes('Högst 10'), await notis());
  await p.fill('#bonus-klattra', '2'); await p.press('#bonus-klattra', 'Tab');
  await p.check('#session-psykamp');
  koll('spara spärrat innan PSY-slaget', await p.locator('#spara-session').isDisabled());
  await p.click('#psy-1t20-sla'); await p.waitForTimeout(400);
  if (await p.locator('#psy-1t3-sla').count()) { await p.click('#psy-1t3-sla'); await p.waitForTimeout(400); }
  await p.fill('#session-hp', '6'); await p.press('#session-hp', 'Tab');
  await p.fill('#session-sm', '-100'); await p.press('#session-sm', 'Tab');
  await p.fill('#session-sak', 'Silverring'); await p.fill('#session-vikt', '0,1'); await p.click('text=Lägg till');
  await p.fill('#session-titel', 'Testäventyret');
  await p.fill('#session-anteckning', 'Vi hittade en karta.');
  await bild('2-spelmote');
  await p.click('#spara-session');
  koll('spelmötet sparas', (await notis()).includes('Spelmötet är infört'), await notis());
  koll('osparade EP 9', (await p.locator('.steg-potter dd').first().textContent()) === '9');

  // Träning med lärare
  await p.click('.steg-knapp:has-text("Träning")');
  await p.selectOption('#traning-egen', { label: 'Smyga' });
  await p.locator('#traning-metod .valknapp', { hasText: 'Lärare i grupp' }).click();
  await p.fill('#traning-lararfv', '20'); await p.press('#traning-lararfv', 'Tab');
  await p.check('#traning-lararint');
  await p.fill('#traning-veckor', '3'); await p.press('#traning-veckor', 'Tab');
  await p.click('#traning-sla');
  koll('lärare som inte går att betala stoppas', await p.locator('#spara-traning').isDisabled() && await p.locator('.felrad', { hasText: 'inte råd' }).count() === 1);
  await p.locator('#traning-metod .valknapp', { hasText: 'Ensam' }).click();
  await p.click('#traning-sla');
  await bild('3-traning');
  await p.click('#spara-traning');
  koll('träningen sparas', (await notis()).includes('Träningen är införd'), await notis());

  // Förbättring
  const smygaFore = await fvPa('Smyga');
  await p.click('.steg-knapp:has-text("Förbättra")');
  koll('höjning spärrad utan vila', await p.locator('#forb-upp-smyga').isDisabled());
  await p.check('#forb-vila');
  await p.click('#forb-upp-smyga'); await p.click('#forb-upp-smyga');
  await bild('4-forbattra-erfarenhet');
  // till steg 3 grundegenskaper
  while ((await p.locator('.spel-steg .vald').textContent()).indexOf('Grundegenskaper') < 0) await p.locator('.forb-fot .primar').click();
  await p.click('#forb-SMI-upp');
  koll('STO kan inte höjas', await p.locator('#forb-egenskaper tr', { hasText: 'STO' }).locator('text=kan inte höjas').count() === 1);
  await bild('5-forbattra-egenskaper');
  await p.locator('.forb-fot .primar').click(); await p.locator('.forb-fot .primar').click();
  await bild('6-forbattra-sammanfattning');
  await p.click('#spara-forbattring');
  koll('förbättringen sparas', (await notis()).includes('Förbättringen är införd'), await notis());
  const smygaEfter = await fvPa('Smyga');
  koll('Smyga +2 FV och +1 för SMI', smygaEfter === smygaFore + 3, `${smygaFore} → ${smygaEfter}`);

  // Rollformuläret visar det nya
  await p.click('text=Rollformulär >> nth=0').catch(() => {});
  await p.locator('.spel-fot button', { hasText: 'Rollformulär' }).click().catch(() => {});
  await p.waitForSelector('.rf-sidor');
  await bild('7-rollformular');
  koll('formuläret har Silverring', (await p.locator('.rf-sidor input').evaluateAll(x => x.map(i => i.value))).includes('Silverring'));
  await p.click('text=← Tillbaka till spelmötena');

  // Logg och ångra
  await p.click('.steg-knapp:has-text("Logg")');
  koll('loggen har 3 poster', await p.locator('.spel-logg > li').count() === 3);
  await bild('8-logg');
  await p.click('#angra-senaste'); await p.click('#angra-senaste');
  koll('ångra tar bort förbättringen', await p.locator('.spel-logg > li').count() === 2);
  koll('Smyga tillbaka', await fvPa('Smyga') === smygaFore);

  // Export och import behåller loggen
  const fil = await p.evaluate(() => JSON.parse(localStorage.getItem('chronopia-rollperson-v2')).rp);
  koll('loggen sparas lokalt', fil.utveckling.logg.length === 2);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await tillRas(p);
  const ut = JSON.stringify({ format: 'chronopia-rollperson', version: 2, sparad: new Date().toISOString(), rollperson: fil });
  await p.setInputFiles('#importfil', { name: 'rp.json', mimeType: 'application/json', buffer: Buffer.from(ut) });
  await p.waitForTimeout(300);
  koll('en spelad rollperson öppnas i spelvyn', (await p.locator('.steg-huvud .eyebrow').textContent()).startsWith('Spelmöten'), await p.locator('.steg-huvud .eyebrow').textContent());
  koll('ingen väg tillbaka till skapandet', await p.locator('text=← Tillbaka till skapandet').count() === 0);
  koll('inga konsolfel', errs.length === 0, errs.join(' | '));
  console.log('OK:', ok.length, '\n' + (fel.length ? 'FEL:\n' + fel.join('\n') : 'inga fel'));
  await b.close();
})();
