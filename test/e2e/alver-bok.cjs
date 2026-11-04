// Alver i Chronopia: bokvalet och nivåerna, husalverna (inte drakalven), Belisarius valfria färdighet,
// Drakblod med defekten, pierrotens täckyrke och masker, dockmästarens dockor, Påfågelsdansen och
// spindelmästarens gratisslag, rollformuläret och poängloggen (RB-024, RB-025).
// Körs med `npm run e2e` (startar en egen server). Kör med LANG=C.UTF-8.
const { chromium } = require('playwright');
const res = []; const ok = (namn, villkor, info = '') => res.push(`${villkor ? 'PASS' : 'FAIL'} ${namn}${info ? ' — ' + info : ''}`);
const BAS = process.env.E2E_BAS || 'http://localhost:8766';

(async () => {
  const b = await chromium.launch();
  try {
  const ny = async (dev = false) => {
    const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
    p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
    await p.goto(`${BAS}/index.html${dev ? '?dev' : '?dev=av'}`);
    await p.evaluate((dev) => { localStorage.clear(); localStorage.setItem('chronopia-dev', dev ? 'ja' : 'nej'); localStorage.setItem('chronopia-dev-autofyll', 'nej'); }, dev);
    await p.reload(); await p.click('#start-skapa'); await p.waitForSelector('.bokgrupper');
    return p;
  };
  const notis = (p) => p.locator('#notis').textContent();
  const ladda = async (p, id, lage) => {
    await p.click('#menyknapp'); await p.selectOption('#dev-lage', lage); await p.click(`#dev-${id}`); await p.waitForTimeout(400);
  };
  const formular = async (p) => { await p.click('#menyknapp'); await p.click('#visa-formular'); await p.waitForTimeout(300); return p.locator('#rf-vy').textContent(); };
  const loggStammer = async (p) => (await p.locator('.pl-fot').count()) === 0 || p.locator('.pl-fot').isHidden();

  // ---- Steg 0 och 1: nivåerna och husalverna
  let p = await ny();
  await p.check('[data-bok=alver]'); await p.waitForTimeout(80);
  const nivaer = await p.locator('#nivaval .bokrad').allTextContents();
  ok('nivåerna alv, veteran och upphöjd', nivaer.length === 3 && /Alv.*125 BP/.test(nivaer[0]) && /Veteran.*150 BP/.test(nivaer[1]) && /Upphöjd.*175 BP/.test(nivaer[2]), nivaer.join(' | '));
  await p.click('#nasta-steg'); await p.waitForSelector('.raskort');
  // De sju husen ligger bakom ett enda kort, Alv; ett tryck fäller ut dem och döljer de andra raserna
  const forst = await p.locator('.raskort').allTextContents();
  ok('ett kort, Alv, i stället för sju husalver', await p.locator('#rasgrupp-alv').count() === 1 && !forst.some((r) => /Belisarius|Degas|Lysander/.test(r)) && forst.includes('Människa'), forst.join(','));
  await p.click('#rasgrupp-alv'); await p.waitForTimeout(100);
  const raser = await p.locator('.raskort').allTextContents();
  ok('sju husalver att välja, de andra raserna dolda', raser.length === 7 && ['Aramas', 'Belisarius', 'Cerias', 'Degas', 'Kothal', 'Lysander', 'Ventura'].every((h) => raser.some((r) => r.includes(h))), raser.join(','));
  ok('rubriken Alv med knappen Alla raser', /Alv: de Stora husen/.test(await p.locator('#rasgrupp').textContent()) && await p.locator('#rasgrupp-alla').count() === 1);
  ok('drakalven går inte att välja direkt', !raser.some((r) => /Drakalv/.test(r)));
  await p.click('#rasgrupp-alla'); await p.waitForTimeout(100);
  ok('Alla raser tar tillbaka den vanliga vyn', await p.locator('#rasgrupp-alv').count() === 1 && (await p.locator('.raskort').count()) > 7);
  await p.click('#rasgrupp-alv'); await p.waitForTimeout(100);
  await p.click('.raskort:has-text("Belisarius")'); await p.waitForTimeout(100);
  ok('Belisarius: en av tre färdigheter som primär', await p.locator('#rasval-alt').count() === 1);
  await p.click('#rasval-alt [data-varde=skadespeleri]'); await p.waitForTimeout(80);
  ok('valet räcker för att gå vidare', !/sparrad/.test(await p.locator('#nasta-steg').getAttribute('class')));
  await p.click('#rasgrupp-alla'); await p.waitForTimeout(100);
  ok('alla raser: Alv-kortet visar valt hus', /valt/.test(await p.locator('#rasgrupp-alv').getAttribute('class')) && (await p.locator('#rasgrupp-alv').textContent()).includes('Belisarius'));
  ok('inga konsolfel (rassteget)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- Drakblod: lysanderalven blir drakalv och har en defekt
  p = await ny(true);
  await ladda(p, 'alv-drakblod', 'formagor');
  ok('drakalven byggs enligt receptet', (await notis(p)) === 'Vaelis av Lysander är inläst.', await notis(p));
  ok('förmågan Drakblod med defekten Stympad', /Drakblod/.test(await p.locator('.steg-innehall').first().textContent()) && /Stympad/.test(await p.locator('.steg-innehall').first().textContent()));
  let rf = await formular(p);
  ok('rollformuläret: drakalv med defekten', rf.includes('Drakalv') && rf.includes('Defekt') && rf.includes('Stympad'));
  ok('poängloggen stämmer (drakalv)', await loggStammer(p));
  ok('inga konsolfel (drakblod)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- Pierrot: täckyrket och maskerna
  p = await ny(true);
  await ladda(p, 'alv-pierrot', 'extra');
  ok('pierroten byggs enligt receptet', (await notis(p)) === 'Sorel Degas är inläst.', await notis(p));
  ok('täckyrket bard i steg 4', await p.locator('#tackyrke').count() === 1 && (await p.locator('#tackyrke-yrke').inputValue()) === 'bard');
  await ladda(p, 'alv-pierrot', 'masker');
  ok('steget Masker och dockor visar maskerna', /Masker och dockor/.test(await p.locator('.steg-huvud h2').textContent()) && await p.locator('#masker [data-mask]').count() === 1);
  ok('maskerna: högst 5 BP och inget kvar', /högst 5 BP.*Valt: 5 BP, 0 BP kvar/.test(await p.locator('#masker-summa').textContent()), await p.locator('#masker-summa').textContent());
  ok('en mask till går inte att lägga till', await p.locator('[data-maskegenskap=riddaren] button').isDisabled());
  ok('inga dockor för pierroten', await p.locator('#dockor').count() === 0);
  rf = await formular(p);
  ok('rollformuläret: mask och täckyrke', rf.includes('Bedragaren') && rf.includes('Täckyrke: Bard'), rf.slice(0, 200));
  ok('poängloggen stämmer (pierrot)', await loggStammer(p));
  ok('inga konsolfel (pierrot)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- Dockmästaren: dockorna och taket
  p = await ny(true);
  await ladda(p, 'alv-dockmastare', 'masker');
  ok('dockmästaren byggs enligt receptet', (await notis(p)) === 'Amaury Belisarius är inläst.', await notis(p));
  ok('två dockor värda 11 av 15 BP', /högst 15 BP.*Valt: 11 BP, 4 BP kvar/.test(await p.locator('#dockor-summa').textContent()), await p.locator('#dockor-summa').textContent());
  ok('inga masker för dockmästaren', await p.locator('#masker').count() === 0);
  await p.selectOption('#docka-gnista-0', '4'); await p.waitForTimeout(150);
  ok('livsgnista 4 fyller taket', /Valt: 15 BP, 0 BP kvar/.test(await p.locator('#dockor-summa').textContent()), await p.locator('#dockor-summa').textContent());
  ok('fler dockor går inte att lägga till', await p.locator('[data-dockrad] button:not([disabled])').count() === 0);
  rf = await formular(p);
  ok('rollformuläret: dockorna', rf.includes('Docka') && rf.includes('Guignol'));
  ok('inga konsolfel (dockmästare)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- Flamboyanten: Påfågelsdansen
  p = await ny(true);
  await ladda(p, 'alv-flamboyant', 'fardigheter');
  ok('flamboyanten byggs enligt receptet', (await notis(p)) === 'Liriel Aramas är inläst.', await notis(p));
  const fard = await p.locator('.steg-innehall').first().textContent();
  ok('Påfågelsdansen med dansens tekniker', fard.includes('Påfågelsdansen') && fard.includes('Dubbelstöt'));
  ok('poängloggen stämmer (flamboyant)', await loggStammer(p));
  ok('inga konsolfel (flamboyant)', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---- Spindelmästaren: gratisslaget med +10 på Magis tabell
  p = await ny(true);
  await ladda(p, 'alv-spindelmastare', 'formagor');
  ok('spindelmästaren byggs enligt receptet', (await notis(p)) === 'Nyx av Kothal är inläst.', await notis(p));
  ok('två slag, det andra gratis', await p.locator('[data-plats="1"]').count() === 1 && /gratis/.test(await p.locator('[data-plats="1"]').textContent()));
  await p.click('[data-plats="1"]'); await p.waitForTimeout(150);
  ok('gratisslaget: Magis tabell och +10', /Magi/.test(await p.locator('#sf2-tabell').inputValue()) && /\+10/.test(await p.locator('.steg-innehall').first().textContent()));
  ok('poängloggen stämmer (spindelmästare)', await loggStammer(p));
  ok('inga konsolfel (spindelmästare)', !p.errs.length, p.errs.join(' | '));
  await p.close();
  } catch (e) { ok('skriptet kraschade inte', false, e.message); }
  await b.close();
  console.log(res.join('\n'));
})();
