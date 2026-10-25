// Utvecklingen efter skapandet (kapitel 4, s. 73–76), med bokens Brutus som rollperson.
// Kör: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { raknaRollperson } from "../regelmotor.js";
import { TOMT_SPEL } from "../sparformat.js";
import {
  utvecklad, laggTill, angraSenaste, kontrolleraPost, kravdaHpSlag, fvGranser, psyOkning, traning, traningsdagar, borsen,
} from "../utveckling.js";
import { regler as bas, brutus, las } from "./brutus-data.mjs";

const regler = { ...bas, "sarskilda-formagor": las("sarskilda-formagor"), erfarenhet: las("erfarenhet") };
const start = { ...structuredClone(brutus), spel: TOMT_SPEL(), utveckling: { logg: [] } };
const rakna = (rp) => utvecklad(regler, rp, raknaRollperson(regler, rp));
const fv = (res, n) => res.fardigheter.find((f) => f.nyckel === n)?.fv;
const KVAR = rakna(start).utrustning.kvar;

// För in en post och ger rollpersonen efteråt och regelbrotten
function forIn(rp, post) {
  const efter = laggTill(rp, post, KVAR);
  return { rp: efter, fel: kontrolleraPost(regler, rp, efter, rakna(rp), rakna(efter), post) };
}
const session = (ep, extra = {}) => ({
  typ: "session", datum: "2026-10-25", ep, erf: Object.fromEntries(Object.entries(ep).map(([k, v]) => [k, (v.aventyr ?? 0) + (v.bonus ?? 0)])),
  hp: 0, hpFatt: 0, ...extra,
});

test("utan logg är rollpersonen som vid skapandet", () => {
  const r = raknaRollperson(regler, start);
  const u = rakna(start);
  assert.deepEqual(u.fardigheter, r.fardigheter);
  assert.deepEqual(u.grundegenskaper, r.grundegenskaper);
  assert.deepEqual(u.fel, []);
});

test("spelmöte: EP per färdighet, bonuspoäng efter avslutat äventyr (s. 74)", () => {
  const { rp, fel } = forIn(start, session({ smyga: { aventyr: 2 }, bluffa: { aventyr: 1, bonus: 3 } }, { avslutat: true, hp: 2, hpFatt: 2 }));
  assert.deepEqual(fel, []);
  assert.deepEqual(rp.spel.erf, { smyga: 2, bluffa: 4 });
  assert.equal(rp.spel.hjaltepoang, 2);
  assert.equal(rp.utveckling.logg.length, 1);
});

test("spelmöte: kategori B får inga äventyrs-EP och bonus är högst 10 (s. 74)", () => {
  assert.match(forIn(start, session({ "hantverk:Smide": { aventyr: 1 } })).fel.join(), /kategori B/);
  assert.match(forIn(start, session({ smyga: { bonus: 6 }, bluffa: { bonus: 5 } }, { avslutat: true })).fel.join(), /Högst 10/);
  assert.match(forIn(start, session({ smyga: { bonus: 2 } })).fel.join(), /avslutat äventyr/);
});

test("förbättring: EP blir FV till samma pris som vid start, efter sju dagars vila (s. 74–75)", () => {
  const efterSession = forIn(start, session({ smyga: { aventyr: 5 } })).rp;
  const post = { typ: "forbattring", datum: "2026-11-01", vila: true, fv: { smyga: 2 }, erf: { smyga: -4 }, hpSlag: [], hp: 0 };
  const { rp, fel } = forIn(efterSession, post);
  assert.deepEqual(fel, []);
  assert.equal(fv(rakna(rp), "smyga"), 8);
  assert.deepEqual(rp.spel.erf, { smyga: 1 });
  assert.match(forIn(efterSession, { ...post, vila: false }).fel.join(), /vila/);
  assert.match(forIn(efterSession, { ...post, fv: { smyga: 3 }, erf: { smyga: -6 } }).fel.join(), /bara 5 EP/);
});

test("förbättring: sekundär färdighet högst grundegenskapen (s. 74)", () => {
  // Låsdyrkning är sekundär och SMI-baserad; Brutus har SMI 15 och FV 6
  const rik = forIn(start, { typ: "traning", ...traningsPost("lasdyrkning", 60) }).rp;
  const { fel } = forIn(rik, { typ: "forbattring", vila: true, fv: { lasdyrkning: 10 }, erf: { lasdyrkning: -50 }, hpSlag: [], hp: 0 });
  assert.match(fel.join(), /Låsdyrkning: högst FV 15/);
  const ok = forIn(rik, { typ: "forbattring", vila: true, fv: { lasdyrkning: 9 }, erf: { lasdyrkning: -45 }, hpSlag: [], hp: 0 });
  assert.deepEqual(ok.fel, []);
});

// En träningspost som ger exakt ep EP (12 veckor ensamträning med lyckade slag om 1T4)
function traningsPost(nyckel, ep) {
  const veckor = [];
  for (let kvar = ep; kvar > 0; kvar -= 4) veckor.push({ slag: [1], ep: [Math.min(4, kvar)] });
  return { datum: "2026-11-01", nyckel, metod: "ensam", timmar: 8, veckor, erf: { [nyckel]: ep }, mynt: {} };
}

test("träning: ensam, med lärare och privatlärare (s. 74)", () => {
  const res = rakna(start);
  assert.deepEqual(traning(regler, res, { nyckel: "smyga", metod: "ensam" }), { grundegenskap: "SMI", cl: 15, mod: 0, slagPerVecka: 1, ep: "1T4", kostnad: 0 });
  assert.deepEqual(traning(regler, res, { nyckel: "smyga", metod: "larare", lararFV: 20 }), { grundegenskap: "SMI", cl: 15, slagPerVecka: 2, ep: "1T4", mod: -4, kostnad: 1500 });
  assert.equal(traning(regler, res, { nyckel: "smyga", metod: "privat", lararFV: 18 }).kostnad, 3000);
  assert.equal(traning(regler, res, { nyckel: "smyga", metod: "privat", lararFV: 18 }).mod, -5);
  assert.equal(traningsdagar(regler, 2, 6), 21);
  // Bokens exempel: INT 15 i ensamträning av en besvärjelse får +4 och måste slå 11 eller lägre (s. 75)
  const b = traning(regler, { grundegenskaper: { INT: 15 } }, { nyckel: "antimagi", metod: "ensam" });
  assert.equal(b.cl - b.mod, 11);
  assert.equal(b.ep, 1);
});

test("träning med lärare kostar pengar ur börsen och kräver en mästare (s. 74)", () => {
  const post = { typ: "traning", datum: "2026-11-01", nyckel: "smyga", metod: "larare", lararFV: 18, lararInt: true, timmar: 8,
    veckor: [{ slag: [3, 19], ep: [2, 0] }], erf: { smyga: 2 }, mynt: { sm: -1500 } };
  const { rp, fel } = forIn(start, post);
  assert.deepEqual(fel, []);
  assert.equal(borsen(rp.spel, KVAR).sm, KVAR - 1500);
  assert.match(forIn(start, { ...post, lararFV: 16 }).fel.join(), /mästare/);
  assert.match(forIn(start, { ...post, veckor: [{ slag: [3, 19], ep: [2, 1] }], erf: { smyga: 3 } }).fel.join(), /misslyckat/);
  const fattig = { ...start, spel: { ...TOMT_SPEL(), pengar: { bors: { gm: "", sm: "100", km: "" }, bank: { gm: "", sm: "", km: "" }, juveler: "" } } };
  assert.match(forIn(fattig, post).fel.join(), /bara 100 sm/);
});

test("HP för en grundegenskap höjer FV i primära och yrkesfärdigheter, inte sekundära (s. 45, 76)", () => {
  const medHp = { ...start, spel: { ...TOMT_SPEL(), hjaltepoang: 5 } };
  const post = { typ: "forbattring", datum: "2026-11-01", egenskaper: { SMI: 1 }, hpSlag: [], hp: -5, erf: {} };
  const { rp, fel } = forIn(medHp, post);
  assert.deepEqual(fel, []);
  const u = rakna(rp);
  assert.equal(u.grundegenskaper.SMI, 16);
  assert.equal(fv(u, "smyga"), 7); // primär
  assert.equal(fv(u, "dra-vapen"), 8); // yrke
  assert.equal(fv(u, "lasdyrkning"), 6); // sekundär
  assert.equal(rp.spel.hjaltepoang, 0);
  assert.match(forIn(medHp, { ...post, egenskaper: { SMI: 2 }, hp: -10 }).fel.join(), /bara 5 hjältepoäng/);
  assert.match(forIn(medHp, { ...post, egenskaper: { STO: 1 } }).fel.join(), /STO/);
});

test("FV 21 ger ett slag om 1T4 HP (s. 76)", () => {
  assert.deepEqual(fvGranser(regler, 16, 21), [21]);
  assert.deepEqual(fvGranser(regler, 20, 45), [21, 41]);
  assert.deepEqual(fvGranser(regler, 21, 30), []);
  const rik = forIn(start, { typ: "traning", ...traningsPost("vapen:Tvåhandsyxa", 10) }).rp;
  const utan = { typ: "forbattring", vila: true, fv: { "vapen:Tvåhandsyxa": 5 }, erf: { "vapen:Tvåhandsyxa": -10 }, hpSlag: [], hp: 0 };
  assert.match(forIn(rik, utan).fel.join(), /1T4 HP/);
  const efter = laggTill(rik, utan, KVAR);
  assert.deepEqual(kravdaHpSlag(regler, rakna(rik), rakna(efter)), [{ nyckel: "vapen:Tvåhandsyxa", namn: "Tvåhandsyxa", grans: 21 }]);
  const med = { ...utan, hpSlag: [{ nyckel: "vapen:Tvåhandsyxa", grans: 21, slag: 3 }], hp: 3 };
  const { rp, fel } = forIn(rik, med);
  assert.deepEqual(fel, []);
  assert.equal(rp.spel.hjaltepoang, 3);
  assert.equal(rakna(rp).utveckling.hpSamlade, 3);
});

test("PSY efter ett äventyr med en vunnen kamp PSY mot PSY (s. 75)", () => {
  assert.equal(psyOkning(regler, { magiker: true, psy: 8, slag: 17 }), 1);
  assert.equal(psyOkning(regler, { magiker: true, psy: 8, slag: 18 }), 0);
  assert.equal(psyOkning(regler, { magiker: true, psy: 8, slag: 1, t3: 2 }), 3);
  assert.equal(psyOkning(regler, { magiker: true, psy: 25, slag: 1, t3: 2 }), 2);
  assert.equal(psyOkning(regler, { magiker: true, psy: 25, slag: 2 }), 0);
  assert.equal(psyOkning(regler, { magiker: false, psy: 8, slag: 12 }), 1);
  assert.equal(psyOkning(regler, { magiker: false, psy: 8, slag: 13 }), 0);
  assert.equal(psyOkning(regler, { magiker: false, psy: 20, slag: 1, t3: 3 }), 1);
  assert.equal(psyOkning(regler, { magiker: false, psy: 8, slag: 16, mod: -5 }), 1); // God PSY-potential
  const { rp, fel } = forIn(start, session({}, { avslutat: true, psy: { slag: 12, okning: 1 } }));
  assert.deepEqual(fel, []);
  assert.equal(rakna(rp).grundegenskaper.PSY, 9);
  assert.equal(fv(rakna(rp), "upptacka-fara"), 8); // primär, PSY-baserad
});

test("utrustning och pengar under spel, och ångra senaste posten", () => {
  const medKopt = { ...start, utrustning: { "½-tums rep (10 m, tål 100 kg)": 1 } };
  const kvar = rakna(medKopt).utrustning.kvar;
  const post = session({}, { mynt: { sm: -200, gm: 3 }, in: [{ namn: "Drakfjäll", vikt: "1" }], ut: [{ namn: "½-tums rep (10 m, tål 100 kg)", kopt: true }] });
  const efter = laggTill(medKopt, post, kvar);
  assert.deepEqual(kontrolleraPost(regler, medKopt, efter, rakna(medKopt), rakna(efter), post), []);
  assert.deepEqual(borsen(efter.spel, kvar), { gm: 3, sm: kvar - 200, km: 0 });
  assert.deepEqual(efter.spel.utrustning, [{ namn: "Drakfjäll", vikt: "1" }]);
  assert.equal(rakna(efter).utrustning.saker.some((x) => x.namn === "½-tums rep (10 m, tål 100 kg)"), false);
  const tillbaka = angraSenaste(efter, kvar);
  assert.deepEqual(tillbaka.utveckling.logg, []);
  assert.deepEqual(tillbaka.spel.utrustning, []);
  assert.deepEqual(tillbaka.spel.borttaget, {});
  assert.deepEqual(borsen(tillbaka.spel, kvar), { gm: 0, sm: kvar, km: 0 });
  assert.equal(rakna(tillbaka).utrustning.saker.some((x) => x.namn === "½-tums rep (10 m, tål 100 kg)"), true);
});

test("en särskild förmåga köpt för HP: 2T20 + 2 per HP (s. 76)", () => {
  const medHp = { ...start, spel: { ...TOMT_SPEL(), hjaltepoang: 30 } };
  // 30 + 2 × 26 = 82: Höjd grundegenskap, +2 på en
  const post = { typ: "forbattring", formaga: { hp: 26, slag: 30, val: [{ lage: "en", egenskaper: ["FYS"] }], namn: "Höjd grundegenskap" }, hpSlag: [], hp: -26, erf: {} };
  const { rp, fel } = forIn(medHp, post);
  assert.deepEqual(fel, []);
  const u = rakna(rp);
  assert.equal(u.grundegenskaper.FYS, 17);
  assert.equal(u.extraFormagor[0].namn, "Höjd grundegenskap");
  assert.ok(u.harledda.totalKP >= rakna(start).harledda.totalKP);
  assert.match(forIn(medHp, { ...post, formaga: { ...post.formaga, val: [] } }).fel.join(), /Välj grundegenskaper/);
});
