// Besvärjelser (s. 36, 74–).
import { skolFV, besvarjelsePris, iBocker, kallText, tidsgrenTak } from "../regelmotor.js";
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
    const tips = `${b.beskrivning} Räckvidd: ${b.rackvidd}. Varaktighet: ${b.varaktighet}.${b.typ ? ` Typ: ${b.typ}.` : ""} (${kallText(S.R, b, `s. ${b.sida}`)})`;
    return el("tr", { class: fv ? "vald" : "" },
      el("td", {}, namn, el("button", { type: "button", class: "info", "data-tip": tips, "aria-label": `Om ${b.namn}` }, "i"), extra),
      el("td", { class: "num" }, b.sv),
      el("td", { class: "num" }, per),
      el("td", { class: "num" }, tal(`bv-${nyckel.replace(/[^a-z0-9]/gi, "-")}`, fv || null, (v) => satt(nyckel, v ?? 0), { min: 0, max: psy })),
      el("td", { class: "num" }, fv ? fv * per : ""));
  };
  // Besvärjelser från valda böcker som yrket får lära sig (underjordens magi bara för cestoditer, Magi i Chronopia s. 30)
  const tillatna = B.lista.filter((b) => iBocker(b, S.rp) && (!b.villkor?.yrken || b.villkor.yrken.includes(res.yrke.id)));
  const raderFor = (lista) => lista.flatMap((b) => {
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
  const tabell = (lista) => el("div", { class: "tabellram" }, el("table", { class: "tabell besvarjelsetabell" },
    el("thead", {}, el("tr", {}, el("th", {}, "Besvärjelse"), el("th", { class: "num" }, "SV"), el("th", { class: "num" }, "EP/FV"), el("th", { class: "num" }, "FV"), el("th", { class: "num" }, "EP"))),
    el("tbody", {}, raderFor(lista))));
  const tid = tidsgrenTak(S.R, { yrke: res.yrke.id }, res.besvarjelser);
  const grupper = Object.keys(B.skolor).filter((k) => skola[k] > 0).map((k) => {
    const iSkolan = tillatna.filter((b) => b.skola === k);
    const lista = iSkolan.filter((b) => b.sv <= skola[k]);
    const forHoga = iSkolan.length - lista.length;
    const delar = [...new Set(lista.map((b) => b.grupp ?? ""))];
    return [
      el("h3", {}, B.skolor[k], el("span", { class: "pris" }, k === "allman" ? `styrs av bästa skolan, FV ${skola[k]}` : `FV ${skola[k]} i skolan`)),
      delar.map((g) => {
        const G = g ? B.grupper[g] : null;
        const info = G && tid && g === tid.annan ? ` Just nu: ${tid.anvanda} av ${tid.tak}.` : "";
        return [G ? el("h4", { class: "besvarjelsegrupp", "data-grupp": g }, G.namn) : null,
          G ? el("p", { class: "hjalp" }, G.text + info, el("span", { class: "sida" }, ` (${kallText(S.R, G)})`)) : null,
          tabell(lista.filter((b) => (b.grupp ?? "") === g))];
      }),
      forHoga ? el("p", { class: "hjalp" }, `${forHoga} besvärjelser i ${B.skolor[k].toLowerCase()} har högre skolvärde än ${skola[k]} och kan inte läras än.`) : null,
    ];
  });
  // Minimagi (Magi i Chronopia s. 19, 28–29): två valfria minimagiska besvärjelser per FV, utan EP
  const M = B.minimagi && iBocker(B.minimagi, S.rp) ? B.minimagi : null;
  const mm = res.minimagi;
  const minimagi = M && mm?.fv > 0 ? [
    el("h3", {}, "Minimagi", el("span", { class: "pris" }, `FV ${mm.fv}: ${(S.rp.minimagi ?? []).length} av ${mm.max}`)),
    el("p", { class: "hjalp" }, M.text, el("span", { class: "sida" }, ` (${kallText(S.R, M)})`)),
    el("ul", { class: "minimagi-lista" }, M.lista.map((x) => {
      const valda = S.rp.minimagi ?? [];
      const pa = valda.includes(x.id);
      return el("li", { class: pa ? "vald" : "" }, el("label", { title: x.beskrivning },
        el("input", { type: "checkbox", "data-minimagi": x.id, checked: pa, disabled: !pa && valda.length >= mm.max,
          onchange: (e) => { S.rp.minimagi = e.target.checked ? [...valda, x.id] : valda.filter((v) => v !== x.id); uppdatera(); } }),
        ` ${x.namn}`), el("span", { class: "hjalp" }, ` – ${x.beskrivning}`));
    })),
  ] : null;
  return [
    el("p", {}, `Besvärjelser köps med EP, precis som färdigheter. De har ingen baschans och FV kan vara högst ${psy}, samma som PSY. Priset per FV beror på skolvärdet (SV): 2 EP för SV 1–3, 3 EP för SV 4–6 och så vidare (s. 36).`),
    el("ul", { class: "punkter hjalp" }, B.regler.slice(1).map((t) => el("li", {}, t))),
    grupper,
    minimagi,
  ];
}
