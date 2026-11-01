// Besvärjelser (s. 36, 74–).
import { skolFV, besvarjelsePris } from "../regelmotor.js";
import { S, uppdatera } from "../tillstand.js";
import { el } from "../ui/dom.js";
import { tal, valLista } from "../ui/kontroller.js";

// ------------------------------------------------------------ besvärjelser (s. 36, 106–129)
export function stegBesvarjelser(res) {
  const B = S.R.besvarjelser;
  const skola = skolFV(res.fardigheter);
  const kanMagi = res.yrke.magiker || res.magiformaga.lyckat;
  const psy = res.grundegenskaper.PSY;
  if (!kanMagi || skola.allman === 0) {
    return [el("p", { class: "summering" }, "Rollpersonen har ingen magiskola och kan inte lära sig besvärjelser. Gå vidare till utrustningen."),
      el("p", { class: "hjalp" }, "Magiker får en magiskola som yrkesfärdighet. Andra kan lära sig en skola som extra yrkesfärdighet i steg 4 eller som sekundär färdighet i steg 11, om magiförmågeslaget lyckas (s. 106).")];
  }
  const satt = (nyckel, fv) => {
    const ny = { ...S.rp.besvarjelser };
    if (fv > 0) ny[nyckel] = fv; else delete ny[nyckel];
    S.rp.besvarjelser = ny;
    uppdatera();
  };
  const fvFor = (nyckel) => S.rp.besvarjelser[nyckel] ?? 0;
  const rad = (b, nyckel, namn, extra = null) => {
    const fv = fvFor(nyckel);
    const per = besvarjelsePris(S.R, b.sv);
    const tips = `${b.beskrivning} Räckvidd: ${b.rackvidd}. Varaktighet: ${b.varaktighet}.${b.typ ? ` Typ: ${b.typ}.` : ""} (s. ${b.sida})`;
    return el("tr", { class: fv ? "vald" : "" },
      el("td", {}, namn, el("button", { type: "button", class: "info", "data-tip": tips, "aria-label": `Om ${b.namn}` }, "i"), extra),
      el("td", { class: "num" }, b.sv),
      el("td", { class: "num" }, per),
      el("td", { class: "num" }, tal(`bv-${nyckel.replace(/[^a-z0-9]/gi, "-")}`, fv || null, (v) => satt(nyckel, v ?? 0), { min: 0, max: psy })),
      el("td", { class: "num" }, fv ? fv * per : ""));
  };
  const grupper = ["allman", "animism", "elementarmagi", "mentalism"].filter((k) => skola[k] > 0).map((k) => {
    const lista = B.lista.filter((b) => b.skola === k && b.sv <= skola[k]);
    const forHoga = B.lista.filter((b) => b.skola === k && b.sv > skola[k]).length;
    const rader = lista.flatMap((b) => {
      if (!b.perVal) return [rad(b, b.id, b.namn)];
      const alternativ = b.perVal === "elementar" ? B.elementarer : B.varelsegrupper;
      const valda = alternativ.filter((g) => fvFor(`${b.id}:${g}`) > 0);
      const kvar = alternativ.filter((g) => !valda.includes(g));
      return [
        ...valda.map((g) => rad(b, `${b.id}:${g}`, `${b.namn}: ${g}`)),
        kvar.length ? el("tr", {}, el("td", { colspan: 5 },
          valLista(`bv-ny-${b.id}`, "", kvar.map((g) => [g, g]), (g) => { if (g) satt(`${b.id}:${g}`, 1); },
            `${b.namn} (SV ${b.sv}): lär för ${b.perVal === "elementar" ? "elementar" : "grupp"} …`))) : null,
      ];
    });
    return [
      el("h3", {}, B.skolor[k], el("span", { class: "pris" }, k === "allman" ? `styrs av bästa skolan, FV ${skola[k]}` : `FV ${skola[k]} i skolan`)),
      el("div", { class: "tabellram" }, el("table", { class: "tabell besvarjelsetabell" },
        el("thead", {}, el("tr", {}, el("th", {}, "Besvärjelse"), el("th", { class: "num" }, "SV"), el("th", { class: "num" }, "EP/FV"), el("th", { class: "num" }, "FV"), el("th", { class: "num" }, "EP"))),
        el("tbody", {}, rader))),
      forHoga ? el("p", { class: "hjalp" }, `${forHoga} besvärjelser i ${B.skolor[k].toLowerCase()} har högre skolvärde än ${skola[k]} och kan inte läras än.`) : null,
    ];
  });
  return [
    el("p", {}, `Besvärjelser köps med EP, precis som färdigheter. De har ingen baschans och FV kan vara högst ${psy}, samma som PSY. Priset per FV beror på skolvärdet (SV): 2 EP för SV 1–3, 3 EP för SV 4–6 och så vidare (s. 36).`),
    el("ul", { class: "punkter hjalp" }, B.regler.slice(1).map((t) => el("li", {}, t))),
    grupper,
  ];
}
