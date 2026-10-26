// Kontroll mot bokens exempel: Peters högländare Brutus (s. 14–38).
// Kör: node --test test/brutus.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { raknaRollperson, besvarjelsePris } from "../regelmotor.js";
import { regler, brutus, las } from "./brutus-data.mjs";

const r = raknaRollperson({ ...regler, "sarskilda-formagor": las("sarskilda-formagor") }, brutus);
const fv = (n) => r.fardigheter.find((f) => f.nyckel === n);

test("inga regelbrott", () => assert.deepEqual(r.fel, []));

test("grundegenskaper efter ras och ålder (s. 28)", () => {
  assert.equal(r.alderskategori, "medelalders");
  assert.deepEqual(r.grundegenskaper, { STY: 16, FYS: 15, SMI: 15, INT: 8, PSY: 8, KAR: 10, STO: 17 });
});

test("BP: 130 start, 5 kvar (s. 17–33)", () => {
  assert.equal(r.bp.start, 130);
  assert.equal(r.bp.utgifter.extraYrkesfardigheter, 12);
  assert.equal(r.bp.utgifter.grundegenskaper, 79);
  assert.equal(r.bp.kvar, 5);
});

test("härledda värden (s. 29)", () => {
  assert.equal(r.harledda.totalKP, 16);
  assert.equal(r.harledda.skadebonus, "+1T4");
  assert.equal(r.harledda.forflyttning, 11);
});

test("svärdshand, socialt stånd och startkapital (s. 32–33)", () => {
  assert.equal(r.slag.svardshand, "Höger");
  assert.equal(r.slag.socialtStand, "Högre medelklass");
  assert.equal(r.slag.skResultat, 13);
  assert.equal(r.slag.startkapital, 6000);
});

test("startvärden och EP som i boken (s. 34–38)", () => {
  assert.equal(fv("vapen:Tvåhandsyxa").ep, 26);
  assert.equal(fv("vapen:Tvåhandssvärd").start, 8);
  assert.equal(fv("vapen:Tvåhandssvärd").ep, 6);
  assert.equal(fv("lasa-skriva:hoglandska").start, 11);
  assert.equal(fv("tala:hoglandska").start, 16);
  assert.equal(fv("rida").start, 8);
  assert.equal(fv("lasdyrkning").status, "sekundar");
  assert.equal(fv("lasdyrkning").ep, 15);
  assert.equal(fv("bluffa").status, "yrke");
  // Boken spenderar exakt 200 EP; med husregeln 5 EP per överblivet BP finns 25 EP kvar.
  assert.equal(r.ep.spenderat, 200);
  assert.equal(r.ep.start, 225);
});

// Regelbrott som gränssnittet ska stoppa
const allaRegler = { ...regler, "sarskilda-formagor": las("sarskilda-formagor") };
const felFor = (andring) => raknaRollperson(allaRegler, { ...structuredClone(brutus), ...andring }).fel;

test("dubblerad yrkesfärdighet är ett regelbrott (s. 27)", () => {
  assert.equal(felFor({ extraYrkesfardigheter: ["bluffa", "muta"] }).length > 0, true);
});

test("magiskola utan lyckat magiförmågeslag gör rollpersonen ofärdig (s. 106)", () => {
  const fardigheter = { ...brutus.fardigheter, animism: 1 };
  const vantarFor = (andring) => raknaRollperson(allaRegler, { ...structuredClone(brutus), ...andring }).vantar;
  assert.match(vantarFor({ fardigheter }).join(), /magiförmågeslag/);
  // INT 8 + PSY 8 ger chansen 8
  assert.match(vantarFor({ fardigheter, magiformaga: { slag: 9 } }).join(), /misslyckades/);
  assert.equal(vantarFor({ fardigheter, magiformaga: { slag: 8 } }).length, 0);
});

test("drakonitiska högst FV 5 och wongosiska bara yrke för wongoser (s. 64)", () => {
  assert.match(felFor({ fardigheter: { ...brutus.fardigheter, "tala:drakonitiska": 6 } }).join(), /högst FV 5/);
  assert.match(felFor({ extraYrkesfardigheter: ["tala:wongosiska"] }).join(), /wongoser/);
});

test("stridskonster kostar teknikernas grundkostnad, +2 som sekundär (s. 68)", () => {
  const hogland = ["Normalt slag", "Normal spark", "Uppresning", "Krosslag"]; // 2,5 → 3
  const rk = (andring) => raknaRollperson(allaRegler, { ...structuredClone(brutus), ...andring });
  const fardigheter = { ...brutus.fardigheter, "stridskonster:Högländarkross": 2 };
  const sek = rk({ sekundara: ["stridskonster:Högländarkross"], fardigheter, stridskonstTekniker: { "stridskonster:Högländarkross": hogland } });
  assert.equal(sek.fardigheter.find((f) => f.nyckel === "stridskonster:Högländarkross").epPerFV, 5);
  const yrk = rk({ extraYrkesfardigheter: ["bluffa", "stjala-foremal", "stridskonster:Högländarkross"], fardigheter, stridskonstTekniker: { "stridskonster:Högländarkross": hogland } });
  assert.equal(yrk.fardigheter.find((f) => f.nyckel === "stridskonster:Högländarkross").epPerFV, 3);
  assert.match(rk({ fardigheter }).fel.join(), /välj stilens tekniker/);
});

test("särskild förmåga kan bara gälla tillåtna färdigheter (s. 30)", () => {
  // Hobbyist gäller sekundära färdigheter, inte primära
  assert.match(felFor({ sarskildaFormagor: { bp: 1, slag: 23, val: [["rida"]] } }).join(), /Hobbyist/);
});

test("modersmål kan inte väljas som främmande språk, och Två vapen kan inte ha tvåhandsvapen (s. 66–71)", () => {
  assert.match(felFor({ yrkesfardigheter: [...brutus.yrkesfardigheter, "tala:hoglandska"] }).join(), /modersmål/);
  const yrkesfardigheter = brutus.yrkesfardigheter.map((k) => (k.startsWith("tva-vapen") ? "tva-vapen:Tvåhandssvärd+Dolk" : k));
  const fardigheter = { ...brutus.fardigheter, "tva-vapen:Tvåhandssvärd+Dolk": 3 };
  delete fardigheter["tva-vapen:Bredsvärd+Dolk"];
  assert.match(felFor({ yrkesfardigheter, fardigheter }).join(), /tvåhandsvapen/);
});

test("valt socialt stånd räknas som lägsta slagresultatet för ståndet (s. 33)", () => {
  const r = raknaRollperson(allaRegler, { ...structuredClone(brutus), socialtStand: { bp: 0, slag: null, valt: "Lågadel" } });
  assert.equal(r.slag.socialtStand, "Lågadel");
  assert.equal(r.slag.ssResultat, 30);
});

test("besvärjelser: pris efter skolvärde, tak av PSY och skolans FV (s. 36, 106)", () => {
  // Bokens exempel med Sigurd: SV 9 och 8 kostar 4, SV 5 kostar 3, SV 1 kostar 2 EP per FV
  assert.deepEqual([9, 8, 5, 1, 22].map((sv) => besvarjelsePris(allaRegler, sv)), [4, 4, 3, 2, 9]);
  const r = raknaRollperson(allaRegler, { ...structuredClone(brutus), fardigheter: { ...brutus.fardigheter, mentalism: 9 },
    magiformaga: { slag: 1 }, besvarjelser: { osynlighet: 5, teleportera: 1, flyga: 9 } });
  assert.equal(r.besvarjelser.find((b) => b.id === "osynlighet").ep, 20);
  assert.match(r.fel.join(), /Teleportera har skolvärde 12/);
  assert.match(r.fel.join(), /Flyga: högst FV 8/);
  const utan = raknaRollperson(allaRegler, { ...structuredClone(brutus), besvarjelser: { sprang: 1 } });
  assert.match(utan.fel.join(), /kan inte lära sig magi/);
});

test("utrustning betalas med startkapitalet; startpaketets vapen är enkelt och användbart (s. 38, 89)", () => {
  const rk = (andring) => raknaRollperson(allaRegler, { ...structuredClone(brutus), ...andring });
  const r = rk({ utrustning: { "Ryggsäck (20 liter)": 1, Bredsvärd: 1 } });
  assert.equal(r.utrustning.kvar, 6000 - 1020);
  assert.match(rk({ utrustning: { "Helrustning: Metall": 2 } }).fel.join(), /startkapitalet är 6000/);
  assert.match(rk({ startpaket: { valt: true, vapen: "Tvåhandssvärd" } }).fel.join(), /högst 100 sm/);
  assert.equal(rk({ startpaket: { valt: true, vapen: "Dolk" } }).fel.length, 0);
});

test("för låga slutvärden efter ålder är inget regelbrott, men måste lagas", () => {
  const r = raknaRollperson(allaRegler, { ...structuredClone(brutus), ras: "halvalv", alder: 300, modersmal: { tala: [], lasaSkriva: [] },
    grundvarden: { STY: 10, FYS: 10, SMI: 10, INT: 10, PSY: 10, KAR: 10 }, fardigheter: {}, rasval: [] });
  assert.equal(r.grundegenskaper.FYS, 10 - 1 - 8);
  assert.ok(!r.fel.some((f) => /minst 3/.test(f)));
  assert.match(r.forLagaEgenskaper.join(), /FYS blir 1/);
});

test("bärförmåga: kläder räknas inte, rustning väger hälften (s. 100)", () => {
  const rk = (andring) => raknaRollperson(allaRegler, { ...structuredClone(brutus), ...andring });
  const kladd = rk({ utrustning: { Byxor: 1, Mantel: 1 } }).utrustning;
  assert.equal(kladd.borda, 0);
  assert.equal(kladd.belastning, null);
  const tung = rk({ utrustning: { "Trätunna (100 liter)": 2, "Hauberk: Ringbrynja": 1 } }).utrustning;
  assert.equal(tung.barformaga, 16);
  assert.equal(tung.borda, 28 + 16);
  assert.equal(tung.belastning.mod, -2);
});
