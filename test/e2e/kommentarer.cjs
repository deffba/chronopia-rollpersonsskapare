// Kommentarsverktyget i utvecklarläget (kommentarer.js): finns bara med ?dev, klick på sidan öppnar en anteckningsruta
// i stället för att påverka appen, kommentarer sparas, får markörer, kan ändras och tas bort, och listan kan kopieras.
// Körs med `npm run e2e`. Kör med LANG=C.UTF-8.
const { chromium } = require('playwright');
const res = []; const ok = (namn, villkor, info = '') => res.push(`${villkor ? 'PASS' : 'FAIL'} ${namn}${info ? ' — ' + info : ''}`);
const BAS = process.env.E2E_BAS || 'http://localhost:8766';

(async () => {
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BAS });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));

    // Utan utvecklarläget: inget verktyg
    await p.goto(`${BAS}/index.html`);
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('chronopia-dev', 'nej'); });
    await p.reload(); await p.waitForTimeout(300);
    ok('inget kommentarsverktyg utan ?dev', await p.locator('#km-pa').count() === 0);

    // Med utvecklarläget
    await p.goto(`${BAS}/index.html?dev`);
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('chronopia-dev', 'ja'); localStorage.setItem('chronopia-dev-autofyll', 'nej'); });
    await p.reload(); await p.waitForFunction(() => window.chronopiaKommentarer);
    ok('verktyget syns i utvecklarläget', await p.locator('#km-pa').isVisible() && await p.locator('#km-lista').isVisible());
    ok('räknaren börjar på noll', (await p.locator('#km-lista').textContent()) === 'Kommentarer (0)');

    // Ladda en testrollperson i steget Yrke
    await p.click('#menyknapp'); await p.selectOption('#dev-lage', 'yrke'); await p.click('#dev-krigare'); await p.waitForTimeout(300);
    const rubrik = p.locator('.steg-huvud h2');
    const stegFore = await rubrik.textContent();
    const rpFore = await p.evaluate(() => localStorage.getItem('chronopia-rollperson-v2'));

    // Kommentarsläget: ett klick på ett yrkeskort väljer inte yrket utan öppnar rutan
    await p.click('#km-pa');
    ok('Kommentera slås på', await p.getAttribute('#km-pa', 'aria-pressed') === 'true');
    const kort = p.locator('[data-yrke]').nth(2);
    await kort.hover(); await p.waitForTimeout(50);
    ok('ram runt elementet under musen', await p.locator('.km-ram').isVisible());
    await kort.click();
    ok('anteckningsrutan öppnas', await p.locator('.km-ruta').isVisible());
    ok('rutan säger var man är', /Steg \d+\. /.test(await p.locator('.km-ruta .km-om').textContent()), await p.locator('.km-ruta .km-om').textContent());
    ok('klicket ändrade inte rollpersonen', await p.evaluate(() => localStorage.getItem('chronopia-rollperson-v2')) === rpFore);
    await p.click('#km-storre');
    await p.fill('#km-text', 'Korten känns trånga.\nMer luft mellan dem?');
    await p.click('#km-spara'); await p.waitForTimeout(100);
    let lista = await p.evaluate(() => window.chronopiaKommentarer.lista());
    ok('kommentaren sparas', lista.length === 1 && lista[0].anteckning === 'Korten känns trånga.\nMer luft mellan dem?');
    ok('platsen sparas', lista[0].plats === 'steg:yrke' && /^Steg \d+\. /.test(lista[0].platsNamn), `${lista[0].plats} ${lista[0].platsNamn}`);
    ok('väljaren pekar ut elementet', await p.evaluate((sel) => Boolean(document.querySelector(sel)), lista[0].selektor), lista[0].selektor);
    ok('stilen och fönstret sparas', Boolean(lista[0].stil) && lista[0].bredd === 1400);
    ok('sparat i localStorage', JSON.parse(await p.evaluate(() => localStorage.getItem('chronopia-kommentarer'))).length === 1);
    ok('räknaren visar en', (await p.locator('#km-lista').textContent()) === 'Kommentarer (1)');
    ok('markör på sidan', await p.locator('.km-markor').count() === 1);

    // Avbryt sparar inget, Escape stänger rutan
    await p.locator('.steg-huvud h2').click();
    await p.fill('#km-text', 'ska inte sparas'); await p.click('#km-avbryt');
    ok('Avbryt sparar inget', (await p.evaluate(() => window.chronopiaKommentarer.lista())).length === 1);
    await p.locator('.steg-huvud h2').click(); await p.keyboard.press('Escape');
    ok('Escape stänger rutan', await p.locator('.km-ruta').count() === 0);
    // En till via Ctrl+Enter
    await p.locator('.steg-huvud h2').click(); await p.fill('#km-text', 'Rubriken kunde ha en ornament-linje.'); await p.keyboard.press('Control+Enter');
    ok('Ctrl+Enter sparar', (await p.evaluate(() => window.chronopiaKommentarer.lista())).length === 2);

    // Stäng av: sidan fungerar igen
    await p.click('#km-pa');
    ok('Kommentera slås av', await p.getAttribute('#km-pa', 'aria-pressed') === 'false' && !(await p.locator('.km-ram').isVisible()));
    ok('markörerna finns kvar', await p.locator('.km-markor').count() === 2);
    // Markörerna följer med när sidan ritas om
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.click('#menyknapp'); await p.click('#menyknapp'); await p.waitForTimeout(100);
    ok('markörerna står kvar efter omritning', await p.locator('.km-markor').count() === 2);
    // Alt+K slår på
    await p.keyboard.press('Alt+KeyK');
    ok('Alt+K slår på', await p.getAttribute('#km-pa', 'aria-pressed') === 'true');
    await p.keyboard.press('Escape');
    ok('Escape slår av', await p.getAttribute('#km-pa', 'aria-pressed') === 'false');
    ok('steget är detsamma', (await rubrik.textContent()) === stegFore);

    // Ändra via markören
    await p.locator('.km-markor').first().click();
    ok('markören öppnar rutan för att ändra', (await p.locator('.km-ruta h2').textContent()) === 'Ändra kommentar' && (await p.inputValue('#km-text')).startsWith('Korten'));
    await p.fill('#km-text', 'Korten är för trånga.'); await p.click('#km-spara');
    ok('ändringen sparas', (await p.evaluate(() => window.chronopiaKommentarer.lista()))[0].anteckning === 'Korten är för trånga.');

    // Listan och exporten
    await p.click('#km-lista');
    ok('listan öppnas', await p.locator('.km-panel').isVisible() && await p.locator('.km-panel li').count() === 2);
    const text = await p.inputValue('#km-export');
    ok('exporten som text', text.includes('## Steg') && text.includes('Korten är för trånga.') && text.includes('Rubriken kunde ha en ornament-linje.'), text.split('\n')[0]);
    await p.click('#km-kopiera'); await p.waitForTimeout(100);
    ok('Kopiera säger till', /Kopierat|markerad/.test(await p.locator('.km-status').textContent()), await p.locator('.km-status').textContent());
    const urklipp = await p.evaluate(() => navigator.clipboard.readText().catch(() => ''));
    ok('urklippet har texten', urklipp === text || urklipp === '');
    await p.check('input[name="km-format"][value="json"]');
    const json = JSON.parse(await p.inputValue('#km-export'));
    ok('exporten som JSON', json.format === 'chronopia-kommentarer' && json.kommentarer.length === 2 && json.kommentarer[0].selektor);
    // Kommentar om hela vyn
    await p.click('#km-allman'); await p.fill('#km-text', 'Hela steget kunde ha en bild i bakgrunden.'); await p.click('#km-spara');
    lista = await p.evaluate(() => window.chronopiaKommentarer.lista());
    ok('kommentar om hela vyn', lista.length === 3 && lista[2].selektor === null && lista[2].element === 'Hela vyn');
    // Ta bort en
    await p.click('#km-lista');
    await p.locator(`.km-panel [data-ta-bort="${lista[1].id}"]`).click();
    ok('Ta bort i listan', (await p.evaluate(() => window.chronopiaKommentarer.lista())).length === 2 && await p.locator('.km-panel li').count() === 2);
    // Kvar efter omladdning
    await p.reload(); await p.waitForFunction(() => window.chronopiaKommentarer);
    ok('kommentarerna finns kvar efter omladdning', (await p.evaluate(() => window.chronopiaKommentarer.lista())).length === 2);
    const vy = await p.evaluate(() => window.chronopiaKommentarer.plats());
    ok('ingen markör från ett annat steg', vy === 'steg:yrke' || await p.locator('.km-markor').count() === 0, vy);
    await p.click('#menyknapp'); await p.selectOption('#dev-lage', 'yrke'); await p.click('#dev-krigare'); await p.waitForTimeout(300);
    ok('markören hittar elementet igen efter omladdning', await p.locator('.km-markor').count() === 1);
    // Ta bort alla kräver två klick
    await p.click('#km-lista'); await p.click('#km-rensa');
    ok('första klicket tar inte bort', (await p.evaluate(() => window.chronopiaKommentarer.lista())).length === 2);
    await p.click('#km-rensa');
    ok('andra klicket tar bort alla', (await p.evaluate(() => window.chronopiaKommentarer.lista())).length === 0);
    await p.click('#km-stang');
    ok('listan stängs', await p.locator('.km-panel').count() === 0);
    ok('inga konsolfel', !errs.length, errs.join(' | '));
  } finally {
    await b.close();
    console.log(res.join('\n'));
  }
})();
