// Kön.
import { yrkeAv } from "../regelmotor.js";
import { S, uppdatera, yrkeId } from "../tillstand.js";
import { el } from "../ui/dom.js";
import { falt, valLista } from "../ui/kontroller.js";

export function stegKon() {
  const kravt = yrkeAv(S.R, yrkeId())?.villkor?.kon; // Svartsyster: bara kvinnor (Magi i Chronopia s. 15)
  const kon = [["Man", "Man"], ["Kvinna", "Kvinna"]].filter(([k]) => !kravt || k === kravt);
  return [
    el("div", { class: "rad" },
      falt("Namn", el("input", { id: "namn", type: "text", value: S.rp.namn, onchange: (e) => { S.rp.namn = e.target.value; uppdatera(); } })),
      falt("Spelare", el("input", { id: "spelare", type: "text", value: S.rp.spelare, onchange: (e) => { S.rp.spelare = e.target.value; uppdatera(); } })),
      falt("Kön", valLista("kon", S.rp.kon, kon, (v) => { S.rp.kon = v; uppdatera(); }), kravt ? `Yrket är bara för ${kravt === "Kvinna" ? "kvinnor" : "män"}.` : "Påverkar inte spelvärdena (s. 27).")),
    falt("Utseende och bakgrund", el("textarea", { id: "anteckningar", rows: 5, onchange: (e) => { S.rp.anteckningar = e.target.value; uppdatera(); } }, S.rp.anteckningar)),
  ];
}
