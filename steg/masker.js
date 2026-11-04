// Steget Masker och dockor (Alver i Chronopia): huset Degas magiska masker och dockmästarens dockor.
import { kallText } from "../regelmotor.js";
import { S, uppdatera } from "../tillstand.js";
import { el } from "../ui/dom.js";

// Masker (s. 41–42) får bara pierroten och dockor (s. 25–27) bara dockmästaren: yrket ger dem till ett visst
// värde efter erfarenhetsnivån, och mer går inte att köpa för egna BP (RB-024).
export function stegMasker(res) {
  const delar = [];
  if (res.masker?.tillganglig) delar.push(maskdel(res.masker));
  if (res.dockor?.tillganglig) delar.push(dockdel(res.dockor));
  if (!delar.length) return [el("p", {}, "Masker finns bara för pierroter och dockor bara för dockmästare (Alver i Chronopia).")];
  return delar;
}

function maskdel(m) {
  const M = S.R.foljeslagare.masker;
  const masker = S.rp.masker ?? [];
  const satt = (ny) => { S.rp.masker = ny; uppdatera(); };
  const vaxla = (i, id, pa) => satt(masker.map((ids, j) => (j !== i ? ids : pa ? [...ids, id] : ids.filter((x) => x !== id))).filter((ids, j) => j !== i || ids.length));
  const kvar = Math.max(0, m.gratis - m.varde);
  return el("div", { class: "rutor", id: "masker" }, el("div", {},
    el("h3", {}, "Degas masker"),
    el("p", { id: "masker-summa" }, `Pierroten får masker till ett värde av högst ${m.gratis} BP. Valt: ${m.varde} BP, ${kvar} BP kvar.`),
    el("p", { class: "hjalp" }, `${M.text} (${kallText(S.R, M, "")}).`),
    ...m.lista.map((mask, i) => el("div", { class: "mask", "data-mask": String(i) },
      el("p", {}, el("strong", {}, `Mask ${i + 1}: `), `${mask.egenskaper.map((e) => e.namn).join(" + ")} (${mask.bp} BP) `,
        el("button", { type: "button", class: "knapp liten", id: `mask-bort-${i}`, onclick: () => satt(masker.filter((_, j) => j !== i)) }, "Ta bort masken")),
      el("div", { class: "rad" }, M.egenskaper.map((e) => el("label", { class: "kryss" },
        el("input", { type: "checkbox", "data-mask-egenskap": `${i}-${e.id}`, checked: masker[i].includes(e.id), disabled: !masker[i].includes(e.id) && e.bp + M.extraPerEgenskap > kvar, onchange: (ev) => vaxla(i, e.id, ev.target.checked) }),
        ` ${e.namn} (${e.bp})`))))),
    el("div", { class: "tabellram" }, el("table", { class: "tabell varutabell" },
      el("thead", {}, el("tr", {}, el("th", {}, "Egenskap"), el("th", {}, "BP"), el("th", {}, "Effekt"), el("th", {}, ""))),
      el("tbody", {}, M.egenskaper.map((e) => el("tr", { "data-maskegenskap": e.id },
        el("td", {}, el("strong", {}, e.namn)), el("td", {}, String(e.bp)), el("td", { class: "hjalp" }, e.effekt),
        el("td", {}, el("button", { type: "button", class: "knapp liten", "aria-label": `Ny mask: ${e.namn}`, disabled: e.bp > kvar, onclick: () => satt([...masker, [e.id]]) }, "Ny mask")))))))));
}

function dockdel(d) {
  const D = S.R.foljeslagare.dockor;
  const dockor = S.rp.dockor ?? [];
  const satt = (ny) => { S.rp.dockor = ny; uppdatera(); };
  const kvar = Math.max(0, d.gratis - d.varde);
  return el("div", { class: "rutor", id: "dockor" }, el("div", {},
    el("h3", {}, "Dockmästarens dockor"),
    el("p", { id: "dockor-summa" }, `Dockmästaren får dockor till ett värde av högst ${d.gratis} BP. Valt: ${d.varde} BP, ${kvar} BP kvar.`),
    el("p", { class: "hjalp" }, `${D.text} (${kallText(S.R, D, "")}).`),
    d.lista.length ? el("ul", { id: "dockor-valda" }, d.lista.map((x, i) => el("li", { "data-docka": `${i}` },
      `${x.namn}: ${x.bp} BP + livsgnista grad `,
      el("select", { id: `docka-gnista-${i}`, onchange: (ev) => satt(dockor.map((y, j) => (j === i ? { ...y, gnista: +ev.target.value } : y))) },
        D.livsgnista.map((bp, g) => el("option", { value: String(g + 1), selected: x.gnista === g + 1 }, `${g + 1} (${bp} BP)`))),
      ` = ${x.varde} BP `,
      el("button", { type: "button", class: "knapp liten", id: `docka-bort-${i}`, onclick: () => satt(dockor.filter((_, j) => j !== i)) }, "Ta bort")))) : null,
    el("div", { class: "tabellram" }, el("table", { class: "tabell varutabell" },
      el("thead", {}, el("tr", {}, el("th", {}, "Docka"), el("th", {}, "BP"), el("th", {}, "Färdigheter"), el("th", {}, ""))),
      el("tbody", {}, D.lista.map((x) => el("tr", { "data-dockrad": x.id },
        el("td", {}, el("strong", {}, x.namn), el("div", { class: "hjalp" }, x.beskrivning ?? "")),
        el("td", {}, String(x.bp)), el("td", { class: "hjalp" }, x.fardigheter || "–"),
        el("td", {}, el("button", { type: "button", class: "knapp liten", "aria-label": `Lägg till ${x.namn}`, disabled: x.bp + D.livsgnista[0] > kvar, onclick: () => satt([...dockor, { id: x.id, gnista: 1 }]) }, "Lägg till")))))))));
}
