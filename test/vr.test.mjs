// Vapen & rustningar i Chronopia: bokvalet, erfarenhetsnivåerna, de nya raserna och flera särskilda förmågor.
// Kör: node --test test/vr.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { raknaRollperson, sarskildFormaga, nivaFor, nivaer, valbaraRaser, valbaraYrken, kulturer, tillgangligaFormagetabeller, formageslag, yrkesPoster, yrkeVillkor, yrkesformagaText, svardsskolaFor, varukatalog, vapenVillkor, allaVapen, valfriaRegler, raknaSinnen } from "../regelmotor.js";
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

// ------------------------------------------------------------ yrken, färdigheter och vapentekniker (V&R s. 4–16, 32–33)
const medYrke = (rp, yrke, yrkesval, fv = {}) => {
  const x = { ...rp, yrke, yrkesval, extraYrkesfardigheter: [] };
  x.yrkesfardigheter = yrkesPoster(regler, x).flatMap((p) => p.nycklar);
  x.fardigheter = { ...Object.fromEntries(x.yrkesfardigheter.map((k) => [k, 0])), ...fv };
  return x;
};
const fardighet = (res, nyckel) => res.fardigheter.find((f) => f.nyckel === nyckel);

test("V&R:s 15 yrken finns bara med V&R, med +3 initiativ och startutrustning", () => {
  const nya = regler.yrken.lista.filter((y) => y.kalla?.bok === "vr");
  assert.equal(nya.length, 15);
  assert.ok(nya.every((y) => y.initiativ === 3 && y.startutrustning.length && y.stamning && y.beskrivning));
  assert.ok(!valbaraYrken(regler, brutus).some((y) => y.kalla));
  assert.match(fel({ ...brutus, yrke: "hyrsvard" }).join(), /Hyrsvärd finns i Vapen & rustningar/);
  assert.match(yrkesformagaText(regler.yrken.lista.find((y) => y.id === "hyrsvard")), /\+3 på initiativet\.$/);
});

test("yrken med rasvillkor (Hedersvakt bara dvärgar)", () => {
  const hedersvakt = regler.yrken.lista.find((y) => y.id === "hedersvakt");
  assert.equal(yrkeVillkor(regler, { ras: "dvarg" }, hedersvakt), null);
  assert.equal(yrkeVillkor(regler, { ras: "hoglandare" }, hedersvakt), "Bara för Dvärg");
  assert.match(fel(medYrke(vr, "hedersvakt", {})).join(), /Hedersvakt: bara för Dvärg/);
});

test("Vapenmästare: tre vapen med FV 10 gratis som primära", () => {
  const rp = medYrke(vr, "vapenmastare", { 6: ["Bredsvärd", "Dolk", "Långbåge"], 7: ["Tvåhandssvärd", "Kortsvärd"] });
  const res = raknaRollperson(regler, rp);
  assert.deepEqual(["Bredsvärd", "Dolk", "Långbåge"].map((v) => [fardighet(res, `vapen:${v}`).status, fardighet(res, `vapen:${v}`).start >= 10]),
    [["primar", true], ["primar", true], ["primar", true]]);
  assert.equal(fardighet(res, "vapen:Kortsvärd").status, "yrke");
});

test("Sabransk ökenriddare: magiskola utan magiförmågeslag, högst FV 10, och Hypnotisera FV 10", () => {
  const bas = { ...vr, ras: "sabran", rasval: [], modersmal: { tala: ["chronos"], lasaSkriva: ["chronos"] }, grundvarden: { ...vr.grundvarden, INT: 15, PSY: 13 } };
  const rp = medYrke(bas, "sabransk-okenriddare", { 7: { id: "mentalism" } }, { hypnotisera: 0 });
  rp.fardigheter.mentalism = 10;
  const res = raknaRollperson(regler, rp);
  assert.equal(res.magiformaga.behovs, false);
  assert.deepEqual([fardighet(res, "hypnotisera").status, fardighet(res, "hypnotisera").start], ["primar", 10]);
  assert.match(raknaRollperson(regler, { ...rp, fardigheter: { ...rp.fardigheter, mentalism: 11 } }).fel.join(), /Mentalism: högst FV 10/);
  // En annan skola som sekundär färdighet kräver slaget (RB-011)
  assert.equal(raknaRollperson(regler, { ...rp, fardigheter: { ...rp.fardigheter, animism: 1 } }).magiformaga.behovs, true);
});

test("Vapentekniker: svärdsskolans pris, yrkesfärdighetens pris och egna stilar", () => {
  const bas = { ...vr, ras: "latracier", rasval: [], modersmal: { tala: ["hoglandska"], lasaSkriva: ["hoglandska"] } };
  const rp = medYrke(bas, "svartgardist", {}, { "vapentekniker:Kejsarens hand": 2, "vapentekniker:Dubar": 1, "vapentekniker:Egen": 1 });
  rp.stridskonstTekniker = { "vapentekniker:Egen": ["Krafthugg", "Fint"] };
  const res = raknaRollperson(regler, rp);
  const kh = fardighet(res, "vapentekniker:Kejsarens hand");
  assert.deepEqual([kh.status, kh.epPerFV, kh.skola.id, kh.tekniker.length], ["yrke", 3, "svarta-gardet", 6]);
  assert.deepEqual([fardighet(res, "vapentekniker:Dubar").status, fardighet(res, "vapentekniker:Dubar").epPerFV], ["sekundar", 4]);
  assert.equal(fardighet(res, "vapentekniker:Egen").epPerFV, 2); // 1 + 0,5 avrundat uppåt
  assert.equal(svardsskolaFor(regler, "vapentekniker:sabrans väg").namn, "Sabrans väg");
  assert.match(fel({ ...brutus, fardigheter: { ...brutus.fardigheter, taktik: 1 } }).join(), /Taktik finns i Vapen & rustningar/);
});

test("Ädling: minst 100 000 sm (RB-004)", () => {
  const rp = medYrke({ ...vr, ras: "stadsalv", rasval: [] }, "adling", {});
  assert.ok(raknaRollperson(regler, rp).slag.startkapital >= 100000);
});

// Steg 5: vapen, sköldar, rustningar och utrustning (Vapen & rustningar s. 57–76)
test("V&R:s vapen, rustningar och varor finns bara med V&R, med unika namn", () => {
  const vrPost = (x) => x.kalla?.bok === "vr";
  const namn = allaVapen(regler).map((x) => x.namn);
  assert.equal(new Set(namn).size, namn.length);
  assert.ok(allaVapen(regler).filter(vrPost).length >= 90);
  assert.ok(!varukatalog(regler, brutus).some(vrPost));
  const katalog = varukatalog(regler, vr);
  for (const n of ["Ceriansk klinga", "Musköt", "Wongosköld", "Svarta gardets harnesk", "Axelskydd (par): Dvärgiskt", "Gasmask", "Trollört", "Rustningsvapen: Taggar"])
    assert.ok(katalog.some((x) => x.namn === n), n);
  assert.ok(!katalog.some((x) => x.namn === "Hederssvärd"), "hederssvärdet säljs inte");
  assert.ok(allaVapen(regler).filter(vrPost).every((x) => regler.vapen.grupper.some((g) => g.id === x.grupp) || ["svard", "kross", "yxor", "slagsmal"].includes(x.grupp)));
});

test("vapenfärdighet och köp av V&R-vapen kräver boken, och rasvapen kräver rätt ras", () => {
  const medVapen = (rp, v) => ({ ...rp, fardigheter: { ...rp.fardigheter, [`vapen:${v}`]: 3 } });
  assert.match(fel(medVapen(brutus, "Ceriansk klinga")).join(), /Ceriansk klinga finns i Vapen & rustningar/);
  assert.ok(!fel(medVapen(vr, "Ceriansk klinga")).some((t) => t.includes("Ceriansk")));
  assert.match(fel(medVapen(vr, "Wongodolk")).join(), /Wongodolk bärs bara av Wongos/);
  assert.equal(vapenVillkor(regler, { ...vr, ras: "wongos" }, "Wongodolk"), null);
  assert.match(vapenVillkor(regler, vr, "Snittare"), /Orch och Goblin/);
  assert.match(fel({ ...brutus, utrustning: { Gasmask: 1 } }).join(), /Gasmask finns i Vapen & rustningar/);
  const res = raknaRollperson(regler, { ...vr, utrustning: { Gasmask: 1 } });
  assert.ok(res.utrustning.saker.some((x) => x.namn === "Gasmask" && x.pris === 700));
});

test("yrkets startutrustning: varor i katalogen läggs gratis i packningen", () => {
  const rp = medYrke({ ...vr, ras: "hoglandare" }, "ordenskrigare", {});
  const res = raknaRollperson(regler, rp);
  const svard = res.utrustning.saker.find((x) => x.namn === "Hederssvärd");
  assert.ok(svard && svard.gratis && svard.yrke && svard.vikt === 8.5);
  assert.equal(res.utrustning.kostnad, 0);
  assert.ok(!res.startutrustning.includes("Hederssvärd"), "kopplade rader står inte två gånger");
  assert.ok(res.startutrustning.includes("Högländsk stridshäst"));
});

test("Börda i V&R: tung packning kostar handlingar (RB-017)", () => {
  const tung = { ...vr, utrustning: { "Normalt städ": 1 } }; // 35 kg är mellan 2 och 3 × STY
  assert.equal(raknaRollperson(regler, tung).utrustning.handlingar, -1);
  assert.equal(raknaRollperson(regler, { ...brutus, utrustning: { "Normalt städ": 1 } }).utrustning.handlingar, null);
  assert.equal(raknaRollperson(regler, { ...vr, utrustning: { "Normalt städ": 2 } }).utrustning.handlingar, -2); // 70 kg är mellan 3 och 5 × STY
  assert.equal(raknaRollperson(regler, { ...vr, utrustning: { "Normalt städ": 3 } }).utrustning.handlingar, -3); // 105 kg, mer än 6 × STY
});

// Steg 6: Syn och hörsel som valfri regel (V&R s. 3, RB-002)
test("Syn och hörsel: bara med V&R och när regeln är påslagen", () => {
  assert.deepEqual(valfriaRegler(regler, brutus), []);
  assert.deepEqual(valfriaRegler(regler, vr).map((v) => v.id), ["syn-och-horsel"]);
  assert.equal(raknaSinnen(regler, vr), null);
  assert.match(fel({ ...brutus, valfriaRegler: ["syn-och-horsel"] }).join(), /valfri regel/);
});

test("Syn och hörsel: BP + 1T6 ger nivå, BP dras och modifikationerna läggs ihop", () => {
  const rp = { ...vr, valfriaRegler: ["syn-och-horsel"], sinnen: { syn: { bp: 3, slag: 4 }, horsel: { bp: 2, slag: 3 } } };
  const res = raknaRollperson(regler, rp);
  const [syn, horsel] = res.sinnen.sinnen;
  assert.deepEqual([syn.varde, syn.niva, syn.mod, horsel.varde, horsel.niva, horsel.mod], [7, "Mycket god", 2, 5, "God", 1]);
  assert.equal(res.bp.utgifter.sinnen, 5);
  assert.equal(res.bp.kvar, raknaRollperson(regler, vr).bp.kvar - 5);
  const f = (n) => res.fardigheter.find((x) => x.nyckel === n)?.sinne;
  assert.deepEqual([f("upptacka-fara"), f("lyssna"), f("finna-dolda-ting"), f("vapen:Långbåge"), f("vapen:Bredsvärd")], [3, 1, 2, 2, undefined]);
  const dalig = raknaRollperson(regler, { ...rp, sinnen: { syn: { bp: 0, slag: 1 }, horsel: { bp: 0, slag: 6 } } }).sinnen.sinnen;
  assert.deepEqual(dalig.map((x) => [x.niva, x.mod]), [["Dålig", -2], ["God", 1]]);
  assert.equal(raknaRollperson(regler, { ...rp, sinnen: { syn: { bp: 9, slag: 6 }, horsel: { bp: 0, slag: null } } }).sinnen.sinnen[0].niva, "Utmärkt");
});

test("Krigarmunk: två paketval, lärdom eller fällor och lås, vapen eller valfria (RB-016)", () => {
  const nycklar = (val) => yrkesPoster(regler, { ...vr, yrke: "krigarmunk", yrkesval: val }).flatMap((p) => p.nycklar);
  const a = nycklar({ 4: { paket: 0, val: ["Heraldik", "Historia"] }, 6: { paket: 0, val: ["Dolk", "Trästav"] } });
  assert.ok(["lardom:Heraldik", "lardom:Historia", "vapen:Dolk", "vapen:Trästav"].every((k) => a.includes(k)), a.join());
  const b = nycklar({ 4: { paket: 1 }, 6: { paket: 1, val: ["simma", "akrobatik"] } });
  assert.ok(["hantera-fallor", "lasdyrkning", "simma", "akrobatik"].every((k) => b.includes(k)), b.join());
  assert.ok(!b.some((k) => k.startsWith("vapen:")));
  assert.ok(!nycklar({}).some((k) => k === "hantera-fallor" || k.startsWith("vapen:")), "inget paket valt: inga nycklar");
  assert.match(fel(medYrke(vr, "krigarmunk", { 6: { paket: 1, val: ["rida", "simma"] } })).join(), /Rida är en primär färdighet/);
});

test("Smidesmästare: dvärgisk stridshammare som vapenfärdighet och hammaren +3 i packningen (RB-016)", () => {
  const rp = medYrke({ ...vr, ras: "dvarg", rasval: [] }, "smidesmastare", { 0: ["Smide", "Vapensmide", "Rustningssmide"], 4: ["Stridshammare (dvärgisk)", "Dolk", "Yxa"] });
  assert.ok(rp.yrkesfardigheter.includes("vapen:Stridshammare (dvärgisk)"));
  const res = raknaRollperson(regler, rp);
  const hammare = res.utrustning.saker.find((x) => x.namn === "Smidesmästarens stridshammare");
  assert.ok(hammare?.yrke && hammare.vikt === 5);
  const vapnet = allaVapen(regler).find((x) => x.namn === "Smidesmästarens stridshammare");
  assert.deepEqual([vapnet.skada, vapnet.bv, vapnet.styKrav, vapnet.somVapen], ["1T10+3", 16, 15, "Stridshammare (dvärgisk)"]);
  assert.ok(!res.startutrustning.some((t) => t.startsWith("Tvåhandshammare")));
  assert.match(vapenVillkor(regler, rp, "Smidesmästarens stridshammare"), /färdigheten är Stridshammare \(dvärgisk\)/);
  assert.match(fel(medYrke({ ...vr, ras: "latracier" }, "smidesmastare", {})).join(), /bara för Dvärg och Människa|bara för Människa och Dvärg/);
});
