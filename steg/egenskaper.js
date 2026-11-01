// Grundegenskaper och förslag på grundvärden.
import { GRUNDEGENSKAPER, STANDARDVARDEN, rasAv, fardighetAv } from "../regelmotor.js";
import { visaNotis } from "../app.js";
import { S, rakna, rasId, uppdatera } from "../tillstand.js";
import { el } from "../ui/dom.js";
import { info, markera, tal } from "../ui/kontroller.js";
import { fmtMod } from "./alder.js";

export function stegEgenskaper(res) {
  const ras = rasAv(S.R, rasId());
  const aldersmod = S.R.alder.effekter[res.alderskategori];
  const kostnad = S.R.grundegenskaper.kostnad;
  const rader = GRUNDEGENSKAPER.map((g) => el("tr", {},
    el("th", { scope: "row" }, g, info(g)),
    el("td", {}, markera(tal(`ge-${g}`, S.rp.grundvarden[g], (v) => { S.rp.grundvarden[g] = Math.min(18, Math.max(3, v ?? 3)); uppdatera(); }, { min: 3, max: 18 }), S.rp.grundvarden[g], STANDARDVARDEN()[g])),
    el("td", { class: "num" }, kostnad[String(S.rp.grundvarden[g])] ?? "–"),
    el("td", { class: "num" }, fmtMod(ras.mod[g])),
    el("td", { class: "num" }, fmtMod(aldersmod[g])),
    el("td", { class: "num stor" + (res.grundegenskaper[g] < 3 ? " fel" : "") }, res.grundegenskaper[g])));
  const s = S.R.grundegenskaper.sto;
  const steg = S.rp.stoSteg;
  const stoBP = steg > 0 ? s.hojning[steg - 1] : steg < 0 ? -s.sankning[-steg - 1] : 0;
  return [
    el("p", {}, "Köp ett grundvärde (3–18) för varje grundegenskap. Ras och ålder läggs på efteråt. Alla slutvärden måste bli minst 3."),
    res.forLagaEgenskaper.length ? el("div", { class: "varning", role: "note" },
      el("strong", {}, "Höj grundvärdet så att slutvärdet blir minst 3. "),
      `Rasen och åldern (${S.R.alder.kategorier.find((k) => k.id === res.alderskategori).namn.toLowerCase()}) sänker ${res.forLagaEgenskaper.map((t) => t.split(" ")[0]).join(" och ")} för mycket. Du kan också välja en annan ålder i steg 2.`) : null,
    el("div", { class: "rad" },
      el("button", { type: "button", class: "knapp", onclick: foreslaGrundvarden }, `Föreslå värden för ${res.ras.namn.toLowerCase()} som ${res.yrke.namn.toLowerCase()}`),
      S.autoAnvand.egenskaper ? el("button", { type: "button", class: "knapp", onclick: () => { S.rp.grundvarden = STANDARDVARDEN(); S.rp.stoSteg = 0; S.autoAnvand.egenskaper = false; uppdatera(); } }, "Återställ") : null,
      el("span", { class: "hjalp" }, "Lägger de högsta värdena där yrkets färdigheter och rasen gör mest nytta och sparar 10 BP till steg 7–10. Du kan justera efteråt.")),
    el("div", { class: "tabellram" }, el("table", { class: "tabell" },
      el("thead", {}, el("tr", {}, ["", "Grundvärde", "BP", "Ras", "Ålder", "Slutvärde"].map((t, i) => el("th", { class: i > 1 ? "num" : "" }, t, t === "BP" ? info("BP") : null)))),
      el("tbody", {}, rader,
        el("tr", {}, el("th", { scope: "row" }, "STO", info("STO")),
          el("td", {}, el("div", { class: "stegare" },
            el("button", { type: "button", class: "knapp liten", "aria-label": "Sänk STO", disabled: steg <= -5 || ras.sto.normal + steg <= ras.sto.min, onclick: () => { S.rp.stoSteg -= 1; uppdatera(); } }, "−"),
            el("span", {}, steg === 0 ? "normal" : fmtMod(steg)),
            el("button", { type: "button", class: "knapp liten", "aria-label": "Höj STO", disabled: steg >= 5 || ras.sto.normal + steg >= ras.sto.max, onclick: () => { S.rp.stoSteg += 1; uppdatera(); } }, "+"))),
          el("td", { class: "num" }, stoBP > 0 ? stoBP : stoBP < 0 ? `${stoBP}` : "0"),
          el("td", { class: "num" }, `${ras.sto.min}–${ras.sto.max}`), el("td", {}),
          el("td", { class: "num stor" }, res.grundegenskaper.STO))))),
    el("details", { class: "fakta" }, el("summary", {}, "Vad kostar grundvärdena? (s. 27)"),
      el("p", { class: "hjalp" }, "Den övre raden är grundvärdet du köper, den undre hur många BP det kostar. 3 är gratis, och kostnaden stiger brant över 12. Ett grundvärde på 13 kostar till exempel 14 BP. Kolumnen BP i tabellen ovan visar vad varje värde kostar just nu."),
      el("div", { class: "tabellram" }, el("table", { class: "tabell kostnadstabell" }, el("tbody", {},
        el("tr", {}, el("th", { scope: "row" }, "Grundvärde"), Object.keys(kostnad).map((v) => el("td", { class: "num" }, v))),
        el("tr", {}, el("th", { scope: "row" }, "BP", info("BP")), Object.values(kostnad).map((k) => el("td", { class: "num" }, k))))))),
  ];
}

// Föreslagna grundvärden: högst där yrkets färdigheter och rasens styrkor ligger (s. 18–29).
// Ger grundvärdena, eller null om BP inte räcker till något förslag.
export function grundvardesForslag() {
  const res = rakna();
  const yrke = res.yrke;
  const ras = res.ras;
  const vikt = Object.fromEntries(GRUNDEGENSKAPER.map((g) => [g, ras.mod[g] * 0.2]));
  const lagg = (id, v) => {
    const f = fardighetAv(S.R, id);
    if (!f) return;
    if (GRUNDEGENSKAPER.includes(f.grundegenskap)) vikt[f.grundegenskap] += v;
    else { vikt.STY += v / 2; vikt.SMI += v / 2; } // vapen och hantverk varierar
  };
  for (const post of yrke.fardigheter) {
    if (typeof post === "string") lagg(post, 1);
    else if (post.valEn) post.valEn.forEach((x) => lagg(x.fardighet ?? x, 1 / post.valEn.length));
    else lagg(post.fardighet, post.antal ?? 2);
  }
  for (const f of S.R.fardigheter.lista) if (f.typ === "primar") lagg(f.id, 0.25);
  if (yrke.magiker) { vikt.INT += 3; vikt.PSY += 3; }
  vikt.FYS += 1; // kroppspoäng
  const ordning = [...GRUNDEGENSKAPER].sort((a, b) => vikt[b] - vikt[a]);
  const kostnad = S.R.grundegenskaper.kostnad;
  const mallar = [[16, 15, 13, 12, 10, 9], [15, 14, 12, 11, 10, 8], [14, 13, 12, 10, 9, 8], [13, 12, 11, 10, 9, 8],
    [12, 11, 10, 10, 9, 7], [11, 10, 10, 9, 8, 7], [10, 10, 9, 8, 7, 6], [9, 8, 8, 7, 6, 5], [7, 6, 6, 5, 5, 4]];
  const budget = res.bp.kvar + res.bp.utgifter.grundegenskaper - 10;
  const aldersmod = S.R.alder.effekter[res.alderskategori];
  for (const mall of mallar) {
    const varden = Object.fromEntries(ordning.map((g, i) => [g, mall[i]]));
    // Slutvärdet måste bli minst 3 efter ras och ålder
    for (const g of GRUNDEGENSKAPER) varden[g] = Math.min(18, Math.max(varden[g], 3 - ras.mod[g] - aldersmod[g]));
    const pris = GRUNDEGENSKAPER.reduce((summa, g) => summa + kostnad[String(varden[g])], 0);
    if (pris <= budget) return varden;
  }
  return null;
}

function foreslaGrundvarden() {
  const varden = grundvardesForslag();
  if (!varden) { visaNotis("Det finns inte tillräckligt med BP för ett förslag. Sänk något annat först."); return; }
  S.rp.grundvarden = varden;
  S.autoAnvand.egenskaper = true;
  uppdatera();
}
