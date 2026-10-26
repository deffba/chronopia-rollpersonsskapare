// Filformatet för sparade rollpersoner: version 2 och inläsning av äldre filer.
// Kör: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { tillFil, franFil, FORMAT, VERSION, TOMT_SPEL, TOM_UTVECKLING } from "../sparformat.js";

const rp = { namn: "Brutus", ras: "hoglandare", grundvarden: { STY: 14 }, fardigheter: { smyga: 6 }, spel: { ...TOMT_SPEL(), erf: { smyga: 3 }, hjaltepoang: 2 },
  utveckling: { logg: [{ typ: "session", datum: "2026-10-20", erf: { smyga: 3 }, hp: 2, hpFatt: 2 }] } };

test("en sparad fil läses in oförändrad", () => {
  const fil = JSON.parse(JSON.stringify(tillFil(rp, new Date("2026-10-25T12:00:00Z"))));
  assert.equal(fil.format, FORMAT);
  assert.equal(fil.version, VERSION);
  assert.equal(fil.sparad, "2026-10-25T12:00:00.000Z");
  assert.deepEqual(franFil(fil), rp);
});

test("en fil från före versionsnumret får tomma spelfält", () => {
  const gammal = { namn: "Brutus", ras: "hoglandare", grundvarden: { STY: 14 }, fardigheter: { smyga: 6 } };
  const ut = franFil(gammal);
  assert.deepEqual(ut.spel, TOMT_SPEL());
  assert.deepEqual(ut.utveckling, TOM_UTVECKLING());
  assert.equal(ut.fardigheter.smyga, 6);
  assert.equal(gammal.spel, undefined, "originalet ändras inte");
});

test("spelfält som saknas i filen fylls i", () => {
  const ut = franFil({ format: FORMAT, version: 1, rollperson: { ras: "troll", grundvarden: {}, spel: { erf: { rida: 1 } } } });
  assert.deepEqual(ut.spel, { ...TOMT_SPEL(), erf: { rida: 1 } });
});

test("nyare version och okända filer ger begripliga fel", () => {
  assert.throws(() => franFil({ format: FORMAT, version: VERSION + 1, rollperson: rp }), /nyare version/);
  assert.throws(() => franFil({ format: FORMAT, rollperson: rp }), /versionsnummer/);
  assert.throws(() => franFil({ hej: 1 }), /saknar ras/);
  assert.throws(() => franFil(null), /saknar ras/);
});

test("en fil i version 1 får en tom utvecklingslogg och behåller spelfälten", () => {
  const v1 = { format: FORMAT, version: 1, sparad: "2026-10-25T12:00:00.000Z",
    rollperson: { ras: "troll", grundvarden: {}, spel: { ...TOMT_SPEL(), hjaltepoang: 4, pengar: { bors: { gm: "", sm: "12", km: "" }, bank: { gm: "", sm: "", km: "" }, juveler: "" } } } };
  delete v1.rollperson.spel.borttaget;
  const ut = franFil(v1);
  assert.deepEqual(ut.utveckling, { logg: [] });
  assert.deepEqual(ut.spel.borttaget, {});
  assert.equal(ut.spel.hjaltepoang, 4);
  assert.equal(ut.spel.pengar.bors.sm, "12");
});

test("en trasig logg ger ett begripligt fel", () => {
  assert.throws(() => franFil({ format: FORMAT, version: 2, rollperson: { ras: "troll", grundvarden: {}, utveckling: { logg: "x" } } }), /logg/);
});
