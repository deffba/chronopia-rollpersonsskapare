// Steget Klan (Dvärgar i Chronopia s. 4, 18–26): dvärgens klan och klanförmåga.
import { kallText, klanAv, klanForSlag, slagIntervall } from "../regelmotor.js";
import { rita } from "../app.js";
import { S, spara, uppdatera } from "../tillstand.js";
import { el, slaT } from "../ui/dom.js";
import { falt, valLista } from "../ui/kontroller.js";
import { inteSlaget, landatSlag, slagKontroll, valjFardighet } from "../ui/tarningar.js";

const TOM_KLAN = () => ({ id: "", slag: null, formagaSlag: null, val: [] });

// Spelaren slår 1T100 på klantabellen eller väljer klan (s. 4). Medlemmar i en namngiven klan slår sedan
// 1T10 på klanens tabell och får en klanförmåga, utan att lägga BP. Klanförmågans val (t.ex. vilken
// lärdomsfärdighet) görs här. Durban finns inte i tabellen och kan bara väljas.
export function stegKlan(res) {
  const K = S.R.klaner;
  if (!K || !res.klan?.tillganglig) return [el("p", {}, "Klaner finns bara för dvärgar med Dvärgar i Chronopia.")];
  const k = S.rp.klan ?? TOM_KLAN();
  S.rp.klan = k;
  const klan = klanAv(S.R, k.id);
  const kalla = kallText(S.R, K, "");
  const delar = [el("p", {}, `${K.text} (${kalla}).`)];

  // 1. Klanen: slå eller välj
  if (!klan) {
    const { slagfalt, knapp } = slagKontroll("klan", "Slag (1T100)", "Slå 1T100", 1, 100,
      (v) => { S.rp.klan = { ...TOM_KLAN(), id: klanForSlag(S.R, v), slag: v }; uppdatera(); }, () => slaT(1, 100), 100);
    delar.push(el("div", { class: "rad" }, slagfalt, knapp,
      falt("Eller välj klan", valLista("klan-val", "", K.lista.map((x) => [x.id, x.namn]),
        (v) => { if (v) { S.rp.klan = { ...TOM_KLAN(), id: v }; uppdatera(); } }, "Välj klan …"))));
    delar.push(el("div", { class: "tabellram" }, el("table", { class: "tabell" },
      el("thead", {}, el("tr", {}, el("th", {}, "1T100"), el("th", {}, "Klan"))),
      el("tbody", {}, K.tabell.map(([fran, till, id]) => el("tr", {},
        el("td", {}, fran === till ? String(fran) : `${String(fran).padStart(2, "0")}–${till === 100 ? "00" : String(till).padStart(2, "0")}`),
        el("td", {}, klanAv(S.R, id)?.namn ?? id)))))));
    return delar;
  }
  delar.push(el("div", { class: "rad" },
    k.slag != null ? falt("Slag (1T100)", landatSlag("klan", k.slag, "Slå 1T100", { sidor: 100, antal: 1 })) : null,
    el("p", { class: "summering", id: "klan-namn" }, `Klan: ${klan.namn}${k.slag == null ? " (vald)" : ""}.`),
    // Klanen går att byta tills klanförmågan är slagen; i utvecklarläget alltid
    k.formagaSlag == null || S.omslag ? el("button", { type: "button", class: "knapp" + (k.formagaSlag == null ? "" : " omslag"), id: "klan-byt",
      onclick: () => { S.rp.klan = TOM_KLAN(); S.giltig = structuredClone(S.rp); spara(); rita(); } }, "Byt klan") : null));
  delar.push(el("div", { class: "valinfo" },
    el("h3", { class: "valrubrik" }, klan.namn),
    el("p", { class: "vallore" }, klan.beskrivning, ` (${kallText(S.R, { kalla: { ...K.kalla, sida: klan.sida } }, "")})`)));
  if (!klan.formagor.length) {
    delar.push(el("p", { class: "hjalp" }, "Klanen har ingen tabell för klanförmågor, så rollpersonen får ingen klanförmåga."));
    return delar;
  }

  // 2. Klanförmågan: 1T10 på klanens tabell
  const r = res.klan;
  if (k.formagaSlag == null) {
    const { slagfalt, knapp } = slagKontroll("klanformaga", "Slag (1T10)", "Slå 1T10", 1, 10,
      (v) => { S.rp.klan = { ...S.rp.klan, formagaSlag: v, val: [] }; uppdatera(); }, () => slaT(1, 10), 10);
    delar.push(el("h4", {}, "Klanförmåga"), el("div", { class: "rad" }, slagfalt, knapp), el("p", { class: "summering" }, inteSlaget()));
  } else {
    const f = r.formaga;
    delar.push(el("h4", {}, "Klanförmåga"),
      el("div", { class: "rad" }, falt("Slag (1T10)", landatSlag("klanformaga", k.formagaSlag, "Slå 1T10", { sidor: 10, antal: 1 }))),
      el("p", { class: "summering", id: "klanformaga" }, f ? [el("strong", {}, `${f.namn}: `), f.effekt] : ""),
      klanVal(f));
  }
  delar.push(el("div", { class: "tabellram" }, el("table", { class: "tabell" },
    el("thead", {}, el("tr", {}, el("th", {}, "1T10"), el("th", {}, "Klanförmåga"))),
    el("tbody", {}, klan.formagor.map((x) => el("tr", { class: r.formaga === x ? "vald" : "" },
      el("td", {}, slagIntervall(x)), el("td", {}, el("strong", {}, x.namn), ` ${x.effekt}`)))))));
  return delar;
}

// Val som klanförmågan kräver, t.ex. vilken lärdomsfärdighet Bokmal gäller
function klanVal(formaga) {
  const val = S.rp.klan.val ?? [];
  const satt = (i, v) => { const ny = [...val]; ny[i] = v; S.rp.klan = { ...S.rp.klan, val: ny }; uppdatera(); };
  const rader = (formaga?.regel ?? []).map((del, i) => {
    if (del.typ !== "fv" || !del.valj) return null;
    const valda = [].concat(val[i] ?? []);
    return el("li", {}, el("span", { class: "fnamn" }, "Välj färdighet"),
      el("div", { class: "rad" }, valjFardighet(`klan-${i}`, del.bland, valda[0], (v) => satt(i, v ? [v] : []))));
  }).filter(Boolean);
  return rader.length ? el("ul", { class: "yrkeslista" }, rader) : null;
}

// Klanen och klanförmågan i en rad, t.ex. för sammanfattningen och rollformuläret
export function klanText(res) {
  const k = res.klan;
  if (!k?.klan) return null;
  return k.formaga ? `${k.klan.namn}: ${k.formaga.namn}` : k.klan.namn;
}
