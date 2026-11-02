// Vapen & rustningar i Chronopia kap. 8–9: vapen, sköldar, rustningsdelar och övrig utrustning (V&R s. 57–76; RB-017).
// Bokfiltret i varulistan och vapenvalen, rasvapen, åtkomlighet, börda i handlingar och yrkets startutrustning i packningen.
// Körs med `npm run e2e` (startar en egen server). Kör med LANG=C.UTF-8.
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
  const flikar = (p) => p.locator('.flikar .valknapp').allTextContents();
  const sok = async (p, text) => { await p.fill('#varusok', text); await p.waitForTimeout(80); };
  const synligaRader = (p) => p.locator('.varutabell tbody tr:not([hidden])').evaluateAll((r) => r.map((x) => x.dataset.namn));

  // ---- Utan V&R: grundreglernas varor och vapen
  let p = await ny();
  await ladda(p, 'krigare', 'utrustning');
  ok('utan V&R: inga nya varukategorier', !(await flikar(p)).some((k) => ['Stridsdroger', 'Djur', 'Skrifter', 'Rustningsvapen'].includes(k)), (await flikar(p)).join(','));
  await sok(p, 'gasmask');
  ok('utan V&R: gasmasken finns inte', (await synligaRader(p)).length === 0);
  await sok(p, 'ceriansk');
  ok('utan V&R: inga cerianska vapen', (await synligaRader(p)).length === 0);
  ok('inga konsolfel (utan V&R)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- Med V&R: ordenskrigaren med hederssvärd, ordenskrigarhjälm och högländskt axelskydd
  p = await ny();
  await ladda(p, 'vr-ordenskrigare', 'utrustning');
  const k = await flikar(p);
  ok('med V&R: nya varukategorier', ['Stridsdroger', 'Djur', 'Skrifter', 'Rustningsvapen', 'Möbler'].every((x) => k.includes(x)) && !k.includes('Diverse (Chronopia)'), k.join(','));
  await sok(p, 'gasmask');
  const gasmask = p.locator('.varutabell tbody tr[data-namn="gasmask"]');
  ok('gasmasken med åtkomlighet D, S', (await gasmask.locator('.varutagg').textContent()) === 'D, S' && (await gasmask.locator('.varutagg').getAttribute('title')).includes('sällsynt, Stubbstan'));
  await sok(p, 'blodkräva');
  ok('förbjuden vara märks ut (X)', await p.locator('tr[data-namn="blodkräva"] .varutagg.forbjuden').count() === 1);
  await sok(p, 'hedersyxa');
  ok('kejserligt vapen märks ut', await p.locator('tr[data-namn="hedersyxa"] .varutagg.forbjuden:has-text("kejserligt")').count() === 1);
  await sok(p, 'wongodolk');
  ok('wongoiska vapen visas inte för en högländare', (await synligaRader(p)).length === 0);
  await sok(p, 'peruk');
  ok('varierande pris visas som lägsta pris med +', (await p.locator('tr[data-namn="peruk"] td.num >> nth=1').textContent()).includes('+'));
  await sok(p, 'axelskydd (par): högländskt');
  ok('axelskyddet skyddar även huvudet och bröstkorgen', (await p.locator('.varutabell tbody tr:not([hidden])').first().textContent()).includes('även huvudet mot hugg och slag, och bröstkorgen'));
  await sok(p, '');

  // Startutrustning: hederssvärdet och vimplarna ligger gratis i packningen, hästen står kvar som text
  const utr = await p.locator('#startutrustning').textContent();
  ok('startutrustningen visar vad som ligger i packningen', utr.includes('Hederssvärd (ligger i packningen)') && utr.includes('Högländsk stridshäst') && !utr.includes('stridshäst (ligger'), utr);
  const packning = await p.locator('.packning').textContent();
  ok('packningen: hederssvärdet gratis från yrket', packning.includes('Hederssvärdgratis (yrket)') && packning.includes('Heraldiska vimplargratis (yrket)'), packning);
  ok('packningen: köpta V&R-rustningar', packning.includes('Ordenskrigarhjälm') && packning.includes('Axelskydd (par): Högländskt'), packning);

  // Köp en V&R-vara och se att pengarna minskar
  const kvarFore = await p.locator('.utrustning-summa div:nth-child(3) dd').textContent();
  await sok(p, 'kikare');
  await p.click('tr[data-namn="kikare"] button[aria-label="En Kikare till"]'); await p.waitForTimeout(120);
  const kvarEfter = await p.locator('.utrustning-summa div:nth-child(3) dd').textContent();
  ok('köp av en V&R-vara drar 150 sm', Number(kvarFore.replace(/\D/g, '')) - Number(kvarEfter.replace(/\D/g, '')) === 150, `${kvarFore} → ${kvarEfter}`);
  ok('kikaren sparas i rollpersonen', (await rp(p)).utrustning.Kikare === 1);

  // Börda: ett tungt köp ger avdrag på handlingar enligt V&R
  await sok(p, 'spett');
  for (let i = 0; i < 6; i++) { await p.click('tr[data-namn="spett"] button[aria-label="En Spett till"]'); await p.waitForTimeout(100); }
  const varning = await p.locator('#viktvarning').textContent().catch(() => '');
  ok('börda: avdrag på handlingar enligt V&R s. 69', /handling(ar)? per stridsrunda \(Vapen & rustningar i Chronopia s\. 69\)/.test(varning), varning);

  // Rollformuläret: hederssvärdet bland vapnen, hjälmen på huvudet
  await p.reload(); await p.waitForTimeout(200);
  await ladda(p, 'vr-ordenskrigare', 'formular');
  const rf = await p.locator('#rf-vy').textContent();
  ok('rollformuläret: hederssvärdet och startutrustningen', rf.includes('Hederssvärd') && rf.includes('Högländsk stridshäst') && rf.includes('Ordenskrigarhjälm'));
  ok('inga konsolfel (V&R)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- Vapenvalen: V&R-vapen och eldvapen med boken, rasvapen bara för rasen
  p = await ny();
  await ladda(p, 'vr-svartgardist', 'extra');
  const alt = await p.locator('select option').evaluateAll((o) => o.map((x) => x.value));
  ok('vapenval: V&R-vapen och eldvapen finns', alt.includes('Ceriansk klinga') && alt.includes('Musköt'), String(alt.length));
  ok('vapenval: inga wongoiska eller orchiska vapen för en latracier', !alt.includes('Wongodolk') && !alt.includes('Snittare'));
  ok('inga konsolfel (vapenval)', !p.errs.length, p.errs.join(' | '));
  await p.close();
  } catch (e) { res.push(`FAIL körningen avbröts — ${e.message.split('\n').slice(0, 3).join(' ')}`); }
  await b.close();
  console.log(res.join('\n'));
})();
