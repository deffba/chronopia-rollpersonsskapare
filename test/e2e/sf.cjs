const { chromium } = require('playwright');
const RASER = ['Dimalv','Drakonit','Dvärg','Goblin','Halvalv','Högländare','Ljusalv','Människa','Orch','Stadsalv','Troll','Wongos'];
const YRKEN = ['animist','bard','elementarmagiker','gladiator','gycklare','hantverkare','krigare','kopman','lard-man','lonnmordare','mentalist','munk','paladin','resenar','tjuv','arkemagiker'];
const [RAS, YRKE] = [process.argv[2] ?? 'Människa', process.argv[3] ?? 'krigare'];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  let errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto((process.env.E2E_BAS || 'http://localhost:8766') + '/index.html'); await p.waitForSelector('.raskort');
  const nastaOk = async () => !(await p.locator('.steg-fot .primar').isDisabled());
  const alderKlar = async () => { if (await p.locator('#alder').count() && !(await p.inputValue('#alder'))) await p.click('.steg-innehall button:has-text("Enkel metod")'); }; // åldern är tom från början (steg 2)
  const nasta = async () => { await alderKlar(); if (await p.locator('#sf-modal-fortsatt:not([disabled])').count()) await p.click('#sf-modal-fortsatt'); await p.locator('.steg-fot .primar').click(); };
  async function fyll(varv = 40) {
    for (let i = 0; i < varv; i++) {
      if (await nastaOk()) return true;
      const grupp = p.locator('.steg-innehall .valknappar:not(.gjort)').first();
      if (await grupp.count()) { await grupp.locator('.valknapp').first().click(); continue; }
      const sel = await p.locator('.steg-innehall select:not(#valt-stand):not(#yrke):not(#ny-extra-f):not(#ny-sek-f)').evaluateAll(s => s.filter(x => !x.value && !x.disabled).map(x => ({ id: x.id, alt: [...x.options].filter(o => o.value && !o.disabled).map(o => o.value) })));
      if (sel.length) {
        const { id, alt } = sel[0]; let klar = false;
        for (const v of alt) { await p.selectOption('#' + CSS_escape(id), v); if (await p.locator('#' + CSS_escape(id)).inputValue().catch(() => '') === v) { klar = true; break; } }
        if (!klar) return `kunde inte välja något i ${id}`;
        continue;
      }
      const txt = await p.locator('.steg-innehall input[type=text]').evaluateAll(s => s.filter(x => !x.value).map(x => x.id));
      if (txt.length) { await p.fill('#' + CSS_escape(txt[0]), 'Test' + i); await p.press('#' + CSS_escape(txt[0]), 'Tab'); continue; }
      return 'fastnade: ' + (await p.locator('.saknaslista').first().textContent().catch(() => '?'));
    }
    return 'för många varv';
  }
  function CSS_escape(s) { return s.replace(/([:+.])/g, '\\$1'); }

  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.raskort');
  await p.locator('.raskort', { hasText: RAS }).click(); await fyll(); await nasta(); await nasta();
  await p.click(`[data-yrke="${YRKE}"]`); await nasta(); await fyll(); await nasta();
  await p.fill('#namn', 'Test'); await p.press('#namn', 'Tab'); await p.locator('#kon .valknapp').first().click(); await nasta();
  await p.click('text=Föreslå värden'); await nasta();
  const bild = await p.evaluate(() => localStorage.getItem('chronopia-rollperson-v2'));
  const ut = [];
  for (let mal = 3; mal <= 80; mal++) {
    // Sidan börjar alltid med en ny rollperson; den sparade öppnas med Fortsätt med den. Slagen skrivs in (manuella slag).
    await p.evaluate((b) => { localStorage.setItem('chronopia-rollperson-v2', b); localStorage.setItem('chronopia-manuella-slag', 'ja'); }, bild);
    await p.reload(); await p.click('#fortsatt-sparad'); await p.waitForSelector('#sf-bp');
    const bp = Math.max(1, mal - 40), slag = mal - bp;
    await p.fill('#sf-bp', String(bp)); await p.press('#sf-bp', 'Tab');
    await p.fill('#sf-slag', String(slag)); await p.click('#sf-sla');
    const r = await fyll(25);
    const namn = (await p.locator('.resultat .summering').first().locator('li').nth(1).textContent().catch(() => '')).split(':')[0];
    if (r !== true) ut.push(`${mal} ${namn}: ${r} | ${await p.locator('#notis').textContent()}`);
  }
  console.log(RAS, YRKE, ut.length ? '\n' + ut.join('\n') : 'alla ok');
  await b.close();
})();
