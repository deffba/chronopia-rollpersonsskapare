// Gränssnittet för Chronopia-rollpersonsskaparen. All regellogik finns i regelmotor.js.
import {
  GRUNDEGENSKAPER, raknaRollperson, rasAv, yrkeAv, fardighetAv, alderskategori, slaUpp, sarskildFormaga as sfFor,
} from "./regelmotor.js";

const FILER = ["raser", "alder", "grundegenskaper", "fardigheter", "yrken", "slag", "vapen", "sarskilda-formagor", "husregler"];
const LAGRING = "chronopia-rollperson-v2";

const STEG = [
  { id: "ras", namn: "Ras", sida: "14–16", bp: true },
  { id: "alder", namn: "Ålder", sida: "16–17" },
  { id: "yrke", namn: "Yrke", sida: "18–26" },
  { id: "extra", namn: "Fler yrkesfärdigheter", sida: "27", bp: true },
  { id: "kon", namn: "Kön och namn", sida: "27" },
  { id: "egenskaper", namn: "Grundegenskaper", sida: "27–29", bp: true },
  { id: "formagor", namn: "Särskilda förmågor", sida: "30–32", bp: true },
  { id: "svardshand", namn: "Svärdshand", sida: "32", bp: true },
  { id: "stand", namn: "Socialt stånd", sida: "33", bp: true },
  { id: "kapital", namn: "Startkapital", sida: "33", bp: true },
  { id: "fardigheter", namn: "Färdigheter", sida: "34–38" },
];

const LARDOMSFORSLAG = ["Kunskap om magi", "Kunskap om religion", "Kunskap om demoner", "Kunskap om odöda", "Kunskap om språk"];
const SKOLOR = [["animism", "Animism"], ["elementarmagi", "Elementarmagi"], ["mentalism", "Mentalism"]];

const TOM = () => ({
  namn: "", spelare: "", kon: "", ras: "manniska", alder: 21, yrke: "krigare", yrkesval: {}, valfri: "",
  extraYrkesfardigheter: [], rasval: [], grundvarden: { STY: 10, FYS: 10, SMI: 10, INT: 10, PSY: 10, KAR: 10 },
  stoSteg: 0, sarskildaFormagor: { bp: 0, slag: null, val: [] }, svardshand: { bp: 0, slag: null },
  socialtStand: { bp: 0, slag: null }, startkapital: { bp: 0, slag: null }, sekundara: [], fardigheter: {},
  magiformaga: { slag: null }, anteckningar: "",
});

let R; // regeldata
let rp; // rollpersonen (spelarens val)
let aktivtSteg = "ras";
let giltig; // senaste rollperson som följer alla regler
let nySekundar = ""; // påbörjat val av ny sekundär färdighet
let provar = false; // sant medan tal() letar efter närmaste tillåtna värde

const $ = (sel, rot = document) => rot.querySelector(sel);
const el = (tagg, attr = {}, ...barn) => {
  const e = document.createElement(tagg);
  for (const [k, v] of Object.entries(attr)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const b of barn.flat(Infinity)) if (b !== null && b !== undefined && b !== false) e.append(b.nodeType ? b : String(b));
  return e;
};
const slaT = (antal, sidor) => Array.from({ length: antal }, () => 1 + Math.floor(Math.random() * sidor)).reduce((a, b) => a + b, 0);
const sm = (n) => n.toLocaleString("sv-SE") + " sm";

function spara() {
  try { localStorage.setItem(LAGRING, JSON.stringify({ rp, aktivtSteg })); } catch { /* lagring är frivillig */ }
}

const rakna = () => raknaRollperson(R, motorIndata());

// Varje ändring kontrolleras mot reglerna. Bryter den mot någon regel återställs rollpersonen
// till senaste giltiga läge, så att det aldrig går att skapa en otillåten rollperson.
function uppdatera() {
  if (provar) return;
  const fel = rakna().fel;
  if (fel.length) {
    rp = structuredClone(giltig);
    visaNotis(`Det går inte: ${fel[0]}.`);
  } else {
    giltig = structuredClone(rp);
    spara();
  }
  rita();
}

// ------------------------------------------------------------ från val till motorns indata
function delval(f) {
  return f.perVal || null;
}

function yrkesNycklar() {
  const yrke = yrkeAv(R, rp.yrke);
  const nycklar = [];
  yrke.fardigheter.forEach((post, i) => {
    const val = rp.yrkesval[i];
    if (typeof post === "string") {
      const f = fardighetAv(R, post);
      if (!delval(f)) nycklar.push(post);
      else if (val) nycklar.push(`${post}:${val}`);
    } else if (post.valEn) {
      if (!val?.id) return;
      const f = fardighetAv(R, val.id);
      if (!delval(f)) nycklar.push(val.id);
      else if (val.sub) nycklar.push(`${val.id}:${val.sub}`);
    } else {
      for (const v of [].concat(val ?? [])) if (v) nycklar.push(`${post.fardighet}:${v}`);
    }
  });
  if (rp.valfri && yrke.valfri) nycklar.push(rp.valfri);
  return nycklar;
}

function modersmal() {
  const ras = rasAv(R, rp.ras);
  return {
    tala: ras.talaModersmal.map((x) => x.sprak),
    lasaSkriva: ras.lasaSkrivaModersmal.map((x) => (typeof x === "string" ? x : x.sprak)),
  };
}

function allaNycklar(yrkesfardigheter) {
  const ras = rasAv(R, rp.ras);
  const yrke = yrkeAv(R, rp.yrke);
  const m = modersmal();
  const mangd = new Set();
  for (const f of R.fardigheter.lista) if (f.typ === "primar" && !ras.sekundara.includes(f.id)) mangd.add(f.id);
  for (const p of ras.primara) if (typeof p === "string") mangd.add(p);
  if (ras.id === "ljusalv") mangd.add("vapen:Långbåge");
  for (const k of rp.rasval) mangd.add(k);
  for (const s of m.tala) mangd.add(`tala:${s}`);
  for (const s of m.lasaSkriva) mangd.add(`lasa-skriva:${s}`);
  for (const k of yrkesfardigheter) mangd.add(k);
  for (const k of rp.extraYrkesfardigheter) mangd.add(k);
  for (const k of rp.sekundara) mangd.add(k);
  const sf = sfFor(R, { ...rp, yrkesfardigheter, extraYrkesfardigheter: rp.extraYrkesfardigheter }).tillagg.sarskildaFormagor;
  for (const b of [...(sf?.fvBonus ?? []), ...(sf?.fvMinst ?? [])]) mangd.add(b.fardighet);
  if (yrke.magiker) {
    mangd.add("lardom:Kunskap om magi");
    for (const k of [...mangd]) if (fardighetAv(R, k)?.typ === "magiskola") mangd.add(`kanna-magi:${k}`);
  }
  return [...mangd].filter((k) => k && !k.endsWith(":") && fardighetAv(R, k));
}

function motorIndata() {
  const yrkesfardigheter = yrkesNycklar();
  const fardigheter = {};
  for (const k of allaNycklar(yrkesfardigheter)) fardigheter[k] = rp.fardigheter[k] ?? 0;
  return {
    ...rp, yrkesfardigheter, fardigheter, modersmal: modersmal(),
    svardshand: { ...rp.svardshand, slag: rp.svardshand.slag ?? 0 },
    socialtStand: { ...rp.socialtStand, slag: rp.socialtStand.slag ?? 0 },
    startkapital: { ...rp.startkapital, slag: rp.startkapital.slag ?? 0 },
  };
}

const sarskildFormaga = () => sfFor(R, { ...rp, yrkesfardigheter: yrkesNycklar() }).formaga;

// ------------------------------------------------------------ små kontroller
// Talfält: ett otillåtet värde ersätts med det närmaste tillåtna mellan det nya och det gamla.
function tal(id, varde, onchange, { min, max, steg = 1, bred } = {}) {
  return el("input", {
    type: "number", id, value: varde ?? "", min, max, step: steg, class: bred ? "tal bred" : "tal",
    onchange: (e) => {
      let nytt = e.target.value === "" ? null : Math.round(Number(e.target.value));
      if (nytt !== null && min !== undefined) nytt = Math.max(min, nytt);
      if (nytt !== null && max !== undefined) nytt = Math.min(max, nytt);
      if (nytt === null || varde === null || varde === undefined || nytt === varde) { onchange(nytt); return; }
      const riktning = nytt > varde ? -1 : 1;
      let forstaFel = null;
      provar = true;
      for (let v = nytt; v !== varde; v += riktning) {
        rp = structuredClone(giltig);
        onchange(v);
        const fel = rakna().fel;
        if (!fel.length) {
          if (v !== nytt) visaNotis(`${v} är närmast tillåtna värde: ${forstaFel}.`);
          provar = false;
          uppdatera();
          return;
        }
        forstaFel ??= fel[0];
      }
      provar = false;
      rp = structuredClone(giltig);
      visaNotis(`Det går inte: ${forstaFel}.`);
      rita();
    },
  });
}

function falt(etikett, kontroll, hjalp) {
  return el("label", { class: "falt" }, el("span", { class: "etikett" }, etikett), kontroll, hjalp ? el("span", { class: "hjalp" }, hjalp) : null);
}

function valLista(id, varde, alternativ, onchange, tomText = "Välj …") {
  return el("select", { id, onchange: (e) => onchange(e.target.value) },
    el("option", { value: "" }, tomText),
    alternativ.map(([v, t]) => el("option", { value: v, selected: v === varde }, t)));
}

function allaVapen() {
  const v = R.vapen;
  return [...v.narstrid.filter((x) => x.grupp !== "slagsmal"), ...v.projektil, ...v.kast, ...v.skoldar].map((x) => x.namn);
}

// Delval för färdigheter som lärs separat per vapen, språk, hantverk, stad …
function delvalKontroll(id, fardighetId, varde, onchange) {
  if (fardighetId === "vapen") return valLista(id, varde, allaVapen().map((n) => [n, n]), onchange, "Välj vapen …");
  if (fardighetId === "tala" || fardighetId === "lasa-skriva") {
    return valLista(id, varde, R.fardigheter.sprak.filter((s) => fardighetId === "tala" || s.skriftsprak !== false)
      .map((s) => [s.id, s.namn]), onchange, "Välj språk …");
  }
  if (fardighetId === "hantverk") return valLista(id, varde, R.fardigheter.hantverk.map(([n, g]) => [n, `${n} (${g})`]), onchange, "Välj hantverk …");
  if (fardighetId === "kanna-magi") return valLista(id, varde, SKOLOR, onchange, "Välj skola …");
  const f = fardighetAv(R, fardighetId);
  const lista = fardighetId === "lardom" ? "lardomar" : null;
  return el("input", {
    id, type: "text", value: varde ?? "", list: lista,
    placeholder: { stad: "t.ex. Chronopia", kontinent: "t.ex. Chronopias kontinent", kultur: "t.ex. Dvärgar", djur: "t.ex. Hästar", instrument: "t.ex. Luta", stil: "t.ex. Högländarkross", kombination: "t.ex. Kortsvärd+Dolk", amne: "t.ex. Kunskap om religion" }[f.perVal] ?? "",
    onchange: (e) => onchange(e.target.value.trim()),
  });
}

function fardighetsVal(idPrefix, nyckel, onchange, filter = () => true) {
  const [id, sub] = (nyckel ?? "").split(":");
  const lista = R.fardigheter.lista.filter(filter).sort((a, b) => a.namn.localeCompare(b.namn, "sv"));
  const f = id ? fardighetAv(R, id) : null;
  return el("div", { class: "rad" },
    valLista(`${idPrefix}-f`, id, lista.map((x) => [x.id, x.namn]), (v) => onchange(v ? (fardighetAv(R, v).perVal ? `${v}:` : v) : "")),
    f?.perVal ? delvalKontroll(`${idPrefix}-d`, id, sub, (v) => onchange(`${id}:${v}`)) : null);
}

// ------------------------------------------------------------ stegen
function stegRas() {
  const valt = rasAv(R, rp.ras);
  const kort = R.raser.map((r) => el("button", {
    type: "button", class: "raskort" + (r.id === rp.ras ? " valt" : ""), "aria-pressed": r.id === rp.ras ? "true" : "false",
    onclick: () => { rp.ras = r.id; rp.rasval = []; rp.stoSteg = 0; uppdatera(); },
  },
  el("span", { class: "raskort-namn" }, r.namn),
  el("span", { class: "raskort-bp" }, `${r.bp} BP`),
  el("span", { class: "raskort-mod" }, GRUNDEGENSKAPER.filter((g) => r.mod[g]).map((g) => `${g} ${r.mod[g] > 0 ? "+" : "−"}${Math.abs(r.mod[g])}`).join(" · ") || "Inga modifikationer"),
  el("span", { class: "raskort-mod" }, `STO ${r.sto.min}–${r.sto.max} (normalt ${r.sto.normal})`)));

  const extra = [];
  if (valt.primara.some((p) => p.valfri === "vapen")) {
    extra.push(falt("Valfri vapenfärdighet som primär (s. 71)",
      delvalKontroll("rasval-vapen", "vapen", rp.rasval[0]?.split(":")[1], (v) => { rp.rasval = v ? [`vapen:${v}`] : []; uppdatera(); })));
  }
  if (valt.primara.some((p) => p.valfri === "hantverk")) {
    extra.push(falt("Valfritt hantverk som primär (s. 59)",
      delvalKontroll("rasval-hantverk", "hantverk", rp.rasval[0]?.split(":")[1], (v) => { rp.rasval = v ? [`hantverk:${v}`] : []; uppdatera(); })));
  }
  const sprak = (lista) => lista.map((x) => R.fardigheter.sprak.find((s) => s.id === (x.sprak ?? x))?.namn ?? x).join(", ") || "inget skriftspråk";
  return [
    el("div", { class: "raskort-rutnat" }, kort),
    el("div", { class: "rutor" },
      el("div", {}, el("h3", {}, "Särskilt för ", valt.namn),
        el("ul", { class: "punkter" },
          valt.formagor.map((t) => el("li", {}, t)),
          valt.primara.length ? el("li", {}, "Extra primära färdigheter: ", valt.primara.map((p) => (typeof p === "string" ? fardighetAv(R, p).namn : `valfri ${p.valfri === "vapen" ? "vapenfärdighet" : "hantverk"}`)).join(", ")) : null,
          valt.sekundara.length ? el("li", {}, "Sekundära för rasen: ", valt.sekundara.map((p) => fardighetAv(R, p).namn).join(", ")) : null,
          valt.startbonus.map((b) => el("li", {}, `+${b.bc} på BC i ${fardighetAv(R, b.fardighet).namn}`)),
          Object.entries(valt.slagbonus).map(([k, v]) => el("li", {}, `+${v} på slaget för ${k === "socialtStand" ? "socialt stånd" : "startkapital"}`)),
          el("li", {}, "Talar: ", sprak(valt.talaModersmal)),
          el("li", {}, "Läser och skriver: ", sprak(valt.lasaSkrivaModersmal)))),
      extra.length ? el("div", {}, extra) : null),
  ];
}

function stegAlder() {
  const ras = rasAv(R, rp.ras);
  const kat = alderskategori(R, ras, rp.alder);
  const eff = R.alder.effekter[kat];
  const efter = R.alder.efterAr.find((r) => r.max === null || rp.alder <= r.max);
  const katNamn = Object.fromEntries(R.alder.kategorier.map((k) => [k.id, k.namn]));
  return [
    el("div", { class: "rad" },
      falt("Ålder i år", tal("alder", rp.alder, (v) => { rp.alder = v ?? ras.alder.vuxen[0]; uppdatera(); }, { min: 1, bred: true })),
      el("button", { type: "button", class: "knapp", onclick: () => { rp.alder = ras.alder.vuxen[0]; uppdatera(); } }, `Enkel metod: ${ras.alder.vuxen[0]} år`)),
    el("div", { class: "tabellram" }, el("table", { class: "tabell" },
      el("thead", {}, el("tr", {}, el("th", {}, "Kategori"), el("th", {}, `${ras.namn}, år`), GRUNDEGENSKAPER.map((g) => el("th", { class: "num" }, g)))),
      el("tbody", {}, R.alder.kategorier.map((k) => el("tr", { class: k.id === kat ? "markerad" : "" },
        el("td", {}, k.namn), el("td", { class: "num" }, ras.alder[k.id][1] === null ? `${ras.alder[k.id][0]}+` : ras.alder[k.id].join("–")),
        GRUNDEGENSKAPER.map((g) => el("td", { class: "num" }, fmtMod(R.alder.effekter[k.id][g])))))))),
    el("p", { class: "summering" }, `${rp.alder} år räknas som ${katNamn[kat].toLowerCase()}. Det ger +${efter.bp} BP, startkapital ×${String(efter.kapital).replace(".", ",")} och ${efter.ep} EP till färdigheter.`),
  ];
}

const fmtMod = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");

function stegYrke() {
  const yrke = yrkeAv(R, rp.yrke);
  const rader = yrke.fardigheter.map((post, i) => {
    const id = `yrke-${i}`;
    const satt = (v) => { rp.yrkesval[i] = v; uppdatera(); };
    if (typeof post === "string") {
      const f = fardighetAv(R, post) ?? { namn: post };
      return el("li", {}, el("span", { class: "fnamn" }, f.namn),
        f.perVal ? delvalKontroll(id, post, rp.yrkesval[i], satt) : null);
    }
    if (post.valEn) {
      const val = rp.yrkesval[i] ?? {};
      const alt = post.valEn.map((x) => (typeof x === "string" ? x : x.fardighet));
      const f = val.id ? fardighetAv(R, val.id) : null;
      return el("li", {}, el("span", { class: "fnamn" }, alt.map((a) => fardighetAv(R, a).namn).join(" eller ")),
        el("div", { class: "rad" },
          valLista(id, val.id, alt.map((a) => [a, fardighetAv(R, a).namn]), (v) => satt({ id: v })),
          f?.perVal ? delvalKontroll(`${id}-d`, val.id, val.sub, (v) => satt({ ...val, sub: v })) : null));
    }
    const f = fardighetAv(R, post.fardighet);
    const antal = post.antal ?? 3;
    const varden = [].concat(rp.yrkesval[i] ?? []);
    return el("li", {}, el("span", { class: "fnamn" }, `${f.namn} (${post.antal ?? "obegränsat"})`),
      post.maste ? el("span", { class: "hjalp" }, `Ett val måste vara ${post.maste.join(", ")}.`) : null,
      el("div", { class: "rad" }, Array.from({ length: antal }, (_, j) => delvalKontroll(`${id}-${j}`, post.fardighet, varden[j], (v) => {
        const ny = [...varden]; ny[j] = v; satt(ny);
      }))));
  });
  return [
    falt("Yrke", valLista("yrke", rp.yrke, R.yrken.lista.map((y) => [y.id, y.namn]), (v) => {
      if (!v) return; rp.yrke = v; rp.yrkesval = {}; rp.valfri = ""; uppdatera();
    })),
    el("p", { class: "yrkesformaga" }, el("strong", {}, "Yrkesförmåga: "), yrke.yrkesformaga, el("span", { class: "sida" }, ` s. ${yrke.sida}`)),
    yrke.extraBP ? el("p", { class: "notis" }, `Paladinen får ${yrke.extraBP.antal} extra BP. Enligt boken bestämmer ${yrke.extraBP.styrsAv} hur de används.`) : null,
    el("h3", {}, "Yrkesfärdigheter"),
    el("ul", { class: "yrkeslista" }, rader,
      yrke.valfri ? el("li", {}, el("span", { class: "fnamn" }, "En valfri färdighet"),
        fardighetsVal("valfri", rp.valfri, (v) => { rp.valfri = v; uppdatera(); })) : null),
    yrke.automatiska.length ? el("p", { class: "hjalp" }, "Får automatiskt Känna magi och Kunskap om magi med samma FV som i sin magiskola (s. 62, 64).") : null,
  ];
}

function stegExtra(res) {
  const lista = rp.extraYrkesfardigheter;
  const k = R.yrken.extraYrkesfardigheter;
  return [
    el("p", {}, `Den första extra yrkesfärdigheten kostar ${k.forsta} BP, den andra ${k.andra} BP och varje därefter ${k.darefter} BP. En magiskola kostar ${k.magiskola} BP och kräver ett lyckat magiförmågeslag (1T100 högst (INT+PSY)/2, s. 106).`),
    el("ul", { class: "yrkeslista" }, lista.map((nyckel, i) => el("li", {},
      fardighetsVal(`extra-${i}`, nyckel, (v) => { lista[i] = v; uppdatera(); }),
      el("button", { type: "button", class: "knapp liten", onclick: () => { lista.splice(i, 1); uppdatera(); } }, "Ta bort")))),
    el("button", { type: "button", class: "knapp", onclick: () => { lista.push(""); uppdatera(); } }, "Lägg till yrkesfärdighet"),
    yrkeAv(R, rp.yrke).magiker ? null : magiformagaKontroll(res),
  ];
}

function stegKon() {
  return [
    el("div", { class: "rad" },
      falt("Namn", el("input", { id: "namn", type: "text", value: rp.namn, onchange: (e) => { rp.namn = e.target.value; uppdatera(); } })),
      falt("Spelare", el("input", { id: "spelare", type: "text", value: rp.spelare, onchange: (e) => { rp.spelare = e.target.value; uppdatera(); } })),
      falt("Kön", valLista("kon", rp.kon, [["Man", "Man"], ["Kvinna", "Kvinna"]], (v) => { rp.kon = v; uppdatera(); }), "Påverkar inte spelvärdena (s. 27).")),
    falt("Utseende och bakgrund", el("textarea", { id: "anteckningar", rows: 5, onchange: (e) => { rp.anteckningar = e.target.value; uppdatera(); } }, rp.anteckningar)),
  ];
}

function stegEgenskaper(res) {
  const ras = rasAv(R, rp.ras);
  const aldersmod = R.alder.effekter[res.alderskategori];
  const kostnad = R.grundegenskaper.kostnad;
  const rader = GRUNDEGENSKAPER.map((g) => el("tr", {},
    el("th", { scope: "row" }, g),
    el("td", {}, tal(`ge-${g}`, rp.grundvarden[g], (v) => { rp.grundvarden[g] = Math.min(18, Math.max(3, v ?? 3)); uppdatera(); }, { min: 3, max: 18 })),
    el("td", { class: "num" }, kostnad[String(rp.grundvarden[g])] ?? "–"),
    el("td", { class: "num" }, fmtMod(ras.mod[g])),
    el("td", { class: "num" }, fmtMod(aldersmod[g])),
    el("td", { class: "num stor" + (res.grundegenskaper[g] < 3 ? " fel" : "") }, res.grundegenskaper[g])));
  const s = R.grundegenskaper.sto;
  const steg = rp.stoSteg;
  const stoBP = steg > 0 ? s.hojning[steg - 1] : steg < 0 ? -s.sankning[-steg - 1] : 0;
  return [
    el("p", {}, "Köp ett grundvärde (3–18) för varje grundegenskap. Ras och ålder läggs på efteråt. Alla slutvärden måste bli minst 3."),
    el("div", { class: "tabellram" }, el("table", { class: "tabell" },
      el("thead", {}, el("tr", {}, ["", "Grundvärde", "BP", "Ras", "Ålder", "Slutvärde"].map((t, i) => el("th", { class: i > 1 ? "num" : "" }, t)))),
      el("tbody", {}, rader,
        el("tr", {}, el("th", { scope: "row" }, "STO"),
          el("td", {}, el("div", { class: "stegare" },
            el("button", { type: "button", class: "knapp liten", "aria-label": "Sänk STO", disabled: steg <= -5 || ras.sto.normal + steg <= ras.sto.min, onclick: () => { rp.stoSteg -= 1; uppdatera(); } }, "−"),
            el("span", {}, steg === 0 ? "normal" : fmtMod(steg)),
            el("button", { type: "button", class: "knapp liten", "aria-label": "Höj STO", disabled: steg >= 5 || ras.sto.normal + steg >= ras.sto.max, onclick: () => { rp.stoSteg += 1; uppdatera(); } }, "+"))),
          el("td", { class: "num" }, stoBP > 0 ? stoBP : stoBP < 0 ? `${stoBP}` : "0"),
          el("td", { class: "num" }, `${ras.sto.min}–${ras.sto.max}`), el("td", {}),
          el("td", { class: "num stor" }, res.grundegenskaper.STO))))),
    el("details", { class: "fakta" }, el("summary", {}, "Grundegenskapstabellen (s. 27)"),
      el("p", { class: "mono" }, Object.entries(kostnad).map(([v, k]) => `${v}: ${k}`).join(" · "))),
  ];
}

function slagSteg(id, nyckel, titel, tarning, tolkning, hjalp, efter = () => {}) {
  const s = rp[nyckel];
  const [n, sidor] = tarning === "2T20" ? [2, 20] : [2, 6];
  const satt = (falt, v) => { rp[nyckel][falt] = v; efter(); uppdatera(); };
  // När slaget är gjort ligger det fast: BP och slag går inte att ändra i efterhand
  if (s.slag !== null && s.slag !== undefined) {
    return [
      el("p", {}, hjalp),
      el("p", { class: "hjalp" }, `Lagda BP: ${s.bp}. Slag: ${s.slag}. Slaget är gjort och kan inte göras om.`),
      el("p", { class: "summering" }, tolkning),
    ];
  }
  return [
    el("p", {}, hjalp),
    el("div", { class: "rad" },
      falt("BP att lägga", tal(`${id}-bp`, s.bp, (v) => satt("bp", Math.max(0, v ?? 0)), { min: 0 })),
      falt(`Slag (${tarning})`, tal(`${id}-slag`, s.slag, (v) => satt("slag", v), { min: n, max: n * sidor })),
      el("button", { type: "button", class: "knapp", onclick: () => satt("slag", slaT(n, sidor)) }, `Slå ${tarning}`)),
    el("p", { class: "summering" }, tolkning),
  ];
}

// Väljare för en färdighet som en särskild förmåga gäller ("bland" enligt sarskilda-formagor.json).
function valjFardighet(id, bland, varde, onchange) {
  if (bland === "sprak") {
    return delvalKontroll(id, "tala", varde?.split(":")[1], (v) => onchange(v ? `tala:${v}` : ""));
  }
  if (Array.isArray(bland)) {
    return valLista(id, varde, bland.map((f) => [f, fardighetAv(R, f).namn]), onchange);
  }
  const fast = fardighetAv(R, bland);
  if (fast) {
    if (!fast.perVal) return el("span", {}, fast.namn);
    return delvalKontroll(id, bland, varde?.split(":")[1], (v) => onchange(v ? `${bland}:${v}` : ""));
  }
  const magi = (f) => f.typ === "magiskola" || ["kanna-magi", "magisk-kanalisering", "magistudier"].includes(f.id);
  return fardighetsVal(id, varde, onchange, (f) => !magi(f) && f.typ !== "sprak");
}

function stegFormagor() {
  const sf = sarskildFormaga();
  const s = rp.sarskildaFormagor;
  const tolkning = !s.bp ? "Lägg minst 1 BP för att få slå (högst 40)." :
    s.slag === null || s.slag === undefined ? "Slå eller skriv in slaget." :
    `${s.slag} + ${s.bp} = ${s.slag + s.bp}: ${sf?.namn}. ${sf?.effekt} (s. ${sf?.sida})`;
  // Byts förmågan ut gäller inte de gamla valen längre
  const nollstall = () => {
    const ny = sfFor(R, { ...rp, yrkesfardigheter: yrkesNycklar() }).formaga;
    if (ny?.namn !== rp.sarskildaFormagor.formaga) rp.sarskildaFormagor.val = [];
    rp.sarskildaFormagor.formaga = ny?.namn;
  };
  const val = (i) => rp.sarskildaFormagor.val?.[i];
  const sattVal = (i, v) => { rp.sarskildaFormagor.val ??= []; rp.sarskildaFormagor.val[i] = v; uppdatera(); };
  const delar = (sf?.regel ?? []).map((del, i) => {
    if (del.typ === "fv" && del.valj) {
      const valda = [].concat(val(i) ?? []);
      return el("li", {}, el("span", { class: "fnamn" }, del.valj > 1 ? `Välj ${del.valj} färdigheter` : "Välj färdighet"),
        el("div", { class: "rad" }, Array.from({ length: del.valj }, (_, j) => valjFardighet(`sf-${i}-${j}`, del.bland, valda[j], (v) => {
          const ny = [...valda]; ny[j] = v; sattVal(i, ny);
        }))));
    }
    if (del.typ === "egenskapVal") {
      const v = val(i) ?? {};
      const antal = v.lage === "en" ? 1 : v.lage === "tre" ? 3 : 0;
      const egenskaper = v.egenskaper ?? [];
      return el("li", {}, el("span", { class: "fnamn" }, "Höj grundegenskaper"),
        el("div", { class: "rad" },
          valLista(`sf-${i}-lage`, v.lage, [["tre", "+1 på tre olika"], ["en", "+2 på en"]], (lage) => sattVal(i, { lage, egenskaper: [] })),
          Array.from({ length: antal }, (_, j) => valLista(`sf-${i}-${j}`, egenskaper[j], GRUNDEGENSKAPER.map((g) => [g, g]), (g) => {
            const ny = [...egenskaper]; ny[j] = g; sattVal(i, { ...v, egenskaper: ny });
          }))));
    }
    return null;
  }).filter(Boolean);
  return [
    ...slagSteg("sf", "sarskildaFormagor", "Särskilda förmågor", "2T20", tolkning,
      "Lägg 1–40 BP och slå 2T20. Summan avgör förmågan. SL får justera resultatet.", nollstall),
    delar.length ? [el("h3", {}, "Val för förmågan"), el("ul", { class: "yrkeslista" }, delar)] : null,
    sf && !sf.regel ? el("p", { class: "hjalp" }, "Förmågan påverkar inga värden på rollformuläret. Skriv in den i anteckningarna om den behöver beskrivas mer.") : null,
    el("details", { class: "fakta" }, el("summary", {}, "Hela tabellen (s. 30–32)"),
      el("div", { class: "tabellram" }, el("table", { class: "tabell" }, el("tbody", {}, R["sarskilda-formagor"].map((x) => el("tr", { class: x === sf ? "markerad" : "" },
        el("td", { class: "num" }, x.slag[1] === null ? `${x.slag[0]}+` : x.slag[0] === x.slag[1] ? x.slag[0] : x.slag.join("–")),
        el("td", {}, el("strong", {}, x.namn), " ", x.effekt))))))),
  ];
}

// Magiförmågeslaget (s. 106) behövs för magiskolor utanför magikeryrkena.
function magiformagaKontroll(res) {
  const m = res.magiformaga;
  const satt = (v) => { rp.magiformaga = { slag: v }; uppdatera(); };
  return el("div", { class: "rutor" }, el("div", {},
    el("h3", {}, "Magiförmågeslag"),
    m.slag === null ? el("p", { class: "hjalp" }, "Gör slaget innan du väljer en magiskola.") : null,
    el("p", {}, `Slå 1T100. Slaget${m.mod ? ` ${m.mod > 0 ? "+" : "−"} ${Math.abs(m.mod)}` : ""} måste bli högst ${m.chans}, det vill säga (INT+PSY)/2 avrundat uppåt (s. 106). Det görs en gång.`),
    m.slag === null ? el("div", { class: "rad" },
      falt("Slag (1T100)", tal("magiformaga", m.slag, satt, { min: 1, max: 100 })),
      el("button", { type: "button", class: "knapp", onclick: () => satt(slaT(1, 100)) }, "Slå 1T100")) : el("p", { class: "hjalp" }, `Slag: ${m.slag}. Slaget är gjort och kan inte göras om.`),
    m.slag !== null ? el("p", { class: "summering" }, m.lyckat ? "Lyckat. Rollpersonen kan lära sig magi." : "Misslyckat. Rollpersonen kan inte lära sig magi.") : null));
}

function stegSvardshand(res) {
  const sf = sarskildFormaga();
  if (sf && ["Dubbelhänt", "Ambidextriös"].includes(sf.namn)) {
    return [el("p", { class: "summering" }, `Den särskilda förmågan ger ${sf.namn.toLowerCase()} rollperson, så du behöver inte slå (s. 32).`)];
  }
  return slagSteg("sh", "svardshand", "Svärdshand", "2T6",
    rp.svardshand.slag === null ? "Slå eller skriv in slaget." : `${rp.svardshand.slag} + ${rp.svardshand.bp} = ${rp.svardshand.slag + rp.svardshand.bp}: ${res.slag.svardshand}.`,
    "Slå 2T6 plus lagda BP: 2–11 höger, 12–14 vänster, 15–18 dubbelhänt, 19+ ambidextriös.");
}

function stegStand(res) {
  const ras = rasAv(R, rp.ras);
  const bonus = ras.slagbonus.socialtStand ?? 0;
  return slagSteg("ss", "socialtStand", "Socialt stånd", "2T6",
    rp.socialtStand.slag === null ? "Slå eller skriv in slaget." :
      `${rp.socialtStand.slag} + ${rp.socialtStand.bp}${bonus ? ` + ${bonus} (${ras.namn.toLowerCase()})` : ""} = ${res.slag.ssResultat}: ${res.slag.socialtStand}.`,
    "Slå 2T6 plus lagda BP. Socialt stånd påverkar läs- och skrivkunnighet i modersmålet och taket för startkapitalet.");
}

function stegKapital(res) {
  const halva = Math.ceil(rp.socialtStand.bp / 2);
  const alderEff = R.alder.efterAr.find((r) => r.max === null || rp.alder <= r.max);
  return slagSteg("sk", "startkapital", "Startkapital", "2T6",
    rp.startkapital.slag === null ? "Slå eller skriv in slaget." :
      `Resultat ${res.slag.skResultat} (taket är socialt stånd ${res.slag.ssResultat} + ${yrkeAv(R, rp.yrke).kapitaltak ?? 10}). Ålder ger ×${String(alderEff.kapital).replace(".", ",")}: ${sm(res.slag.startkapital)}.`,
    `Slå 2T6 plus lagda BP plus halva BP från socialt stånd (${halva}), plus eventuell ras- och yrkesbonus.`);
}

function stegFardigheter(res) {
  const grupper = [["primar", "Primära färdigheter", "2 EP per FV"], ["yrke", "Yrkesfärdigheter", "3 EP per FV"], ["sekundar", "Sekundära färdigheter", "5 EP per FV"]];
  const bniva = (fv) => slaUpp(R.fardigheter.bNivaer, fv);
  const tabell = (lista) => el("div", { class: "tabellram" }, el("table", { class: "tabell fardighetstabell" },
    el("thead", {}, el("tr", {}, el("th", {}, "Färdighet"), el("th", {}, "Grundeg."), el("th", { class: "num" }, "Start"), el("th", { class: "num" }, "FV"), el("th", { class: "num" }, "EP"))),
    el("tbody", {}, lista.map((f) => el("tr", {},
      el("td", {}, f.namn, rp.sekundara.includes(f.nyckel) && f.status === "sekundar" ? el("button", {
        type: "button", class: "lank", "aria-label": `Ta bort ${f.namn}`,
        onclick: () => { rp.sekundara = rp.sekundara.filter((k) => k !== f.nyckel); delete rp.fardigheter[f.nyckel]; uppdatera(); },
      }, "ta bort") : null),
      el("td", {}, f.grundegenskap),
      el("td", { class: "num" }, f.start),
      el("td", { class: "num" }, tal(`fv-${f.nyckel}`, f.fv, (v) => { rp.fardigheter[f.nyckel] = v ?? 0; uppdatera(); }, { min: 0, max: 30 }),
        f.kategoriB ? el("span", { class: "bniva" }, bniva(f.fv)) : null),
      el("td", { class: "num" }, f.ep || ""))))));
  return [
    el("p", {}, `Du har ${res.ep.start} EP: ${R.alder.efterAr.find((r) => r.max === null || rp.alder <= r.max).ep} för åldern och 5 per överblivet BP. Primära och yrkesfärdigheter har gratis baschans (BC). FV får inte vara högre än grundegenskapen vid start.`),
    grupper.map(([st, titel, pris]) => {
      const lista = res.fardigheter.filter((f) => f.status === st);
      return lista.length ? [el("h3", {}, titel, el("span", { class: "pris" }, pris)), tabell(lista)] : null;
    }),
    el("h3", {}, "Lär dig en ny sekundär färdighet"),
    el("div", { class: "rad" },
      fardighetsVal("ny-sek", nySekundar, (v) => { nySekundar = v; rita(); }, (f) => f.typ !== "primar"),
      el("button", { type: "button", class: "knapp", disabled: !nySekundar || nySekundar.endsWith(":"), onclick: () => {
        if (!rp.sekundara.includes(nySekundar)) rp.sekundara.push(nySekundar);
        nySekundar = "";
        uppdatera();
      } }, "Lägg till")),
    el("p", { class: "hjalp" }, "Välj färdighet, fyll i vad den gäller och tryck Lägg till."),
    yrkeAv(R, rp.yrke).magiker ? null : magiformagaKontroll(res),
  ];
}

// ------------------------------------------------------------ rollformuläret
function rollformular(res) {
  const g = res.grundegenskaper;
  const h = res.harledda;
  const bpProcent = Math.max(0, Math.min(100, (res.bp.kvar / res.bp.start) * 100));
  const epProcent = Math.max(0, Math.min(100, (res.ep.kvar / res.ep.start) * 100));
  return el("div", { class: "formular" },
    el("div", { class: "formular-huvud" },
      el("h2", {}, rp.namn || "Namnlös rollperson"),
      el("p", {}, [res.ras.namn, res.yrke.namn, `${rp.alder} år`, rp.kon].filter(Boolean).join(" · "))),
    el("div", { class: "potter" },
      el("div", { class: "pott" + (res.bp.kvar < 0 ? " over" : "") }, el("span", { class: "etikett" }, "BP kvar"),
        el("span", { class: "pott-tal" }, res.bp.kvar), el("span", { class: "matare" }, el("span", { style: `width:${bpProcent}%` })),
        el("span", { class: "hjalp" }, `av ${res.bp.start}`)),
      el("div", { class: "pott" + (res.ep.kvar < 0 ? " over" : "") }, el("span", { class: "etikett" }, "EP kvar"),
        el("span", { class: "pott-tal" }, res.ep.kvar), el("span", { class: "matare" }, el("span", { style: `width:${epProcent}%` })),
        el("span", { class: "hjalp" }, `av ${res.ep.start}`))),
    saknas(res).length ? el("div", { class: "saknaslista", role: "status" }, el("strong", {}, "Kvar att välja"), el("ul", {}, saknas(res).map((f) => el("li", {}, f))))
      : el("p", { class: "klar" }, "Rollpersonen är klar."),
    el("dl", { class: "egenskaper" }, [...GRUNDEGENSKAPER, "STO"].map((k) => el("div", {}, el("dt", {}, k), el("dd", {}, g[k])))),
    el("dl", { class: "nyckelvarden" },
      el("div", {}, el("dt", {}, "Kroppspoäng"), el("dd", {}, h.totalKP)),
      el("div", {}, el("dt", {}, "Skadebonus"), el("dd", {}, h.skadebonus)),
      el("div", {}, el("dt", {}, "Förflyttning"), el("dd", {}, h.forflyttning)),
      el("div", {}, el("dt", {}, "Svärdshand"), el("dd", {}, res.slag.svardshand)),
      el("div", {}, el("dt", {}, "Socialt stånd"), el("dd", {}, res.slag.socialtStand)),
      el("div", {}, el("dt", {}, "Startkapital"), el("dd", {}, sm(res.slag.startkapital))),
      el("div", {}, el("dt", {}, "Längd"), el("dd", {}, h.langd ?? "–")),
      el("div", {}, el("dt", {}, "Vikt"), el("dd", {}, h.vikt ?? "–"))),
    el("h3", {}, "Kroppsdelar"),
    el("ul", { class: "kroppsdelar" }, h.kroppsdelar.map((d) => el("li", {}, el("span", {}, d.namn), el("span", { class: "num" }, d.kp)))),
    res.sarskildFormaga ? [el("h3", {}, "Särskild förmåga"), el("p", {}, el("strong", {}, res.sarskildFormaga.namn), " ", res.sarskildFormaga.effekt)] : null,
    el("p", {}, el("strong", {}, "Yrkesförmåga: "), res.yrke.yrkesformaga),
    el("h3", {}, "Färdigheter"),
    el("ul", { class: "fardighetsrader" }, res.fardigheter.filter((f) => f.fv > 0).map((f) =>
      el("li", { class: f.status }, el("span", {}, f.namn), el("span", { class: "num" }, f.kategoriB ? `${f.fv} ${slaUpp(R.fardigheter.bNivaer, f.fv)}` : f.fv)))),
  );
}

// Val som ännu inte är gjorda. Rollpersonen följer reglerna även utan dem, men är inte färdig.
function saknas(res) {
  const lista = [];
  const yrke = yrkeAv(R, rp.yrke);
  const ras = rasAv(R, rp.ras);
  const klar = (v) => v && !String(v).endsWith(":");
  if (ras.primara.some((p) => p.valfri) && !rp.rasval.some(klar)) lista.push(`Rasens valfria ${ras.primara.find((p) => p.valfri).valfri === "vapen" ? "vapenfärdighet" : "hantverk"} (steg 1)`);
  yrke.fardigheter.forEach((post, i) => {
    const val = rp.yrkesval[i];
    if (typeof post === "string") {
      if (fardighetAv(R, post)?.perVal && !val) lista.push(`${fardighetAv(R, post).namn}: vad den gäller (steg 3)`);
    } else if (post.valEn) {
      if (!val?.id || (fardighetAv(R, val.id).perVal && !val.sub)) lista.push(`Yrkesfärdighet: ${post.valEn.map((x) => fardighetAv(R, x.fardighet ?? x).namn).join(" eller ")} (steg 3)`);
    } else {
      const antal = post.antal ?? 1;
      const gjorda = [].concat(val ?? []).filter(Boolean).length;
      if (gjorda < antal) lista.push(`${fardighetAv(R, post.fardighet).namn}: ${antal - gjorda} val kvar (steg 3)`);
    }
  });
  if (yrke.valfri && !klar(rp.valfri)) lista.push("Yrkets valfria färdighet (steg 3)");
  if (rp.extraYrkesfardigheter.some((k) => !klar(k))) lista.push("En extra yrkesfärdighet är inte färdigvald (steg 4)");
  if (!rp.namn.trim()) lista.push("Namn (steg 5)");
  if (rp.sarskildaFormagor.bp && rp.sarskildaFormagor.slag === null) lista.push("Slaget för särskilda förmågor (steg 7)");
  lista.push(...res.saknas.map((t) => `${t} (steg 7)`));
  if (rp.svardshand.slag === null && !(res.sarskildFormaga?.regel ?? []).some((d) => d.typ === "svardshand")) lista.push("Slaget för svärdshand (steg 8)");
  if (rp.socialtStand.slag === null) lista.push("Slaget för socialt stånd (steg 9)");
  if (rp.startkapital.slag === null) lista.push("Slaget för startkapital (steg 10)");
  return lista;
}

// ------------------------------------------------------------ export och import
function exportera() {
  const text = JSON.stringify(rp, null, 2);
  const ruta = $("#exportruta");
  ruta.hidden = false;
  ruta.value = text;
  navigator.clipboard?.writeText(text).then(
    () => visaNotis("Rollpersonen är kopierad. Klistra in den i en textfil för att spara den."),
    () => { ruta.select(); visaNotis("Markera texten i rutan och kopiera den."); });
}

function importera(text) {
  try {
    const data = JSON.parse(text);
    if (!data.ras || !data.grundvarden) throw new Error("saknar ras eller grundegenskaper");
    const fore = rp;
    rp = { ...TOM(), ...data };
    const fel = rakna().fel;
    if (fel.length) {
      rp = fore;
      throw new Error(`den bryter mot reglerna (${fel[0]})`);
    }
    visaNotis(`${rp.namn || "Rollpersonen"} är inläst.`);
    uppdatera();
  } catch (e) {
    visaNotis(`Det gick inte att läsa in rollpersonen: ${e.message}. Kontrollera att det är en sparad rollperson i JSON-format.`);
  }
}

function visaNotis(text) {
  const n = $("#notis");
  n.textContent = text;
  n.hidden = false;
  clearTimeout(visaNotis.t);
  visaNotis.t = setTimeout(() => { n.hidden = true; }, 6000);
}

// ------------------------------------------------------------ ritning
function rita() {
  const res = raknaRollperson(R, motorIndata());
  const rail = $("#steg");
  rail.replaceChildren(...STEG.map((s, i) => el("li", {},
    el("button", { type: "button", class: "steg-knapp" + (s.id === aktivtSteg ? " aktiv" : ""), "aria-current": s.id === aktivtSteg ? "step" : null,
      onclick: () => { aktivtSteg = s.id; uppdatera(); $("#arbetsyta").focus({ preventScroll: true }); } },
    el("span", { class: "steg-nr" }, i + 1), el("span", { class: "steg-namn" }, s.namn),
    s.bp ? el("span", { class: "steg-bp" }, bpForSteg(s.id, res)) : null))));

  const steg = STEG.find((s) => s.id === aktivtSteg);
  const index = STEG.indexOf(steg);
  const innehall = {
    ras: stegRas, alder: stegAlder, yrke: stegYrke, extra: stegExtra, kon: stegKon, egenskaper: stegEgenskaper,
    formagor: stegFormagor, svardshand: stegSvardshand, stand: stegStand, kapital: stegKapital, fardigheter: stegFardigheter,
  }[steg.id](res);
  $("#arbetsyta").replaceChildren(
    el("header", { class: "steg-huvud" },
      el("span", { class: "eyebrow" }, `Steg ${index + 1} av ${STEG.length} · s. ${steg.sida}`),
      el("h2", {}, steg.namn)),
    el("div", { class: "steg-innehall" }, innehall),
    el("nav", { class: "steg-fot", "aria-label": "Föregående och nästa steg" },
      index > 0 ? el("button", { type: "button", class: "knapp", onclick: () => { aktivtSteg = STEG[index - 1].id; uppdatera(); } }, `← ${STEG[index - 1].namn}`) : el("span"),
      index < STEG.length - 1 ? el("button", { type: "button", class: "knapp primar", onclick: () => { aktivtSteg = STEG[index + 1].id; uppdatera(); } }, `${STEG[index + 1].namn} →`) : el("span")));
  $("#formular").replaceChildren(rollformular(res));
  $("#bp-topp").textContent = `${res.bp.kvar} BP · ${res.ep.kvar} EP`;
}

function bpForSteg(id, res) {
  const u = res.bp.utgifter;
  const v = { ras: u.ras, extra: u.extraYrkesfardigheter, egenskaper: u.grundegenskaper, formagor: u.sarskildaFormagor,
    svardshand: u.svardshand, stand: u.socialtStand, kapital: u.startkapital }[id];
  return v ? `${v} BP` : "";
}

function ritaHusregler() {
  $("#husregler").replaceChildren(...R.husregler.map((h) => el("li", {}, h.beslut, el("span", { class: "sida" }, ` s. ${h.sida.join(", ")}`))));
}

async function start() {
  const data = await Promise.all(FILER.map((n) => fetch(`regler/${n}.json`).then((r) => {
    if (!r.ok) throw new Error(`regler/${n}.json`);
    return r.json();
  })));
  R = Object.fromEntries(FILER.map((n, i) => [n, data[i]]));
  let sparad = null;
  try { sparad = JSON.parse(localStorage.getItem(LAGRING) ?? "null"); } catch { /* ingen sparad rollperson */ }
  rp = sparad?.rp ? { ...TOM(), ...sparad.rp } : TOM();
  aktivtSteg = sparad?.aktivtSteg ?? "ras";
  try {
    if (rakna().fel.length) throw new Error("ogiltig");
  } catch {
    rp = TOM();
    aktivtSteg = "ras";
  }
  giltig = structuredClone(rp);
  const lardomar = el("datalist", { id: "lardomar" }, LARDOMSFORSLAG.map((t) => el("option", { value: t })));
  document.body.append(lardomar);

  $("#ny").addEventListener("click", () => {
    if ($("#ny").dataset.bekrafta !== "1") {
      $("#ny").dataset.bekrafta = "1";
      $("#ny").textContent = "Tryck igen för att börja om";
      setTimeout(() => { $("#ny").dataset.bekrafta = ""; $("#ny").textContent = "Ny rollperson"; }, 4000);
      return;
    }
    $("#ny").dataset.bekrafta = ""; $("#ny").textContent = "Ny rollperson";
    rp = TOM(); aktivtSteg = "ras"; nySekundar = ""; uppdatera();
  });
  $("#exportera").addEventListener("click", exportera);
  $("#importfil").addEventListener("change", async (e) => { const fil = e.target.files[0]; if (fil) importera(await fil.text()); e.target.value = ""; });
  document.addEventListener("paste", (e) => {
    if (e.target.closest("input, textarea")) return;
    const text = e.clipboardData.getData("text");
    if (text.trim().startsWith("{")) importera(text);
  });
  ritaHusregler();
  rita();
}

start().catch((e) => {
  $("#arbetsyta").replaceChildren(el("p", { class: "fellista" }, `Regelfilen ${e.message} kunde inte läsas. Kontrollera att mappen regler ligger bredvid sidan.`));
});
