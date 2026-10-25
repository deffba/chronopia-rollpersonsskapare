// Rollpersonens utveckling efter skapandet: spelmöten, träning och förbättringar (kapitel 4, s. 73–76).
// Allt som händer sparas som poster i rp.utveckling.logg. Den utvecklade rollpersonen räknas fram ur
// rollpersonen vid skapandet plus loggen, så att varje förändring går att följa och den senaste går att ångra.
// Det som också skrivs direkt på rollformuläret (erf, hjältepoäng, pengar, egen utrustning) ligger i rp.spel;
// varje post sparar exakt vad den ändrade där, så att den kan tas tillbaka.
import {
  GRUNDEGENSKAPER, fardighetAv, status, grundegenskapFor, epPerFV, raknaHarledda, besvarjelsePris, skolFV,
  namnFor, sarskildFormaga, yrkeAv, slaUpp, vapengrupp, bordaFor,
} from "./regelmotor.js";

export { TOM_UTVECKLING } from "./sparformat.js";
import { TOM_UTVECKLING } from "./sparformat.js";

const summa = (lista) => lista.reduce((a, b) => a + b, 0);
const heltal = (n) => Number.isInteger(n);
const lagg = (m, k, n) => { if (n) m[k] = (m[k] ?? 0) + n; };

// Allt som loggen har ändrat i regelvärdena: köpta FV, höjda grundegenskaper, förmågor köpta för HP.
export function summera(logg = []) {
  const s = { fv: {}, besvarjelser: {}, egenskaper: {}, formagor: [], hpSamlade: 0, epFatt: 0 };
  for (const p of logg) {
    if (p.typ === "forbattring") {
      for (const [k, n] of Object.entries(p.fv ?? {})) lagg(s.fv, k, n);
      for (const [k, n] of Object.entries(p.besvarjelser ?? {})) lagg(s.besvarjelser, k, n);
      for (const [g, n] of Object.entries(p.egenskaper ?? {})) lagg(s.egenskaper, g, n);
      if (p.formaga) s.formagor.push(p.formaga);
      s.hpSamlade += summa((p.hpSlag ?? []).map((x) => x.slag));
    } else {
      if (p.psy?.okning) lagg(s.egenskaper, "PSY", p.psy.okning);
      if (p.hpFatt > 0) s.hpSamlade += p.hpFatt;
      s.epFatt += summa(Object.values(p.erf ?? {}).filter((n) => n > 0));
    }
  }
  return s;
}

// Besvärjelsen för en nyckel som "paralysering" eller "tillkalla-varelse:Djur"
export function besvarjelseAv(regler, nyckel) {
  return regler.besvarjelser?.lista.find((b) => b.id === nyckel.split(":")[0]);
}

function besvarjelseNamn(b, nyckel) {
  const val = nyckel.split(":")[1];
  return val ? `${b.namn} (${val})` : b.namn;
}

// Högsta FV en färdighet får nå genom EP efter skapandet (s. 36, 64, 74)
function takFor(regler, rpm, nyckel, f, st, varden, fvNu) {
  let tak = Infinity;
  if (st === "sekundar") tak = varden[grundegenskapFor(regler, nyckel, varden)] ?? tak;
  if (f.typ === "magiskola" && yrkeAv(regler, rpm.yrke)?.skolTak) tak = Math.min(tak, varden.INT);
  if (f.tak === "PSY") tak = Math.min(tak, varden.PSY);
  if (f.tak === "lasa-skriva") {
    const ls = Object.entries(fvNu).filter(([k]) => k.startsWith("lasa-skriva:")).map(([, v]) => v);
    tak = Math.min(tak, Math.max(0, ...ls));
  }
  const sprak = regler.fardigheter.sprak.find((x) => x.id === nyckel.split(":")[1]);
  if (f.id === "tala" && sprak?.maxFvAndra && rpm.ras !== "drakonit") tak = Math.min(tak, sprak.maxFvAndra);
  return tak + (rpm.sarskildaFormagor?.takBonus?.[nyckel] ?? 0);
}

// Den utvecklade rollpersonen: res från raknaRollperson med loggen inräknad.
// indata är samma rollperson som gavs till raknaRollperson.
export function utvecklad(regler, indata, res) {
  const logg = indata.utveckling?.logg ?? [];
  const s = summera(logg);
  if (!logg.length && !Object.keys(indata.spel?.borttaget ?? {}).length) return { ...res, extraFormagor: [], utveckling: { ...s, delta: {} } };
  const E = regler.erfarenhet;
  const fel = [...res.fel];
  const sf0 = sarskildFormaga(regler, indata);
  const rpm = { ...indata, ...sf0.tillagg };
  rpm.sarskildaFormagor = { ...rpm.sarskildaFormagor, status: { ...rpm.sarskildaFormagor?.status }, takBonus: { ...rpm.sarskildaFormagor?.takBonus } };

  // Särskilda förmågor köpta för HP: 2T20 + 2 per HP på tabellen (s. 76)
  const extra = s.formagor.map((f) => {
    const r = sarskildFormaga(regler, { ...rpm, sarskildaFormagor: { bp: f.hp * E.hjaltepoang.sarskildFormaga.bonusPerHp, slag: f.slag, val: f.val ?? [] } });
    fel.push(...r.fel, ...r.saknas);
    const t = r.tillagg.sarskildaFormagor;
    Object.assign(rpm.sarskildaFormagor.status, t.status);
    for (const [k, n] of Object.entries(t.takBonus)) lagg(rpm.sarskildaFormagor.takBonus, k, n);
    return r;
  });

  // Grundegenskaper: HP, PSY-slag och köpta förmågor. STO kan inte höjas (s. 76).
  if (s.egenskaper.STO) fel.push("STO kan inte höjas med hjältepoäng (s. 76)");
  const delta = {};
  for (const g of GRUNDEGENSKAPER) {
    delta[g] = (s.egenskaper[g] ?? 0) + summa(extra.map((r) => r.tillagg.egenskapsbonus[g] ?? 0));
  }
  const varden = { ...res.grundegenskaper };
  for (const g of GRUNDEGENSKAPER) varden[g] += delta[g];
  const just = sf0.tillagg.harleddaJustering ?? { kpFaktor: 1, forflyttningBonus: 0 };
  const harledda = raknaHarledda(regler, varden, {
    kpFaktor: Math.max(just.kpFaktor, ...extra.map((r) => r.tillagg.harleddaJustering.kpFaktor)),
    forflyttningBonus: just.forflyttningBonus + summa(extra.map((r) => r.tillagg.harleddaJustering.forflyttningBonus)),
  });

  // Färdigheter. En permanent ändring av en grundegenskap ändrar FV i primära färdigheter och
  // yrkesfärdigheter som bygger på den lika mycket (s. 45); sekundära påverkas inte.
  const bonus = {};
  const minst = {};
  for (const r of extra) {
    for (const b of r.tillagg.sarskildaFormagor.fvBonus) lagg(bonus, b.fardighet, b.fv);
    for (const b of r.tillagg.sarskildaFormagor.fvMinst) minst[b.fardighet] = Math.max(minst[b.fardighet] ?? 0, b.fv);
  }
  const fore = new Map(res.fardigheter.map((f) => [f.nyckel, f]));
  const fvNu = Object.fromEntries(res.fardigheter.map((f) => [f.nyckel, f.fv]));
  const nycklar = [...new Set([...fore.keys(), ...Object.keys(s.fv), ...Object.keys(bonus), ...Object.keys(minst)])];
  const fardigheter = [];
  for (const nyckel of nycklar) {
    const f = fardighetAv(regler, nyckel);
    if (!f) { fel.push(`Okänd färdighet: ${nyckel}`); continue; }
    const st = status(regler, rpm, nyckel);
    const ge = grundegenskapFor(regler, nyckel, varden);
    const gammal = fore.get(nyckel);
    // En färdighet som lärs efter skapandet börjar på BC om den är primär eller yrkesfärdighet, annars på 0
    const bas = gammal ? gammal.fv + (E.permanentEgenskap.galler.includes(st) ? delta[ge] ?? 0 : 0)
      : st === "sekundar" ? 0 : slaUpp(regler.fardigheter.baschans, varden[ge]);
    const kopt = s.fv[nyckel] ?? 0;
    let fv = Math.max(0, bas + kopt + (bonus[nyckel] ?? 0));
    if (minst[nyckel]) fv = Math.max(fv, minst[nyckel]);
    const tekniker = f.id === "stridskonster" ? (gammal?.tekniker ?? indata.stridskonstTekniker?.[nyckel] ?? []) : undefined;
    if (tekniker && kopt > 0 && !tekniker.length) fel.push(`${namnFor(regler, f, nyckel)}: stilen har inga tekniker (s. 68)`);
    fvNu[nyckel] = fv;
    fardigheter.push({
      nyckel, namn: namnFor(regler, f, nyckel), status: st, grundegenskap: ge, start: gammal?.start ?? bas, fv, ep: gammal?.ep ?? 0,
      epPerFV: epPerFV(regler, st, f, tekniker), kategoriB: f.kategoriB, kopt, ...(tekniker ? { tekniker } : {}),
    });
  }
  // Vapen i samma vapengrupp har minst halva bästa FV i gruppen (s. 71)
  for (const a of fardigheter) {
    if (!a.nyckel.startsWith("vapen:")) continue;
    const grupp = vapengrupp(regler, a.nyckel.split(":")[1], varden.STY);
    for (const b of fardigheter) {
      if (b !== a && b.nyckel.startsWith("vapen:") && vapengrupp(regler, b.nyckel.split(":")[1], varden.STY) === grupp) a.fv = Math.max(a.fv, Math.floor(b.fv / 2));
    }
  }
  for (const a of fardigheter) {
    a.tak = takFor(regler, rpm, a.nyckel, fardighetAv(regler, a.nyckel), a.status, varden, fvNu);
    if (a.kopt > 0 && a.fv > a.tak) fel.push(`${a.namn}: högst FV ${a.tak} (s. ${a.status === "sekundar" ? 74 : 64})`);
  }

  // Besvärjelser: högst PSY i FV (s. 36), och en ny besvärjelse kräver skolvärde högst FV i skolan (s. 106)
  const skola = skolFV(fardigheter);
  const kanMagi = res.yrke.magiker || res.magiformaga.lyckat;
  const foreB = new Map(res.besvarjelser.map((b) => [b.nyckel, b]));
  const besvarjelser = [];
  for (const nyckel of new Set([...foreB.keys(), ...Object.keys(s.besvarjelser)])) {
    const b = besvarjelseAv(regler, nyckel);
    if (!b) { fel.push(`Okänd besvärjelse: ${nyckel}`); continue; }
    const gammal = foreB.get(nyckel);
    const kopt = s.besvarjelser[nyckel] ?? 0;
    const fv = (gammal?.fv ?? 0) + kopt;
    const namn = besvarjelseNamn(b, nyckel);
    if (kopt > 0) {
      if (!kanMagi) fel.push(`${namn}: rollpersonen kan inte lära sig magi (s. 106)`);
      if (fv > varden.PSY) fel.push(`${namn}: högst FV ${varden.PSY}, samma som PSY (s. 36)`);
      if (!gammal && b.sv > skola[b.skola]) fel.push(`${namn} har skolvärde ${b.sv} men FV i skolan är ${skola[b.skola]} (s. 106)`);
    }
    besvarjelser.push({ ...(gammal ?? { nyckel, id: b.id, namn, skola: b.skola, sv: b.sv, rackvidd: b.rackvidd, varaktighet: b.varaktighet }),
      fv, epPerFV: besvarjelsePris(regler, b.sv), kopt, tak: varden.PSY });
  }
  besvarjelser.sort((a, b) => a.skola.localeCompare(b.skola) || a.sv - b.sv || a.namn.localeCompare(b.namn, "sv"));

  // Saker från inköpen vid skapandet som har tagits bort under spel
  const borta = { ...(indata.spel?.borttaget ?? {}) };
  const saker = [];
  for (const x of res.utrustning.saker) {
    const bort = Math.min(x.antal, borta[x.namn] ?? 0);
    borta[x.namn] = (borta[x.namn] ?? 0) - bort;
    if (x.antal - bort > 0) saker.push({ ...x, antal: x.antal - bort, vikt: Math.round((x.vikt / x.antal) * (x.antal - bort) * 10) / 10 });
  }
  const utrustning = regler.utrustning ? { ...res.utrustning, saker, ...bordaFor(regler, saker, varden) } : res.utrustning;

  return {
    ...res, grundegenskaper: varden, harledda, utrustning,
    fardigheter: fardigheter.sort((a, b) => a.namn.localeCompare(b.namn, "sv")), besvarjelser,
    extraFormagor: extra.map((r) => r.formaga).filter(Boolean),
    utveckling: { ...s, delta }, fel,
  };
}

// ------------------------------------------------------------ hjälp för posterna

// FV-gränser som ger 1T4 HP: 21, 41, 61 … (s. 76). Gränserna som passeras när FV går från före till efter.
export function fvGranser(regler, fore, efter) {
  const { forsta, steg } = regler.erfarenhet.hjaltepoang.fvGrans;
  const ut = [];
  for (let g = forsta; g <= efter; g += steg) if (g > fore) ut.push(g);
  return ut;
}

// Slagen för HP som en förbättring kräver: en per passerad gräns och färdighet
export function kravdaHpSlag(regler, resFore, resEfter) {
  const fore = new Map(resFore.fardigheter.map((f) => [f.nyckel, f.fv]));
  return resEfter.fardigheter.flatMap((f) => fvGranser(regler, fore.get(f.nyckel) ?? 0, f.fv).map((grans) => ({ nyckel: f.nyckel, namn: f.namn, grans })));
}

// Höjning av PSY efter ett äventyr där rollpersonen vann en kamp PSY mot PSY (s. 75).
// slag är 1T20, t3 är 1T3 (behövs bara när slag är 1).
export function psyOkning(regler, { magiker, psy, slag, t3 = 0, mod = 0 }) {
  const P = regler.erfarenhet.psyHojning[magiker ? "magiker" : "ickeMagiker"];
  const varde = (t) => (t === "1T3+1" ? t3 + 1 : t === "1T3" ? t3 : Number(t));
  if (slag === 1) return varde(psy > P.tak ? P.ettaOverTak : P.etta);
  if (psy > P.tak) return 0;
  return slag + mod <= P.bas - psy ? 1 : 0;
}

export function psyMod(regler, res) {
  const tabell = regler.erfarenhet.psyHojning.sarskildFormagaMod;
  return summa([res.sarskildFormaga, ...(res.extraFormagor ?? [])].filter(Boolean).map((f) => tabell[f.namn] ?? 0));
}

const MAGI = ["kanna-magi", "magisk-kanalisering", "magistudier"];
export const arMagi = (regler, nyckel) => Boolean(besvarjelseAv(regler, nyckel)) || fardighetAv(regler, nyckel)?.typ === "magiskola" || MAGI.includes(nyckel.split(":")[0]);

// En träningsvecka (s. 74–75): vilket grundegenskapsslag, modifikation, antal slag och vad ett lyckat slag ger.
// metod: "ensam", "larare" (i grupp) eller "privat" (ensam elev hos lärare).
export function traning(regler, res, { nyckel, metod, lararFV = 0 }) {
  const E = regler.erfarenhet;
  const besv = besvarjelseAv(regler, nyckel);
  if (besv && metod === "ensam") {
    const B = E.besvarjelseEnsam;
    const int = res.grundegenskaper.INT;
    return { grundegenskap: "INT", cl: int + B.svarighet, mod: Math.max(0, B.modPerIntUnder - int), slagPerVecka: 1, ep: B.ep, kostnad: 0 };
  }
  // Besvärjelser bygger på PSY (s. 107); övriga färdigheter på sin grundegenskap
  const g = besv ? "PSY" : grundegenskapFor(regler, nyckel, res.grundegenskaper);
  const cl = res.grundegenskaper[g] + E.ensamtraning.svarighet;
  if (metod === "ensam") return { grundegenskap: g, cl, mod: 0, slagPerVecka: 1, ep: E.ensamtraning.ep, kostnad: 0 };
  const L = E.larare;
  const privat = metod === "privat";
  return {
    grundegenskap: g, cl, slagPerVecka: L.slagPerVecka, ep: E.ensamtraning.ep,
    mod: L.modPerFVOver18 * Math.max(0, lararFV - 18) + (privat ? L.modEnsamElev : 0),
    kostnad: (arMagi(regler, nyckel) ? L.kostnadMagi : L.kostnadPerVecka) * (privat ? L.faktorEnsamElev : 1),
  };
}

// Kalenderdagar för ett antal träningsveckor med ett visst antal timmar om dagen (s. 74)
export function traningsdagar(regler, veckor, timmar) {
  return Math.ceil(veckor * 7 * (regler.erfarenhet.ensamtraning.tidsfaktor[String(timmar)] ?? 1));
}

// ------------------------------------------------------------ pengar

// Pengarna i rp.spel.pengar är texter som skrivs på formuläret; null betyder pengarna kvar efter inköpen.
export const tomaPengar = (kvar) => ({ bors: { gm: "", sm: String(kvar), km: "" }, bank: { gm: "", sm: "", km: "" }, juveler: "" });
const mynt = (t) => (/^\s*-?\d+\s*$/.test(t ?? "") ? Number(t) : (t ?? "").trim() === "" ? 0 : null);
export function borsen(spel, kvar) {
  const p = spel.pengar ?? tomaPengar(kvar);
  return Object.fromEntries(["gm", "sm", "km"].map((m) => [m, mynt(p.bors[m])]));
}

// ------------------------------------------------------------ poster

// För in en post i rp.spel (tecken +1) eller ta tillbaka den (−1). Ändrar spel på plats.
function tillampa(spel, post, tecken, kvar) {
  for (const [k, n] of Object.entries(post.erf ?? {})) {
    const nytt = (spel.erf[k] ?? 0) + tecken * n;
    if (nytt) spel.erf[k] = nytt; else delete spel.erf[k];
  }
  spel.hjaltepoang = (spel.hjaltepoang ?? 0) + tecken * (post.hp ?? 0);
  const m = Object.entries(post.mynt ?? {}).filter(([, n]) => n);
  if (m.length) {
    spel.pengar ??= tomaPengar(kvar);
    for (const [mynt_, n] of m) spel.pengar.bors[mynt_] = String((mynt(spel.pengar.bors[mynt_]) ?? 0) + tecken * n);
  }
  spel.borttaget ??= {};
  if (tecken > 0) {
    for (const x of post.ut ?? []) {
      if (x.kopt) spel.borttaget[x.namn] = (spel.borttaget[x.namn] ?? 0) + 1;
      else {
        const i = spel.utrustning.findIndex((r) => r.namn === x.namn && String(r.vikt ?? "") === String(x.vikt ?? ""));
        if (i >= 0) spel.utrustning.splice(i, 1);
      }
    }
    spel.utrustning.push(...(post.in ?? []).map((x) => ({ ...x })));
  } else {
    for (const x of post.in ?? []) {
      const i = spel.utrustning.findLastIndex((r) => r.namn === x.namn && String(r.vikt ?? "") === String(x.vikt ?? ""));
      if (i >= 0) spel.utrustning.splice(i, 1);
    }
    for (const x of post.ut ?? []) {
      if (x.kopt) { spel.borttaget[x.namn] -= 1; if (spel.borttaget[x.namn] <= 0) delete spel.borttaget[x.namn]; }
      else spel.utrustning.push({ namn: x.namn, vikt: x.vikt });
    }
  }
}

// Ny rollperson med posten införd. kvar är pengarna kvar efter inköpen (res.utrustning.kvar).
export function laggTill(rp, post, kvar) {
  const ny = structuredClone(rp);
  ny.utveckling ??= TOM_UTVECKLING();
  tillampa(ny.spel, post, 1, kvar);
  ny.utveckling.logg.push(structuredClone(post));
  return ny;
}

// Ny rollperson utan den senaste posten
export function angraSenaste(rp, kvar) {
  const ny = structuredClone(rp);
  const post = ny.utveckling?.logg.pop();
  if (post) tillampa(ny.spel, post, -1, kvar);
  return ny;
}

// Kontroll av en post innan den förs in. resFore är den utvecklade rollpersonen före posten,
// resEfter efter. Ger en lista med regelbrott; tom lista betyder att posten går att föra in.
export function kontrolleraPost(regler, rpFore, rpEfter, resFore, resEfter, post) {
  const E = regler.erfarenhet;
  const fel = [];
  const namn = (k) => resFore.fardigheter.find((f) => f.nyckel === k)?.namn ?? resFore.besvarjelser.find((b) => b.nyckel === k)?.namn
    ?? (besvarjelseAv(regler, k) ? besvarjelseNamn(besvarjelseAv(regler, k), k) : fardighetAv(regler, k) ? namnFor(regler, fardighetAv(regler, k), k) : k);
  const kand = (k) => fardighetAv(regler, k) || besvarjelseAv(regler, k);
  for (const k of Object.keys(post.erf ?? {})) {
    if (!kand(k) || k.endsWith(":")) fel.push(`Okänd färdighet: ${k}`);
    if (!heltal(post.erf[k])) fel.push(`${namn(k)}: EP måste vara heltal`);
  }

  if (post.typ === "session") {
    let bonus = 0;
    for (const [k, { aventyr = 0, bonus: b = 0 } = {}] of Object.entries(post.ep ?? {})) {
      if (!heltal(aventyr) || !heltal(b) || aventyr < 0 || b < 0) fel.push(`${namn(k)}: EP måste vara 0 eller fler`);
      if ((aventyr || b) && fardighetAv(regler, k)?.kategoriB && !besvarjelseAv(regler, k)) fel.push(`${namn(k)} är en färdighet i kategori B och kan bara förbättras genom träning (s. 74)`);
      if ((post.erf?.[k] ?? 0) !== aventyr + b) fel.push(`${namn(k)}: EP stämmer inte`);
      bonus += b;
    }
    if (bonus > E.bonus.maxPerAventyr) fel.push(`Högst ${E.bonus.maxPerAventyr} bonuspoäng för ett äventyr (s. 74)`);
    if (bonus && !post.avslutat) fel.push("Bonuspoäng delas ut efter ett avslutat äventyr (s. 74)");
    if (post.psy && !post.avslutat) fel.push("PSY kan bara höjas efter ett avslutat äventyr (s. 75)");
    if (!heltal(post.hp ?? 0)) fel.push("Hjältepoäng måste vara heltal");
    if (post.hpFatt !== Math.max(0, post.hp ?? 0)) fel.push("Hjältepoängen stämmer inte");
  }

  if (post.typ === "traning") {
    const t = traning(regler, resFore, post);
    const fvNu = resFore.fardigheter.find((f) => f.nyckel === post.nyckel)?.fv ?? resFore.besvarjelser.find((b) => b.nyckel === post.nyckel)?.fv ?? 0;
    if (!(post.veckor?.length > 0)) fel.push("Minst en träningsvecka");
    if (!Object.hasOwn(E.ensamtraning.tidsfaktor, String(post.timmar))) fel.push("Man tränar 4, 6 eller 8 timmar om dagen (s. 74)");
    if (post.metod !== "ensam") {
      if (!(post.lararFV >= E.larare.minFV)) fel.push(`Läraren måste vara mästare, minst FV ${E.larare.minFV} (s. 74)`);
      if (!(post.lararFV > fvNu)) fel.push(`Lärarens FV måste vara högre än elevens (${fvNu}) (s. 74)`);
      if (!post.lararInt) fel.push(`Läraren måste ha INT ${E.larare.minINT} eller mer (s. 74)`);
    } else if (besvarjelseAv(regler, post.nyckel)) {
      if (!post.kodex) fel.push("Ensamträning i en besvärjelse kräver en magisk kodex (s. 75)");
    } else if (fardighetAv(regler, post.nyckel)?.grundegenskap === "INT" && !post.bok) fel.push("Ensamträning i en INT-baserad färdighet kräver en bok som SL godkänner (s. 74)");
    let ep = 0;
    for (const v of post.veckor ?? []) {
      if (v.slag?.length !== t.slagPerVecka) fel.push(`${t.slagPerVecka === 1 ? "Ett slag" : "Två slag"} per vecka (s. 74)`);
      (v.slag ?? []).forEach((slag, i) => {
        if (!heltal(slag) || slag < 1 || slag > 20) fel.push("Slagen är 1T20");
        const lyckat = slag + t.mod <= t.cl;
        const fatt = v.ep?.[i] ?? 0;
        if (!lyckat && fatt) fel.push("Ett misslyckat slag ger inga EP (s. 74)");
        if (lyckat && (t.ep === "1T4" ? !(fatt >= 1 && fatt <= 4) : fatt !== t.ep)) fel.push(`Ett lyckat slag ger ${t.ep} EP (s. 74–75)`);
        ep += fatt;
      });
    }
    if ((post.erf?.[post.nyckel] ?? 0) !== ep || Object.keys(post.erf ?? {}).length > 1) fel.push("EP från träningen stämmer inte");
    if ((post.mynt?.sm ?? 0) !== -t.kostnad * (post.veckor?.length ?? 0)) fel.push("Kostnaden stämmer inte");
  }

  if (post.typ === "forbattring") {
    const forbrukat = {};
    for (const [k, n] of Object.entries(post.fv ?? {})) {
      const f = resFore.fardigheter.find((x) => x.nyckel === k);
      const pris = f?.epPerFV ?? epPerFV(regler, status(regler, rpFore, k), fardighetAv(regler, k) ?? {}, []);
      if (!heltal(n) || n < 0) fel.push(`${namn(k)}: FV höjs med hela steg`);
      lagg(forbrukat, k, n * pris);
    }
    for (const [k, n] of Object.entries(post.besvarjelser ?? {})) {
      const b = besvarjelseAv(regler, k);
      if (!heltal(n) || n < 0) fel.push(`${namn(k)}: FV höjs med hela steg`);
      if (b) lagg(forbrukat, k, n * besvarjelsePris(regler, b.sv));
    }
    for (const k of new Set([...Object.keys(forbrukat), ...Object.keys(post.erf ?? {})])) {
      if ((post.erf?.[k] ?? 0) !== -(forbrukat[k] ?? 0)) fel.push(`${namn(k)}: EP stämmer inte`);
    }
    if (Object.keys(forbrukat).length && !post.vila) fel.push(`EP växlas till FV först efter minst ${E.omvandling.viladagar} dagars vila (s. 74)`);
    const hojda = Object.values(post.egenskaper ?? {});
    if (hojda.some((n) => !heltal(n) || n < 0)) fel.push("Grundegenskaper höjs med hela poäng");
    if (post.egenskaper?.STO) fel.push("STO kan inte höjas (s. 76)");
    const S = E.hjaltepoang.sarskildFormaga;
    if (post.formaga && (!heltal(post.formaga.hp) || post.formaga.hp < S.min || post.formaga.hp > S.max)) fel.push(`En särskild förmåga kostar ${S.min}–${S.max} HP (s. 76)`);
    if (post.formaga && !(post.formaga.slag >= 2 && post.formaga.slag <= 40)) fel.push("Slaget för särskild förmåga är 2T20");
    // Varje passerad FV-gräns ger ett slag 1T4 (s. 76)
    const krav = kravdaHpSlag(regler, resFore, resEfter);
    const slag = post.hpSlag ?? [];
    const matchar = krav.length === slag.length && krav.every((k) => slag.some((x) => x.nyckel === k.nyckel && x.grans === k.grans && heltal(x.slag) && x.slag >= 1 && x.slag <= 4));
    if (!matchar) fel.push("Slå 1T4 HP för varje FV 21, 41, 61 … som nås (s. 76)");
    const hp = summa(slag.map((x) => x.slag ?? 0)) - E.hjaltepoang.egenskap.hp * summa(hojda) - (post.formaga?.hp ?? 0);
    if (post.hp !== hp) fel.push("Hjältepoängen stämmer inte");
  }

  // Det som posten ändrar får inte gå under noll
  const spel = rpEfter.spel;
  for (const [k, n] of Object.entries(spel.erf)) if (n < 0) fel.push(`${namn(k)}: bara ${rpFore.spel.erf[k] ?? 0} EP finns`);
  if (spel.hjaltepoang < 0) fel.push(`Rollpersonen har bara ${rpFore.spel.hjaltepoang ?? 0} hjältepoäng`);
  const kvar = resFore.utrustning.kvar;
  const bors = borsen(spel, kvar);
  for (const m of Object.keys(post.mynt ?? {})) {
    if (post.mynt[m] && bors[m] === null) fel.push(`Börsens ${m} är inte ett tal på formuläret`);
    else if (bors[m] < 0) fel.push(`Rollpersonen har bara ${borsen(rpFore.spel, kvar)[m] ?? 0} ${m} i börsen`);
  }
  for (const x of post.ut ?? []) {
    if (x.kopt ? !resFore.utrustning.saker.some((s) => s.namn === x.namn) : !rpFore.spel.utrustning.some((r) => r.namn === x.namn)) fel.push(`${x.namn} finns inte i utrustningen`);
  }
  fel.push(...resEfter.fel.filter((f) => !resFore.fel.includes(f)));
  return [...new Set(fel)];
}
