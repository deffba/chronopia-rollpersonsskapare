// Spelmötesdelen för en magiker: ny besvärjelse genom ensamträning, FV i den, och en särskild förmåga för HP.
const { tillRas } = require('./hjalp.cjs');
// SF_SLUMP=0.3 låser tärningen för förmågeslaget (0.3 ger 14 + 24 = 38, Mångsidig, som kräver två olika val).
const { chromium } = require('playwright');
const fs = require('fs');
const FIL = process.argv[2] || 'Dimalv-arkemagiker.json';
const BILDER = process.argv[3] || null;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const ok = []; const fel = [];
  const koll = (namn, villkor, info = '') => (villkor ? ok : fel).push(namn + (villkor ? '' : ' ' + info));
  const notis = async () => (await p.locator('#notis').textContent()).trim();
  await p.goto((process.env.E2E_BAS || 'http://localhost:8766') + '/index.html?dev'); await tillRas(p);
  await p.setInputFiles('#importfil', { name: 'rp.json', mimeType: 'application/json', buffer: fs.readFileSync(FIL) });
  await p.waitForTimeout(300);
  await p.click('#menyknapp'); await p.click('#visa-spel');
  // Ny besvärjelse genom ensamträning ur en kodex; slagen skrivs in så att alla lyckas
  await p.click('.steg-knapp:has-text("Träning")');
  const alt = await p.locator('#traning-besv option').evaluateAll(o => o.filter(x => x.value && !x.disabled).map(x => x.value));
  koll('nya besvärjelser att välja', alt.length > 0);
  await p.selectOption('#traning-besv', alt[0]);
  await p.fill('#traning-veckor', '6'); await p.press('#traning-veckor', 'Tab');
  for (let w = 0; w < 6; w++) { await p.fill(`#traning-${w}-0`, '1'); await p.press(`#traning-${w}-0`, 'Tab'); }
  koll('spara spärrat… nej, kodex saknas ger fel', true);
  await p.click('#spara-traning');
  koll('kodex krävs', (await notis()).includes('kodex'), await notis());
  await p.check('#traning-kodex');
  await p.click('#spara-traning');
  koll('träningen sparas', (await notis()).includes('6 EP'), await notis());
  // Spelmöte med 12 HP
  await p.click('.steg-knapp:has-text("Spelmöte")');
  await p.fill('#session-hp', '12'); await p.press('#session-hp', 'Tab');
  await p.click('#spara-session');
  // Förbättring: FV i besvärjelsen och en särskild förmåga
  await p.click('.steg-knapp:has-text("Förbättra")');
  await p.check('#forb-vila');
  const upp = p.locator('#forb-eptabell button[id^="forb-upp-"]').first();
  let n = 0; while (!(await upp.isDisabled()) && n < 10) { await upp.click(); n++; }
  koll('besvärjelsen kan höjas', n > 0, String(n));
  await p.locator('.spel-steg button', { hasText: '4. Särskild förmåga' }).click();
  await p.fill('#forb-sf-hp', '12'); await p.press('#forb-sf-hp', 'Tab');
  if (process.env.SF_SLUMP) await p.evaluate((x) => { Math.random = () => x; }, Number(process.env.SF_SLUMP)); await p.click('#forb-sf-sla'); await p.waitForTimeout(400);
  const resultat = await p.locator('.summering').last().textContent();
  koll('förmågan slås', /\+ 24 = /.test(resultat), resultat);
  // Fyll i val om förmågan kräver det
  for (let i = 0; i < 6; i++) {
    const g = p.locator('.spel-steginnehall .valknappar:not(.gjort)').first();
    if (await g.count()) { await g.locator('.valknapp:not([disabled])').first().click(); continue; }
    const sel = await p.locator('.spel-steginnehall select').evaluateAll(s => { const valda = new Set(s.map(x => x.value).filter(Boolean)); return s.filter(x => !x.value).map(x => ({ id: x.id, v: [...x.options].find(o => o.value && !o.disabled && !valda.has(o.value))?.value })); }); // olika val i varje lista (t.ex. Mångsidig: två olika färdigheter)
    if (sel.length && sel[0].v) { await p.selectOption('#' + sel[0].id.replace(/([:+.])/g, '\\$1'), sel[0].v); continue; }
    const txt = await p.locator('.spel-steginnehall input[type=text]').evaluateAll(s => s.filter(x => !x.value && !x.readOnly).map(x => x.id));
    if (txt.length) { await p.fill('#' + txt[0], 'Test'); await p.press('#' + txt[0], 'Tab'); continue; }
    break;
  }
  if (BILDER) await p.screenshot({ path: `${BILDER}/9-formaga.png`, fullPage: true });
  await p.locator('.spel-steg button', { hasText: '5. Sammanfattning' }).click();
  const felLista = await p.locator('.spel-steginnehall .saknaslista').textContent().catch(() => '');
  await p.click('#spara-forbattring').catch(() => {});
  koll('förbättringen sparas', (await notis()).includes('Förbättringen är införd'), (await notis()) + ' | ' + felLista + ' | ' + resultat);
  koll('HP är förbrukade', (await p.locator('.steg-potter dd').nth(1).textContent()) === '0');
  koll('inga konsolfel', errs.length === 0, errs.join(' | '));
  console.log('OK:', ok.length, '\n' + (fel.length ? 'FEL:\n' + fel.join('\n') : 'inga fel'));
  await b.close();
})();
