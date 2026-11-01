// Magiförmågeslaget i steg 6: knappen heter MAGIFÖRMÅGESLAG, ett misslyckat slag byts i modalen (GÅ VIDARE),
// inget "null" i sidan, och utvecklarlägets knappar (lyckat/misslyckat, Gör om).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ok = []; const fel = []; const koll = (n, v, i = '') => (v ? ok : fel).push(n + (v ? '' : ' ' + i));
  const errs = [];
  async function tillSteg6(url, manuell, dev) {
    const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    const alderKlar = async () => { if (await p.locator('#alder').count() && !(await p.inputValue('#alder'))) await p.click('.steg-innehall button:has-text("Enkel metod")'); }; // åldern är tom från början (steg 2)
    const nasta = async () => { await alderKlar(); if (await p.locator('#sf-modal-fortsatt:not([disabled])').count()) await p.click('#sf-modal-fortsatt'); await p.locator('.steg-fot .primar').click(); };
    await p.goto(url);
    await p.evaluate(([m, d]) => { localStorage.clear(); localStorage.setItem('chronopia-manuella-slag', m ? 'ja' : 'nej'); if (d) localStorage.setItem('chronopia-dev', 'ja'); }, [manuell, dev]);
    await p.reload(); await p.waitForSelector('.raskort');
    await p.locator('.raskort').first().click(); await p.waitForTimeout(150); await nasta(); await nasta();
    await p.click('[data-yrke="krigare"]'); await nasta(); await p.waitForTimeout(200);
    await p.selectOption('#valfri-f', 'animism'); await p.waitForTimeout(150);
    for (let i = 0; i < 40 && await p.locator('.steg-fot .primar').isDisabled(); i++) {
      const grupp = p.locator('.steg-innehall .valknappar:not(.gjort)').first();
      if (await grupp.count()) { await grupp.locator('.valknapp:not([disabled])').first().click(); continue; }
      const sel = await p.locator('.steg-innehall select').evaluateAll(s => s.filter(x => !x.value && !x.disabled && !x.id.startsWith('ny-')).map(x => ({ id: x.id, alt: [...x.options].filter(o => o.value && !o.disabled).map(o => o.value) })));
      if (sel.length) { await p.selectOption('#' + sel[0].id.replace(/([:+.])/g, '\\$1'), sel[0].alt[0]); continue; }
      const txt = await p.locator('.steg-innehall input[type=text]').evaluateAll(s => s.filter(x => !x.value && !x.id.startsWith('ny-')).map(x => x.id));
      if (txt.length) { await p.fill('#' + txt[0].replace(/([:+.])/g, '\\$1'), 'Test'); await p.press('#' + txt[0].replace(/([:+.])/g, '\\$1'), 'Tab'); continue; }
      break;
    }
    await nasta(); await p.fill('#namn', 'Test'); await p.press('#namn', 'Tab'); await p.locator('#kon .valknapp').first().click(); await nasta();
    await p.click('text=Föreslå värden'); await p.waitForTimeout(150);
    return { p, nasta };
  }
  // 1. Manuellt 100 i steg 6: bytet i modalen
  let { p } = await tillSteg6((process.env.E2E_BAS || 'http://localhost:8766') + '/index.html', true, false);
  koll('i steg 6', (await p.locator('.steg-huvud h2').textContent()) === 'Grundegenskaper');
  koll('inget null i sidan', !(await p.locator('#arbetsyta').textContent()).includes('null'));
  koll('knappen heter MAGIFÖRMÅGESLAG', (await p.locator('.steg-fot .primar').textContent()) === 'MAGIFÖRMÅGESLAG', await p.locator('.steg-fot .primar').textContent());
  await p.locator('.steg-fot .primar').click();
  await p.waitForSelector('#magiformaga-sla:not([disabled])');
  koll('inga utvecklarknappar utan dev', (await p.locator('.magi-dev').count()) === 0);
  await p.fill('#magiformaga-varde', '100'); await p.click('#magiformaga-sla');
  await p.waitForSelector('#magimodal.klar'); await p.click('#magimodal-forlikas');
  await p.waitForSelector('#magimodal.byte');
  koll('rubrik FÖRLIKAS MED ÖDET', (await p.locator('.magi-byte-rubrik').textContent()) === 'FÖRLIKAS MED ÖDET');
  koll('kursiv text', (await p.locator('.magi-byte-text').textContent()) === 'Magin förkastar dig. Glöm dina drömmar och satsa på något du kan.');
  koll('GÅ VIDARE spärrad', await p.locator('#magimodal-ga-vidare').isDisabled());
  const alt = await p.locator('#magibyte-0-f option').evaluateAll(o => o.map(x => x.value).filter(Boolean));
  koll('inga magiskolor i bytet', !alt.some(v => ['animism', 'elementarmagi', 'mentalism'].includes(v)));
  koll('bakom: fortfarande steg 6', (await p.locator('.steg-huvud h2').textContent()) === 'Grundegenskaper');
  const enkel = await p.evaluate(() => [...document.querySelectorAll('#magibyte-0-f option')].map(o => o.value).find(v => v && !['akrobatik'].includes('x')));
  await p.selectOption('#magibyte-0-f', 'akrobatik').catch(async () => p.selectOption('#magibyte-0-f', enkel));
  await p.waitForTimeout(100);
  koll('beskrivning visas', (await p.locator('#magimodal .vald-beskrivning').count()) === 1);
  if (await p.locator('#magibyte-0-d, #magibyte-0-d-f').count()) await p.locator('#magibyte-0-d, #magibyte-0-d-f').first().fill?.('Test').catch(() => {});
  koll('GÅ VIDARE öppen när färdigheten är vald', !(await p.locator('#magimodal-ga-vidare').isDisabled()));
  if (process.env.BILDER) await p.screenshot({ path: `${process.env.BILDER}/byte.png` });
  await p.click('#magimodal-ga-vidare'); await p.waitForSelector('#magimodal', { state: 'detached' }); await p.waitForTimeout(200);
  koll('vidare till steg 7', (await p.locator('.steg-huvud h2').textContent()) === 'Särskilda förmågor', await p.locator('.steg-huvud h2').textContent());
  const rpS = await p.evaluate(() => JSON.parse(localStorage.getItem('chronopia-rollperson-v2')).rp);
  koll('valfri bytt', rpS.valfri && rpS.valfri !== 'animism', rpS.valfri);
  await p.close();

  // 2. Utvecklarläget: lyckat-knappen, Gör om i steg 6, misslyckat-knappen
  ({ p } = await tillSteg6((process.env.E2E_BAS || 'http://localhost:8766') + '/index.html?dev', false, true));
  await p.evaluate(() => localStorage.setItem('chronopia-dev-autofyll', 'nej'));
  await p.locator('.steg-fot .primar').click();
  await p.waitForSelector('#magi-dev-lyckat');
  await p.click('#magi-dev-lyckat'); await p.waitForSelector('#magimodal.klar');
  koll('dev lyckat', (await p.locator('.magi-utfall h2').textContent()) === 'SLAGET LYCKADES!');
  await p.click('#magimodal-fortsatt'); await p.waitForSelector('#magimodal', { state: 'detached' });
  koll('ingen Gör om i steg 7', (await p.locator('#magi-gor-om').count()) === 0);
  await p.locator('.steg-fot .knapp').first().click(); await p.waitForTimeout(150);
  koll('Gör om i steg 6', (await p.locator('.nasta-kolumn #magi-gor-om').count()) === 1);
  if (process.env.BILDER) await p.screenshot({ path: `${process.env.BILDER}/gorom.png` });
  await p.click('#magi-gor-om'); await p.waitForSelector('#magi-dev-misslyckat');
  await p.click('#magi-dev-misslyckat'); await p.waitForSelector('#magimodal.klar');
  koll('dev misslyckat', (await p.locator('.magi-utfall h2').textContent()) === 'SLAGET MISSLYCKADES!');
  await p.close();

  koll('inga konsolfel', errs.length === 0, errs.join(' | '));
  console.log('OK:', ok.length, '\n' + (fel.length ? 'FEL:\n' + fel.join('\n') : 'inga fel'));
  await b.close();
})();
