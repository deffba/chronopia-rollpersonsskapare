// Steg 14: spara och exportera.
import { tillFil } from "../sparformat.js";
import { laddaNerPdf, oppnaSpel, visaFormular, visaNotis } from "../app.js";
import { S } from "../tillstand.js";
import { $, el } from "../ui/dom.js";

// ------------------------------------------------------------ steg 12: spara och exportera
export function filnamn() {
  return `${(S.rp.namn || "rollperson").trim().replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.json`;
}

const filtext = () => JSON.stringify(tillFil(S.rp), null, 2);

export function stegExport(res) {
  const text = filtext();
  return [
    el("p", { class: "summering" }, `${S.rp.namn} är klar: ${res.ras.namn.toLowerCase()}, ${res.yrke.namn.toLowerCase()}, ${S.rp.alder} år.`),
    el("p", {}, "Spara rollpersonen som en JSON-fil. Filen kan läsas in igen med knappen Läs in fil högst upp, till exempel för att fortsätta på en annan dator."),
    el("p", {}, "Rollformuläret ser ut som bokens (s. 11–12) och kan laddas ner som PDF, färdigt att skriva ut eller fylla i på datorn. Det du skriver i rollformuläret här på sidan under spel, som erf och pengar, sparas i JSON-filen."),
    el("div", { class: "rad" },
      el("button", { type: "button", class: "knapp primar", id: "pdf-direkt", onclick: laddaNerPdf }, "Ladda ner rollformuläret som PDF"),
      el("button", { type: "button", class: "knapp", onclick: visaFormular }, "Visa rollformuläret"),
      el("button", { type: "button", class: "knapp", onclick: laddaNer }, `Ladda ner ${filnamn()}`),
      el("button", { type: "button", class: "knapp", onclick: () => kopiera(text) }, "Kopiera JSON")),
    S.spelSynlig && el("p", {}, "När rollpersonen har spelats för du in erfarenhet, hjältepoäng, pengar och utrustning efter varje spelmöte, och förbättrar henne när erfarenheten räcker. Efter det första spelmötet går skapandet inte längre att ändra."),
    S.spelSynlig && el("div", { class: "rad" }, el("button", { type: "button", class: "knapp", id: "till-spel", onclick: oppnaSpel }, "Till spelmötena →")),
    el("details", { class: "fakta" }, el("summary", {}, "Visa JSON"),
      el("textarea", { id: "exportruta", rows: 12, readonly: true, "aria-label": "Rollpersonen som JSON" }, text)),
  ];
}

export function laddaNer() {
  const url = URL.createObjectURL(new Blob([filtext()], { type: "application/json" }));
  const a = el("a", { href: url, download: filnamn() });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  visaNotis(`${filnamn()} laddas ner. Om inget händer kan du använda Kopiera JSON i stället.`);
}

function kopiera(text) {
  navigator.clipboard?.writeText(text).then(
    () => visaNotis("JSON är kopierad."),
    () => { const ruta = $("#exportruta"); ruta?.closest("details")?.setAttribute("open", ""); ruta?.select(); visaNotis("Markera texten i rutan och kopiera den."); });
}
