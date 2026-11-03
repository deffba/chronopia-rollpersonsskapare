// Tabellerna för särskilda förmågor: grundreglernas tabell, och flera tabeller när expansionerna läggs in.
// Kör: node --test test/formagor.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { raknaRollperson, sarskildFormaga, formagetabeller, tillgangligaFormagetabeller, formagetabell, tarningAv, slagIntervall } from "../regelmotor.js";
import { regler, brutus, las } from "./brutus-data.mjs";

const grund = las("sarskilda-formagor").tabeller.find((t) => t.id === "grund").rader;
const enTabell = { ...regler, "sarskilda-formagor": grund };
const rad = (slag, namn) => ({ slag, namn, effekt: "", sida: 1 });
const flera = { ...regler, "sarskilda-formagor": { tabeller: [
  { id: "grund", namn: "Grundreglerna", tarning: "2T20", sida: "30–32", rader: grund },
  { id: "magi", namn: "Magi i Chronopia", tarning: "1T20", sida: "16", kraver: { expansion: "magi" }, rader: [rad([1, 20], "Låg"), rad([21, null], "Hög")] },
  { id: "dvarg", namn: "Dvärgar", tarning: "1T20", sida: "14", kraver: { raser: ["dvarg"] }, rader: [rad([1, null], "Dvärgförmåga")] },
] } };

test("grundreglernas tabell är en tabell med tärningen 2T20", () => {
  const t = formagetabeller(enTabell);
  assert.equal(t.length, 1);
  assert.deepEqual([t[0].id, t[0].tarning, t[0].rader.length], ["grund", "2T20", grund.length]);
  assert.deepEqual(tarningAv("1T20"), { n: 1, sidor: 20 });
  assert.deepEqual([slagIntervall(grund[0]), slagIntervall(grund[1]), slagIntervall(grund.at(-1))], ["3–4", "5", "81+"]);
});

test("bara tabeller som rollpersonen har tillgång till", () => {
  assert.deepEqual(tillgangligaFormagetabeller(flera, brutus).map((t) => t.id), ["grund"]);
  assert.deepEqual(tillgangligaFormagetabeller(flera, { ...brutus, expansioner: ["magi"] }).map((t) => t.id), ["grund", "magi"]);
  assert.deepEqual(tillgangligaFormagetabeller(flera, { ...brutus, ras: "dvarg" }).map((t) => t.id), ["grund", "dvarg"]);
  assert.equal(formagetabell(flera, brutus).id, "grund");
});

test("slaget görs på den valda tabellen", () => {
  const rp = { ...brutus, expansioner: ["magi"], sarskildaFormagor: { bp: 5, slag: 17, val: [], tabell: "magi" } };
  assert.equal(sarskildFormaga(flera, rp).formaga.namn, "Hög");
  assert.equal(sarskildFormaga(flera, { ...rp, sarskildaFormagor: { ...rp.sarskildaFormagor, slag: 10 } }).formaga.namn, "Låg");
});

test("en tabell som rollpersonen inte har tillgång till är ett regelbrott", () => {
  const rp = { ...brutus, sarskildaFormagor: { bp: 5, slag: 17, val: [], tabell: "magi" } };
  assert.match(raknaRollperson(flera, rp).fel.join(), /tabellen Magi i Chronopia/);
});

test("att avstå och samtidigt lägga BP är ett regelbrott", () => {
  const rp = { ...brutus, sarskildaFormagor: { ...brutus.sarskildaFormagor, bp: 5, avstar: true } };
  assert.match(raknaRollperson(enTabell, rp).fel.join(), /inte vill lägga BP/);
});
