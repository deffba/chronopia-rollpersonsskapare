// Packningen i steg Utrustning: köpta varor kan ökas, minskas och tas bort direkt i packningslistan.
// Gratis saker (startpaketet, yrkets startutrustning) har inga knappar. Körs med `npm run e2e`. Kör med LANG=C.UTF-8.
const { chromium } = require('playwright');
const res = []; const ok = (namn, villkor, info = '') => res.push(`${villkor ? 'PASS' : 'FAIL'} ${namn}${info ? ' — ' + info : ''}`);
const BAS = process.env.E2E_BAS || 'http://localhost:8766';

(async () => {
  const b = await chromium.launch();
  try {
  const ny = async () => {
    const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
    p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
    await p.goto(`${BAS}/index.html?dev`);
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('chronopia-dev', 'ja'); localStorage.setItem('chronopia-dev-autofyll', 'nej'); });
    await p.reload(); await p.waitForTimeout(200);
    return p;
  };
  const ladda = async (p, id, lage) => {
    await p.click('#menyknapp'); await p.selectOption('#dev-lage', lage); await p.click(`#dev-${id}`); await p.waitForTimeout(350);
  };
  const rp = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('chronopia-rollperson-v2')).rp);
  const spenderat = (p) => p.locator('.utrustning-summa div:has(dt:text-is("Spenderat")) dd').textContent();

  let p = await ny();
  await ladda(p, 'krigare', 'utrustning');
  // Köp ett rep via varulistan och öka sedan i packningen
  await p.fill('#varusok', 'rep'); await p.waitForTimeout(80);
  const forsta = await p.locator('.varutabell tbody tr:not([hidden])').first().getAttribute('data-namn');
  const namn = (await rp(p)) && await p.locator('.varutabell tbody tr:not([hidden])').first().locator('td').first().evaluate((td) => td.firstChild.textContent);
  await p.locator(`.varutabell tbody tr[data-namn="${forsta}"] button[aria-label^="En "][aria-label$=" till"]`).click(); await p.waitForTimeout(150);
  const fore = (await rp(p)).utrustning[namn] ?? 0;
  const rad = () => p.locator(`.packning li[data-vara="${namn}"]`);
  ok('köpt vara har knappar i packningen', await rad().locator('button').count() === 3, namn);
  const kost1 = await spenderat(p);
  await rad().locator(`button[aria-label="En ${namn} till"]`).click(); await p.waitForTimeout(150);
  ok('+ i packningen ökar antalet', (await rp(p)).utrustning[namn] === fore + 1);
  ok('+ i packningen ändrar spenderat', (await spenderat(p)) !== kost1);
  ok('varulistans antal följer med', (await p.locator(`.varutabell tbody tr[data-namn="${forsta}"] td.antal span`).textContent()) === String(fore + 1));
  await rad().locator(`button[aria-label="En ${namn} mindre"]`).click(); await p.waitForTimeout(150);
  ok('− i packningen minskar antalet', (await rp(p)).utrustning[namn] === fore);
  ok('spenderat tillbaka efter −', (await spenderat(p)) === kost1);
  await rad().locator(`button[aria-label="En ${namn} till"]`).click(); await p.waitForTimeout(150);
  await rad().locator(`button[aria-label="Ta bort ${namn}"]`).click(); await p.waitForTimeout(150);
  ok('ta bort tar bort hela varan', !((await rp(p)).utrustning[namn]) && await rad().count() === 0);
  // Gratis startpaket: inga knappar
  if (!(await p.isChecked('#startpaket'))) { await p.check('#startpaket'); await p.waitForTimeout(150); }
  const gratis = p.locator('.packning li:has(.packpris:text-is("gratis"))');
  ok('startpaketets saker saknar knappar', await gratis.count() > 0 && await gratis.locator('button').count() === 0, String(await gratis.count()));
  ok('inga konsolfel', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // Yrkets startutrustning (V&R ordenskrigare): gratis och utan knappar; köpta V&R-varor har knappar
  p = await ny();
  await ladda(p, 'vr-ordenskrigare', 'utrustning');
  const yrke = p.locator('.packning li:has(.packpris:text-is("gratis (yrket)"))');
  ok('yrkets startutrustning saknar knappar', await yrke.count() >= 2 && await yrke.locator('button').count() === 0, String(await yrke.count()));
  const hjalm = p.locator('.packning li[data-vara="Ordenskrigarhjälm"]');
  ok('köpt V&R-vara har knappar', await hjalm.locator('button').count() === 3);
  await hjalm.locator('button[aria-label="Ta bort Ordenskrigarhjälm"]').click(); await p.waitForTimeout(150);
  ok('köpt V&R-vara kan tas bort', !(await rp(p)).utrustning['Ordenskrigarhjälm'] && await yrke.count() >= 2);
  ok('inga konsolfel (V&R)', !p.errs.length, p.errs.join(' | '));
  await p.close();
  } catch (e) { res.push(`FAIL körningen avbröts — ${e.message.split('\n').slice(0, 3).join(' ')}`); }
  await b.close();
  console.log(res.join('\n'));
})();
