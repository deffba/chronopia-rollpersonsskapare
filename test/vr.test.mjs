// Vapen & rustningar i Chronopia: bokvalet, erfarenhetsnivåerna, de nya raserna och flera särskilda förmågor.
// Kör: node --test test/vr.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { raknaRollperson, sarskildFormaga, nivaFor, nivaer, valbaraRaser, valbaraYrken, kulturer, tillgangligaFormagetabeller, formageslag } from "../regelmotor.js";
import { regler as bas, brutus, las } from "./brutus-data.mjs";

const regler = { ...bas, "sarskilda-formagor": las("sarskilda-formagor"), bocker: las("bocker"), erfarenhet: las("erfarenhet") };
const fel = (rp) => raknaRollperson(regler, rp).fel;
const vr = { ...brutus, bocker: ["grund", "vr"] };
const slag = (bp, s, tabell, val = []) => ({ bp, slag: s, val, avstar: false, tabell });

test("utan V&R: grundreglernas raser, 125 BP och en förmåga", () => {
  assert.equal(valbaraRaser(regler, brutus).length, 12);
  assert.equal(nivaer(regler, brutus), null);
  assert.deepEqual([nivaFor(regler, brutus).bp, nivaFor(regler, brutus).formagor], [125, 1]);
  assert.deepEqual(tillgangligaFormagetabeller(regler, brutus).map((t) => t.id), ["grund"]);
  assert.ok(!kulturer(regler, brutus).includes("Sabran"));
});

test("med V&R: tre nya raser, tre nivåer och V&R:s förmågetabell", () => {
  assert.deepEqual(valbaraRaser(regler, vr).slice(-3).map((r) => r.id), ["latracier", "mulvak", "sabran"]);
  assert.deepEqual(nivaer(regler, vr).map((n) => [n.namn, n.bp, n.formagor]), [["Krigare", 125, 1], ["Veteran", 150, 2], ["Hjälte", 175, 3]]);
  assert.deepEqual(tillgangligaFormagetabeller(regler, vr).map((t) => t.id), ["grund", "vr"]);
  assert.ok(kulturer(regler, vr).includes("Sabran"));
  assert.equal(valbaraYrken(regler, vr).length, valbaraYrken(regler, brutus).length + valbaraYrken(regler, vr).filter((y) => y.kalla?.bok === "vr").length);
});

test("rasdata enligt RB-005 och RB-006", () => {
  const ras = (id) => regler.raser.find((r) => r.id === id);
  assert.deepEqual(ras("latracier").sto, { min: 10, max: 20, normal: 15 });
  assert.deepEqual(ras("latracier").talaModersmal, [{ sprak: "hoglandska", fv: 16 }]);
  assert.deepEqual([ras("mulvak").bp, ras("mulvak").sto.normal, ras("sabran").bp, ras("sabran").sto.normal], [0, 4, 20, 14]);
  assert.deepEqual(ras("sabran").alder, ras("manniska").alder);
});

test("en ras eller nivå från en bok som inte är vald är ett regelbrott", () => {
  assert.match(fel({ ...brutus, ras: "sabran" }).join(), /Sabran finns i Vapen & rustningar/);
  assert.ok(!fel({ ...vr, ras: "sabran", rasval: [] }).some((t) => t.includes("finns i")));
  assert.match(fel({ ...brutus, niva: 2 }).join(), /Erfarenhetsnivån/);
});

test("hjältenivån ger 175 BP och tre slag", () => {
  const r = raknaRollperson(regler, { ...vr, niva: 2 });
  assert.equal(r.bp.start, 175 + 5); // Brutus är 50 år: +5 BP (s. 17)
  assert.equal(formageslag(regler, { ...vr, niva: 2 }).length, 3);
});

test("flera förmågor: effekterna läggs ihop och BP räknas för alla slag", () => {
  const rp = { ...vr, niva: 1, sarskildaFormagor: { ...brutus.sarskildaFormagor, fler: [slag(5, 25, "vr")] } }; // 30: Extremt smärttålig
  const r = raknaRollperson(regler, rp);
  assert.deepEqual(r.fel, []);
  assert.deepEqual(r.sarskildaFormagorna.map((f) => f.namn), ["Hobbyist", "Extremt smärttålig"]);
  assert.equal(r.bp.utgifter.sarskildaFormagor, 6);
  assert.equal(r.harledda.totalKP, Math.ceil(((r.grundegenskaper.STO + r.grundegenskaper.FYS) / 2) * 1.5));
  // Två arv läggs ihop: Arvinge (75 000) och Gravplundrare (20 000)
  const rik = raknaRollperson(regler, { ...vr, niva: 2, sarskildaFormagor: { ...slag(5, 1, "vr"), fler: [slag(5, 20, "vr"), slag(0, null)] } });
  assert.equal(rik.sarskildaFormagorna[0].namn, "Arvinge");
  assert.equal(rik.sarskildaFormagorna[1].namn, "Gravplundrare");
  assert.ok(rik.slag.startkapital >= 95000);
});

test("högst 20 BP per slag på V&R:s tabell och 40 på grundreglernas", () => {
  assert.match(fel({ ...vr, sarskildaFormagor: slag(21, 5, "vr") }).join(), /Högst 20 BP per slag på tabellen Vapen & rustningar/);
  assert.deepEqual(fel({ ...vr, sarskildaFormagor: slag(20, 5, "vr") }).filter((t) => t.includes("Högst")), []);
  assert.match(fel({ ...vr, niva: 1, sarskildaFormagor: { ...slag(1, 3), fler: [slag(41, 3, "grund")] } }).join(), /Högst 40 BP/);
});

test("slag utöver nivåns antal får inga BP", () => {
  assert.match(sarskildFormaga(regler, { ...vr, niva: 0, sarskildaFormagor: { ...slag(1, 3), fler: [slag(5, 5, "vr")] } }).fel.join(), /inte fler särskilda förmågor/);
});

test("Hjälte: 3T20 hjältepoäng som slås och kan köpa grundegenskaper (RB-003)", () => {
  const hjalte = (val, kop = {}) => ({ ...vr, niva: 2, sarskildaFormagor: { ...slag(20, 15, "vr", val), fler: [slag(0, null), slag(0, null)] }, hjaltepoangKop: kop });
  assert.match(sarskildFormaga(regler, hjalte([])).saknas.join(), /Slå 3T20 för hjältepoängen/);
  assert.match(fel(hjalte([{ slag: 61 }])).join(), /3–60/);
  const r = raknaRollperson(regler, hjalte([{ slag: 33 }], { STY: 2 }));
  assert.deepEqual(r.fel, []);
  assert.deepEqual(r.hjaltepoang, { totalt: 33, spenderat: 10, kvar: 23, slagna: true });
  assert.equal(r.grundegenskaper.STY, raknaRollperson(regler, hjalte([{ slag: 33 }])).grundegenskaper.STY + 2);
  assert.match(fel(hjalte([{ slag: 33 }], { STY: 7 })).join(), /bara 33 hjältepoäng/);
  assert.match(fel(hjalte([{ slag: 33 }], { STO: 1 })).join(), /bara höja STY/);
  // Utan förmågan finns inga hjältepoäng att använda
  assert.match(fel({ ...vr, hjaltepoangKop: { STY: 1 } }).join(), /bara 0 hjältepoäng/);
});

test("V&R:s tabell enligt RB-008: Blodshämnd, Mycket mäktiga vänner, ingen Järnnäve", () => {
  const t = regler["sarskilda-formagor"].tabeller.find((x) => x.id === "vr");
  const namn = t.rader.map((r) => r.namn);
  assert.equal(t.rader.length, 30);
  assert.equal(namn[t.rader.findIndex((r) => r.slag[0] === 23)], "Blodshämnd");
  assert.equal(namn[t.rader.findIndex((r) => r.slag[0] === 36)], "Mycket mäktiga vänner");
  assert.ok(!namn.includes("Järnnäve"));
  assert.deepEqual(t.rader.at(-1).slag, [40, null]);
});
