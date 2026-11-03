// Steget Familjarer (Magi i Chronopia).
import { kallText } from "../regelmotor.js";
import { S, uppdatera } from "../tillstand.js";
import { el } from "../ui/dom.js";

// Familjarer (Magi i Chronopia s. 40–43) köps för BP i ett eget steg efter särskilda förmågor, innan BP
// som blir över växlas till EP. Erfarenhetsnivån avgör hur många rollpersonen får ha (RB-010); de som
// yrket eller Spiritus familiarius ger är gratis och räknas inte mot taket.
export function stegFamiljarer(res) {
  const F = S.R.foljeslagare?.familjarer;
  const fam = res.familjarer;
  if (!F || !fam?.tillganglig) return [el("p", {}, "Familjarer finns bara med Magi i Chronopia.")];
  const kopta = S.rp.familjarer ?? [];
  const antal = (id) => kopta.filter((x) => x === id).length;
  const andra = (id, d) => {
    const ny = [...kopta];
    if (d > 0) ny.push(id); else ny.splice(ny.lastIndexOf(id), 1);
    S.rp.familjarer = ny;
    uppdatera();
  };
  const gratis = fam.lista.filter((f) => f.gratis);
  const kanKopa = fam.kanKopa !== false;
  const varden = (f) => ["STO", "STY", "FYS", "SMI", "INT", "PSY", "KP"].map((g) => `${g} ${f[g]}`).join(", ");
  return [el("div", { class: "rutor", id: "familjarer" }, el("div", {},
    el("p", {}, `Rollpersonen får ha högst ${fam.tak} köpt${fam.tak === 1 ? "" : "a"} familjar${fam.tak === 1 ? "" : "er"} och har köpt ${fam.antal}. De kostar ${fam.bp} BP.`),
    el("p", { class: "hjalp" }, `${F.text} (${kallText(S.R, F, "")}).`),
    kanKopa ? null : el("p", { class: "hjalp", id: "familjarer-ej-magi" }, "Bara rollpersoner som kan magi får köpa familjarer (RB-023). Familjarer som yrket eller en särskild förmåga ger är gratis och får alla ha."),
    gratis.length ? el("p", { id: "familjarer-gratis" }, `Gratis: ${gratis.map((f) => `${f.namn} (${f.kallaGratis})`).join(", ")}.`) : null,
    el("div", { class: "tabellram" }, el("table", { class: "tabell varutabell" },
      el("thead", {}, el("tr", {}, el("th", {}, "Familjar"), el("th", {}, "BP"), el("th", {}, "Värden"), el("th", {}, "Antal"))),
      el("tbody", {}, F.lista.map((f) => {
        const n = antal(f.id);
        const sparrad = f.villkor?.yrken && !f.villkor.yrken.includes(S.rp.yrke);
        return el("tr", { "data-familjar": f.id, class: sparrad ? "sparrad" : "" },
          el("td", {}, el("strong", {}, f.namn), el("div", { class: "hjalp" }, f.beskrivning, sparrad ? " Bara för chronomager och divinatorer." : "")),
          el("td", {}, String(f.bp)),
          el("td", { class: "hjalp" }, varden(f), f.fardigheter ? el("div", {}, f.fardigheter) : null),
          el("td", { class: "antal" },
            el("button", { type: "button", class: "knapp liten", "aria-label": `Ta bort ${f.namn}`, disabled: !n, onclick: () => andra(f.id, -1) }, "−"),
            el("span", { id: `familjar-${f.id}` }, String(n)),
            el("button", { type: "button", class: "knapp liten", "aria-label": `Köp ${f.namn}`, disabled: !kanKopa || sparrad || fam.antal >= fam.tak, onclick: () => andra(f.id, 1) }, "+")));
      }))))))];
}
