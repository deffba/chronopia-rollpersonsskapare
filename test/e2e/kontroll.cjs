const { chromium } = require('playwright');
const { tillRas } = require('./hjalp.cjs');
const res = []; const ok = (namn, villkor, info = '') => res.push(`${villkor ? 'PASS' : 'FAIL'} ${namn}${info ? ' — ' + info : ''}`);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 900 }, reducedMotion: 'reduce' });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const esc = (s) => s.replace(/([:+.])/g, '\\$1');
  const nastaKnapp = () => p.locator('.steg-fot .primar');
  const alderKlar = async () => { if (await p.locator('#alder').count() && !(await p.inputValue('#alder'))) await p.click('.steg-innehall button:has-text("Enkel metod")'); }; // åldern är tom från början (steg 2)
  const nasta = async () => { await alderKlar(); if (await p.locator('#sf-modal-fortsatt:not([disabled])').count()) await p.click('#sf-modal-fortsatt'); await nastaKnapp().click(); };
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
  const rubrik = () => p.locator('.steg-huvud h2').textContent();
  async function fyll() { for (let i = 0; i < 40; i++) {
    if (!(await nastaKnapp().isDisabled())) return true;
    const g = p.locator('.steg-innehall .valknappar:not(.gjort)').first(); if (await g.count()) { await g.locator('.valknapp:not([disabled])').first().click(); continue; }
    const sel = await p.locator('.steg-innehall select:not(#yrke):not(#valt-stand):not(#ny-extra-f):not(#ny-sek-f)').evaluateAll(s => s.filter(x => !x.value).map(x => ({ id: x.id, alt: [...x.options].filter(o => o.value && !o.disabled).map(o => o.value) })));
    if (sel.length) { for (const v of sel[0].alt) { await p.selectOption('#' + esc(sel[0].id), v); if (await p.locator('#' + esc(sel[0].id)).inputValue() === v) break; } continue; }
    const t = await p.locator('.steg-innehall input[type=text]:not([readonly])').evaluateAll(s => s.filter(x => !x.value).map(x => x.id)); if (t.length) { await p.fill('#' + esc(t[0]), 'Kross' + i); await p.press('#' + esc(t[0]), 'Tab'); continue; }
    return false; } }
  const ny = async () => { await p.goto((process.env.E2E_BAS || 'http://localhost:8766') + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await tillRas(p); };
  async function tillSteg6(ras, yrke, alderRad) {
    await ny(); await p.locator('.raskort', { hasText: ras }).click(); await fyll(); await nasta();
    if (alderRad) await p.locator('tr.valbar', { hasText: alderRad }).click();
    await nasta(); await p.click(`[data-yrke="${yrke}"]`); await nasta(); await fyll(); await nasta();
    await p.fill('#namn', 'Test'); await p.press('#namn', 'Tab'); await p.locator('#kon .valknapp').first().click(); await nasta();
  }
  async function slaKlart(ssBp = 0) {
    await p.click('text=Föreslå värden');
    await nasta();
    await magi();
    await p.fill('#sf-bp', '5'); await p.press('#sf-bp', 'Tab'); await p.locator('#sf-sla').click(); await p.waitForTimeout(450); await fyll(); await nasta();
    for (const id of ['sh', 'ss', 'sk']) {
      if (id === 'ss' && ssBp) { await p.fill('#ss-bp', String(ssBp)); await p.press('#ss-bp', 'Tab'); }
      if (await p.locator(`#${id}-sla:not([disabled])`).count()) { await p.click(`#${id}-sla`); await p.waitForTimeout(450); }
      await nasta();
    }
  }

  // 0. Runda 13: Klassisk som standard, steg 1-texter
  await ny();
  ok('Klassisk är standard', await p.evaluate(() => document.documentElement.dataset.stil) === 'klassisk');
  ok('meny stängd från början', await p.locator('#menypanel').isHidden() && await p.locator('#ny').isHidden());
  ok('inga BP spenderade vid start', (await p.locator('.pott .pott-tal').first().textContent()) === '125');
  ok('grundegenskaper visar – vid start', (await p.locator('.egenskaper dd:not(.egenskap-info)').allTextContents()).every(t => t === '–'));
  ok('härledda värden visar – vid start', (await p.locator('.nyckelvarden dd').first().textContent()) === '–');
  ok('manuella slag av från början', !(await p.locator('#manuella-slag').isChecked()));
  await p.locator('.raskort', { hasText: 'Dvärg' }).click();
  ok('valfritt hantverk', await p.locator('.steg-innehall', { hasText: 'valfritt hantverk' }).count() === 1 && await p.locator('.steg-innehall', { hasText: 'valfri hantverk' }).count() === 0);
  ok('infoikon för infrasyn', await p.locator('.steg-innehall button.info[data-tip*="Ser värme"]').count() >= 1);
  ok('BP (bakgrundspoäng)', await p.locator('button.info[data-tip^="BP (bakgrundspoäng)"]').count() >= 1);

  // 1. Start utan förvald ras, sparad rollperson erbjuds, husregler dolda
  await ny();
  ok('ingen ras förvald vid start', await p.locator('.raskort.valt').count() === 0);
  ok('husregler visas inte', await p.locator('text=Husregler och tolkningar').count() === 0);
  await p.locator('.raskort', { hasText: 'Dvärg' }).click();
  await p.reload(); await tillRas(p);
  ok('efter omladdning: ingen ras vald', await p.locator('.raskort.valt').count() === 0);
  ok('sparad rollperson erbjuds', await p.locator('#fortsatt-sparad').count() === 1);
  await p.click('#fortsatt-sparad');
  ok('Fortsätt återställer rasen', (await p.locator('.raskort.valt').textContent()) === 'Dvärg');
  await p.locator('.raskort.valt').click();
  ok('klick på vald ras avmarkerar', await p.locator('.raskort.valt').count() === 0);

  // 2. Ålder: uråldrig halvalv
  await tillSteg6('Halvalv', 'krigare', 'Uråldrig');
  ok('uråldrig halvalv når steg 6', (await rubrik()) === 'Grundegenskaper');
  ok('varning om för lågt slutvärde', await p.locator('.varning', { hasText: 'minst 3' }).count() === 1);
  ok('steg 6 spärrat tills det är åtgärdat', await nastaKnapp().isDisabled());
  ok('Återställ dold före förslag', await p.locator('.steg-innehall button', { hasText: /^Återställ$/ }).count() === 0);
  await p.click('text=Föreslå värden');
  ok('förslaget löser det', !(await nastaKnapp().isDisabled()));
  ok('Återställ syns efter förslag', await p.locator('.steg-innehall button', { hasText: /^Återställ$/ }).count() === 1);

  // 3. Slag: låsta fält, bonus, Resultat (stadsalv köpman)
  await tillSteg6('Stadsalv', 'kopman');
  await p.click('text=Föreslå värden'); await nasta();
  await p.fill('#sf-bp', '5'); await p.press('#sf-bp', 'Tab'); await p.click('#sf-sla'); await p.waitForTimeout(450);
  ok('efter slag: BP lagda låst', await p.locator('#sf-bp[readonly]').count() === 1 && await p.locator('.falt', { hasText: 'BP lagda' }).count() === 1);
  ok('efter slag: två T20 och lagda BP som bonus', await p.locator('#sf-slag.landad svg.sida').count() === 2 && (await p.locator('#sf-slag .slagvarde').textContent()).trim().endsWith('+ 5'), await p.locator('#sf-slag').textContent());
  ok('BP lagda är ett sifferfält som innan', (await p.locator('#sf-bp').getAttribute('type')) === 'number');
  ok('efter slag: tärningsrutan borta', await p.locator('#sf-sla').count() === 0);
  ok('Resultat-rubrik', await p.locator('.resultat .etikett', { hasText: 'Resultat' }).count() === 1);
  await fyll(); await nasta();
  // manuellt slag i svärdshand
  ok('inget sifferfält för slaget utan manuella slag', await p.locator('#sh-slag').count() === 0 && await p.locator('.falt', { hasText: 'Slag (2T6)' }).locator('#sh-sla').count() === 1);
  await p.click('#menyknapp'); await p.check('#manuella-slag'); await p.click('.steg-huvud h2');
  ok('menyn stängs vid klick utanför', await p.locator('#menypanel').isHidden());
  ok('Bekräfta slag spärrad utan värde', (await p.locator('#sh-sla').textContent()).includes('Bekräfta slag') && await p.locator('#sh-sla').isDisabled());
  await p.fill('#sh-slag', '13');
  ok('Bekräfta slag spärrad utanför 2–12', await p.locator('#sh-sla').isDisabled());
  await p.fill('#sh-slag', '7');
  ok('Bekräfta slag möjlig med giltigt värde', !(await p.locator('#sh-sla').isDisabled()));
  await p.click('#sh-sla');
  ok('manuellt slag låses också', (await p.locator('#sh-slag.landad').getAttribute('data-varde')) === '7' && await p.locator('#sh-slag.landad svg.sida').count() === 2, await p.locator('.resultat').textContent());
  await p.click('#menyknapp'); await p.uncheck('#manuella-slag'); await p.keyboard.press('Escape');
  await nasta();
  ok('bonuspunkt för ras i socialt stånd', await p.locator('.bonuslista li', { hasText: 'Ras (stadsalv): +15' }).count() === 1);
  ok('bonusen i tärningsrutan, inget bonusfält', (await p.locator('#ss-sla').textContent()).includes('Slå 2T6+15') && !(await p.locator('#ss-bonus').count()));
  await p.click('#ss-sla'); await p.waitForTimeout(450); await nasta();
  ok('tre bonusar i startkapital', await p.locator('.bonuslista li').count() === 3 || await p.locator('.bonuslista li').count() === 4); // bonusarna och taket
  ok('bonusen i startkapitalets tärningsruta', /Slå 2T6\+\d+/.test(await p.locator('#sk-sla').textContent()) && !(await p.locator('#sk-bonus').count()));
  await p.click('#sk-sla'); await p.waitForTimeout(450); await nasta();

  // 4. Färdigheter, klistrad rubrik, skroll
  ok('steg 11', (await rubrik()) === 'Färdigheter');
  const forsta = await p.locator('#ny-sek-f option').evaluateAll(o => o.filter(x => x.value).map(x => x.value));
  let enkel = null;
  for (const v of forsta) { await p.selectOption('#ny-sek-f', v); if (!(await p.locator('#ny-sek-d').count())) { enkel = v; break; } }
  await p.locator('.steg-innehall button', { hasText: /^Lägg till$/ }).click();
  ok('vald sekundär färdighet försvinner ur listan', await p.locator(`#ny-sek-f option[value="${enkel}"]`).count() === 0, enkel);
  await p.selectOption('#ny-sek-f', 'hantverk');
  const hv = await p.locator('#ny-sek-d option:not([disabled])').evaluateAll(o => o.filter(x => x.value).map(x => x.value));
  await p.selectOption('#ny-sek-d', hv[0]); await p.locator('.steg-innehall button', { hasText: /^Lägg till$/ }).click();
  await p.selectOption('#ny-sek-f', 'hantverk');
  ok('valt hantverk spärras i delvalet', await p.locator(`#ny-sek-d option[value="${hv[0]}"][disabled]`).count() === 1, hv[0]);
  await p.selectOption('#ny-sek-f', '');
  ok('Nollställ FV dold före fördelning', await p.locator('text=Nollställ FV').count() === 0);
  await p.click('text=Fördela EP automatiskt');
  ok('Nollställ FV syns efter fördelning', await p.locator('text=Nollställ FV').count() === 1);
  await p.mouse.wheel(0, 1500); await p.waitForTimeout(300);
  const topp = await p.locator('.steg-huvud').evaluate(e => e.getBoundingClientRect().top);
  ok('stegrubriken klistrad vid skroll', Math.abs(topp) < 2, `top=${topp}`);
  ok('Besvärjelser dold för köpman utan magi', await p.locator('#steg', { hasText: 'Besvärjelser' }).count() === 0);
  await nasta(); await p.waitForTimeout(700);
  ok('skrollar upp vid stegbyte', (await p.evaluate(() => scrollY)) < 5, `scrollY=${await p.evaluate(() => scrollY)}`);

  // 5. Utrustning
  ok('steg Utrustning', (await rubrik()) === 'Utrustning');
  ok('pengamätare i rubriken', /^[\d\s\u202f]+\/[\d\s\u202f]+$/.test(await p.locator('#pengar-kvar dd').textContent()), await p.locator('#pengar-kvar dd').textContent());
  await p.click('text=Äventyrarutrustning');
  await p.click('button[aria-label="En Pilar (10 st) till"]'); await p.click('button[aria-label="En Pilar (10 st) till"]');
  await p.click('text=Behållare');
  for (let i = 0; i < 3; i++) await p.click('button[aria-label="En Trätunna (100 liter) till"]');
  ok('viktvarning', await p.locator('#viktvarning').count() === 1);
  const blad = (await p.locator('.formular .fardighetsrader').last().locator('li span:first-child').allTextContents());
  ok('Pilar (x20) på formuläret', blad.includes('Pilar (x20)'), blad.join(' | '));
  ok('Trätunna (100 liter, x3)', blad.includes('Trätunna (100 liter, x3)'));
  ok('Vikt-kolumn', (await p.locator('.formular .fardighetsrader').last().locator('li.kolumnrubrik').textContent()).includes('Vikt'));
  ok('KP-rubrik på kroppsdelar', await p.locator('.formular .kroppsdelar li.kolumnrubrik', { hasText: 'KP' }).count() === 2);
  const fv = await p.locator('.formular .fardighetsrader li', { hasText: 'Tala' }).first().textContent();
  ok('språknivå i parentes efter språket', /Tala .+\(B\d\)\d+$/.test(fv), fv);
  for (let i = 0; i < 3; i++) await p.click('button[aria-label="En Trätunna (100 liter) mindre"]');
  await p.click('#varusok'); await p.keyboard.type('pil');
  const synligaVaror = await p.locator('.varutabell tbody tr:visible td:first-child').allTextContents();
  ok('fritextfilter filtrerar medan man skriver', synligaVaror.length >= 1 && synligaVaror.every(t => /pil/i.test(t.split(' · ')[0])), synligaVaror.join(' | '));
  ok('sökfältet behåller fokus', await p.evaluate(() => document.activeElement?.id) === 'varusok');
  await p.keyboard.type('xyzq');
  ok('inga träffar visas', await p.locator('#inga-varor:visible').count() === 1);
  await p.fill('#varusok', '');
  await p.click('text=Äventyrarutrustning');
  for (let i = 0; i < 2; i++) await p.click('button[aria-label="En Pilar (10 st) mindre"]');

  // 6. Gladiator: stridskonster
  await tillSteg6('Människa', 'gladiator');
  await p.click('text=Föreslå värden'); await p.locator('.steg-fot .knapp:not(.primar)').click(); // tillbaka till steg 5
  await p.locator('#steg .steg-namn', { hasText: /^Yrkesfärdigheter$/ }).click();
  ok('inforuta om tekniker i steg 4', await p.locator('.stridskonst-info').count() === 1);
  ok('inga tekniker i steg 4', await p.locator('.stridskonst').count() === 0);
  await p.locator('#steg .steg-namn', { hasText: /^Grundegenskaper$/ }).click(); await nasta();
  await p.fill('#sf-bp', '5'); await p.press('#sf-bp', 'Tab'); await p.click('#sf-sla'); await p.waitForTimeout(450); await fyll(); await nasta();
  for (const id of ['sh', 'ss', 'sk']) { if (await p.locator(`#${id}-sla:not([disabled])`).count()) { await p.click(`#${id}-sla`); await p.waitForTimeout(450); } await nasta(); }
  ok('spärr: välj tekniker', (await p.locator('.steg-innehall + .saknaslista, .saknaslista').first().textContent()).includes('tekniker'));
  const namnfalt = p.locator('.stridskonst input[type=text]');
  await namnfalt.fill('Gatukross'); await namnfalt.press('Tab');
  ok('stilen bytte namn', (await p.locator('.stridskonst h3').textContent()).includes('Gatukross'));
  await p.locator('.stridskonst input[type=checkbox]').first().check();
  await p.click('text=Fördela EP automatiskt');
  const kvar = Number(await p.locator('.steg-potter dd').nth(1).textContent());
  const valbara = await p.locator('.teknik:not(.for-dyr) input:not(:checked)').count();
  ok('dyra tekniker spärrade när EP är slut', kvar > 3 || valbara < 22, `EP kvar ${kvar}, valbara ${valbara}`);
  await p.click('text=Färdigställ stridskonst');
  ok('färdigställd: bara valda tekniker med beskrivning', await p.locator('.teknikbeskrivningar li').count() === 1 && await p.locator('text=Färdigställ stridskonst').count() === 0);
  await p.locator('.stridskonst button', { hasText: 'Ändra' }).click();
  ok('Ändra öppnar igen', await p.locator('.stridskonst input[type=checkbox]').count() === 22);

  // 7. Mentalist: besvärjelsesteg finns
  await tillSteg6('Människa', 'mentalist');
  await slaKlart();
  await p.click('text=Fördela EP automatiskt'); await nasta();
  ok('Besvärjelser för magiker', (await rubrik()) === 'Besvärjelser');
  ok('besvärjelsetabell', await p.locator('.besvarjelsetabell').count() >= 1);

  // 8. Äldre delar: Ny rollperson, stilbyte, smal skärm
  await p.click('#menyknapp');
  ok('menyn: Startsidan, Ny, Läs in fil, Rollformulär, manuella slag, tema sist', await p.evaluate(() => { const ids = [...document.querySelectorAll('#menypanel button, #menypanel input')].filter(e => !e.hidden).map(e => e.id || e.dataset.stil); return ids.join(','); }) === 'till-start,ny,importfil,visa-formular,manuella-slag,klassisk,modern');
  await p.click('#ny'); ok('Ny rollperson kräver bekräftelse', (await p.locator('#ny').textContent()).includes('Bekräfta'));
  await p.click('#ny'); ok('Ny rollperson börjar om i steg 0', (await rubrik()) === 'Böcker'); await tillRas(p); ok('Ny rollperson: ingen ras vald', (await rubrik()) === 'Ras' && await p.locator('.raskort.valt').count() === 0);
  if (await p.locator('#menypanel').isHidden()) await p.click('#menyknapp');
  await p.click('.stilval button[data-stil="modern"]');
  ok('stilbyte till Modern', await p.evaluate(() => document.documentElement.dataset.stil) !== 'klassisk');
  await p.click('.stilval button[data-stil="klassisk"]');
  ok('stilbyte till Klassisk', await p.evaluate(() => document.documentElement.dataset.stil) === 'klassisk');
  await p.setViewportSize({ width: 400, height: 800 });
  ok('ingen sidledsskroll på 400 px', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await p.setViewportSize({ width: 1400, height: 900 });
  const eg = await p.locator('.egenskaper > div').first().evaluate(d => { const r = d.getBoundingClientRect(); const c = (e) => { const b = e.getBoundingClientRect(); return b.x + b.width / 2 - (r.x + r.width / 2); }; return { dt: c(d.querySelector('dt')), dd: c(d.querySelector('dd')), info: d.querySelector('.info').getBoundingClientRect().y - d.querySelector('dd').getBoundingClientRect().bottom }; });
  ok('grundegenskap: namn och värde centrerade, info längst ned', Math.abs(eg.dt) < 1 && Math.abs(eg.dd) < 1 && eg.info >= 0, JSON.stringify(eg));
  ok('inga konsolfel', errs.length === 0, errs.join(' | '));
  console.log(res.join('\n'));
  await b.close();
})().catch(e => { console.log(res.join('\n')); console.log('UNDANTAG', e.message.split('\n').slice(0,4).join(' / ')); process.exit(1); });
