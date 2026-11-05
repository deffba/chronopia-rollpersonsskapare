// Dvärgar i Chronopia: klanerna och klanförmågorna, dvärgyrkena, Atums väg, tatueringarna och förmågetabellen.
// Kör: node --test test/dvargar.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { raknaRollperson, nivaer, valbaraYrken, yrkeVillkor, tillgangligaFormagetabeller, raknaKlan, klanForSlag, klanTillganglig,
  magiskolor, yrkesPoster, varukatalog, vapenVillkor, svardsskolaFor, sarskildFormaga } from "../regelmotor.js";
import { regler as bas, brutus, las } from "./brutus-data.mjs";

const regler = { ...bas, "sarskilda-formagor": las("sarskilda-formagor"), bocker: las("bocker"), erfarenhet: las("erfarenhet"), klaner: las("klaner") };
const dvargar = { ...brutus, bocker: ["grund", "vr", "dvargar"] };
const ATUM = "lardom:Kunskap om religion (Atum)";
// En präst ur klan Mindir med Magikerbakgrund (+3 i Atums väg)
const prast = { ...dvargar, ras: "dvarg", alder: 60, yrke: "prast", rasval: ["hantverk:Smide"], kon: "Man",
  klan: { id: "mindir", slag: 50, formagaSlag: 10, val: [] },
  modersmal: { tala: ["dvargiska"], lasaSkriva: ["dvargiska"] },
  yrkesfardigheter: ["administration", "historia", ATUM, "atums-vag", "lardom:Historia om Stubbstan", "lardom:Kunskap om magi", "rakning", "vapen:Stridsyxa (dvärgisk)", "vapen:Handyxa"],
  extraYrkesfardigheter: [], grundvarden: { STY: 12, FYS: 12, SMI: 10, INT: 14, PSY: 15, KAR: 10 }, stoSteg: 0,
  sarskildaFormagor: { bp: 0, slag: null, val: [], avstar: true },
  fardigheter: { "atums-vag": 10, [ATUM]: 0, "lasa-skriva:dvargiska": 12, "hantverk:Smide": 0, geologi: 0 },
  besvarjelser: { "atums-valsignelse": 5 } };
const fel = (rp) => raknaRollperson(regler, rp).fel;
const fv = (r, k) => r.fardigheter.find((f) => f.nyckel === k);

test("med Dvärgar: nivåerna, 15 dvärgyrken och förmågetabellen för dvärgar", () => {
  assert.deepEqual(nivaer(regler, dvargar).map((n) => [n.namn, n.bp, n.formagor]),
    [["Krigare / Dvärg", 125, 1], ["Veteran", 150, 2], ["Hjälte", 175, 3]]);
  assert.equal(valbaraYrken(regler, dvargar).filter((y) => y.kalla?.bok === "dvargar").length, 15);
  assert.deepEqual(tillgangligaFormagetabeller(regler, { ...dvargar, ras: "dvarg" }).map((t) => t.id), ["grund", "vr", "dvargar"]);
  assert.ok(!tillgangligaFormagetabeller(regler, dvargar).some((t) => t.id === "dvargar")); // bara för dvärgar (RB-007)
});

test("dvärgyrkena är bara för dvärgar, och Präst bara för klan Mindir", () => {
  const y = (id) => regler.yrken.lista.find((x) => x.id === id);
  assert.match(yrkeVillkor(regler, { ras: "manniska" }, y("ingenjor")), /Dvärg/);
  assert.equal(yrkeVillkor(regler, { ras: "dvarg" }, y("ingenjor")), null);
  assert.match(yrkeVillkor(regler, { ras: "dvarg", klan: { id: "dolin" } }, y("prast")), /klan Mindir/);
  assert.equal(yrkeVillkor(regler, { ras: "dvarg", klan: { id: "mindir" } }, y("prast")), null);
});

test("klanen: slag och val, och bara för dvärgar med Dvärgar", () => {
  assert.equal(klanForSlag(regler, 1), "bodrin");
  assert.equal(klanForSlag(regler, 22), "dord");
  assert.equal(klanForSlag(regler, 100), "annan");
  assert.ok(klanTillganglig(regler, { ...dvargar, ras: "dvarg" }));
  assert.ok(!klanTillganglig(regler, { ...dvargar, ras: "dvarg", bocker: ["grund", "vr"] }));
  assert.ok(!klanTillganglig(regler, dvargar));
  assert.deepEqual(raknaKlan(regler, { ...dvargar, ras: "dvarg" }).saknas, ["Klan"]);
  assert.deepEqual(raknaKlan(regler, { ...dvargar, ras: "dvarg", klan: { id: "durban" } }).saknas, ["Slaget för klanförmåga"]);
  assert.match(raknaKlan(regler, { ...dvargar, ras: "dvarg", klan: { id: "durban", slag: 30 } }).fel.join(), /ger inte klan Durban/);
  assert.deepEqual(raknaKlan(regler, { ...dvargar, ras: "dvarg", klan: { id: "annan", slag: 85 } }).saknas, []); // ingen klanförmåga
  assert.match(fel({ ...dvargar, klan: { id: "bodrin" } }).join(), /Klaner finns bara för dvärgar/);
});

test("präst ur Mindir: Atums väg utan magiförmågeslag, Kunskap om religion (Atum) primär och +3 från klanen", () => {
  const r = raknaRollperson(regler, prast);
  assert.deepEqual(r.fel, []);
  assert.equal(r.magiformaga.behovs, false);
  assert.ok(r.kanMagi);
  assert.equal(fv(r, ATUM).status, "primar");
  assert.equal(fv(r, "atums-vag").start, 3 + 3); // BC 3 för INT 14, +3 från Magikerbakgrund
  assert.equal(r.besvarjelser[0].namn, "Atums välsignelse");
  assert.equal(r.klan.formaga.namn, "Magikerbakgrund");
});

test("Atums väg finns bara för präster", () => {
  assert.ok(magiskolor(regler, prast).some((f) => f.id === "atums-vag"));
  assert.ok(!magiskolor(regler, { ...prast, yrke: "ingenjor" }).some((f) => f.id === "atums-vag"));
});

test("Mindirs +3 i Atums väg ger inte skolan till den som inte är präst", () => {
  const r = raknaRollperson(regler, { ...prast, yrke: "alderman", yrkesfardigheter: [], fardigheter: {}, besvarjelser: {} });
  assert.ok(!r.fardigheter.some((f) => f.nyckel === "atums-vag"));
  assert.equal(r.magiformaga.behovs, false);
});

test("klanförmågor: bonus på FV, på slagen och i startkapital", () => {
  const med = (id, slag, formagaSlag, val = []) => raknaRollperson(regler, { ...prast, klan: { id, slag, formagaSlag, val } });
  assert.equal(fv(med("mindir", 50, 9), ATUM).start, 3 + 10); // Fanatiker +10
  const utan = raknaRollperson(regler, prast);
  assert.equal(med("morgrim", 46, 9).slag.ssResultat, utan.slag.ssResultat + 15); // Förmögen
  assert.ok(med("cador", 16, 9).slag.skResultat >= utan.slag.skResultat); // Mycket rik, upp till taket
  assert.equal(med("dord", 22, 10).startkapital ?? med("dord", 22, 10).slag.startkapital, utan.slag.startkapital + 15000);
  const bokmal = raknaRollperson(regler, { ...prast, klan: { id: "bord", slag: 12, formagaSlag: 9, val: [["lardom:Kunskap om drakar"]] },
    fardigheter: { ...prast.fardigheter, "lardom:Kunskap om drakar": 0 } });
  assert.equal(fv(bokmal, "lardom:Kunskap om drakar").start, 10); // FV 10 i en valfri lärdomsfärdighet (RB-021)
  assert.deepEqual(sarskildFormaga(regler, { ...prast, klan: { id: "bord", formagaSlag: 9 } }).klan.saknas, ["Välj 1 färdighet för Bokmal"]);
});

test("Tymar: Ambidextriös ger svärdshanden", () => {
  const r = raknaRollperson(regler, { ...prast, klan: { id: "tymar", slag: 60, formagaSlag: 9 } });
  assert.equal(r.slag.svardshand, "Ambidextriös");
});

test("Durban: Magiker ger en skola utan magiförmågeslag och +5 i den och i Magisk kanalisering", () => {
  const rp = { ...prast, yrke: "ingenjor", klan: { id: "durban", formagaSlag: 10, val: ["mentalism"] },
    yrkesfardigheter: [], fardigheter: { mentalism: 0, "magisk-kanalisering": 0 }, besvarjelser: {} };
  const r = raknaRollperson(regler, rp);
  assert.equal(r.magiformaga.behovs, false);
  assert.equal(fv(r, "mentalism").start, 5);
  assert.equal(fv(r, "magisk-kanalisering").start, 5);
  assert.ok(r.kanMagi);
});

test("Zodan: Smärttålig är stridskonsten Stålsättning som yrkesfärdighet med FV 5", () => {
  const r = raknaRollperson(regler, { ...prast, yrke: "barsark", klan: { id: "zodan", slag: 68, formagaSlag: 9 }, yrkesfardigheter: [],
    fardigheter: { "stridskonster:Smärttålig": 0 }, besvarjelser: {}, tatueringar: [] });
  const s = fv(r, "stridskonster:Smärttålig");
  assert.deepEqual([s.status, s.start, s.tekniker], ["yrke", 5, ["Stålsättning"]]);
});

test("bärsärk: 1/2/3 levande tatueringar efter nivån, och förmågan Bärsärk ger en med insikt högst 15", () => {
  const barsark = { ...prast, yrke: "barsark", klan: { id: "zodan", slag: 68, formagaSlag: 1 }, yrkesfardigheter: [], fardigheter: {}, besvarjelser: {} };
  assert.deepEqual(fel({ ...barsark, tatueringar: ["lothans-marke"] }), []);
  assert.match(fel({ ...barsark, tatueringar: ["lothans-marke", "fjallhud"] }).join(), /Högst 1 levande tatuering/);
  assert.deepEqual(fel({ ...barsark, niva: 1, tatueringar: ["lothans-marke", "fjallhud"] }), []);
  assert.match(fel({ ...prast, tatueringar: ["fjallhud"] }).join(), /Bara bärsärkar/);
  const sf = (val) => sarskildFormaga(regler, { ...prast, sarskildaFormagor: { bp: 7, slag: 20, val: [val], avstar: false, tabell: "dvargar" } });
  assert.equal(sf("hjalpare").formaga.namn, "Bärsärk");
  assert.match(sf("vredens-kaftar").fel.join(), /högst 15/);
  assert.deepEqual(sf("hjalpare").tatueringar, [{ id: "hjalpare", fran: "Bärsärk" }]);
});

test("dvärgarnas förmågetabell: Skumraskkontakter ger FV 15 i Undre världen, Stryktålig KP ×1,5", () => {
  const sf = (slag) => raknaRollperson(regler, { ...prast, sarskildaFormagor: { bp: 5, slag, val: [], avstar: false, tabell: "dvargar" }, fardigheter: { ...prast.fardigheter, "undre-varlden": 0 } });
  assert.equal(fv(sf(20), "undre-varlden").start, 15);
  assert.equal(sf(29).harledda.totalKP, Math.ceil(raknaRollperson(regler, prast).harledda.totalKP * 1.5));
});

test("Värdshusvärd: Bryggning och Matlagning, och en extra valfri färdighet med FV 10", () => {
  const rp = { ...prast, yrke: "vardshusvard", yrkesval: { 6: { val: ["simma"] } }, klan: { id: "annan", slag: 80 }, besvarjelser: {} };
  const poster = yrkesPoster(regler, rp);
  assert.deepEqual(poster[0].nycklar, ["hantverk:Bryggning", "hantverk:Matlagning"]);
  assert.deepEqual(poster[6].nycklar, ["simma"]);
  const r = raknaRollperson(regler, { ...rp, yrkesfardigheter: ["simma"], fardigheter: { simma: 0 } });
  assert.equal(fv(r, "simma").start, 10);
});

test("Argolisbroder: Atums väg som stridskonst, och vapnen från Dvärgar", () => {
  assert.deepEqual(svardsskolaFor(regler, "vapentekniker:Atums väg").tekniker, ["Boridushugg", "Krafthugg", "Stormanfall", "Stålsättning"]);
  const katalog = varukatalog(regler, dvargar).map((x) => x.namn);
  for (const n of ["Drakdödare", "Stridsyxa (dvärgisk)", "Kastkniv (dvärgisk)", "Prästkåpa", "Fiskebåt"]) assert.ok(katalog.includes(n), n);
  assert.ok(!varukatalog(regler, { ...dvargar, bocker: ["grund", "vr"] }).some((x) => x.namn === "Drakdödare"));
  assert.match(vapenVillkor(regler, { ...brutus, bocker: ["grund"] }, "Sprättare"), /Dvärgar i Chronopia/);
});

test("rasens extra primära färdigheter förblir primära även när yrket listar dem", () => {
  const smed = { ...prast, yrkesfardigheter: [...prast.yrkesfardigheter.filter((k) => k !== "rakning"), "hantverk:Smide"] };
  const r = raknaRollperson(regler, smed);
  assert.equal(fv(r, "hantverk:Smide").status, "primar");
  assert.equal(fv(r, "geologi").status, "primar");
  assert.equal(fv(r, ATUM).status, "primar"); // klan Mindir
});
