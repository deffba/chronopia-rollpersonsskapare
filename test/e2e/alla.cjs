const { chromium } = require('playwright');
const { tillRas } = require('./hjalp.cjs');
const RASER = ['Dimalv','Drakonit','Dvärg','Goblin','Halvalv','Högländare','Ljusalv','Människa','Orch','Stadsalv','Troll','Wongos'];
const YRKEN = ['animist','bard','elementarmagiker','gladiator','gycklare','hantverkare','krigare','kopman','lard-man','lonnmordare','mentalist','munk','paladin','resenar','tjuv','arkemagiker'];
const [from, to] = [Number(process.argv[2] ?? 0), Number(process.argv[3] ?? 999)];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
  let errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto((process.env.E2E_BAS || 'http://localhost:8766') + '/index.html'); await tillRas(p);
  const nastaOk = async () => !(await p.locator('.steg-fot .primar').isDisabled());
  const alderKlar = async () => { if (await p.locator('#alder').count() && !(await p.inputValue('#alder'))) await p.click('.steg-innehall button:has-text("Enkel metod")'); }; // åldern är tom från början (steg 2)
  const nasta = async () => { await alderKlar(); if (await p.locator('#sf-modal-fortsatt:not([disabled])').count()) await p.click('#sf-modal-fortsatt'); await p.locator('.steg-fot .primar').click(); };
  // Magiförmågeslaget görs i en modal när man går vidare (eller direkt när en sekundär magiskola läggs till).
  // Svar: null = inget slag, true = lyckat (modalen stängd med FORTSÄTT), false = misslyckat (FÖRLIKAS MED ÖDET).
  const magi = async () => {
    await p.waitForTimeout(30);
    if (!(await p.locator('#magimodal').count())) return null;
    await p.waitForSelector('#magiformaga-sla:not([disabled])');
    if (await p.locator('#magiformaga-varde').count()) await p.fill('#magiformaga-varde', '1');
    await p.click('#magiformaga-sla'); await p.waitForSelector('#magimodal.klar');
    const ok = (await p.locator('#magimodal-fortsatt').count()) > 0;
    await p.click(ok ? '#magimodal-fortsatt' : '#magimodal-forlikas');
    await magiByte();
    await p.waitForSelector('#magimodal', { state: 'detached' });
    return ok;
  };
  // Efter FÖRLIKAS MED ÖDET i steg 6 väljs en ny färdighet i modalen och GÅ VIDARE trycks
  const magiByte = async () => {
    for (let i = 0; i < 15; i++) {
      if (!(await p.locator('#magimodal.byte').count())) return;
      const knapp = p.locator('#magimodal-ga-vidare');
      if (!(await knapp.isDisabled())) { await knapp.click(); await p.waitForSelector('#magimodal', { state: 'detached' }); return; }
      const sel = await p.locator('#magimodal select').evaluateAll(s => s.filter(x => !x.value).map(x => ({ id: x.id, alt: [...x.options].filter(o => o.value && !o.disabled).map(o => o.value) })));
      if (sel.length) { await p.selectOption('#' + sel[0].id.replace(/([:+.])/g, '\\$1'), sel[0].alt[i % sel[0].alt.length]); continue; }
      const txt = await p.locator('#magimodal input[type=text]').evaluateAll(s => s.filter(x => !x.value).map(x => x.id));
      if (txt.length) { await p.fill('#' + txt[0], 'Test'); await p.press('#' + txt[0], 'Tab'); continue; }
      const fylld = await p.locator('#magimodal select').evaluateAll(s => s.map(x => x.id));
      if (fylld.length) await p.selectOption('#' + fylld[0].replace(/([:+.])/g, '\\$1'), '');
    }
    throw new Error('bytet i modalen gick inte att göra klart');
  };
  async function fyll(varv = 40) {
    for (let i = 0; i < varv; i++) {
      if (await nastaOk()) return true;
      const grupp = p.locator('.steg-innehall .valknappar:not(.gjort)').first();
      if (await grupp.count()) { await grupp.locator('.valknapp:not([disabled])').first().click(); continue; }
      const sel = await p.locator('.steg-innehall select:not(#valt-stand):not(#yrke):not(#ny-extra-f):not(#ny-sek-f)').evaluateAll(s => s.filter(x => !x.value && !x.disabled).map(x => ({ id: x.id, alt: [...x.options].filter(o => o.value && !o.disabled).map(o => o.value) })));
      if (sel.length) {
        const { id, alt } = sel[0]; let klar = false;
        for (const v of alt) { await p.selectOption('#' + CSS_escape(id), v); if (await p.locator('#' + CSS_escape(id)).inputValue().catch(() => '') === v) { klar = true; break; } }
        if (!klar) return `kunde inte välja något i ${id}`;
        continue;
      }
      const sk = p.locator('.steg-innehall .stridskonst').first();
      if (await sk.count() && !(await sk.locator('input:checked').count())) { await sk.locator('input[type=checkbox]').first().check(); continue; }
      const txt = await p.locator('.steg-innehall input[type=text]').evaluateAll(s => s.filter(x => !x.value).map(x => x.id));
      if (txt.length) { await p.fill('#' + CSS_escape(txt[0]), 'Test' + i); await p.press('#' + CSS_escape(txt[0]), 'Tab'); continue; }
      return 'fastnade: ' + (await p.locator('.saknaslista').first().textContent().catch(() => '?'));
    }
    return 'för många varv';
  }
  function CSS_escape(s) { return s.replace(/([:+.])/g, '\\$1'); }
  const resultat = []; let n = 0;
  for (const ras of RASER) for (const yrke of YRKEN) {
    if (n++ < from || n > to) continue;
    errs = [];
    const fel = async (vad) => { resultat.push(`${ras}/${yrke}: ${vad}`); };
    try {
      await p.evaluate(() => localStorage.clear()); await p.reload(); await tillRas(p);
      await p.locator('.raskort', { hasText: ras }).click();
      let r = await fyll(); if (r !== true) { await fel('ras ' + r); continue; } await nasta();
      await nasta(); // ålder
      await p.click(`[data-yrke="${yrke}"]`); await nasta(); // yrke: korten i steg 3, valen i steg 4
      r = await fyll(); if (r !== true) { await fel('yrke ' + r); continue; } await nasta();
      await p.fill('#namn', 'Test'); await p.press('#namn', 'Tab'); await p.locator('#kon .valknapp').first().click(); await nasta();
      await p.click('text=Föreslå värden');
      await nasta();
      const mg = await magi();
      if (mg === false) resultat.push(`magi misslyckad, bytt ${ras}/${yrke}`);
      if (mg) resultat.push(`magi lyckad ${ras}/${yrke}`);
      await p.fill('#sf-bp', '5'); await p.press('#sf-bp', 'Tab'); await p.locator('button', { hasText: /^Slå 2T20([+−]\d+)*$/ }).click(); await p.waitForTimeout(450);
      r = await fyll(); if (r !== true) { await fel('förmåga ' + r); continue; } await nasta();
      for (const steg of ['svärdshand', 'stånd', 'kapital']) {
        const k = p.locator('.steg-innehall .knapp', { hasText: /^Slå 2T6([+−]\d+)*$/ });
        if (await k.count()) { await k.click(); await p.waitForTimeout(450); }
        if (!(await nastaOk())) { await fel(steg + ' spärrad'); break; }
        await nasta();
      }
      if (!(await p.locator('h2', { hasText: 'Färdigheter' }).count())) continue;
      for (const c of await p.locator('.stridskonst').all()) await c.locator('input[type=checkbox]').first().check();
      await p.click('text=Fördela EP automatiskt');
      const topp = (await p.locator('.potter .pott-tal').allTextContents()).join(' BP · ') + ' EP';
      const ep = Number(topp.split('·')[1].trim().split(' ')[0]);
      if (ep < 0 || ep > 10) await fel('EP kvar ' + ep);
      if (!(await p.locator('.klar').count())) { await fel('inte klar: ' + await p.locator('.saknaslista').first().textContent()); continue; }
      await nasta();
      // Besvärjelser: lär den första om rollpersonen kan magi och har EP kvar
      let extraInfo = '';
      const bv = p.locator('.besvarjelsetabell input[type=number]');
      if (await bv.count()) {
        await bv.first().fill('1'); await bv.first().press('Tab'); await p.waitForTimeout(50);
        extraInfo += ' bv:' + await p.locator('.besvarjelsetabell input[type=number]').first().inputValue();
      }
      if (errs.length) await fel('konsolfel i besvärjelser: ' + errs.join(' | '));
      // Steget Besvärjelser finns bara för rollpersoner som kan lära sig magi
      const harBv = (await p.locator('.steg-huvud h2').textContent()) === 'Besvärjelser';
      extraInfo += harBv ? ' [bv-steg]' : '';
      if (harBv) await nasta();
      // Utrustning: startpaket och ett köp
      await p.check('#startpaket');
      const vv = await p.locator('#startpaket-vapen').evaluate(x => [...x.options].filter(o => o.value && !o.disabled).map(o => o.value));
      if (!vv.length) await fel('inget startvapen att välja');
      else await p.selectOption('#startpaket-vapen', vv[0]);
      await p.locator('.varutabell tr:not([hidden]) button[aria-label^="En "][aria-label$=" till"]').first().click();
      extraInfo += ' sv:' + vv[0] + ' kvar:' + (await p.locator('.utrustning-summa div').nth(2).locator('dd').textContent());
      if (!(await nastaOk())) { await fel('utrustning spärrad: ' + await p.locator('.saknaslista').first().textContent().catch(() => '?')); continue; }
      await nasta();
      const json = await p.locator('#exportruta').inputValue();
      await p.evaluate(() => localStorage.clear()); await p.reload(); await tillRas(p);
      await p.setInputFiles('#importfil', { name: 'test.json', mimeType: 'application/json', buffer: Buffer.from(json) });
      await p.waitForFunction(() => document.querySelector('#notis')?.textContent.trim(), null, { timeout: 5000 }).catch(() => {});
      const notis = await p.locator('#notis').textContent();
      if (!notis.includes('inläst') || notis.includes('gick inte')) await fel('import: ' + notis);
      const topp2 = (await p.locator('.potter .pott-tal').allTextContents()).join(' BP · ') + ' EP';
      if (topp2 !== topp) await fel(`import ändrade värden ${topp} → ${topp2}`);
      if (errs.length) await fel('konsolfel: ' + errs.join(' | '));
      resultat.push(`OK ${ras}/${yrke} ${topp}${extraInfo}`);
    } catch (e) { await fel('undantag: ' + e.message.split('\n').slice(0,3).join(' / ')); }
  }
  console.log(resultat.join('\n'));
  await b.close();
})();
