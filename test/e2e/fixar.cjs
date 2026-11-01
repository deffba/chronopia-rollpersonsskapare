// Backlogpunkterna 3, 5 och 7 samt åldern: ingen instruktionstext för förbestämda färdigheter, bonusen i tärningsrutan,
const { tillRas } = require('./hjalp.cjs');
// nästa steg spärrat när en vald färdighet inte är tillagd, åldern tom från början och enkel metod vid autofyll.
// Körs med `npm run e2e` (startar en egen server).
const { chromium } = require('playwright');
const RASER = ['Dimalv','Drakonit','Dvärg','Goblin','Halvalv','Högländare','Ljusalv','Människa','Orch','Stadsalv','Troll','Wongos'];
const YRKEN = ['animist','bard','elementarmagiker','gladiator','gycklare','hantverkare','krigare','kopman','lard-man','lonnmordare','mentalist','munk','paladin','resenar','tjuv','arkemagiker'];
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


  let antalFel = 0; const ok = (namn, villkor, extra = '') => { console.log(`${villkor ? 'PASS' : 'FAIL'} ${namn}${extra ? ' — ' + extra : ''}`); if (!villkor) antalFel++; };
  const rubrik = () => p.locator('.steg-huvud h2').textContent();
  const knapp = () => p.locator('.steg-fot .primar');
  const ny = async (q = '?dev=av') => { await p.goto((process.env.E2E_BAS || 'http://localhost:8766') + '/index.html' + q); await p.evaluate(() => localStorage.clear()); await p.reload(); await tillRas(p); };

  // Åldern
  await ny();
  await p.locator('.raskort', { hasText: 'Dvärg' }).click(); await fyll(); await knapp().click();
  ok('steg 2 är Ålder', await rubrik() === 'Ålder');
  ok('åldersrutan är tom', await p.inputValue('#alder') === '');
  ok('ingen kategori markerad', await p.locator('tr.valbar.markerad').count() === 0);
  ok('nästa steg spärrat utan ålder', await knapp().isDisabled());
  ok('Ålder i saknaslistan', (await p.locator('.saknaslista li').allTextContents()).includes('Ålder'));
  ok('formuläret visar ingen ålder', !(await p.locator('.formular-huvud p').textContent()).includes(' år'));
  await p.fill('#alder', '75'); await p.press('#alder', 'Tab');
  ok('inskriven ålder ger kategori', await p.locator('tr.valbar.markerad').count() === 1);
  await p.fill('#alder', ''); await p.press('#alder', 'Tab');
  ok('tömd ruta förblir tom', await p.inputValue('#alder') === '' && await knapp().isDisabled());
  await p.click('.steg-innehall button:has-text("Enkel metod")');
  const enkel = await p.inputValue('#alder');
  ok('enkel metod fyller i', enkel !== '' && !(await knapp().isDisabled()), enkel);
  await knapp().click(); ok('vidare till Yrke', await rubrik() === 'Yrke');
  await p.click('.steg-fot .knapp:not(.primar)');
  ok('tillbaka: åldern ligger kvar', await p.inputValue('#alder') === enkel);
  await knapp().click();

  // 3: förbestämd lärdomsfärdighet
  await p.click('[data-yrke="paladin"]'); await knapp().click();
  const paladin = await p.locator('.steg-innehall').textContent();
  ok('paladin: ingen "Skriv ett kunskapsområde"', !paladin.includes('Skriv ett kunskapsområde'));
  ok('paladin: Kunskap om religion visas fast', await p.locator('.steg-innehall .fast', { hasText: 'Kunskap om religion' }).count() === 1);
  await p.click('.steg-fot .knapp:not(.primar)'); await p.click('[data-yrke="munk"]'); await knapp().click();
  ok('munk (ett fritt val kvar): instruktionen visas', (await p.locator('.steg-innehall').textContent()).includes('Skriv ett kunskapsområde'));
  await p.click('.steg-fot .knapp:not(.primar)'); await p.click('[data-yrke="krigare"]'); await knapp().click();

  // 7: vald men inte tillagd extra yrkesfärdighet
  let r = await fyll(); if (r !== true) throw new Error('yrke ' + r);
  ok('steg 4 klart', !(await knapp().isDisabled()) && !(await knapp().getAttribute('class')).includes('sparrad'));
  const extra = await p.locator('#ny-extra-f').evaluate(x => [...x.options].find(o => o.value && !o.disabled && !o.value.includes('magi')).value);
  await p.selectOption('#ny-extra-f', extra);
  ok('vald extra: nästa-knappen ser spärrad ut', (await knapp().getAttribute('class')).includes('sparrad') && await knapp().getAttribute('aria-disabled') === 'true');
  await knapp().click({ force: true }); // aria-disabled: Playwright klickar annars inte, men knappen går att trycka på
  ok('klick ger felmeddelande', !(await p.locator('#notis').isHidden()) && (await p.locator('#notis').textContent()).includes('Lägg till'), await p.locator('#notis').textContent());
  ok('steget lämnas inte', await rubrik() === 'Yrkesfärdigheter');
  await p.locator('.steg li:has-text("Kön och namn") button, #steg button:has-text("Kön och namn")').first().click({ force: true, timeout: 3000 }).catch(() => {});
  ok('stegraden framåt är också spärrad', await rubrik() === 'Yrkesfärdigheter');
  await p.selectOption('#ny-extra-f', '');
  ok('tömt val: nästa-knappen fungerar igen', !(await knapp().getAttribute('class')).includes('sparrad'));
  await nasta();
  await p.fill('#namn', 'Test'); await p.press('#namn', 'Tab'); await p.locator('#kon .valknapp').first().click(); await nasta();
  await p.click('text=Föreslå värden'); await nasta(); await magi();
  // Steg 7 slår 2T20: tärningsrutan visar T20 före och efter slaget
  await p.fill('#sf-bp', '5'); await p.press('#sf-bp', 'Tab');
  ok('steg 7: T20-ikon i tärningsrutan', await p.locator('#sf-sla svg polygon').count() === 2);
  if (process.env.BILD) await p.locator('.steg-innehall .rad').first().screenshot({ path: 'sf1.png' });
  await p.click('#sf-sla'); await p.waitForTimeout(450);
  const t20 = await p.locator('#sf-slag svg.sida').evaluateAll(s => s.map(x => [Number(x.getAttribute('aria-label')), x.querySelectorAll('polygon').length + 1, x.querySelector('text')?.textContent]));
  ok('steg 7: två T20 med sina värden + 5', t20.length === 2 && t20.every(([v, poly, txt]) => poly === 2 && String(v) === txt && v >= 1 && v <= 20) && (await p.locator('#sf-slag').textContent()).trim().endsWith('+ 5'), JSON.stringify(t20));
  if (process.env.BILD) await p.locator('.steg-innehall .rad').first().screenshot({ path: 'sf2.png' });
  r = await fyll(); if (r !== true) throw new Error('förmåga ' + r); await nasta();

  // 5: bonusen i tärningsrutan
  ok('svärdshand utan bonus: Slå 2T6', await p.locator('#sh-sla').textContent() === 'Slå 2T6' || (await p.locator('#sh-sla').textContent()).endsWith('Slå 2T6'), await p.locator('#sh-sla').textContent());
  ok('etiketten utan bonus: Slag (2T6)', (await p.locator('.steg-innehall').textContent()).includes('Slag (2T6)'));
  await p.click('#sh-sla'); await p.waitForTimeout(450);
  const shTarn = await p.locator('#sh-slag svg.sida').evaluateAll(s => s.map(x => [Number(x.getAttribute('aria-label')), x.querySelectorAll('circle').length]));
  ok('svärdshand utan bonus: två T6 med prickar, ingen bonus', shTarn.length === 2 && shTarn.every(([v, n]) => v === n) && (await p.locator('#sh-slag').textContent()).trim() === '+', JSON.stringify(shTarn));
  ok('svärdshand: Resultat och Svärdshand som punkter', (await p.locator('.resultat li').allTextContents()).some(r => r.startsWith('Svärdshand: ')));
  await nasta();
  ok('socialt stånd: notisen om halva BP till startkapitalet', (await p.locator('.steg-innehall').textContent()).includes('Hälften av de BP du lägger här (avrundat uppåt)'));
  await p.fill('#ss-bp', '3'); await p.press('#ss-bp', 'Tab');
  ok('lagda BP räknas som bonus: Slå 2T6+3', (await p.locator('#ss-sla').textContent()).includes('Slå 2T6+3') && !(await p.locator('.bonuslista li').allTextContents()).some(t => t.startsWith('BP lagda')));
  await p.click('#ss-sla'); await p.waitForTimeout(450);
  ok('socialt stånd landat: två tärningar + 3', await p.locator('#ss-slag svg.sida').count() === 2 && (await p.locator('#ss-slag').textContent()).trim().endsWith('+ 3'), await p.locator('#ss-slag').textContent());
  await nasta();
  ok('startkapital: varje bonus för sig, Slå 2T6+2+4', (await p.locator('#sk-sla').textContent()).includes('Slå 2T6+2+4'), await p.locator('#sk-sla').textContent());
  const sk = await p.locator('#sk-sla').textContent();
  ok('etiketten: Slag (2T6+2+4)', (await p.locator('.steg-innehall').textContent()).includes('Slag (2T6+2+4)'));
  ok('inget separat bonusfält', await p.locator('#sk-bonus').count() === 0 && !(await p.locator('.steg-innehall label, .steg-innehall .etikett').allTextContents()).some(t => t.trim().toUpperCase() === 'BONUS'));
  // Ett inskrivet slag delas upp på två tärningar
  await p.click('#menyknapp'); await p.check('#manuella-slag'); await p.keyboard.press('Escape');
  await p.fill('#sk-slag', '11'); await p.click('#sk-sla'); await p.waitForTimeout(200);
  const delade = await p.locator('#sk-slag svg.sida').evaluateAll(s => s.map(x => Number(x.getAttribute('aria-label'))));
  ok('inskrivet slag 11 visas som två tärningar', delade.length === 2 && delade[0] + delade[1] === 11 && delade.every(v => v >= 5 && v <= 6), JSON.stringify(delade));
  await p.click('#menyknapp'); await p.uncheck('#manuella-slag'); await p.keyboard.press('Escape');
  await p.click('.steg-fot .knapp:not(.primar)'); await p.click('.steg-fot .primar');

  ok('landat slag behåller etiketten', (await p.locator('.steg-innehall').textContent()).includes('Slag (2T6+2+4)'));
  ok('landat slag: två tärningar med prickar och bonusen', await p.locator('#sk-slag svg.sida').count() === 2 && (await p.locator('#sk-slag').textContent()).trim().endsWith('+ 2 + 4'), await p.locator('#sk-slag').textContent());
  const prickar = await p.locator('#sk-slag svg.sida').evaluateAll(s => s.map(x => [Number(x.getAttribute('aria-label')), x.querySelectorAll('circle').length]));
  ok('prickarna stämmer med tärningarna och summan', prickar.every(([v, n]) => v === n) && prickar[0][0] + prickar[1][0] === Number(await p.locator('#sk-slag').getAttribute('data-varde')), JSON.stringify(prickar));

  const rader = await p.locator('.resultat li').allTextContents();
  const overst = await p.locator('.bonuslista li').allTextContents();
  ok('Tak för startkapital sist bland punkterna överst', /^Tak för startkapital: \d+$/.test(overst.at(-1)), overst.join(' | '));
  ok('Resultat som punktlista: Resultat, Åldersbonus (taket står överst)', /^Resultat: \d+/.test(rader[0]) && !rader.some(r => r.startsWith('Tak')) && rader.some(r => r.startsWith('Åldersbonus: ')) && !rader.some(r => r.startsWith('Startkapital')), rader.join(' | '));
  const total = p.locator('#sk-total');
  ok('Totalt startkapital på egen rad, stor och fet', /^Totalt startkapital: [\d\s ]+ sm$/.test(await total.textContent()) && Number(await total.evaluate(e => getComputedStyle(e).fontWeight)) >= 700, await total.textContent());
  await nasta();

  // 7 i steg 11: vald men inte tillagd sekundär färdighet
  const sek = await p.locator('#ny-sek-f').evaluate(x => [...x.options].find(o => o.value && !o.disabled && !o.value.includes('magi')).value);
  await p.selectOption('#ny-sek-f', sek);
  await knapp().click({ force: true });
  ok('steg 11: spärrat med vald sekundär färdighet', await rubrik() === 'Färdigheter' && (await p.locator('#notis').textContent()).includes('Lägg till'));
  await p.selectOption('#ny-sek-f', ''); await nasta();
  ok('steg 11: tömt val går vidare', await rubrik() !== 'Färdigheter', await rubrik());

  // Autofyll i utvecklarläget sätter enkel metod
  await p.goto((process.env.E2E_BAS || 'http://localhost:8766') + '/index.html?dev');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('chronopia-dev-autofyll', 'ja'); }); await p.reload(); await tillRas(p);
  await p.locator('.raskort', { hasText: 'Dimalv' }).click(); await p.waitForTimeout(150); await knapp().click(); await p.waitForTimeout(300);
  const auto = await p.inputValue('#alder');
  const vuxen = await p.locator('.steg-innehall button:has-text("Enkel metod")').textContent();
  ok('autofyll väljer enkel metod', auto !== '' && vuxen.includes(`${auto} år`), `${auto} / ${vuxen}`);

  ok('inga konsolfel', errs.length === 0, errs.join(' | '));
  console.log(antalFel ? `${antalFel} FAIL` : 'Alla PASS');
  await b.close();
})();
