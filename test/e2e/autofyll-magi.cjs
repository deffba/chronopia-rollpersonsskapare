// Autofyll i utvecklarläget med en magiskola som valfri yrkesfärdighet: slaget görs automatiskt i steg 6;
// lyckas det visas ingen modal, misslyckas det öppnas modalen med resultatet och FÖRLIKAS MED ÖDET.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const ok = []; const fel = []; const koll = (n, v, i = '') => (v ? ok : fel).push(n + (v ? '' : ' ' + i));
  const alderKlar = async () => { if (await p.locator('#alder').count() && !(await p.inputValue('#alder'))) await p.click('.steg-innehall button:has-text("Enkel metod")'); }; // åldern är tom från början (steg 2)
  const nasta = async () => { await alderKlar(); if (await p.locator('#sf-modal-fortsatt:not([disabled])').count()) await p.click('#sf-modal-fortsatt'); await p.locator('.steg-fot .primar').click(); };
  const rubrik = () => p.locator('.steg-huvud h2').textContent();
  const sett = { lyckat: 0, misslyckat: 0 };
  for (let varv = 0; varv < 40 && (!sett.lyckat || !sett.misslyckat); varv++) {
    await p.goto((process.env.E2E_BAS || 'http://localhost:8766') + '/index.html?dev');
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('chronopia-dev-autofyll', 'ja'); });
    await p.reload(); await p.waitForSelector('.raskort');
    await p.locator('.raskort').first().click(); await p.waitForTimeout(150); await nasta(); await p.waitForTimeout(150);
    await nasta(); await p.click('[data-yrke="krigare"]'); await nasta(); await p.waitForTimeout(300);
    await p.selectOption('#valfri-f', 'animism'); await p.waitForTimeout(200);
    await nasta(); await p.waitForTimeout(300); await nasta(); await p.waitForTimeout(400);
    koll('i steg 6', (await rubrik()) === 'Grundegenskaper', await rubrik());
    const modal = await p.locator('#magimodal').count();
    const slag = await p.evaluate(() => JSON.parse(localStorage.getItem('chronopia-rollperson-v2')).rp.magiformaga?.slag);
    koll('slaget gjort automatiskt', Number.isInteger(slag), String(slag));
    if (!modal) { sett.lyckat++; koll('lyckat: nästa går', !(await p.locator('.steg-fot .primar').isDisabled())); continue; }
    sett.misslyckat++;
    await p.waitForSelector('#magimodal.klar');
    koll('misslyckat visas', (await p.locator('.magi-utfall h2').textContent()) === 'SLAGET MISSLYCKADES!');
    await p.click('#magimodal-forlikas'); await p.waitForSelector('#magimodal.byte');
    koll('bytet visas i modalen', (await p.locator('.magi-byte-rubrik').textContent()) === 'FÖRLIKAS MED ÖDET');
    const val = await p.locator('#magibyte-0-f option').evaluateAll(o => o.map(x => x.value));
    koll('bytet utan magiskolor', !val.some(v => ['animism', 'elementarmagi', 'mentalism'].includes(v)));
    await p.selectOption('#magibyte-0-f', 'akrobatik'); await p.click('#magimodal-ga-vidare');
    await p.waitForSelector('#magimodal', { state: 'detached' }); await p.waitForTimeout(300);
    koll('kvar i steg 6', (await rubrik()) === 'Grundegenskaper', await rubrik());
  }
  koll('båda utfallen sedda', sett.lyckat > 0 && sett.misslyckat > 0, JSON.stringify(sett));
  koll('inga konsolfel', errs.length === 0, errs.join(' | '));
  console.log('OK:', ok.length, JSON.stringify(sett), '\n' + (fel.length ? 'FEL:\n' + fel.join('\n') : 'inga fel'));
  await b.close();
})();
