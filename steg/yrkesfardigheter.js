// Steg 4: yrkesfärdigheter och extra yrkesfärdigheter.
import { fardighetAv, paborjad, namnFor } from "../regelmotor.js";
import { rita, visaNotis } from "../app.js";
import { S, uppdatera, yrkesNycklar } from "../tillstand.js";
import { el } from "../ui/dom.js";
import { fardighetsInfo, fardighetsVal, info, kortBeskrivning } from "../ui/kontroller.js";
import { magiInfo, magiMojlig } from "../ui/magimodal.js";
import { stridskonstInfo } from "./fardigheter.js";
import { yrketsVal } from "./yrke.js";

// BP för varje extra yrkesfärdighet, i samma prisordning som regelmotorn (s. 27)
function extraPriser(lista) {
  const k = S.R.yrken.extraYrkesfardigheter;
  let vanliga = 0;
  return lista.map((nyckel) => {
    if (fardighetAv(S.R, nyckel || "x")?.typ === "magiskola") return k.magiskola;
    vanliga += 1;
    return vanliga === 1 ? k.forsta : vanliga === 2 ? k.andra : k.darefter;
  });
}

// Beskrivningen av färdigheten som är vald i en rullgardin, innan den läggs till
export function valdBeskrivning(nyckel) {
  const id = (nyckel ?? "").split(":")[0];
  return id ? el("div", { class: "vald-beskrivning" }, kortBeskrivning(id, true)) : null;
}

export function stegExtra(res) {
  const lista = S.rp.extraYrkesfardigheter;
  const k = S.R.yrken.extraYrkesfardigheter;
  const priser = extraPriser(lista);
  const yrkesrader = res.fardigheter.filter((f) => f.status === "yrke");
  // Färdigvalda extra som inte syns bland yrkesfärdigheterna (t.ex. påbörjade i en äldre sparning) listas ändå, så att de går att ta bort
  const ovriga = lista.filter((n) => !yrkesrader.some((f) => f.nyckel === n));
  const taBort = (nyckel, namn) => el("button", {
    type: "button", class: "lank", "aria-label": `Ta bort ${namn}`,
    onclick: () => { const i = lista.indexOf(nyckel); if (i >= 0) lista.splice(i, 1); uppdatera(); },
  }, "ta bort");
  const rad = (nyckel, namn, grundegenskap) => {
    const i = lista.indexOf(nyckel);
    return el("tr", {},
      el("td", {}, namn, fardighetsInfo(nyckel), i >= 0 ? taBort(nyckel, namn) : null),
      el("td", {}, grundegenskap ?? ""),
      el("td", {}, i >= 0 ? "Extra" : "Yrket"),
      el("td", { class: "num" }, i >= 0 ? priser[i] : ""));
  };
  const nasta = extraPriser([...lista, S.nyExtra || "x"]).at(-1);
  const harRedan = new Set([...yrkesNycklar(), ...lista]);
  return [
    ...yrketsVal(),
    el("h3", {}, "Fler yrkesfärdigheter"),
    el("p", {}, `Den första extra yrkesfärdigheten kostar ${k.forsta} BP, den andra ${k.andra} BP och varje därefter ${k.darefter} BP. En magiskola kostar ${k.magiskola} BP och kräver ett lyckat magiförmågeslag (1T100 högst (INT+PSY)/2, s. 106). Slaget görs när du går vidare från steg 6, när INT och PSY är bestämda.`),
    el("h4", {}, "Dina yrkesfärdigheter"),
    el("div", { class: "tabellram" }, el("table", { class: "tabell fardighetstabell yrkestabell" },
      el("thead", {}, el("tr", {}, el("th", {}, "Färdighet"), el("th", {}, "Grundeg."), el("th", {}, "Från"), el("th", { class: "num" }, "BP", info("BP")))),
      el("tbody", {},
        yrkesrader.map((f) => rad(f.nyckel, f.namn, f.grundegenskapText ?? f.grundegenskap)),
        ovriga.map((n) => {
          const f = fardighetAv(S.R, (n || "x").split(":")[0]);
          return rad(n, !f ? n || "Tom rad" : paborjad(n) ? `${f.namn} (inte färdigvald)` : namnFor(S.R, f, n), f?.grundegenskap);
        })))),
    lista.some((n) => n.startsWith("stridskonster")) ? stridskonstInfo() : null,
    el("h4", {}, "Lägg till en extra yrkesfärdighet"),
    el("div", { class: "rad" },
      // Färdigheter som rollpersonen redan har som yrkesfärdighet visas inte; för dem med delval spärras de delval som redan finns
      fardighetsVal("ny-extra", S.nyExtra, (v) => { S.nyExtra = v; rita(); }, (f) => magiMojlig(f) && (f.perVal || !harRedan.has(f.id)), { yrke: true }),
      el("button", { type: "button", class: "knapp", disabled: paborjad(S.nyExtra), onclick: () => {
        if (res.bp.kvar < nasta) {
          visaNotis(`Det går inte: den extra yrkesfärdigheten kostar ${nasta} BP, och du har bara ${res.bp.kvar} BP kvar.`);
          return;
        }
        if (!lista.includes(S.nyExtra)) lista.push(S.nyExtra);
        S.nyExtra = "";
        uppdatera();
      } }, "Lägg till")),
    magiInfo(S.nyExtra),
    valdBeskrivning(S.nyExtra),
    S.nyExtra.startsWith("stridskonster") ? stridskonstInfo() : null,
    el("p", { class: res.bp.kvar < nasta ? "hjalp felrad" : "hjalp" },
      `Nästa extra yrkesfärdighet kostar ${nasta} BP. Du har ${res.bp.kvar} BP kvar.`,
      res.bp.kvar < nasta ? " Du har inte råd med den." : " Välj färdighet, fyll i vad den gäller och tryck Lägg till."),
  ];
}
