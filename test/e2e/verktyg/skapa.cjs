const { chromium } = require('playwright');
const RASER = ['Dimalv','Drakonit','Dvärg','Goblin','Halvalv','Högländare','Ljusalv','Människa','Orch','Stadsalv','Troll','Wongos'];
const YRKEN = ['animist','bard','elementarmagiker','gladiator','gycklare','hantverkare','krigare','kopman','lard-man','lonnmordare','mentalist','munk','paladin','resenar','tjuv','arkemagiker'];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
  let errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto((process.env.E2E_BAS || 'http://localhost:8766') + '/index.html'); await p.waitForSelector('.raskort');
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

  const fs = require('fs');
  const UT = process.argv[2] || '.';
  async function skapa(ras, yrke) {
      await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.raskort');
      await p.locator('.raskort', { hasText: ras }).click();
      let r = await fyll(); if (r !== true) throw new Error('ras ' + r); await nasta();
      await nasta();
      await p.click(`[data-yrke="${yrke}"]`); await nasta(); // yrke: korten i steg 3, valen i steg 4
      r = await fyll(); if (r !== true) throw new Error('yrke ' + r); await nasta();
      await p.fill('#namn', ras + ' ' + yrke); await p.press('#namn', 'Tab'); await p.locator('#kon .valknapp').first().click(); await nasta();
      await p.click('text=Föreslå värden');
      await nasta();
      await magi();
      await p.fill('#sf-bp', '5'); await p.press('#sf-bp', 'Tab'); await p.locator('button', { hasText: /^Slå 2T20([+−]\d+)*$/ }).click(); await p.waitForTimeout(450);
      r = await fyll(); if (r !== true) throw new Error('förmåga ' + r); await nasta();
      for (const steg of ['svärdshand', 'stånd', 'kapital']) {
        const k = p.locator('.steg-innehall .knapp', { hasText: /^Slå 2T6([+−]\d+)*$/ });
        if (await k.count()) { await k.click(); await p.waitForTimeout(450); }
        await nasta();
      }
      for (const c of await p.locator('.stridskonst').all()) await c.locator('input[type=checkbox]').first().check();
      await p.click('text=Fördela EP automatiskt');
      await nasta();
      const bv = p.locator('.besvarjelsetabell input[type=number]');
      for (let i = 0; i < Math.min(4, await bv.count()); i++) { await bv.nth(i).fill('1'); await bv.nth(i).press('Tab'); await p.waitForTimeout(50); }
      if ((await p.locator('.steg-huvud h2').textContent()) === 'Besvärjelser') await nasta();
      await p.check('#startpaket');
      const vv = await p.locator('#startpaket-vapen').evaluate(x => [...x.options].filter(o => o.value && !o.disabled).map(o => o.value));
      await p.selectOption('#startpaket-vapen', vv[0]);
      await p.locator('.varutabell tr:not([hidden]) button[aria-label^="En "][aria-label$=" till"]').first().click();
      await nasta();
      return await p.locator('#exportruta').inputValue();
  }
  const lista = (process.argv[3] || 'Högländare/krigare,Dimalv/arkemagiker,Troll/gladiator').split(',');
  for (const x of lista) {
    const [ras, yrke] = x.split('/');
    try { const json = await skapa(ras, yrke); fs.writeFileSync(`${UT}/${ras}-${yrke}.json`, json); console.log('OK', x, errs.join('|')); }
    catch (e) { console.log('FEL', x, e.message.split('\n')[0]); }
  }
  await b.close();
})();
