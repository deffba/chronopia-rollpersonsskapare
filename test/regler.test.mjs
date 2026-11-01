// Regelfilerna i regler/ är källan till reglerna: de ska gå att läsa och id:n ska vara unika.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const MAPP = new URL("../regler/", import.meta.url);
const las = (namn) => JSON.parse(readFileSync(new URL(`${namn}.json`, MAPP), "utf8"));
const unika = (lista, vad) => {
  const sedda = new Set();
  for (const x of lista) { assert.ok(x.id, `${vad} utan id: ${JSON.stringify(x).slice(0, 60)}`); assert.ok(!sedda.has(x.id), `${vad}: id ${x.id} finns två gånger`); sedda.add(x.id); }
};

test("alla regelfiler är giltig JSON", () => {
  for (const fil of readdirSync(MAPP).filter((f) => f.endsWith(".json"))) assert.doesNotThrow(() => las(fil.replace(/\.json$/, "")), fil);
});

test("raser, yrken, färdigheter och språk har unika id", () => {
  unika(las("raser"), "ras");
  unika(las("yrken").lista, "yrke");
  unika(las("fardigheter").lista, "färdighet");
  unika(las("fardigheter").sprak, "språk");
});

test("regelfält som pekar på andra poster finns", () => {
  const raser = new Set(las("raser").map((r) => r.id));
  const fardigheter = new Set(las("fardigheter").lista.map((f) => f.id));
  for (const s of las("fardigheter").sprak) {
    if (s.utanTakFor) assert.ok(raser.has(s.utanTakFor), `${s.id}: okänd ras ${s.utanTakFor}`);
    if (s.endastPrimarFor) assert.ok(raser.has(s.endastPrimarFor), `${s.id}: okänd ras ${s.endastPrimarFor}`);
  }
  for (const y of las("yrken").lista) for (const g of y.yrkesgrupper ?? []) assert.ok(fardigheter.has(g), `${y.id}: okänd färdighet ${g}`);
});
