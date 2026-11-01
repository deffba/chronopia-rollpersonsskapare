// Steg 2: ålder.
import { GRUNDEGENSKAPER, rasAv, alderskategori } from "../regelmotor.js";
import { S, rasId, uppdatera } from "../tillstand.js";
import { $, el } from "../ui/dom.js";
import { falt, info, tal } from "../ui/kontroller.js";

export function stegAlder() {
  const ras = rasAv(S.R, rasId());
  const vald = S.rp.alder != null;
  const kat = vald ? alderskategori(S.R, ras, S.rp.alder) : null;
  const efter = vald ? S.R.alder.efterAr.find((r) => r.max === null || S.rp.alder <= r.max) : null;
  const katNamn = Object.fromEntries(S.R.alder.kategorier.map((k) => [k.id, k.namn]));
  return [
    el("div", { class: "rad" },
      falt("Ålder i år", tal("alder", S.rp.alder, (v) => { S.rp.alder = v; uppdatera(); }, { min: 1, bred: true })),
      el("button", { type: "button", class: "knapp", onclick: () => { S.rp.alder = ras.alder.vuxen[0]; uppdatera(); } }, `Enkel metod: ${ras.alder.vuxen[0]} år`)),
    el("p", { class: "hjalp" }, "Klicka på en kategori i tabellen för att välja dess lägsta ålder och justera sedan i rutan ovan. Du kan också skriva in valfri ålder direkt."),
    el("div", { class: "tabellram" }, el("table", { class: "tabell" },
      el("thead", {}, el("tr", {}, el("th", {}, "Kategori"), el("th", {}, `${ras.namn}, år`), GRUNDEGENSKAPER.map((g) => el("th", { class: "num" }, g, info(g))))),
      el("tbody", {}, S.R.alder.kategorier.map((k) => el("tr", { class: "valbar" + (k.id === kat ? " markerad" : ""), onclick: () => { S.rp.alder = ras.alder[k.id][0]; uppdatera(); $("#alder")?.focus(); } },
        el("td", {}, el("button", { type: "button", class: "radknapp", "aria-label": `Välj ${k.namn.toLowerCase()}: ${ras.alder[k.id][0]} år` }, k.namn)),
        el("td", { class: "num" }, ras.alder[k.id][1] === null ? `${ras.alder[k.id][0]}+` : ras.alder[k.id].join("–")),
        GRUNDEGENSKAPER.map((g) => el("td", { class: "num" }, fmtMod(S.R.alder.effekter[k.id][g])))))))),
    el("p", { class: "hjalp" }, "Ålderns modifikationer läggs på grundegenskaperna i steg 6. Blir något slutvärde för lågt justerar du grundvärdena där."),
    el("p", { class: "summering" }, vald
      ? `${S.rp.alder} år räknas som ${katNamn[kat].toLowerCase()}. Det ger +${efter.bp} BP, startkapital ×${String(efter.kapital).replace(".", ",")} och ${efter.ep} EP till färdigheter.`
      : "Välj en ålder: skriv in den, klicka på en kategori eller använd enkel metod."),
  ];
}

export const fmtMod = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");
