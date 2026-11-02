// Små kontroller: tal, listor, knappar och info-cirklar.
import { fardighetAv, tvahandsvapen, vapengrupp, kulturer, magiskolor, iBocker, vapenVillkor } from "../regelmotor.js";
import { rita, visaNotis } from "../app.js";
import { DELVAL_HJALP, FORKLARINGAR, SPRAK_HJALP } from "../texter.js";
import { S, modersmal, rakna, uppdatera, yrkesNycklar } from "../tillstand.js";
import { el } from "./dom.js";

export const infoKnapp = (text, etikett) => el("button", { type: "button", class: "info", "data-tip": text, "aria-label": etikett }, "i");

// ------------------------------------------------------------ små kontroller
// Talfält: ett otillåtet värde ersätts med det närmaste tillåtna mellan det nya och det gamla.
export function tal(id, varde, onchange, { min, max, steg = 1, bred } = {}) {
  return el("input", {
    type: "number", id, value: varde ?? "", min, max, step: steg, class: bred ? "tal bred" : "tal",
    onchange: (e) => {
      let nytt = e.target.value === "" ? null : Math.round(Number(e.target.value));
      if (nytt !== null && min !== undefined) nytt = Math.max(min, nytt);
      if (nytt !== null && max !== undefined) nytt = Math.min(max, nytt);
      if (nytt === null || varde === null || varde === undefined || nytt === varde) { onchange(nytt); return; }
      const riktning = nytt > varde ? -1 : 1;
      let forstaFel = null;
      S.provar = true;
      for (let v = nytt; v !== varde; v += riktning) {
        S.rp = structuredClone(S.giltig);
        onchange(v);
        const fel = rakna().fel;
        if (!fel.length) {
          if (v !== nytt) visaNotis(`${v} är närmast tillåtna värde: ${forstaFel}.`);
          S.provar = false;
          uppdatera();
          return;
        }
        forstaFel ??= fel[0];
      }
      S.provar = false;
      S.rp = structuredClone(S.giltig);
      visaNotis(`Det går inte: ${forstaFel}.`);
      rita();
    },
  });
}

export function falt(etikett, kontroll, hjalp) {
  // En grupp valknappar får inte ligga i en label: ett klick på etiketten skulle välja första knappen
  // Detsamma gäller tärningsrutan: ett klick på etiketten skulle slå
  return el(kontroll?.classList?.contains("valknappar") || kontroll?.classList?.contains("tarningsknapp") ? "div" : "label", { class: "falt" }, el("span", { class: "etikett" }, etikett), kontroll, hjalp ? el("span", { class: "hjalp" }, hjalp) : null);
}

export function valLista(id, varde, alternativ, onchange, tomText = "Välj …") {
  if (alternativ.length > 0 && alternativ.length <= 4) return valKnappar(id, varde, alternativ, onchange);
  return el("select", { id, onchange: (e) => onchange(e.target.value) },
    el("option", { value: "" }, tomText),
    alternativ.map(([v, t, { disabled } = {}]) => el("option", { value: v, selected: v === varde, disabled }, t)));
}

// Få alternativ visas som knappar i stället för en rullgardin. Det valda lyser, de andra stryks
// över men går att klicka på för att byta. Ett nytt klick på det valda gör valet ogjort.
function valKnappar(id, varde, alternativ, onchange) {
  const valt = alternativ.some(([v]) => v === varde);
  return el("div", { id, class: "valknappar" + (valt ? " gjort" : ""), role: "group" },
    alternativ.map(([v, t, { disabled } = {}]) => el("button", {
      type: "button", class: "valknapp" + (v === varde ? " vald" : valt ? " bortvald" : ""), "aria-pressed": v === varde ? "true" : "false", disabled,
      "data-varde": v, onclick: () => onchange(v === varde ? "" : v), // ett klick på det valda tar bort valet
    }, t)));
}

// Vapnen ordnade i bokens vapengrupper (s. 72). Gruppen beror på STY, så ett tungt svärd hamnar bland tvåhandsvapnen.
function vapenGrupper(enhandsNarstrid = false) {
  const v = S.R.vapen;
  const varden = rakna().grundegenskaper;
  // Två vapen: bara närstridsvapen som rollpersonen kan hålla med en hand (s. 71–72)
  const lista = (enhandsNarstrid ? v.narstrid.filter((x) => x.grupp !== "slagsmal" && !tvahandsvapen(S.R, x.namn, varden))
    : [...v.narstrid.filter((x) => x.grupp !== "slagsmal"), ...v.projektil, ...v.kast, ...v.skoldar])
    .filter((x) => !vapenVillkor(S.R, S.rp, x.namn)); // bara vapen ur de valda böckerna som rasen får bära
  const sty = varden.STY;
  const grupper = new Map(S.R.vapen.grupper.map((g) => [g.id, []]));
  for (const x of lista) grupper.get(vapengrupp(S.R, x.namn, sty))?.push([x.namn, x.namn]);
  return S.R.vapen.grupper.filter((g) => grupper.get(g.id).length).map((g) => [g.namn, grupper.get(g.id)]);
}

// Rullgardin med rubriker: en tom rad och "– Grupp –" före varje grupp
export function gruppLista(id, varde, grupper, onchange, tomText = "Välj …") {
  return el("select", { id, onchange: (e) => onchange(e.target.value) },
    el("option", { value: "" }, tomText),
    grupper.map(([namn, alt], i) => [
      i > 0 ? el("option", { disabled: true, value: "", "aria-hidden": "true" }, "") : null,
      el("option", { disabled: true, value: "", class: "grupprubrik" }, `– ${namn} –`),
      alt.map(([v, t, extra]) => el("option", { value: v, selected: v === varde, disabled: extra?.disabled }, t))]));
}

// Färgar ett talfält grönt eller rött när värdet ligger över eller under utgångsvärdet
// (grundvärde 10 för grundegenskaper, baschansen för färdigheter)
export function markera(falt, varde, bas) {
  if (varde > bas) falt.classList.add("upp");
  else if (varde < bas) falt.classList.add("ner");
  return falt;
}

// Liten info-cirkel som förklarar en förkortning
export function info(kort) {
  const text = FORKLARINGAR[kort];
  if (!text) return null;
  return el("button", { type: "button", class: "info", "data-tip": text, "aria-label": `Vad betyder ${kort}?` }, "i");
}
const medInfo = (text, kort = text) => [text, info(kort)];

// Info-cirkel med en kort beskrivning av en färdighet (s. 48–72)
export function fardighetsInfo(nyckel) {
  const f = fardighetAv(S.R, nyckel ?? "");
  if (!f?.beskrivning) return null;
  return el("button", { type: "button", class: "info", "data-tip": `${f.beskrivning} (s. ${f.sida})`, "aria-label": `Om ${f.namn}` }, "i");
}
// Beskrivning som skrivs ut under en yrkesfärdighet i steg 4
export function kortBeskrivning(id, namn = null) {
  const f = fardighetAv(S.R, id ?? "");
  if (!f?.beskrivning) return null;
  return el("p", { class: "fbeskr" }, namn ? el("strong", {}, `${f.namn}: `) : null, `${f.beskrivning} (s. ${f.sida})`);
}

export function hjalpFor(fardighetId) {
  const text = DELVAL_HJALP[fardighetId] ?? SPRAK_HJALP[fardighetId];
  return text ? el("p", { class: "hjalp delvalhjalp" }, text) : null;
}

// Delval för färdigheter som lärs separat per vapen, språk, hantverk, stad …
// Delval som rollpersonen redan har som yrkes-, ras- eller sekundär färdighet (utom det som är valt i just den här listan)
function redanValda(fardighetId, varde) {
  const valda = new Set([...yrkesNycklar(), ...S.rp.extraYrkesfardigheter, ...S.rp.sekundara, ...(S.rp.rasval ?? [])]
    .filter((k) => k?.startsWith(`${fardighetId}:`)).map((k) => k.split(":")[1]));
  valda.delete(varde);
  return valda;
}
// Gör redan valda alternativ ovalbara, som "Snickare (redan vald)"
const markeraValda = (alt, valda) => alt.map(([v, t]) => (valda.has(v) ? [v, `${t} (redan vald)`, { disabled: true }] : [v, t]));

export function delvalKontroll(id, fardighetId, varde, onchange, { yrke = false } = {}) {
  if (fardighetId === "vapen") {
    const valda = redanValda("vapen", varde);
    return gruppLista(id, varde, vapenGrupper().map(([g, alt]) => [g, markeraValda(alt, valda)]), onchange, "Välj vapen …");
  }
  if (fardighetId === "tva-vapen") {
    // Två närstridsvapen som kan hållas med en hand var (s. 71)
    const [a, b] = (varde ?? "").split("+");
    const vapen = vapenGrupper(true);
    return el("div", { class: "rad" },
      gruppLista(`${id}-a`, a, vapen, (v) => onchange(v && b ? `${v}+${b}` : v ? `${v}+` : ""), "Första vapnet …"),
      gruppLista(`${id}-b`, b, vapen, (v) => onchange(a && v ? `${a}+${v}` : ""), "Andra vapnet …"));
  }
  if (fardighetId === "kulturkannedom") return valLista(id, varde, markeraValda(kulturer(S.R, S.rp).map((k) => [k, k]), redanValda(fardighetId, varde)), onchange, "Välj kultur …");
  if (fardighetId === "tala" || fardighetId === "lasa-skriva") return sprakLista(id, fardighetId, varde, onchange, yrke);
  if (fardighetId === "hantverk") {
    const lista = valLista(id, varde, markeraValda(S.R.fardigheter.hantverk.map(([n, g]) => [n, `${n} (${g})`]), redanValda(fardighetId, varde)), onchange, "Välj hantverk …");
    const text = S.R.fardigheter.hantverkBeskrivning?.[varde];
    return text ? el("div", { class: "delval-med-text" }, lista, el("p", { class: "fbeskr" }, text)) : lista;
  }
  if (fardighetId === "kanna-magi") return valLista(id, varde, markeraValda(magiskolor(S.R, S.rp).map((f) => [f.id, f.namn]), redanValda(fardighetId, varde)), onchange, "Välj skola …");
  const f = fardighetAv(S.R, fardighetId);
  // Vapentekniker: svärdsskolornas stridskonster föreslås (V&R s. 32–33); ett eget namn ger en egen stil
  if (fardighetId === "vapentekniker") {
    const skolor = (S.R.fardigheter.svardsskolor ?? []).filter((x) => iBocker(x, S.rp));
    return el("span", { class: "delval-stil" },
      el("input", { id, type: "text", value: varde ?? "", list: `${id}-skolor`, maxlength: 125, placeholder: "t.ex. Kejsarens hand eller ett eget namn",
        onchange: (e) => onchange(e.target.value.trim()) }),
      el("datalist", { id: `${id}-skolor` }, skolor.map((x) => el("option", { value: x.namn }, `${x.skola} (${x.kostnad} EP per FV)`))));
  }
  // Heraldik med V&R: allmän eller för en grupp (V&R s. 15)
  if (f?.perVal === "heraldik") {
    return el("span", { class: "delval-stil" },
      el("input", { id, type: "text", value: varde ?? "", list: `${id}-grupper`, maxlength: 125, placeholder: `${f.allman.namn} eller en grupp, t.ex. Högländare`,
        onchange: (e) => onchange(e.target.value.trim()) }),
      el("datalist", { id: `${id}-grupper` }, [f.allman.namn, ...f.grupper].map((g) => el("option", { value: g }))));
  }
  const lista = fardighetId === "lardom" ? "lardomar" : null;
  return el("input", {
    id, type: "text", value: varde ?? "", list: lista, maxlength: 125,
    placeholder: { stad: "t.ex. Chronopia", kontinent: "t.ex. Chronopias kontinent", kultur: "t.ex. Dvärgar", djur: "t.ex. Hästar", instrument: "t.ex. Luta", stil: "t.ex. Högländarkross", kombination: "t.ex. Kortsvärd+Dolk", amne: "t.ex. Kunskap om religion" }[f.perVal] ?? "",
    onchange: (e) => onchange(e.target.value.trim()),
  });
}

// Språk som går att välja. Språk utan skrift och språk som inte får vara yrkesfärdighet visas inte;
// modersmål och språk som redan är valda visas gråa (s. 64, 70).
function sprakLista(id, fardighetId, varde, onchange, yrke) {
  const m = modersmal();
  const egna = fardighetId === "tala" ? m.tala : m.lasaSkriva;
  const valda = new Set([...yrkesNycklar(), ...S.rp.extraYrkesfardigheter, ...S.rp.sekundara]
    .filter((k) => k.startsWith(`${fardighetId}:`)).map((k) => k.split(":")[1]));
  valda.delete(varde);
  const alt = S.R.fardigheter.sprak
    .filter((s) => fardighetId === "tala" || (s.skriftsprak !== false && !s.endastTala))
    .filter((s) => !yrke || (!s.aldrigYrke && (!s.endastPrimarFor || s.endastPrimarFor === S.rp.ras)))
    .map((s) => (egna.includes(s.id) ? [s.id, `${s.namn} (modersmål)`, { disabled: true }]
      : valda.has(s.id) ? [s.id, `${s.namn} (redan vald)`, { disabled: true }] : [s.id, s.namn]));
  return valLista(id, varde, alt, onchange, "Välj språk …");
}

export function fardighetsVal(idPrefix, nyckel, onchange, filter = () => true, val = {}) {
  const [id, sub] = (nyckel ?? "").split(":");
  const lista = S.R.fardigheter.lista.filter((x) => iBocker(x, S.rp) && filter(x)).sort((a, b) => a.namn.localeCompare(b.namn, "sv"));
  const f = id ? fardighetAv(S.R, id) : null;
  return el("div", { class: "rad" },
    valLista(`${idPrefix}-f`, id, lista.map((x) => [x.id, x.namn]), (v) => onchange(v ? (fardighetAv(S.R, v).perVal ? `${v}:` : v) : "")),
    f?.perVal ? delvalKontroll(`${idPrefix}-d`, id, sub, (v) => onchange(`${id}:${v}`), val) : null,
    f?.perVal ? hjalpFor(id) : null);
}
