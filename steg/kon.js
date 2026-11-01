// Kön.
import { S, uppdatera } from "../tillstand.js";
import { el } from "../ui/dom.js";
import { falt, valLista } from "../ui/kontroller.js";

export function stegKon() {
  return [
    el("div", { class: "rad" },
      falt("Namn", el("input", { id: "namn", type: "text", value: S.rp.namn, onchange: (e) => { S.rp.namn = e.target.value; uppdatera(); } })),
      falt("Spelare", el("input", { id: "spelare", type: "text", value: S.rp.spelare, onchange: (e) => { S.rp.spelare = e.target.value; uppdatera(); } })),
      falt("Kön", valLista("kon", S.rp.kon, [["Man", "Man"], ["Kvinna", "Kvinna"]], (v) => { S.rp.kon = v; uppdatera(); }), "Påverkar inte spelvärdena (s. 27).")),
    falt("Utseende och bakgrund", el("textarea", { id: "anteckningar", rows: 5, onchange: (e) => { S.rp.anteckningar = e.target.value; uppdatera(); } }, S.rp.anteckningar)),
  ];
}
