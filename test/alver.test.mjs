// Alver i Chronopia: husalverna, drakalven, alvyrkena, förmågetabellen med husens rader, masker, dockor,
// Påfågelsdansen, Pierrotens täckyrke och husens besvärjelser.
// Kör: node --test test/alver.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { raknaRollperson, nivaer, valbaraRaser, valbaraYrken, yrkeVillkor, tillgangligaFormagetabeller, formagetabell, formageslag,
  sarskildFormaga, raknaSinnen, yrkesPoster, teknikLista, svardsskolaFor, magiskolor, kulturer, epPerFV } from "../regelmotor.js";
import { regler as bas, brutus, las } from "./brutus-data.mjs";

const regler = { ...bas, "sarskilda-formagor": las("sarskilda-formagor"), bocker: las("bocker"), erfarenhet: las("erfarenhet"),
  klaner: las("klaner"), foljeslagare: las("foljeslagare") };
const BOCKER = ["grund", "vr", "magi", "alver"];
const ALV = { tala: ["alviska", "chronos"], lasaSkriva: ["alviska", "chronos"] };
// En lysanderalv som krigare, utan särskild förmåga
const alv = { ...brutus, bocker: BOCKER, ras: "lysanderalv", alder: 200, yrke: "krigare", rasval: [], kon: "Man", modersmal: ALV,
  yrkesfardigheter: ["dra-vapen", "muta", "tva-vapen:Kortsvärd+Dolk", "vapen:Bredsvärd", "vapen:Dolk", "vapen:Långbåge"], extraYrkesfardigheter: [],
  grundvarden: { STY: 12, FYS: 12, SMI: 14, INT: 12, PSY: 12, KAR: 12 }, stoSteg: 0,
  sarskildaFormagor: { bp: 0, slag: null, val: [], avstar: true }, socialtStand: { bp: 0, slag: 7 }, startkapital: { bp: 0, slag: 9 },
  fardigheter: { "vapen:Bredsvärd": 5 } };
const fel = (rp) => raknaRollperson(regler, rp).fel;
const fv = (r, k) => r.fardigheter.find((f) => f.nyckel === k);
const y = (id) => regler.yrken.lista.find((x) => x.id === id);
const sf = (rp, slag, val = [], bp = 5) => ({ ...rp, sarskildaFormagor: { bp, slag, val, avstar: false, tabell: "alver" } });

test("med Alver: nivåerna, sju husalver (inte drakalven) och 16 alvyrken", () => {
  assert.deepEqual(nivaer(regler, alv).map((n) => [n.namn, n.bp, n.formagor]),
    [["Krigare / Magus / Alv", 125, 1], ["Veteran / Magus regis", 150, 2], ["Hjälte / Häxmästare / Upphöjd", 175, 3]]);
  const raser = valbaraRaser(regler, alv).filter((r) => r.kalla?.bok === "alver").map((r) => r.id);
  assert.deepEqual(raser, ["aramasalv", "belisariusalv", "ceriasalv", "degasalv", "kothalv", "lysanderalv", "venturaalv"]);
  assert.ok(!valbaraRaser(regler, { ...alv, bocker: ["grund", "vr", "magi"] }).some((r) => r.kalla?.bok === "alver"));
  assert.equal(valbaraYrken(regler, alv).filter((x) => x.kalla?.bok === "alver").length, 16);
  assert.ok(!kulturer(regler, alv).includes("Aramasalv")); // husalverna är stadsalver
});

test("husalverna: Ceriasalvens 35 BP, Belisarius +20 i stället för stadsalvens +15, stadsalvens förmågor", () => {
  const r = raknaRollperson(regler, { ...alv, ras: "ceriasalv", rasval: ["hantverk:Smide"], fardigheter: { "hantverk:Smide": 0, bluffa: 0 } });
  assert.equal(r.bp.utgifter.ras, 35); // RB-013
  assert.equal(fv(r, "bluffa").status, "sekundar");
  assert.equal(fv(r, "hantverk:Smide").status, "primar");
  const utan = raknaRollperson(regler, { ...alv, ras: "stadsalv" }).slag.ssResultat;
  assert.equal(raknaRollperson(regler, { ...alv, ras: "belisariusalv", rasval: ["malning"] }).slag.ssResultat, utan + 5);
  assert.ok(raknaRollperson(regler, alv).ras.formagor.includes("Mörkersyn"));
});

test("yrkenas villkor: hus, kön och Drakgardisten för alla utom andra alver", () => {
  assert.match(yrkeVillkor(regler, { ras: "degasalv" }, y("dockmastare")), /Belisariusalv/);
  assert.equal(yrkeVillkor(regler, { ras: "belisariusalv", kon: "Kvinna" }, y("husar")), null);
  assert.match(yrkeVillkor(regler, { ras: "belisariusalv", kon: "Man" }, y("husar")), /kvinnor/);
  assert.equal(yrkeVillkor(regler, { ras: "manniska" }, y("drakgardist")), null);
  assert.equal(yrkeVillkor(regler, { ras: "lysanderalv" }, y("drakgardist")), null);
  assert.match(yrkeVillkor(regler, { ras: "aramasalv" }, y("drakgardist")), /alla raser utom/);
  assert.match(yrkeVillkor(regler, { ras: "manniska" }, y("vit-apostel")), /Bara för/);
  assert.equal(yrkeVillkor(regler, { ras: "ljusalv" }, y("hetsare")), null);
});

test("syn och hörsel: alvernas tabell för alver, V&R:s för andra", () => {
  const sinnen = { syn: { bp: 0, slag: 5 }, horsel: { bp: 0, slag: 1 } };
  const med = (ras) => raknaSinnen(regler, { ...alv, ras, valfriaRegler: ["syn-och-horsel"], sinnen });
  assert.deepEqual(med("lysanderalv").sinnen.map((x) => x.mod), [2, -1]);
  assert.deepEqual(med("manniska").sinnen.map((x) => x.mod), [1, -2]);
});

test("förmågetabellen: bara för alver, och husen ersätter rader", () => {
  assert.ok(tillgangligaFormagetabeller(regler, alv).some((t) => t.id === "alver"));
  assert.ok(!tillgangligaFormagetabeller(regler, { ...alv, ras: "manniska" }).some((t) => t.id === "alver"));
  const rad = (ras, nr) => formagetabell(regler, { ...alv, ras }, { tabell: "alver" }).rader.find((r) => nr >= r.slag[0] && (r.slag[1] === null || nr <= r.slag[1])).namn;
  assert.equal(rad("stadsalv", 34), "Stålblick");
  assert.equal(rad("lysanderalv", 34), "Drakblod");
  assert.equal(rad("belisariusalv", 7), "Skådespelare");
  assert.equal(rad("kothalv", 35), "Spindelalv");
  assert.equal(rad("dimalv", 35), "Vapenbärare");
});

test("Drakblod: drakalvens värden, lysanderalvens BP och yrken, och defekterna", () => {
  const drak = (slag) => sf(alv, 29, [undefined, { slag }]);
  const r = raknaRollperson(regler, drak([3]));
  assert.deepEqual(r.fel, []);
  assert.equal(r.ras.id, "drakalv");
  assert.equal(r.bp.utgifter.ras, 25); // ingen extra kostnad
  assert.equal(r.grundegenskaper.STY, 12 + 3);
  assert.equal(r.grundegenskaper.STO, 17);
  assert.equal(r.defekter[0].namn, "Ingen defekt");
  assert.equal(raknaRollperson(regler, drak([16])).grundegenskaper.INT, 5); // Idiot
  assert.equal(fv(raknaRollperson(regler, { ...drak([11]), fardigheter: { ...alv.fardigheter, barsarkagang: 0 } }), "barsarkagang").start, 8);
  assert.deepEqual(sarskildFormaga(regler, drak([19])).saknas, ["Slå 1T20 två gånger till för drakalvens defekter"]);
  assert.deepEqual(raknaRollperson(regler, drak([19, 10, 18])).defekter.map((d) => d.namn), ["Steril", "Beslöjad"]);
  assert.match(fel(drak([19, 5, 10])).join(), /ogiltigt slag/); // 1–8 slås om
  assert.equal(raknaRollperson(regler, { ...drak([3]), yrke: "bestherre", yrkesfardigheter: [] }).fel.length, 0); // Bestherre: bara lysanderalver
});

test("husens förmågor: Vedervärdigt utseende, Spindelalv, Vapenmästare, Kändis och Bestarnas herre", () => {
  assert.equal(raknaRollperson(regler, sf({ ...alv, ras: "degasalv" }, 25)).grundegenskaper.KAR, 3);
  const spindel = raknaRollperson(regler, sf({ ...alv, ras: "kothalv" }, 30));
  assert.equal(spindel.grundegenskaper.STO, 17);
  const cerias = { ...alv, ras: "ceriasalv", rasval: ["hantverk:Smide"] };
  const utan = fv(raknaRollperson(regler, cerias), "vapen:Bredsvärd").start;
  assert.equal(fv(raknaRollperson(regler, sf(cerias, 18)), "vapen:Bredsvärd").start, utan * 2);
  const kandis = raknaRollperson(regler, sf({ ...alv, ras: "belisariusalv", rasval: ["malning"], fardigheter: { sjunga: 0 } }, 15, [["sjunga"]]));
  assert.equal(fv(kandis, "sjunga").status, "primar"); // en primär färdighet blir inte yrkesfärdighet
  const best = raknaRollperson(regler, sf(alv, 20, ["svart-tiger"]));
  assert.equal(best.bestar[0].namn, "Svart tiger");
});

test("Bastardmagiker: FV 5 i en magiskola som yrkesfärdighet, utan magiförmågeslag", () => {
  const r = raknaRollperson(regler, sf({ ...alv, ras: "stadsalv", fardigheter: { ...alv.fardigheter, mentalism: 0 } }, 25, [["mentalism"]]));
  assert.deepEqual(r.fel, []);
  assert.equal(r.magiformaga.behovs, false);
  assert.deepEqual([fv(r, "mentalism").status, fv(r, "mentalism").start], ["yrke", 5]);
  assert.ok(r.kanMagi);
});

test("Utstött: bara +10 på startkapitalet, Distributor +5", () => {
  const stand = { ...alv, ras: "stadsalv" };
  const vanlig = raknaRollperson(regler, stand).slag.skResultat;
  assert.equal(raknaRollperson(regler, { ...stand, yrke: "utstott", yrkesfardigheter: [] }).slag.skResultat, vanlig - 5);
  assert.equal(raknaRollperson(regler, { ...stand, ras: "degasalv", yrke: "distributor", yrkesfardigheter: [] }).slag.skResultat, vanlig + 5);
});

test("Stormfågel: Mekanik är Teknologi med Dvärgar, annars en vapenfärdighet till", () => {
  const storm = { ...alv, ras: "venturaalv", yrke: "stormfagel" };
  assert.equal(yrkesPoster(regler, { ...storm, bocker: [...BOCKER, "dvargar"] })[4].nycklar[0], "teknologi");
  assert.equal(yrkesPoster(regler, storm)[4].post.fardighet, "vapen");
});

test("Påfågelsdansen: egna tekniker och 2 BP per poäng över 8", () => {
  const nyckel = "vapentekniker:Påfågelsdansen";
  const lista = teknikLista(regler, { id: "vapentekniker" }, nyckel).map(([n]) => n);
  assert.ok(lista.includes("Dubbelstöt") && lista.includes("Krafthugg") && lista.includes("Blind strid"));
  assert.ok(!lista.includes("Rundspark"));
  assert.ok(!teknikLista(regler, { id: "vapentekniker" }, "vapentekniker:Egen").some(([n]) => n === "Dubbelstöt"));
  const flamb = { ...alv, ras: "aramasalv", yrke: "flamboyant", yrkesfardigheter: [nyckel], fardigheter: { [nyckel]: 0 } };
  const med = (tekniker) => raknaRollperson(regler, { ...flamb, stridskonstTekniker: { [nyckel]: tekniker } });
  assert.equal(med(["Dubbelstöt", "Nådastöt", "Flygande anfall"]).bp.utgifter.stil, 0); // 5
  assert.equal(med(["Dubbelstöt", "Nådastöt", "Flygande anfall", "Två vapen", "Blind strid", "Markering"]).bp.utgifter.stil, 2); // 9
  assert.equal(epPerFV(regler, "sekundar", { id: "vapentekniker" }, ["Dubbelstöt", "Markering"], nyckel), 3);
});

test("Salvatori: Vit apostels färdiga stridskonst", () => {
  assert.equal(svardsskolaFor(regler, "vapentekniker:Salvatori").kostnad, 8);
});

test("Pierrot: täckyrket ger två yrkesfärdigheter med FV 5", () => {
  const pierrot = { ...alv, ras: "degasalv", yrke: "pierrot", yrkesfardigheter: ["bluffa"], fardigheter: { akrobatik: 0, "spela-instrument:Luta": 0 } };
  assert.deepEqual(raknaRollperson(regler, pierrot).saknas, ["Täckyrket"]);
  const med = { ...pierrot, tackyrke: { yrke: "bard", fardigheter: ["spela-instrument:Luta", "undre-varlden:Chronopia"] },
    yrkesfardigheter: ["spela-instrument:Luta", "undre-varlden:Chronopia"] };
  const r = raknaRollperson(regler, med);
  assert.deepEqual(r.fel, []);
  assert.equal(fv(r, "spela-instrument:Luta").start, 5);
  assert.ok(r.startutrustning.some((t) => t.endsWith("(täckyrket)")) || !regler.yrken.lista.find((x) => x.id === "bard").startutrustning);
  assert.match(fel({ ...med, tackyrke: { yrke: "bard", fardigheter: ["simma", "undre-varlden:Chronopia"] } }).join(), /ingen yrkesfärdighet för bard/);
});

test("masker: bara degasalver, +2 BP per extra egenskap, Pierrotens masker gratis", () => {
  const degas = { ...alv, ras: "degasalv" };
  const r = raknaRollperson(regler, { ...degas, masker: [["bestens-ansikte", "riddaren"]] });
  assert.equal(r.masker.varde, 13);
  assert.equal(r.bp.utgifter.masker, 13);
  assert.match(fel({ ...alv, masker: [["riddaren"]] }).join(), /bara för degasalver/);
  const p = raknaRollperson(regler, { ...degas, yrke: "pierrot", yrkesfardigheter: [], masker: [["riddaren"], ["gycklaren"]] });
  assert.equal(p.bp.utgifter.masker, 13 - 5);
});

test("dockor: dockmästarens 15/20/25 BP, livsgnistan kostar extra", () => {
  const dm = { ...alv, ras: "belisariusalv", rasval: ["malning"], yrke: "dockmastare", yrkesfardigheter: [] };
  const r = raknaRollperson(regler, { ...dm, dockor: [{ id: "docka-hamnare", gnista: 2 }, { id: "spejare", gnista: 1 }] });
  assert.equal(r.dockor.varde, 8 + 3 + 5 + 1);
  assert.equal(r.bp.utgifter.dockor, 2);
  assert.equal(raknaRollperson(regler, { ...dm, niva: 1, dockor: [{ id: "docka-hamnare", gnista: 2 }, { id: "spejare", gnista: 1 }] }).bp.utgifter.dockor, 0);
  assert.match(fel({ ...alv, dockor: [{ id: "spejare" }] }).join(), /bara för dockmästare/);
});

test("Spindelmästare: magiker utan slag, Ritualmagi och ett gratis slag med +10 på Magis tabell", () => {
  const sm = { ...alv, ras: "kothalv", yrke: "spindelmastare", yrkesfardigheter: ["ritualmagi", "elementarmagi"], fardigheter: { ritualmagi: 10, elementarmagi: 5 },
    besvarjelser: { "galenskapens-marke": 4 } };
  const slag = formageslag(regler, sm);
  assert.equal(slag.length, 2);
  assert.deepEqual([slag[1].tabell, slag[1].gratis, slag[1].bonus], ["magi", true, 10]);
  const r = raknaRollperson(regler, { ...sm, sarskildaFormagor: { bp: 0, slag: null, val: [], avstar: true, fler: [{ bp: 0, slag: 5, val: [], avstar: false }] } });
  assert.deepEqual(r.fel, []);
  assert.equal(r.magiformaga.behovs, false);
  assert.equal(r.sarskildaFormagorna[1].namn, regler["sarskilda-formagor"].tabeller.find((t) => t.id === "magi").rader.find((x) => 15 >= x.slag[0] && 15 <= (x.slag[1] ?? 99)).namn);
  assert.ok(magiskolor(regler, sm).some((f) => f.id === "ritualmagi"));
  assert.ok(!magiskolor(regler, { ...sm, yrke: "eldsfurste" }).some((f) => f.id === "ritualmagi"));
  assert.match(fel({ ...sm, yrke: "eldsfurste", besvarjelser: { "galenskapens-marke": 4 } }).join(), /kan bara läras av spindelmästare/);
});

test("Eldsfurste: stridsbesvärjelserna bara för eldsfurstar", () => {
  const ef = { ...alv, ras: "ceriasalv", rasval: ["hantverk:Smide"], yrke: "eldsfurste", yrkesfardigheter: ["elementarmagi"], fardigheter: { elementarmagi: 10 } };
  assert.deepEqual(fel({ ...ef, besvarjelser: { "ingjuta-mod": 3 } }), []);
  assert.match(fel({ ...ef, yrke: "elementarmagiker", besvarjelser: { "ingjuta-mod": 3 } }).join(), /eldsfurste/);
});
