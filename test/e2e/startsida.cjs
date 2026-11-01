// Startsidan, steg 0 (Böcker), Regelresonemang, det tomma rollformuläret och versionsraden.
// Kör: node startsida.cjs <utmapp> (körs med `npm run e2e`)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const res = []; const ok = (namn, villkor, info = '') => res.push(`${villkor ? 'PASS' : 'FAIL'} ${namn}${info ? ' — ' + info : ''}`);
const ut = process.argv[2] || '.';
const ROT = path.resolve(__dirname, '../..');
// Ägarens riktiga namn ska inte finnas någonstans i appen (där står Deffba). Mönstret är kodat så att namnet inte står i repot.
const NAMN = new RegExp(Buffer.from('bmljbGFzfGRlIGZhaXJl', 'base64').toString(), 'i');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const rubrik = () => p.locator('.steg-huvud h2').textContent();
  try {
    await p.goto((process.env.E2E_BAS || 'http://localhost:8766') + '/index.html?dev=av'); await p.evaluate(() => localStorage.clear()); await p.reload();
    await p.waitForSelector('#start-skapa');

    // Startsidan
    const knappar = await p.locator('.startknapp').evaluateAll(k => k.map(x => ({ id: x.id, av: x.disabled, text: x.textContent })));
    ok('startsidan har sex val', knappar.length === 6, knappar.map(k => k.id).join(','));
    ok('Redigera, Förbättra och Kampanj kommer snart och är spärrade', ['start-redigera', 'start-forbattra', 'start-kampanj'].every(id => { const k = knappar.find(x => x.id === id); return k?.av && /kommer snart!/.test(k.text); }));
    ok('Skapa, Ladda ned rollformulär och Regelresonemang går att trycka på', ['start-skapa', 'start-formular', 'start-regler'].every(id => knappar.find(x => x.id === id)?.av === false));
    ok('stegen syns inte på startsidan', await p.locator('.layout').isHidden());
    await p.waitForFunction(() => document.querySelector('#version').textContent);
    ok('versionen syns i sidfoten', /^v\d+\.\d+\.\d+ · lokal version$/.test(await p.locator('#version').textContent()), await p.locator('#version').textContent());

    // Steg 0: böckerna
    await p.click('#start-skapa');
    ok('Skapa rollperson öppnar steg 0 Böcker', (await rubrik()) === 'Böcker' && (await p.locator('.steg-huvud .eyebrow').textContent()).startsWith('Steg 0 av 13'), await p.locator('.steg-huvud .eyebrow').textContent());
    ok('sidomenyn börjar på 0', (await p.locator('.steg-knapp .steg-nr').first().textContent()) === '0' && (await p.locator('.steg-knapp .steg-nr').nth(1).textContent()) === '1');
    const bocker = await p.locator('[data-bok]').evaluateAll(i => i.map(x => ({ id: x.dataset.bok, pa: x.checked, av: x.disabled, text: x.closest('label').textContent })));
    ok('åtta böcker', bocker.length === 8, bocker.map(x => x.id).join(','));
    const grund = bocker.find(x => x.id === 'grund');
    ok('grundreglerna är alltid med och går inte att välja bort', grund.pa && grund.av && /Alltid med/.test(grund.text));
    const snart = bocker.filter(x => x.id !== 'grund');
    ok('expansionerna visas med (Kommer snart!) och går inte att välja', snart.every(x => !x.pa && x.av && x.text.includes('(Kommer snart!)')));
    ok('expansionerna är de rätta', ['Vapen & rustningar', 'Magi', 'Dvärgar', 'Alver', 'Svartblod', 'Mörkrets väktare', 'Mörkrets krigare'].every(n => snart.some(x => x.text.includes(n))));
    await p.click('#nasta-steg');
    ok('Nästa går till steg 1 Ras', (await rubrik()) === 'Ras' && (await p.locator('.steg-huvud .eyebrow').textContent()).startsWith('Steg 1 av 13'));
    await p.click('.raskort >> nth=0'); await p.waitForTimeout(200);
    const sparad = await p.evaluate(() => JSON.parse(localStorage.getItem('chronopia-rollperson-v2')).rp.bocker);
    ok('böckerna sparas i rollpersonen', JSON.stringify(sparad) === '["grund"]', JSON.stringify(sparad));
    await p.click('.steg-knapp >> nth=0');
    ok('valet låses när skapandet har börjat', await p.locator('.bok-last').count() === 1 && await p.locator('[data-bok]:not([disabled])').count() === 0);

    // Tillbaka till startsidan via titeln
    await p.click('#hem');
    ok('titeln går till startsidan', await p.locator('#start-skapa').isVisible() && await p.locator('.layout').isHidden());
    ok('påbörjad rollperson: Fortsätt skapa rollperson', (await p.locator('#start-skapa .startknapp-namn').textContent()).startsWith('Fortsätt'));
    await p.click('#start-skapa');
    ok('Fortsätt öppnar samma steg', (await rubrik()) === 'Böcker');
    await p.click('#menyknapp'); await p.click('#till-start');
    ok('Startsidan i menyn', await p.locator('#start-skapa').isVisible());
    await p.goBack(); await p.waitForTimeout(200);
    ok('bakåtknappen går tillbaka till stegen', await p.locator('.layout').isVisible());
    await p.goForward(); await p.waitForTimeout(200);
    ok('framåtknappen går till startsidan igen', await p.locator('#start-skapa').isVisible());

    // Regelresonemang
    await p.click('#start-regler');
    await p.waitForSelector('.rr-md h3');
    const husregler = JSON.parse(fs.readFileSync(path.join(ROT, 'regler/husregler.json'), 'utf8'));
    ok('alla husregler visas', await p.locator('.rr-husregler li').count() === husregler.length, String(husregler.length));
    ok('regelbesluten visas med RB-rubriker', await p.locator('.rr-md h3#rb-001').count() === 1 && await p.locator('.rr-md h3').count() >= 10);
    ok('fetstil och kursiv tolkas', await p.locator('.rr-md strong').count() > 10 && await p.locator('.rr-md em').count() > 5);
    ok('nästlade listor tolkas', await p.locator('.rr-md ul ul').count() >= 1);
    const sidtext = await p.locator('#start-vy').textContent();
    ok('inget riktigt namn på sidan', !NAMN.test(sidtext));
    ok('ingen markdown kvar', !/\*\*|^#/m.test(sidtext));
    await p.click('text=← Startsidan');
    ok('tillbaka till startsidan', await p.locator('#start-skapa').isVisible());

    // Inget riktigt namn i filerna som publiceras
    const filer = execSync('git ls-files', { cwd: ROT }).toString().split('\n').filter(f => f && !f.startsWith('vendor/') && !f.startsWith('typsnitt/') && !f.startsWith('test/'));
    const medNamn = filer.filter(f => fs.existsSync(path.join(ROT, f)) && NAMN.test(fs.readFileSync(path.join(ROT, f), 'utf8')));
    ok('inget riktigt namn i appens filer', medNamn.length === 0, medNamn.join(', '));

    // Tomt rollformulär
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#start-formular')]);
    const fil = `${ut}/tomt-rollformular.pdf`; await dl.saveAs(fil);
    const pdf = fs.readFileSync(fil);
    ok('tomt rollformulär laddas ner som PDF', pdf.slice(0, 5).toString() === '%PDF-', `${Math.round(pdf.length / 1024)} kB`);
    let text = '';
    try { text = execSync(`pdftotext "${fil}" -`).toString(); } catch { /* pdftotext saknas */ }
    if (text) {
      const sidor = Number(execSync(`pdfinfo "${fil}"`).toString().match(/Pages:\s+(\d+)/)[1]);
      ok('två sidor', sidor === 2, String(sidor));
      ok('formulärets rubriker finns', /Grundegenskap/.test(text) && /Särskilda förmågor/.test(text) && /Utrustning/.test(text));
      // Motorn räknar en tom rollperson som människa och krigare; inget av det får synas, inte heller vikter eller färdigheter
      ok('inga värden ifyllda', !/Människa|Krigare|\bkg\b|Bluffa|Upptäcka fara|Rasförmåga/.test(text), (text.match(/Människa|Krigare|\bkg\b|Bluffa|Upptäcka fara|Rasförmåga/) || [''])[0]);
    }
    ok('knappen återställs efter nedladdningen', await p.locator('#start-formular').isEnabled());
    ok('inga fel i konsolen', errs.length === 0, errs.join(' | '));
  } catch (e) {
    res.push('FAIL UNDANTAG ' + e.message.split('\n')[0]);
  }
  console.log(res.join('\n'));
  await b.close();
})();
