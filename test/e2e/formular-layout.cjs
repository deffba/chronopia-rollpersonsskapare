// Rollformulärets layout: Utseende och bakgrund överst på sida 2, besvärjelserna på en egen sida,
// vapenfärdigheterna bland färdigheterna och bara ägda vapen under Vapen/sköld, och text som görs mindre
// och bryts i stället för att kortas. Körs med `npm run e2e` (startar en egen server). Kör med LANG=C.UTF-8.
const { chromium } = require('playwright');
const res = []; const ok = (namn, villkor, info = '') => res.push(`${villkor ? 'PASS' : 'FAIL'} ${namn}${info ? ' — ' + info : ''}`);
const BAS = process.env.E2E_BAS || 'http://localhost:8766';

(async () => {
  const b = await chromium.launch();
  try {
    const p = await b.newPage({ viewport: { width: 1300, height: 1000 }, reducedMotion: 'reduce' });
    const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await p.goto(`${BAS}/index.html?dev`);
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('chronopia-dev', 'ja'); localStorage.setItem('chronopia-dev-autofyll', 'nej'); });
    await p.reload(); await p.waitForTimeout(200);
    const ladda = async (id) => {
      await p.click('#menyknapp'); await p.selectOption('#dev-lage', 'formular'); await p.click(`#dev-${id}`); await p.waitForTimeout(500);
      await p.waitForSelector('#rf-vy .rf-sida'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    };
    const lista = (titel) => p.locator('.rf-lista', { has: p.locator(`.rf-rubrik-titel:text-is("${titel}")`) }).first();
    const namnI = (titel) => lista(titel).locator('.rf-rad:not(.tom) .rf-namntext').allTextContents();
    const vapenrader = () => p.locator('.rf-vapen .rf-rad:not(.tom)').evaluateAll((r) => r.map((x) => [...x.querySelectorAll('.rf-cell')].map((c) => c.innerText.trim())));
    // Text som webbläsaren kortar (klipper eller ersätter med …) i en ruta på formuläret
    const kortade = () => p.evaluate(() => [...document.querySelectorAll('#rf-vy .rf-sida *')]
      .filter((e) => !e.matches('input, textarea') && e.children.length === 0 && e.textContent.trim() && getComputedStyle(e).overflow !== 'visible'
        && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)).map((e) => e.textContent));

    // ---- Krigare: yrkets vapenfärdigheter (Dolk, Kortsvärd, Bredsvärd) står bland yrkesfärdigheterna
    await ladda('krigare');
    const yrke = await namnI('Yrkesfärdigheter');
    ok('krigare: vapenfärdigheterna bland yrkesfärdigheterna', ['Dolk', 'Kortsvärd', 'Bredsvärd'].every((v) => yrke.includes(v)), yrke.join(', '));
    const rader = await vapenrader();
    const fvDolk = await lista('Yrkesfärdigheter').locator('.rf-rad', { has: p.locator('.rf-namntext:text-is("Dolk")') }).locator('.rf-tal').last().textContent();
    ok('krigare: Vapen/sköld har bara vapnet rollpersonen äger (Dolk)', rader.length === 1 && rader[0][0] === 'Dolk', JSON.stringify(rader));
    ok('krigare: vapnet har FV från vapenfärdigheten', rader[0]?.[1] === fvDolk.trim(), `${rader[0]?.[1]} / ${fvDolk}`);
    ok('Vapen/sköld har ingen erf-kolumn', !(await p.locator('.rf-vapen .rf-rubrik-kol').allTextContents()).includes('Erf'));
    const sida2 = p.locator('.rf-sida').nth(1);
    ok('sida 2: Utseende och bakgrund överst i högra kolumnen', (await sida2.locator('.rf-hoger2 > *').first().getAttribute('class')).includes('rf-utseende'));
    const hojd = await sida2.locator('.rf-utseende').evaluate((e) => e.getBoundingClientRect().height / (96 / 25.4));
    ok('sida 2: Utseende och bakgrund är större (minst 120 mm hög)', hojd >= 120, `${Math.round(hojd)} mm`);
    ok('utan besvärjelser: ingen ruta för besvärjelser', await p.locator('#rf-besvarjelser').count() === 0 && await p.locator('.rf-sida').count() === 2);
    ok('krigare: ingen text kortas', (await kortade()).length === 0, (await kortade()).join(' | '));
    const lang = p.locator('.rf-namntext', { hasText: 'Två vapen (Kortsvärd+Dolk)' });
    ok('lång text görs mindre i stället för att kortas', await lang.evaluate((e) => e.classList.contains('rf-tat') && parseFloat(e.style.fontSize) < 11.2));

    // ---- Vapen utan egen färdighet: halva FV från en färdighet i samma vapengrupp (s. 71), annars tomt
    const rp = await p.evaluate(() => JSON.parse(localStorage.getItem('chronopia-rollperson-v2')).rp);
    rp.utrustning = { 'Kortsvärd': 1, 'Kroksabel': 1, 'Slunga': 1 }; // 1 090 sm av 1 500
    await p.setInputFiles('#importfil', { name: 't.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(rp)) });
    await p.waitForTimeout(300);
    if (!(await p.locator('#rf-vy').isVisible())) { await p.click('#menyknapp'); await p.click('#visa-formular'); await p.waitForTimeout(500); }
    const fvKortsvard = Number(await lista('Yrkesfärdigheter').locator('.rf-rad', { has: p.locator('.rf-namntext:text-is("Kortsvärd")') }).locator('.rf-tal').last().textContent());
    const vr = Object.fromEntries((await vapenrader()).map((r) => [r[0].split('\n')[0], r]));
    ok('köpt vapen med egen färdighet: Kortsvärd har sitt FV', vr['Kortsvärd']?.[1] === String(fvKortsvard), JSON.stringify(vr['Kortsvärd']));
    const fvSvard = Math.max(...await Promise.all(['Kortsvärd', 'Bredsvärd'].map(async (n) => Number(await lista('Yrkesfärdigheter').locator('.rf-rad', { has: p.locator(`.rf-namntext:text-is("${n}")`) }).locator('.rf-tal').last().textContent()))));
    ok('vapen i samma grupp: Kroksabel får halva bästa FV i enhandssvärd', vr['Kroksabel']?.[1] === String(Math.floor(fvSvard / 2)) && vr['Kroksabel'][0].includes('halva FV'), JSON.stringify(vr['Kroksabel']));
    ok('vapen utan färdighet i gruppen: Slunga utan FV', vr['Slunga']?.[1] === '', JSON.stringify(vr['Slunga']));
    ok('vapen rollpersonen inte äger står inte under Vapen/sköld (Bredsvärd)', !vr['Bredsvärd']);

    // ---- Magiker: besvärjelserna på en egen sida 3, inte på sida 2
    await ladda('magiker');
    const besv = await p.locator('#rf-besvarjelser .rf-rad:not(.tom)').count();
    ok('magiker: besvärjelserna på sida 3', besv > 0 && await p.locator('.rf-sida').nth(2).locator('#rf-besvarjelser').count() === 1, `${besv} besvärjelser`);
    ok('magiker: sida 2 har inga besvärjelser', await p.locator('.rf-sida').nth(1).locator('.rf-rubrik-titel:text-is("Besvärjelser")').count() === 0);
    ok('magiker: ingen text kortas', (await kortade()).length === 0, (await kortade()).join(' | '));

    // ---- Många och långa särskilda förmågor: rutan på sida 1 kortar inget, resten på sida 3
    await ladda('dvarg-barsark');
    ok('bärsärk: ingen text kortas', (await kortade()).length === 0, (await kortade()).join(' | '));
    const ruta = await p.locator('.rf-mitt > .rf-formagor').evaluate((e) => e.scrollHeight <= e.clientHeight + 1);
    ok('bärsärk: särskilda förmågor får plats i rutan på sida 1', ruta);
    ok('bärsärk: övriga förmågor på sida 3', await p.locator('.rf-sida3 .rf-rubrik-titel:text-is("Fler särskilda förmågor")').count() === 1);
    for (const id of ['vr-ordenskrigare', 'alv-spindelmastare', 'alv-flamboyant', 'magi-chronomag']) {
      await ladda(id);
      const k = await kortade();
      ok(`${id}: ingen text kortas`, k.length === 0, k.join(' | '));
    }
    ok('inga fel i konsolen', errs.length === 0, errs.join(' | '));
  } finally {
    await b.close();
  }
  console.log(res.join('\n'));
  process.exit(res.some((r) => r.startsWith('FAIL')) ? 1 : 0);
})();
