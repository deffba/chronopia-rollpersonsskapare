// Utrustning (s. 38, 89–).
import { kanAnvandaVapen, varukatalog } from "../regelmotor.js";
import { rita } from "../app.js";
import { S, uppdatera } from "../tillstand.js";
import { el, kg, sm } from "../ui/dom.js";
import { falt, gruppLista } from "../ui/kontroller.js";
import { sakNamn } from "../ui/sammanfattning.js";
import { fmtMod } from "./alder.js";

let utrustningsKategori = "Äventyrarutrustning";

export function stegUtrustning(res) {
  const U = S.R.utrustning;
  const varden = res.grundegenskaper;
  const u = res.utrustning;
  const katalog = varukatalog(S.R).filter((x) => !["Närstridsvapen", "Avståndsvapen", "Kastvapen", "Sköldar"].includes(x.kategori) || kanAnvandaVapen(S.R, x.namn, varden));
  const kategorier = [...new Set(katalog.map((x) => x.kategori))];
  const antal = (namn) => S.rp.utrustning[namn] ?? 0;
  const andra = (namn, d) => {
    const ny = { ...S.rp.utrustning, [namn]: Math.max(0, antal(namn) + d) };
    if (!ny[namn]) delete ny[namn];
    S.rp.utrustning = ny;
    uppdatera();
  };
  // Vapen man har färdighet i visas först i startpaketets lista
  const kanna = new Set(res.fardigheter.filter((f) => f.nyckel.startsWith("vapen:") && f.fv > 0).map((f) => f.nyckel.split(":")[1]));
  const enkla = katalog.filter((x) => ["Närstridsvapen", "Avståndsvapen", "Kastvapen"].includes(x.kategori) && x.pris <= U.startpaket.vapenMaxPris);
  const paketVapen = [
    ...(enkla.some((x) => kanna.has(x.namn)) ? [["Vapen rollpersonen kan hantera", enkla.filter((x) => kanna.has(x.namn)).map((x) => [x.namn, `${x.namn} (${x.skada})`])]] : []),
    ["Andra enkla vapen", enkla.filter((x) => !kanna.has(x.namn)).map((x) => [x.namn, `${x.namn} (${x.skada})`])],
  ].filter(([, alt]) => alt.length);
  // Fritextfiltret söker i alla kategorier och filtrerar raderna direkt medan man skriver, utan att rita om
  // (då behåller sökfältet fokus). Utan text visas vald kategori.
  const rader = katalog.map((x) => el("tr", { class: antal(x.namn) ? "vald" : "", "data-kategori": x.kategori, "data-namn": x.namn.toLowerCase() },
    el("td", {}, x.namn, x.absorbering ? el("span", { class: "hjalp" }, ` abs. ${x.absorbering}`) : x.skada ? el("span", { class: "hjalp" }, ` ${x.skada}`) : null,
      el("span", { class: "hjalp varukategori" }, ` · ${x.kategori}`)),
    el("td", { class: "num" }, x.vikt == null ? "–" : `${x.vikt.toLocaleString("sv-SE")} kg`),
    el("td", { class: "num" }, sm(x.pris)),
    el("td", { class: "num antal" },
      el("button", { type: "button", class: "knapp liten", disabled: !antal(x.namn), "aria-label": `En ${x.namn} mindre`, onclick: () => andra(x.namn, -1) }, "−"),
      el("span", {}, antal(x.namn)),
      el("button", { type: "button", class: "knapp liten", disabled: x.pris > u.kvar, "aria-label": `En ${x.namn} till`, onclick: () => andra(x.namn, 1) }, "+"))));
  const ingenTraff = el("p", { class: "hjalp", id: "inga-varor", role: "status" });
  const tabell = el("div", { class: "tabellram" }, el("table", { class: "tabell varutabell" },
    el("thead", {}, el("tr", {}, el("th", {}, "Vara"), el("th", { class: "num" }, "Vikt"), el("th", { class: "num" }, "Pris"), el("th", { class: "num" }, "Antal"))),
    el("tbody", {}, rader)));
  const flikar = el("div", { class: "flikar", role: "tablist" }, kategorier.map((k) => el("button", {
    type: "button", class: "valknapp" + (k === utrustningsKategori ? " vald" : ""), role: "tab", "aria-selected": k === utrustningsKategori ? "true" : "false",
    onclick: () => { utrustningsKategori = k; S.utrustningsFilter = ""; rita(); },
  }, k)));
  const filtrera = () => {
    const text = S.utrustningsFilter.trim().toLowerCase();
    let synliga = 0;
    for (const rad of rader) {
      rad.hidden = text ? !rad.dataset.namn.includes(text) : rad.dataset.kategori !== utrustningsKategori;
      if (!rad.hidden) synliga++;
    }
    tabell.classList.toggle("sokning", !!text);
    flikar.classList.toggle("sokning", !!text);
    tabell.hidden = !synliga;
    ingenTraff.hidden = !!synliga;
    ingenTraff.textContent = synliga ? "" : `Inga varor matchar ”${S.utrustningsFilter.trim()}”.`;
  };
  const sok = el("input", {
    type: "search", id: "varusok", class: "sokfalt", value: S.utrustningsFilter, placeholder: "Sök bland alla varor …", "aria-label": "Sök utrustning",
    oninput: (e) => { S.utrustningsFilter = e.target.value; filtrera(); },
  });
  filtrera();
  return [
    el("p", {}, "Rollpersonen köper sin utrustning för startkapitalet. Vapen som rollpersonen inte orkar använda visas inte (s. 89). Det som inte spenderas blir kvar som pengar."),
    el("dl", { class: "steg-potter utrustning-summa" },
      el("div", {}, el("dt", {}, "Startkapital"), el("dd", {}, sm(res.slag.startkapital))),
      el("div", {}, el("dt", {}, "Spenderat"), el("dd", {}, sm(u.kostnad))),
      el("div", { class: u.kvar < 0 ? "over" : "" }, el("dt", {}, "Kvar"), el("dd", {}, sm(u.kvar))),
      el("div", { class: u.belastning ? "over" : "" }, el("dt", {}, "Börda"), el("dd", {}, `${kg(u.borda)} av ${u.barformaga} kg`))),
    u.belastning ? el("div", { class: "varning", role: "note", id: "viktvarning" },
      el("strong", {}, `Packningen väger mer än rollpersonen orkar bära utan besvär (${u.barformaga} kg, samma som STY). `),
      u.belastning.mod === null ? u.belastning.text
        : `Bördan på ${kg(u.borda)} kg ger ${fmtMod(u.belastning.mod)} på förflyttning, SMI och CL i SMI-baserade färdigheter. ${u.belastning.text} Kläder räknas inte, och en rustning man bär räknas som halva vikten (s. 100).`) : null,
    el("div", { class: "rutor" }, el("div", {},
      el("label", { class: "kryss" },
        el("input", { type: "checkbox", id: "startpaket", checked: S.rp.startpaket.valt, onchange: (e) => { S.rp.startpaket = { valt: e.target.checked, vapen: "" }; uppdatera(); } }),
        el("span", {}, el("strong", {}, "Gratis startpaket"), `: ${U.startpaket.varor.map((v) => v.replace(/ \(.*\)/, "").toLowerCase()).join(", ")} och ett enkelt vapen (högst ${U.startpaket.vapenMaxPris} sm). Husregel; fråga spelledaren.`)),
      S.rp.startpaket.valt ? falt("Startpaketets vapen", gruppLista("startpaket-vapen", S.rp.startpaket.vapen, paketVapen,
        (v) => { S.rp.startpaket = { ...S.rp.startpaket, vapen: v }; uppdatera(); }, "Välj vapen …")) : null)),
    el("h3", {}, "Köp"),
    flikar,
    sok,
    ingenTraff,
    tabell,
    u.saker.length ? [el("h3", {}, "Packning"), el("ul", { class: "packning" }, u.saker.map((x) =>
      el("li", {}, el("span", {}, sakNamn(x)), el("span", { class: "num hjalp" }, x.gratis ? "gratis" : sm(x.pris * x.antal)))))] : null,
  ];
}
