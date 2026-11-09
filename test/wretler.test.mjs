// Widunder och Wretler (wretler.js): böckerna, Knapadel, lånet minus startutrustningen och medianvärdena.
// Kör: node --test test/wretler.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { raknaRollperson, varukatalog, iBocker, forbjudenVara, regelPa, startvaror } from "../regelmotor.js";
import { WRETLER, valjWretler, wretlerUtrustning } from "../wretler.js";
import { regler as bas, brutus, las } from "./brutus-data.mjs";

const regler = { ...bas, "sarskilda-formagor": las("sarskilda-formagor"), bocker: las("bocker"), erfarenhet: las("erfarenhet"),
  klaner: las("klaner"), foljeslagare: las("foljeslagare") };
const ww = (yrke = "krigare") => {
  const rp = { ...brutus, ras: "", yrke };
  valjWretler(regler, rp, true);
  return { ...rp, ras: brutus.ras };
};

test("knappen: alla inlagda böcker, lägsta nivån, Syn och hörsel och Detaljerad strid", () => {
  const rp = { ...brutus, ras: "", niva: 2, valfriaRegler: ["detaljerad-strid", "kejserliga-varor"], startpaket: { valt: true, vapen: "Dolk" } };
  assert.ok(valjWretler(regler, rp, true));
  assert.deepEqual(rp.bocker, ["grund", "vr", "magi", "dvargar", "alver"]);
  assert.equal(rp.niva, 0);
  assert.deepEqual(rp.valfriaRegler, ["syn-och-horsel", "detaljerad-strid"]);
  assert.equal(rp.startpaket.valt, false);
  assert.ok(valjWretler(regler, rp, false));
  assert.deepEqual([rp.wretler, rp.bocker, rp.valfriaRegler], [false, ["grund"], []]);
  assert.equal(valjWretler(regler, { ...rp, ras: "hoglandare" }, true), false, "låst när en ras är vald");
});

test("Knapadel räknas som lägre medelklass, utan slag", () => {
  const res = raknaRollperson(regler, ww());
  assert.equal(res.slag.socialtStand, "Knapadel");
  assert.equal(res.slag.standsklass, "lagreMedelklass");
  assert.equal(res.slag.ssResultat, 8);
});

test("krigaren har ingen startutrustning: hela lånet", () => {
  const res = raknaRollperson(regler, ww());
  assert.equal(res.slag.startkapital, 5000);
  assert.equal(res.utrustning.kvar, 5000);
});

test("startutrustning i listan dras från lånet", () => {
  const rp = ww("hedersvakt");
  const u = wretlerUtrustning(regler, rp);
  assert.equal(u.summa, 900 + 1800 + 80); // Hedersyxa, Axelskydd (par): Dvärgiskt (Detaljerad strid), Skäggkam
  assert.equal(raknaRollperson(regler, rp).slag.startkapital, 5000 - 2780);
});

test("vapen och rustning utanför listan kostar medianen, annat är gratis", () => {
  const u = wretlerUtrustning(regler, ww("svartsyster")); // Frälsningsklinga (inget pris), vendelstoft, stjärnstoft, liriumrustning
  assert.equal(u.summa, WRETLER.median.narstrid + 3 * 100 + 3 * 450 + WRETLER.median.rustning);
  assert.equal(wretlerUtrustning(regler, ww("adling")).summa, 0, "kläder, hem och tjänare är gratis");
});

test("dyr startutrustning ger 0 sm, inte en negativ summa", () => {
  const res = raknaRollperson(regler, ww("agere-imperator"));
  assert.ok(wretlerUtrustning(regler, ww("agere-imperator")).summa > 5000);
  assert.equal(res.slag.startkapital, 0);
});

test("inget gratis startpaket", () => {
  const res = raknaRollperson(regler, { ...ww(), startpaket: { valt: true, vapen: "" } });
  assert.ok(res.fel.some((f) => /startpaket/.test(f)));
});

test("tabellens texter finns i yrkenas startutrustning", () => {
  for (const [yrke, rader] of Object.entries(WRETLER.utrustning)) {
    const ovriga = startvaror(regler, { yrke, bocker: ww().bocker, valfriaRegler: [] }).ovriga;
    for (const text of Object.keys(rader)) assert.ok(ovriga.includes(text), `${yrke}: ${text}`);
  }
});

test("medianerna stämmer med utrustningslistan", () => {
  const rp = ww();
  const kat = varukatalog(regler, rp).filter((x) => iBocker(x, rp) && !forbjudenVara(regler, rp, x) && !x.kejserligt && !(x.kraverRegel && !regelPa(regler, rp, x.kraverRegel)));
  const median = (k) => {
    const p = kat.filter((x) => x.kategori === k).map((x) => x.pris).sort((a, b) => a - b);
    return p.length % 2 ? p[(p.length - 1) / 2] : (p[p.length / 2 - 1] + p[p.length / 2]) / 2;
  };
  assert.deepEqual(WRETLER.median, { narstrid: median("Närstridsvapen"), avstand: median("Avståndsvapen"), kast: median("Kastvapen"), skold: median("Sköldar"), rustning: median("Rustning") });
});
