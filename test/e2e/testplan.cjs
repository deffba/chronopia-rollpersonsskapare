// Rättelserna efter den manuella testplanen (2026-11-05): bokvalet, sifferfältens minus och plus, rubrikens
// typsnitt, Värdshusvärd, drakgardistens val av yrkesförmåga, startkapitalets tabell, färdighetstabellen,
// knappen för vapentekniker och utrustning som fortsätter på sida 3 av rollformuläret.
// Körs med `npm run e2e` (startar en egen server). Kör med LANG=C.UTF-8.
const { chromium } = require('playwright');
const res = []; const ok = (namn, villkor, info = '') => res.push(`${villkor ? 'PASS' : 'FAIL'} ${namn}${info ? ' — ' + info : ''}`);
const BAS = process.env.E2E_BAS || 'http://localhost:8766';

(async () => {
  const b = await chromium.launch();
  try {
  const ny = async (dev = true) => {
    const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
    p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
    await p.goto(`${BAS}/index.html${dev ? '?dev' : '?dev=av'}`);
    await p.evaluate((dev) => { localStorage.clear(); localStorage.setItem('chronopia-dev', dev ? 'ja' : 'nej'); localStorage.setItem('chronopia-dev-autofyll', 'nej'); }, dev);
    await p.reload(); await p.click('#start-skapa'); await p.waitForSelector('.bokgrupper');
    return p;
  };
  const ladda = async (p, id, lage) => { await p.click('#menyknapp'); await p.selectOption('#dev-lage', lage); await p.click(`#dev-${id}`); await p.waitForTimeout(400); };

  // ---- Steg 0, rubriken och sifferfälten
  let p = await ny(false);
  const bocker = await p.locator('[data-bok]').evaluateAll((i) => i.map((x) => x.dataset.bok));
  ok('steg 0: grundreglerna står inte bland kryssrutorna', !bocker.includes('grund') && bocker.includes('vr'), bocker.join(','));
  ok('steg 0: rubriken Generella expansioner', (await p.locator('.bokgrupp h3').allTextContents()).includes('Generella expansioner'));
  ok('rubriken har rollformulärets typsnitt', /Cinzel Decorative/.test(await p.locator('.topp h1').evaluate((e) => getComputedStyle(e).fontFamily)));
  await p.click('#nasta-steg'); await p.waitForSelector('.raskort'); await p.click('.raskort:has-text("Människa")'); await p.waitForTimeout(100);
  await p.click('#nasta-steg'); await p.waitForSelector('#alder');
  ok('ålder: minus till vänster och plus till höger', await p.locator('.stegare:has(#alder) .stegknapp').count() === 2
    && (await p.locator('.stegare:has(#alder) .stegknapp').first().textContent()) === '−' && (await p.locator('.stegare:has(#alder) .stegknapp').last().textContent()) === '+');
  await p.fill('#alder', '20'); await p.press('#alder', 'Tab'); await p.waitForTimeout(80);
  await p.click('.stegare:has(#alder) .stegknapp >> text=+'); await p.waitForTimeout(80);
  ok('plus höjer värdet ett steg', (await p.inputValue('#alder')) === '21', await p.inputValue('#alder'));
  await p.click('.stegare:has(#alder) .stegknapp >> text=−'); await p.click('.stegare:has(#alder) .stegknapp >> text=−'); await p.waitForTimeout(80);
  ok('minus sänker värdet', (await p.inputValue('#alder')) === '19', await p.inputValue('#alder'));
  ok('inga konsolfel (steg 0–2)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- Värdshusvärd går att välja
  p = await ny();
  await ladda(p, 'dvarg-barsark', 'yrke');
  await p.click('[data-yrke=vardshusvard]'); await p.waitForTimeout(150);
  ok('Värdshusvärd går att välja', /valt/.test(await p.locator('[data-yrke=vardshusvard]').getAttribute('class')) && !p.errs.length, (await p.locator('[data-yrke=vardshusvard]').getAttribute('class')) + p.errs.join(' | '));
  await p.click('#nasta-steg', { force: true }); await p.waitForTimeout(150);
  ok('Värdshusvärd: den extra valfria färdigheten i steg 4', (await p.locator('.yrkeslista').textContent()).includes('En extra valfri färdighet'));
  await p.close();

  // ---- Drakgardisten väljer krigarens eller gladiatorns yrkesförmåga i steg 4
  p = await ny();
  await ladda(p, 'alv-drakblod', 'yrke');
  await p.click('[data-yrke=drakgardist]'); await p.waitForTimeout(150);
  await p.click('#nasta-steg', { force: true }); await p.waitForTimeout(150);
  ok('drakgardist: valet av yrkesförmåga i steg 4', await p.locator('#yrkesformaga-val').count() === 1);
  ok('drakgardist: valet saknas tills det är gjort', (await p.locator('.saknaslista').first().textContent()).includes('Vilken yrkesförmåga rollpersonen har'));
  await p.click('#yrkesformaga [data-varde=gladiator]'); await p.waitForTimeout(150);
  ok('drakgardist: gladiatorns yrkesförmåga vald', (await p.locator('#yrkesformaga-val').textContent()).includes('Gladiatorns yrkesförmåga: +5 på initiativet'));
  await p.click('#menyknapp'); await p.click('#visa-formular'); await p.waitForTimeout(300);
  ok('rollformuläret: den valda yrkesförmågan', (await p.locator('#rf-vy').textContent()).includes('Gladiatorns yrkesförmåga: +5 på initiativet'));
  ok('inga konsolfel (drakgardist)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- Startkapitalet, färdighetstabellen och vapentekniker
  p = await ny();
  await ladda(p, 'vr-ordenskrigare', 'kapital');
  ok('startkapital: tabellen finns, hopfälld', await p.locator('details#sk-tabell').count() === 1 && !(await p.locator('details#sk-tabell').getAttribute('open') !== null));
  ok('startkapital: ingen "husregel" i steget', !(await p.locator('.steg-innehall').first().textContent()).includes('Husregel'));
  await ladda(p, 'vr-hjalte', 'fardigheter');
  const huvud = await p.locator('.fardighetstabell thead th').allTextContents();
  ok('färdighetstabellen: BC i stället för Start', huvud.some((t) => t.startsWith('BC')) && !huvud.some((t) => t.startsWith('Start')), huvud.join('|'));
  const linje = await p.locator('.fardighetstabell').first().evaluate((t) => {
    const th = t.querySelector('thead th.fv-kol').getBoundingClientRect(); const td = t.querySelector('tbody td.fv-kol input').getBoundingClientRect();
    return Math.abs((th.left + th.right) / 2 - (td.left + td.right) / 2);
  });
  ok('färdighetstabellen: FV står över sin kolumn', linje < 20, String(linje));
  ok('inga konsolfel (startkapital, färdigheter)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- Utrustning som inte får plats på sida 2 fortsätter på sida 3
  p = await ny();
  await ladda(p, 'magi-chronomag', 'utrustning');
  await p.fill('#varusok', 'ar'); await p.press('#varusok', 'Enter'); await p.waitForTimeout(200);
  for (let i = 0; i < 14; i++) {
    const k = p.locator('tr:not(:has(button[aria-label$=" mindre"]:not([disabled]))) button[aria-label^="En "][aria-label$=" till"]:not([disabled]):visible').first();
    if (!(await k.count())) break;
    await k.click(); await p.waitForTimeout(60);
  }
  await p.click('#menyknapp'); await p.click('#visa-formular'); await p.waitForTimeout(800);
  const sidor = await p.evaluate(() => [...document.querySelectorAll('.rf-sida')].map((s) => {
    const fot = s.querySelector('.rf-fot').getBoundingClientRect().top;
    return { under: [...s.querySelectorAll('.rf-sakkolumn .rf-rad')].filter((r) => r.getBoundingClientRect().bottom > fot + 1).length, mer: !!s.querySelector('.rf-mer-utrustning') };
  }));
  ok('rollformuläret: ingen utrustning under sidfoten', sidor.every((s) => !s.under), JSON.stringify(sidor));
  ok('rollformuläret: resten av utrustningen på sida 3', sidor[2]?.mer === true, JSON.stringify(sidor));
  ok('inga konsolfel (rollformuläret)', !p.errs.length, p.errs.join(' | '));
  await p.close();
  } catch (e) { ok('skriptet kraschade inte', false, e.message); }
  await b.close();
  console.log(res.join('\n'));
})();
