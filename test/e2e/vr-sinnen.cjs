// Vapen & rustningar i Chronopia: Syn och hörsel som valfri regel (V&R s. 3, RB-002).
// Regeln slås på i steg 0, BP + 1T6 per sinne i steg 6, modifikationerna i sammanfattningen och på rollformuläret.
// Körs med `npm run e2e` (startar en egen server). Kör med LANG=C.UTF-8.
const { chromium } = require('playwright');
const res = []; const ok = (namn, villkor, info = '') => res.push(`${villkor ? 'PASS' : 'FAIL'} ${namn}${info ? ' — ' + info : ''}`);
const BAS = process.env.E2E_BAS || 'http://localhost:8766';

(async () => {
  const b = await chromium.launch();
  try {
  const ny = async (dev) => {
    const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
    p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
    await p.goto(`${BAS}/index.html${dev ? '?dev' : '?dev=av'}`);
    await p.evaluate((dev) => { localStorage.clear(); localStorage.setItem('chronopia-dev', dev ? 'ja' : 'nej'); localStorage.setItem('chronopia-dev-autofyll', 'nej'); }, dev);
    await p.reload(); await p.waitForTimeout(200);
    return p;
  };
  const NYCKEL = 'chronopia-rollperson-v2';
  const rp = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)).rp, NYCKEL);

  // ---- Steg 0: regeln finns bara med V&R och sparas i rollpersonen
  let p = await ny(false);
  await p.click('#start-skapa'); await p.waitForSelector('.bokgrupper');
  ok('utan V&R: inga valfria regler', await p.locator('#valfria-regler').count() === 0);
  await p.check('[data-bok=vr]'); await p.waitForTimeout(80);
  ok('med V&R: Syn och hörsel som valfri regel', (await p.locator('#valfria-regler').textContent()).includes('Syn och hörsel'));
  ok('med V&R: Detaljerad strid som valfri regel', await p.locator('[data-regel=detaljerad-strid]').count() === 1);
  await p.check('[data-regel=syn-och-horsel]'); await p.waitForTimeout(80);
  ok('regeln sparas i rollpersonen', JSON.stringify((await rp(p)).valfriaRegler) === '["syn-och-horsel"]');
  await p.uncheck('[data-bok=vr]'); await p.waitForTimeout(80);
  ok('V&R av: regeln stängs av', (await rp(p)).valfriaRegler.length === 0 && await p.locator('#valfria-regler').count() === 0);
  ok('inga konsolfel (steg 0)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- Steg 6 med testrollpersonen: syn 3 BP + 4 = mycket god, hörsel 0 + 2 = nedsatt
  p = await ny(true);
  await p.click('#menyknapp'); await p.selectOption('#dev-lage', 'egenskaper'); await p.click('#dev-vr-ordenskrigare'); await p.waitForTimeout(350);
  const ruta = await p.locator('#sinnen').textContent();
  ok('steg 6: rutan för syn och hörsel', ruta.includes('Syn och hörsel (Vapen & rustningar s. 3)') && ruta.includes('Syn: mycket god (+2)') && ruta.includes('Hörsel: nedsatt (−1)'), ruta.slice(0, 300));
  // Hörseln är inte slagen än: lägg 2 BP och slå
  await p.click('#sinne-horsel-las-upp'); await p.waitForTimeout(150); // utvecklarlägets Lås upp
  const saknas = (await p.locator('.saknaslista').allTextContents()).join(' ');
  ok('ett sinne som inte är slaget står bland det som saknas', saknas.includes('Slaget för hörsel'), saknas);
  ok('BP-fältet går att ändra innan slaget', await p.locator('#sinne-horsel-bp:not([readonly])').count() === 1);
  // Brann har inga BP över (fler BP skulle ta EP som redan är spenderade), så hörseln slås utan BP
  await p.click('#sinne-horsel-sla'); await p.waitForTimeout(500);
  const h = (await rp(p)).sinnen.horsel;
  ok('hörseln: ett slag 1–6', h.bp === 0 && h.slag >= 1 && h.slag <= 6, JSON.stringify(h));
  ok('resultatet visas', (await p.locator('[data-sinne=horsel]').textContent()).includes(`Resultat: ${h.slag}.`));
  ok('inget saknas längre', !(await p.locator('.saknaslista').allTextContents()).join(' ').includes('hörsel'));

  // Sammanfattningen och rollformuläret
  await p.click('#menyknapp'); await p.selectOption('#dev-lage', 'formular'); await p.click('#dev-vr-ordenskrigare'); await p.waitForTimeout(400);
  const rf = await p.locator('#rf-vy').textContent();
  ok('rollformuläret: syn och hörsel bland förmågorna', rf.includes('Syn: mycket god') && rf.includes('Hörsel: nedsatt'), '');
  const uf = await p.locator('#rf-vy .rf-rad:has-text("Upptäcka fara")').first().textContent().catch(() => '');
  ok('rollformuläret: modifikation vid Upptäcka fara (+2 −1 = +1)', uf.includes('+1 sinne'), uf);
  ok('inga konsolfel (steg 6)', !p.errs.length, p.errs.join(' | '));
  await p.close();
  } catch (e) { res.push(`FAIL körningen avbröts — ${e.message.split('\n').slice(0, 3).join(' ')}`); }
  await b.close();
  console.log(res.join('\n'));
})();
