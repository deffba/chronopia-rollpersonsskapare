// Magi i Chronopia: nivåerna, magikeryrkena, Tidsmagi, minimagi och familjarerna.
// Kör: node --test test/magi.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { raknaRollperson, nivaer, nivaFor, valbaraYrken, yrkeVillkor, tillgangligaFormagetabeller, magiskolor, raknaFamiljarer, yrkesPoster } from "../regelmotor.js";
import { regler as bas, brutus, las } from "./brutus-data.mjs";

const regler = { ...bas, "sarskilda-formagor": las("sarskilda-formagor"), bocker: las("bocker"), erfarenhet: las("erfarenhet"), foljeslagare: las("foljeslagare") };
const magi = { ...brutus, bocker: ["grund", "magi"] };
const chronomag = { ...magi, ras: "manniska", alder: 30, yrke: "chronomag", rasval: [],
  modersmal: { tala: ["chronos"], lasaSkriva: ["chronos"] },
  yrkesfardigheter: ["kunskap-om-tid", "lardom:Astronomi", "lardom:Kunskap om demoner", "magisk-kanalisering", "mentalism", "magistudier", "meditation", "tidsmagi", "vapen:Kortsvärd"],
  extraYrkesfardigheter: [], grundvarden: { STY: 10, FYS: 10, SMI: 12, INT: 16, PSY: 16, KAR: 10 }, stoSteg: 0,
  sarskildaFormagor: { bp: 0, slag: null, val: [], avstar: true },
  fardigheter: { mentalism: 12, tidsmagi: 10, "lasa-skriva:chronos": 14, minimagi: 0, "lardom:Kunskap om magi": 0, "kanna-magi:mentalism": 0, "kanna-magi:tidsmagi": 0, "lardom:Astronomi": 0, "finna-dolda-ting": 0 },
  besvarjelser: { slohet: 10, sinnesskarpa: 3 }, minimagi: ["mini-eld", "mini-laka"] };
const fel = (rp) => raknaRollperson(regler, rp).fel;

test("med Magi: nivåerna Magus, Magus regis och Häxmästare med familjartak 1/3/5", () => {
  assert.deepEqual(nivaer(regler, magi).map((n) => [n.namn, n.bp, n.formagor, n.familjarer]),
    [["Magus", 125, 1, 1], ["Magus regis", 150, 2, 3], ["Häxmästare", 175, 3, 5]]);
  assert.deepEqual(tillgangligaFormagetabeller(regler, magi).map((t) => t.id), ["grund", "magi"]);
  assert.equal(valbaraYrken(regler, magi).filter((y) => y.kalla?.bok === "magi").length, 11);
});

test("med både V&R och Magi slås nivånamnen ihop", () => {
  const n = nivaer(regler, { ...magi, bocker: ["grund", "vr", "magi"] });
  assert.equal(n[1].namn, "Veteran / Magus regis");
  assert.equal(n[1].familjarer, 3);
});

test("Tidsmagi finns bara för chronomager och divinatorer", () => {
  assert.ok(magiskolor(regler, chronomag).some((f) => f.id === "tidsmagi"));
  assert.ok(!magiskolor(regler, { ...chronomag, yrke: "lubriticus" }).some((f) => f.id === "tidsmagi"));
  assert.match(fel({ ...chronomag, yrke: "lubriticus", yrkesval: {}, yrkesfardigheter: ["tidsmagi"] }).join(), /Tidsmagi/);
});

test("Svartsyster: bara kvinnliga människor, och ingen magiker", () => {
  const y = regler.yrken.lista.find((x) => x.id === "svartsyster");
  assert.ok(!y.magiker);
  assert.match(yrkeVillkor(regler, { ras: "manniska", kon: "Man" }, y), /kvinnor/);
  assert.equal(yrkeVillkor(regler, { ras: "manniska", kon: "Kvinna" }, y), null);
});

test("svartsyster: inga magiskolor, men Känna magi går att välja", () => {
  const syster = { ...chronomag, kon: "Kvinna", yrke: "svartsyster" };
  assert.deepEqual(magiskolor(regler, syster), []);
  assert.ok(magiskolor(regler, syster, true).some((f) => f.id === "animism"));
  assert.ok(!magiskolor(regler, syster, true).some((f) => f.id === "tidsmagi"));
  assert.match(fel({ ...syster, yrkesval: {}, yrkesfardigheter: [], sekundara: ["animism"], fardigheter: { animism: 5 } }).join(), /Svartsyster kan inte lära sig magiskolor/);
});

test("chronomag: inget magiförmågeslag, Minimagi från bästa skolan och gratis yrkesfärdigheter", () => {
  const r = raknaRollperson(regler, chronomag);
  assert.deepEqual(r.fel, []);
  assert.equal(r.magiformaga.behovs, false);
  const fv = (k) => r.fardigheter.find((f) => f.nyckel === k);
  assert.equal(fv("minimagi").status, "yrke");
  assert.equal(fv("minimagi").fv, 12); // lika med Mentalism
  assert.equal(r.minimagi.max, 24); // 2 × FV (s. 19)
  assert.equal(fv("finna-dolda-ting").start, 8); // +5 från yrket
});

test("minimagi kräver att rollpersonen kan magi", () => {
  const r = raknaRollperson(regler, { ...brutus, minimagi: ["mini-eld"], fardigheter: { ...brutus.fardigheter, minimagi: 5 } });
  assert.ok(r.fel.some((t) => /Minimagi/.test(t)));
});

test("tidsgrenar: en chronomag får högst var tredje tidsbesvärjelse ur förutskickelse", () => {
  const B = regler.besvarjelser.lista.filter((b) => b.grupp === "forutskickelse").slice(0, 2).map((b) => b.id);
  const r = raknaRollperson(regler, { ...chronomag, besvarjelser: Object.fromEntries(B.map((id) => [id, 1])) });
  assert.ok(r.fel.some((t) => /förutskickelse|Förutskickelse/.test(t)), r.fel.join());
});

test("familjarer: kostar BP, taket följer nivån och gratis räknas inte", () => {
  const ett = raknaRollperson(regler, { ...chronomag, familjarer: ["gargoyl"] });
  assert.deepEqual(ett.fel, []);
  assert.equal(ett.bp.utgifter.familjarer, 2);
  assert.match(fel({ ...chronomag, familjarer: ["gargoyl", "gonk"] }).join(), /Högst 1 familjar som magus/);
  assert.deepEqual(fel({ ...chronomag, niva: 1, familjarer: ["gargoyl", "gonk"] }).filter((t) => /familjar/i.test(t)), []);
  const fagel = raknaFamiljarer(regler, { ...chronomag, yrke: "fagelbroder", familjarer: ["gonk"] });
  assert.deepEqual(fagel.lista.map((f) => [f.id, f.gratis]), [["lystat", true], ["gonk", false]]);
  assert.deepEqual([fagel.bp, fagel.antal, fagel.fel], [2, 1, []]);
});

test("Tefalon bara för tidsmagiker, och familjarer kräver Magi", () => {
  assert.deepEqual(raknaFamiljarer(regler, { ...chronomag, familjarer: ["tefalon"] }).fel, []);
  assert.match(raknaFamiljarer(regler, { ...chronomag, yrke: "lubriticus", familjarer: ["tefalon"] }).fel.join(), /Tefalon: bara för Chronomag och Divinator/);
  assert.match(fel({ ...brutus, familjarer: ["gonk"] }).join(), /Familjarer finns i Magi i Chronopia/);
});

test("Spiritus familiarius ger en valfri familjar gratis", () => {
  const rad = regler["sarskilda-formagor"].tabeller.find((t) => t.id === "magi").rader.find((x) => x.namn === "Spiritus familiarius");
  const sf = (val) => ({ ...chronomag, sarskildaFormagor: { bp: 1, slag: rad.slag[0] - 1, val, avstar: false, tabell: "magi" } });
  assert.ok(raknaRollperson(regler, sf([])).saknas.some((t) => /Välj familjar/.test(t)));
  const r = raknaRollperson(regler, sf(["dragonette"]));
  assert.deepEqual(r.fel, []);
  assert.deepEqual(r.familjarer.lista.map((f) => [f.id, f.gratis]), [["dragonette", true]]);
  assert.equal(r.bp.utgifter.familjarer, 0);
});

test("underjordens magi är bara för cestoditer", () => {
  const id = regler.besvarjelser.lista.find((b) => b.grupp === "underjord").id;
  const r = raknaRollperson(regler, { ...chronomag, besvarjelser: { [id]: 1 } });
  assert.ok(r.fel.some((t) => /[Cc]estodit/.test(t)), r.fel.join());
});

test("bara den som kan magi får köpa familjarer; gratis familjarer får alla ha (RB-023)", () => {
  const krigare = { ...magi, familjarer: ["gonk"] };
  const r = raknaRollperson(regler, krigare);
  assert.equal(r.kanMagi, false);
  assert.equal(r.familjarer.kanKopa, false);
  assert.ok(r.familjarer.tillganglig, "steget syns så att köpta familjarer kan tas bort");
  assert.equal(raknaRollperson(regler, magi).familjarer.tillganglig, false, "utan magi och utan familjarer syns inte steget");
  assert.equal(raknaRollperson(regler, { ...chronomag, familjarer: ["gargoyl"] }).familjarer.kanKopa, true);
});

test("svartsyster: stridskonsten Kejsarens hand med V&R (Magi s. 15), annars inte", () => {
  const syster = { ...chronomag, kon: "Kvinna", yrke: "svartsyster" };
  const harHand = (rp) => yrkesPoster(regler, rp).some((p) => p.post?.maste?.includes("Kejsarens hand"));
  assert.ok(harHand({ ...syster, bocker: ["grund", "vr", "magi"] }));
  assert.ok(!harHand(syster));
});
