// Gränssnittet för Chronopia-rollpersonsskaparen. All regellogik finns i regelmotor.js.
import {
  GRUNDEGENSKAPER, raknaRollperson, rasAv, yrkeAv, fardighetAv, alderskategori, slaUpp, sarskildFormaga as sfFor,
  paborjad, standsvarde, vapengrupp,
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
  { id: "export", namn: "Spara och exportera", sida: "–" },
];

// Förklaringar till förkortningar, visas i små info-cirklar.
const FORKLARINGAR = {
  BP: "BP är poängen du bygger rollpersonen med i steg 1–10: 125 från start plus åldersbonus. Det som blir över ger 5 EP per BP till färdigheterna (husregel).",
  EP: "EP (erfarenhetspoäng) köper FV i färdigheter: 2 EP per FV för primära, 3 för yrkesfärdigheter och 5 för sekundära (20 för en magiskola som sekundär).",
  FV: "FV (färdighetsvärde) visar hur bra rollpersonen är på något. Man slår 1T20, och ett resultat lika med eller under värdet lyckas. Vid start får FV inte vara högre än grundegenskapen.",
  BC: "BC (baschans) är gratis FV vid start i alla primära färdigheter och yrkesfärdigheter. Den beror på grundegenskapen. Sekundära färdigheter har ingen BC.",
  CL: "CL är FV med modifikationer för en viss situation. Det är CL man slår mot.",
  KP: "KP (kroppspoäng) visar hur mycket skada rollpersonen tål, totalt och per kroppsdel. Totalen är (STO+FYS)/2, avrundat uppåt.",
  SB: "SB (skadebonus) läggs till skadan i närstrid. Den beror på STY+STO.",
  STY: "STY (styrka) är muskelkraft. Den ger skadebonus tillsammans med STO och avgör vilka vapen rollpersonen orkar hantera (vapnens STY-krav).",
  FYS: "FYS (fysik) är uthållighet och motståndskraft. Den ger kroppspoäng tillsammans med STO.",
  SMI: "SMI (smidighet) är snabbhet och fingerfärdighet. Den är grund för många rörelsefärdigheter och vapen och påverkar förflyttningen.",
  INT: "INT (intelligens) är förstånd och minne. Den är grund för kunskapsfärdigheter och språk.",
  PSY: "PSY (psyke) är viljestyrka och intuition. Den är grund för bland annat Upptäcka fara och är viktig för magi, eftersom magiförmågeslaget beror på (INT+PSY)/2.",
  KAR: "KAR (karisma) är utstrålning och övertalningsförmåga. Den är grund för sociala färdigheter som Bluffa, Köpslå och Övertala.",
  STO: "STO (storlek) avgör längd och vikt. Den påverkar kroppspoäng, skadebonus och förflyttning. Rasen ger ett normalvärde, och det kostar BP att ändra det.",
  "B-nivå": "Kategori B-färdigheter (till exempel språk, Geografi och Lärdom) anges som nivå B0–B5 i stället för som ett vanligt FV: B0 = 0, B1 = 1–4, B2 = 5–10, B3 = 11–15, B4 = 16–19 och B5 = 20+ (s. 43).",
  Förflyttning: "Förflyttning är hur många rutor rollpersonen kan flytta per stridsrunda. En ruta är 1,5 m. Den beror på STO+FYS+SMI.",
  T: "T betyder tärning. 1T20 är en tjugosidig tärning, 2T6 är två sexsidiga tärningar som läggs ihop och 1T100 är ett procentslag.",
};

// Hjälptexter för färdigheter där spelaren själv skriver vad färdigheten gäller (s. 56–71).
const DELVAL_HJALP = {
  administration: "Skriv namnet på en stad, till exempel Chronopia. Färdigheten är kunskap om hur stadens förvaltning fungerar: ämbetsmän, tillstånd, skatter och vägen genom byråkratin. Den lärs separat för varje stad. Är den en yrkesfärdighet räknas alla städer som yrkesfärdigheter, men varje stad köps för sig (s. 56).",
  "undre-varlden": "Skriv namnet på en stad, till exempel Chronopia. Färdigheten är kontakter och kunskap om stadens undre värld: tjuvar, gäng, hälare och var man får tag i olagliga varor och tjänster. Den lärs separat för varje stad (s. 71).",
  geografi: "Skriv namnet på en kontinent eller ett större landområde. Färdigheten är kunskap om länder, vägar, städer och folk där, till exempel för att hitta rätt eller veta vad som väntar på en resa. Den lärs separat för varje kontinent (s. 59).",
  kulturkannedom: "Välj vilken ras eller vilket folks kultur det gäller. Staden Chronopia räknas som en egen kultur. Färdigheten är kunskap om seder, lagar, tro och etikett, så att rollpersonen kan bete sig rätt och förstå andra (s. 62).",
  lardom: "Skriv ett kunskapsområde, till exempel Kunskap om religion eller Kunskap om magi. Varje lärdomsfärdighet är en egen färdighet och används för att veta saker inom området. FV kan aldrig bli högre än rollpersonens FV i Läsa/Skriva (s. 63–64).",
  djurhelning: "Skriv vilken sorts djur det gäller, till exempel hästar eller hundar. Färdigheten används för att vårda och hela sjuka eller skadade djur av den sorten (s. 58).",
  djurtraning: "Skriv vilken sorts djur det gäller, till exempel hästar eller hundar. Färdigheten används för att dressera och lära djur av den sorten att lyda (s. 58).",
  "spela-instrument": "Skriv vilket instrument det gäller, till exempel luta eller flöjt. Färdigheten lärs separat för varje instrument. Är den en yrkesfärdighet räknas alla instrument som yrkesfärdigheter (s. 68).",
  stridskonster: "Skriv namnet på stridsstilen. Färdigheten används för obeväpnad strid med särskilda tekniker, som sparkar och dubbelslag. FV gäller alla tekniker i stilen (s. 68–69).",
};

const SPRAK_HJALP = {
  tala: "Tala är förmågan att prata och förstå ett språk. Den visas som en B-nivå: på låga nivåer klarar rollpersonen enkla ord och fraser, på B4 talar den flytande som de flesta infödda. Välj ett språk som inte redan är ditt modersmål (s. 70).",
  "lasa-skriva": "Läsa/Skriva är förmågan att läsa och skriva ett språk. Den är skild från Tala: man kan tala ett språk utan att kunna läsa det. FV i Läsa/Skriva är också taket för lärdomsfärdigheter, Historia och Alkemi. Vissa språk, som orchiska, saknar skriftspråk (s. 66).",
};

const KULTURER = () => [...R.raser.map((r) => r.namn), "Staden Chronopia"];

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
let provar = false;
let rasLiten = false; // rasrutorna är förminskade sedan en ras valts
let rasAnimera = false; // nästa ritning ska animera mellan stort och litet läge
let andrat = {}; // färdigheter och grundegenskaper som en automatisk fördelning höjde ("upp") eller sänkte ("ner")
let behallAndrat = false; // sant medan tal() letar efter närmaste tillåtna värde

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
  if (!behallAndrat) andrat = {};
  behallAndrat = false;
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
      const valda = [].concat(val ?? []);
      post.maste?.forEach((m, j) => { valda[j] = m; });
      for (const v of valda) if (v) nycklar.push(`${post.fardighet}:${v}`);
    }
  });
  if (rp.valfri && yrke.valfri) nycklar.push(rp.valfri);
  return nycklar.filter((k) => !paborjad(k));
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
  return [...mangd].filter((k) => !paborjad(k) && fardighetAv(R, k));
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
  // En grupp valknappar får inte ligga i en label: ett klick på etiketten skulle välja första knappen
  return el(kontroll?.classList?.contains("valknappar") ? "div" : "label", { class: "falt" }, el("span", { class: "etikett" }, etikett), kontroll, hjalp ? el("span", { class: "hjalp" }, hjalp) : null);
}

function valLista(id, varde, alternativ, onchange, tomText = "Välj …") {
  if (alternativ.length > 0 && alternativ.length <= 4) return valKnappar(id, varde, alternativ, onchange);
  return el("select", { id, onchange: (e) => onchange(e.target.value) },
    el("option", { value: "" }, tomText),
    alternativ.map(([v, t]) => el("option", { value: v, selected: v === varde }, t)));
}

// Få alternativ visas som knappar i stället för en rullgardin. Det valda lyser, de andra stryks
// över men går att klicka på för att byta.
function valKnappar(id, varde, alternativ, onchange) {
  const valt = alternativ.some(([v]) => v === varde);
  return el("div", { id, class: "valknappar" + (valt ? " gjort" : ""), role: "group" },
    alternativ.map(([v, t]) => el("button", {
      type: "button", class: "valknapp" + (v === varde ? " vald" : valt ? " bortvald" : ""), "aria-pressed": v === varde ? "true" : "false",
      "data-varde": v, onclick: () => { if (v !== varde) onchange(v); },
    }, t)));
}

// Vapnen ordnade i bokens vapengrupper (s. 72). Gruppen beror på STY, så ett tungt svärd hamnar bland tvåhandsvapnen.
function vapenGrupper(barastNarstrid = false) {
  const v = R.vapen;
  const lista = barastNarstrid ? v.narstrid.filter((x) => x.grupp !== "slagsmal")
    : [...v.narstrid.filter((x) => x.grupp !== "slagsmal"), ...v.projektil, ...v.kast, ...v.skoldar];
  const sty = rakna().grundegenskaper.STY;
  const grupper = new Map(R.vapen.grupper.map((g) => [g.id, []]));
  for (const x of lista) grupper.get(vapengrupp(R, x.namn, sty))?.push([x.namn, x.namn]);
  return R.vapen.grupper.filter((g) => grupper.get(g.id).length).map((g) => [g.namn, grupper.get(g.id)]);
}

// Rullgardin med rubriker: en tom rad och "– Grupp –" före varje grupp
function gruppLista(id, varde, grupper, onchange, tomText = "Välj …") {
  return el("select", { id, onchange: (e) => onchange(e.target.value) },
    el("option", { value: "" }, tomText),
    grupper.map(([namn, alt], i) => [
      i > 0 ? el("option", { disabled: true, value: "", "aria-hidden": "true" }, "") : null,
      el("option", { disabled: true, value: "", class: "grupprubrik" }, `– ${namn} –`),
      alt.map(([v, t]) => el("option", { value: v, selected: v === varde }, t))]));
}

// Färgar ett talfält grönt eller rött om en automatisk fördelning just höjde eller sänkte det
function markera(falt, nyckel) {
  if (andrat[nyckel]) falt.classList.add(andrat[nyckel]);
  return falt;
}

// Jämför två lägen och sparar vilka värden som gick upp eller ner
function jamfor(fore, efter) {
  andrat = {};
  for (const k of new Set([...Object.keys(fore), ...Object.keys(efter)])) {
    if ((efter[k] ?? 0) > (fore[k] ?? 0)) andrat[k] = "upp";
    else if ((efter[k] ?? 0) < (fore[k] ?? 0)) andrat[k] = "ner";
  }
  behallAndrat = true;
}
const fvKarta = () => Object.fromEntries(rakna().fardigheter.map((f) => [f.nyckel, f.fv]));
const geKarta = () => Object.fromEntries(GRUNDEGENSKAPER.map((g) => [`ge:${g}`, rp.grundvarden[g]]));

// Liten info-cirkel som förklarar en förkortning
function info(kort) {
  const text = FORKLARINGAR[kort];
  if (!text) return null;
  return el("button", { type: "button", class: "info", "data-tip": text, "aria-label": `Vad betyder ${kort}?` }, "i");
}
const medInfo = (text, kort = text) => [text, info(kort)];

// Info-cirkel med en kort beskrivning av en färdighet (s. 48–72)
function fardighetsInfo(nyckel) {
  const f = fardighetAv(R, nyckel ?? "");
  if (!f?.beskrivning) return null;
  return el("button", { type: "button", class: "info", "data-tip": `${f.beskrivning} (s. ${f.sida})`, "aria-label": `Om ${f.namn}` }, "i");
}
// Beskrivning som skrivs ut under en yrkesfärdighet i steg 3
function kortBeskrivning(id, namn = null) {
  const f = fardighetAv(R, id ?? "");
  if (!f?.beskrivning) return null;
  return el("p", { class: "fbeskr" }, namn ? el("strong", {}, `${f.namn}: `) : null, `${f.beskrivning} (s. ${f.sida})`);
}

function hjalpFor(fardighetId) {
  const text = DELVAL_HJALP[fardighetId] ?? SPRAK_HJALP[fardighetId];
  return text ? el("p", { class: "hjalp delvalhjalp" }, text) : null;
}

// Delval för färdigheter som lärs separat per vapen, språk, hantverk, stad …
function delvalKontroll(id, fardighetId, varde, onchange) {
  if (fardighetId === "vapen") return gruppLista(id, varde, vapenGrupper(), onchange, "Välj vapen …");
  if (fardighetId === "tva-vapen") {
    // Två närstridsvapen som kan hållas med en hand var (s. 71)
    const [a, b] = (varde ?? "").split("+");
    const vapen = vapenGrupper(true);
    return el("div", { class: "rad" },
      gruppLista(`${id}-a`, a, vapen, (v) => onchange(v && b ? `${v}+${b}` : v ? `${v}+` : ""), "Första vapnet …"),
      gruppLista(`${id}-b`, b, vapen, (v) => onchange(a && v ? `${a}+${v}` : ""), "Andra vapnet …"));
  }
  if (fardighetId === "kulturkannedom") return valLista(id, varde, KULTURER().map((k) => [k, k]), onchange, "Välj kultur …");
  if (fardighetId === "tala" || fardighetId === "lasa-skriva") {
    return valLista(id, varde, R.fardigheter.sprak.filter((s) => fardighetId === "tala" || s.skriftsprak !== false)
      .map((s) => [s.id, s.namn]), onchange, "Välj språk …");
  }
  if (fardighetId === "hantverk") {
    const lista = valLista(id, varde, R.fardigheter.hantverk.map(([n, g]) => [n, `${n} (${g})`]), onchange, "Välj hantverk …");
    const text = R.fardigheter.hantverkBeskrivning?.[varde];
    return text ? el("div", { class: "delval-med-text" }, lista, el("p", { class: "fbeskr" }, text)) : lista;
  }
  if (fardighetId === "kanna-magi") return valLista(id, varde, SKOLOR, onchange, "Välj skola …");
  const f = fardighetAv(R, fardighetId);
  const lista = fardighetId === "lardom" ? "lardomar" : null;
  return el("input", {
    id, type: "text", value: varde ?? "", list: lista, maxlength: 125,
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
    f?.perVal ? delvalKontroll(`${idPrefix}-d`, id, sub, (v) => onchange(`${id}:${v}`)) : null,
    f?.perVal ? hjalpFor(id) : null);
}

// ------------------------------------------------------------ stegen
function stegRas() {
  const valt = rasAv(R, rp.ras);
  const kort = R.raser.map((r) => el("button", {
    type: "button", class: "raskort" + (r.id === rp.ras ? " valt" : ""), "aria-pressed": r.id === rp.ras ? "true" : "false",
    onclick: () => {
      if (r.id !== rp.ras) { rp.ras = r.id; rp.rasval = []; rp.stoSteg = 0; }
      if (!rasLiten) { rasLiten = true; rasAnimera = true; }
      uppdatera();
    },
  },
  el("span", { class: "raskort-namn" }, r.namn),
  el("span", { class: "raskort-info", "aria-hidden": rasLiten ? "true" : null }, el("div", {},
    el("span", { class: "raskort-bp" }, `${r.bp} BP`),
    el("span", { class: "raskort-mod" }, GRUNDEGENSKAPER.filter((g) => r.mod[g]).map((g) => `${g} ${r.mod[g] > 0 ? "+" : "−"}${Math.abs(r.mod[g])}`).join(" · ") || "Inga modifikationer"),
    el("span", { class: "raskort-mod" }, `STO ${r.sto.min}–${r.sto.max} (normalt ${r.sto.normal})`)))));
  // Rutnätet ritas i förra läget och byter klass i nästa bildruta, så att övergången animeras
  const rutnat = el("div", { class: "raskort-rutnat" + ((rasAnimera ? !rasLiten : rasLiten) ? " liten" : "") }, kort);
  if (rasAnimera) {
    rasAnimera = false;
    requestAnimationFrame(() => { void rutnat.offsetWidth; rutnat.classList.toggle("liten", rasLiten); });
  }

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
    el("div", { class: "rasval-huvud" }, rutnat,
      rasLiten ? el("button", { type: "button", class: "knapp liten", "aria-label": "Visa alla raser med detaljer",
        onclick: () => { rasLiten = false; rasAnimera = true; rita(); } }, "⤢ Visa alla detaljer") : null),
    el("div", { class: "rutor" },
      el("div", {}, el("h3", {}, "Särskilt för ", valt.namn),
        rasLiten && valt.beskrivning ? el("p", { class: "raslore" }, valt.beskrivning, " (s. 14–16)") : null,
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
    el("p", { class: "hjalp" }, "Klicka på en kategori i tabellen för att välja dess lägsta ålder och justera sedan i rutan ovan. Du kan också skriva in valfri ålder direkt."),
    el("div", { class: "tabellram" }, el("table", { class: "tabell" },
      el("thead", {}, el("tr", {}, el("th", {}, "Kategori"), el("th", {}, `${ras.namn}, år`), GRUNDEGENSKAPER.map((g) => el("th", { class: "num" }, g, info(g))))),
      el("tbody", {}, R.alder.kategorier.map((k) => el("tr", { class: "valbar" + (k.id === kat ? " markerad" : ""), onclick: () => { rp.alder = ras.alder[k.id][0]; uppdatera(); $("#alder")?.focus(); } },
        el("td", {}, el("button", { type: "button", class: "radknapp", "aria-label": `Välj ${k.namn.toLowerCase()}: ${ras.alder[k.id][0]} år` }, k.namn)),
        el("td", { class: "num" }, ras.alder[k.id][1] === null ? `${ras.alder[k.id][0]}+` : ras.alder[k.id].join("–")),
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
      return el("li", {}, el("span", { class: "fnamn" }, f.namn), kortBeskrivning(post),
        f.perVal ? delvalKontroll(id, post, rp.yrkesval[i], satt) : null, f.perVal ? hjalpFor(post) : null);
    }
    if (post.valEn) {
      const val = rp.yrkesval[i] ?? {};
      const alt = post.valEn.map((x) => (typeof x === "string" ? x : x.fardighet));
      const f = val.id ? fardighetAv(R, val.id) : null;
      return el("li", {}, el("span", { class: "fnamn" }, alt.map((a) => fardighetAv(R, a).namn).join(" eller ")),
        val.id ? kortBeskrivning(val.id) : alt.map((a) => kortBeskrivning(a, true)),
        el("div", { class: "rad" },
          valLista(id, val.id, alt.map((a) => [a, fardighetAv(R, a).namn]), (v) => satt({ id: v })),
          f?.perVal ? delvalKontroll(`${id}-d`, val.id, val.sub, (v) => satt({ ...val, sub: v })) : null),
        f?.perVal ? hjalpFor(val.id) : null);
    }
    const f = fardighetAv(R, post.fardighet);
    if (post.antal === null) {
      return el("li", {}, el("span", { class: "fnamn" }, `${f.namn} (obegränsat)`), kortBeskrivning(post.fardighet),
        el("p", { class: "hjalp" }, "Alla lärdomsfärdigheter räknas som yrkesfärdigheter för en lärd man. Lägg till dem i steg 11, Färdigheter."));
    }
    const varden = [].concat(rp.yrkesval[i] ?? []);
    // Ett förbestämt val (t.ex. Kunskap om religion för munk och paladin) ligger först och går inte att ändra
    post.maste?.forEach((m, j) => { varden[j] = m; });
    return el("li", {}, el("span", { class: "fnamn" }, `${f.namn} (${post.antal})`), kortBeskrivning(post.fardighet),
      el("div", { class: "rad" }, Array.from({ length: post.antal }, (_, j) => (j < (post.maste?.length ?? 0)
        ? el("span", { class: "fast" }, varden[j])
        : delvalKontroll(`${id}-${j}`, post.fardighet, varden[j], (v) => {
          const ny = [...varden]; ny[j] = v; satt(ny);
        })))),
      post.maste ? el("p", { class: "hjalp" }, `${post.maste.join(" och ")} ingår alltid för det här yrket (s. 24–25).`) : null,
      hjalpFor(post.fardighet));
  });
  const hantverk = yrkesNycklar().filter((k) => k.startsWith("hantverk:"));
  const bonus = yrke.startbonus?.find((b) => b.valEttAv);
  if (bonus) {
    rader.push(el("li", {}, el("span", { class: "fnamn" }, `FV ${bonus.bc} gratis i ett hantverk`),
      valLista("hantverksbonus", rp.hantverkBonus, hantverk.map((k) => [k, k.split(":")[1]]), (v) => { rp.hantverkBonus = v; uppdatera(); }, hantverk.length ? "Välj hantverk …" : "Välj hantverk ovan först"),
      el("p", { class: "hjalp" }, `Hantverkaren får FV ${bonus.bc} i ett av sina tre hantverk utan att betala EP (s. 21).`)));
  }
  const yrkesrader = rader;
  return [
    falt("Yrke", valLista("yrke", rp.yrke, R.yrken.lista.map((y) => [y.id, y.namn]), (v) => {
      if (!v) return; rp.yrke = v; rp.yrkesval = {}; rp.valfri = ""; rp.hantverkBonus = ""; uppdatera();
    })),
    el("p", { class: "yrkesformaga" }, el("strong", {}, "Yrkesförmåga: "), yrke.yrkesformaga, el("span", { class: "sida" }, ` s. ${yrke.sida}`)),
    yrke.extraBP ? el("p", { class: "notis" }, `Paladinen får ${yrke.extraBP.antal} extra BP. Enligt boken bestämmer ${yrke.extraBP.styrsAv} hur de används.`) : null,
    el("h3", {}, "Yrkesfärdigheter"),
    el("ul", { class: "yrkeslista" }, yrkesrader,
      yrke.valfri ? el("li", {}, el("span", { class: "fnamn" }, "En valfri färdighet"),
        rp.valfri ? kortBeskrivning(rp.valfri.split(":")[0]) : null,
        fardighetsVal("valfri", rp.valfri, (v) => { rp.valfri = v; uppdatera(); }, (f) => f.typ !== "primar"),
        rp.valfri ? null : el("p", { class: "hjalp" }, "Vilken sekundär färdighet som helst, som blir en yrkesfärdighet. Primära färdigheter har rollpersonen redan. En magiskola kräver ett lyckat magiförmågeslag, som görs i steg 4.")) : null),
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
    el("th", { scope: "row" }, g, info(g)),
    el("td", {}, markera(tal(`ge-${g}`, rp.grundvarden[g], (v) => { rp.grundvarden[g] = Math.min(18, Math.max(3, v ?? 3)); uppdatera(); }, { min: 3, max: 18 }), `ge:${g}`)),
    el("td", { class: "num" }, kostnad[String(rp.grundvarden[g])] ?? "–"),
    el("td", { class: "num" }, fmtMod(ras.mod[g])),
    el("td", { class: "num" }, fmtMod(aldersmod[g])),
    el("td", { class: "num stor" + (res.grundegenskaper[g] < 3 ? " fel" : "") }, res.grundegenskaper[g])));
  const s = R.grundegenskaper.sto;
  const steg = rp.stoSteg;
  const stoBP = steg > 0 ? s.hojning[steg - 1] : steg < 0 ? -s.sankning[-steg - 1] : 0;
  return [
    el("p", {}, "Köp ett grundvärde (3–18) för varje grundegenskap. Ras och ålder läggs på efteråt. Alla slutvärden måste bli minst 3."),
    el("div", { class: "rad" },
      el("button", { type: "button", class: "knapp", onclick: foreslaGrundvarden }, `Föreslå värden för ${res.ras.namn.toLowerCase()} som ${res.yrke.namn.toLowerCase()}`),
      el("span", { class: "hjalp" }, "Lägger de högsta värdena där yrkets färdigheter och rasen gör mest nytta och sparar 10 BP till steg 7–10. Du kan justera efteråt.")),
    el("div", { class: "tabellram" }, el("table", { class: "tabell" },
      el("thead", {}, el("tr", {}, ["", "Grundvärde", "BP", "Ras", "Ålder", "Slutvärde"].map((t, i) => el("th", { class: i > 1 ? "num" : "" }, t, t === "BP" ? info("BP") : null)))),
      el("tbody", {}, rader,
        el("tr", {}, el("th", { scope: "row" }, "STO", info("STO")),
          el("td", {}, el("div", { class: "stegare" },
            el("button", { type: "button", class: "knapp liten", "aria-label": "Sänk STO", disabled: steg <= -5 || ras.sto.normal + steg <= ras.sto.min, onclick: () => { rp.stoSteg -= 1; uppdatera(); } }, "−"),
            el("span", {}, steg === 0 ? "normal" : fmtMod(steg)),
            el("button", { type: "button", class: "knapp liten", "aria-label": "Höj STO", disabled: steg >= 5 || ras.sto.normal + steg >= ras.sto.max, onclick: () => { rp.stoSteg += 1; uppdatera(); } }, "+"))),
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
  // Det är lätt att missa att BP ska läggas här, så en varning visas tills BP är lagda
  const oslaget = s.slag === null || s.slag === undefined;
  return [
    oslaget && !s.bp ? el("div", { class: "varning", role: "note" },
      el("strong", {}, "Glöm inte att lägga BP här. "),
      "Utan BP får rollpersonen ingen särskild förmåga, och BP som blir över kan bara växlas mot EP (5 EP per BP).") : null,
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
      el("button", { type: "button", class: "knapp", id: "magiformaga-sla", onclick: () => satt(slaT(1, 100)) }, "Slå 1T100")) : el("p", { class: "hjalp" }, `Slag: ${m.slag}. Slaget är gjort och kan inte göras om.`),
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
  const tabell = R.slag.socialtStand.tabell;
  if (rp.socialtStand.valt) {
    return [
      el("p", { class: "summering" }, `Valt stånd: ${rp.socialtStand.valt}. Det räknas som slagresultatet ${res.slag.ssResultat} för startkapitalet.`),
      el("button", { type: "button", class: "knapp", onclick: () => { rp.socialtStand.valt = ""; uppdatera(); } }, "Slå i stället"),
    ];
  }
  const valja = rp.socialtStand.slag === null ? el("details", { class: "fakta" }, el("summary", {}, "Välj stånd i stället för att slå (om SL tillåter)"),
    el("p", { class: "hjalp" }, "Huvudregeln är att slå. Om spelledaren går med på det kan du välja stånd direkt. Då räknas det lägsta slagresultatet för det ståndet, och du lägger inga BP här."),
    valLista("valt-stand", "", tabell.map(([, n]) => [n, `${n} (${standsvarde(tabell, n)}+)`]), (v) => { if (v) { rp.socialtStand = { bp: 0, slag: null, valt: v }; uppdatera(); } }, "Välj stånd …")) : null;
  return [...slagSteg("ss", "socialtStand", "Socialt stånd", "2T6",
    rp.socialtStand.slag === null ? "Slå eller skriv in slaget." :
      `${rp.socialtStand.slag} + ${rp.socialtStand.bp}${bonus ? ` + ${bonus} (${ras.namn.toLowerCase()})` : ""} = ${res.slag.ssResultat}: ${res.slag.socialtStand}.`,
    "Slå 2T6 plus lagda BP. Socialt stånd påverkar läs- och skrivkunnighet i modersmålet och taket för startkapitalet."), valja];
}

function stegKapital(res) {
  const halva = Math.ceil(rp.socialtStand.bp / 2);
  const alderEff = R.alder.efterAr.find((r) => r.max === null || rp.alder <= r.max);
  return slagSteg("sk", "startkapital", "Startkapital", "2T6",
    rp.startkapital.slag === null ? "Slå eller skriv in slaget." :
      `Resultat ${res.slag.skResultat} (taket är socialt stånd ${res.slag.ssResultat} + ${yrkeAv(R, rp.yrke).kapitaltak ?? 10}). Ålder ger ×${String(alderEff.kapital).replace(".", ",")}: ${sm(res.slag.startkapital)}.`,
    `Slå 2T6 plus lagda BP plus halva BP från socialt stånd (${halva}), plus eventuell ras- och yrkesbonus.`);
}

// EP per FV för en ny sekundär färdighet (s. 35–36)
function sekundarPris(nyckel) {
  const k = R.fardigheter.kostnad;
  return fardighetAv(R, nyckel || "x")?.typ === "magiskola" ? k.magiskolaSekundar : k.sekundar;
}

function nySekundarInfo(res) {
  const pris = sekundarPris(nySekundar);
  const typ = fardighetAv(R, nySekundar || "x")?.typ === "magiskola" ? "En magiskola som sekundär färdighet" : "En sekundär färdighet";
  const text = `${typ} har ingen baschans och kostar ${pris} EP per FV. Du har ${res.ep.kvar} EP kvar, vilket räcker till FV ${Math.floor(res.ep.kvar / pris)}.`;
  return el("p", { class: res.ep.kvar < pris ? "hjalp felrad" : "hjalp" },
    text, res.ep.kvar < pris ? " Du har inte råd med fler sekundära färdigheter." : " Välj färdighet, fyll i vad den gäller och tryck Lägg till.");
}

function stegFardigheter(res) {
  const grupper = [["primar", "Primära färdigheter", "2 EP per FV"], ["yrke", "Yrkesfärdigheter", "3 EP per FV"], ["sekundar", "Sekundära färdigheter", "5 EP per FV"]];
  const bniva = (fv) => slaUpp(R.fardigheter.bNivaer, fv);
  const tabell = (lista) => el("div", { class: "tabellram" }, el("table", { class: "tabell fardighetstabell" },
    el("thead", {}, el("tr", {}, el("th", {}, "Färdighet"), el("th", {}, "Grundeg."), el("th", { class: "num" }, "Start", info("BC")), el("th", { class: "num" }, "FV", info("FV")), el("th", { class: "num" }, "EP", info("EP")))),
    el("tbody", {}, lista.map((f) => el("tr", {},
      el("td", {}, f.namn, fardighetsInfo(f.nyckel), rp.sekundara.includes(f.nyckel) && f.status === "sekundar" ? el("button", {
        type: "button", class: "lank", "aria-label": `Ta bort ${f.namn}`,
        onclick: () => { rp.sekundara = rp.sekundara.filter((k) => k !== f.nyckel); delete rp.fardigheter[f.nyckel]; uppdatera(); },
      }, "ta bort") : null),
      el("td", {}, f.grundegenskap),
      el("td", { class: "num" }, f.start),
      el("td", { class: "num" }, markera(tal(`fv-${f.nyckel}`, f.fv, (v) => { rp.fardigheter[f.nyckel] = v ?? 0; uppdatera(); }, { min: 0, max: 30 }), f.nyckel),
        el("span", { class: "bniva" }, f.kategoriB ? bniva(f.fv) : "")),
      el("td", { class: "num" }, f.ep || ""))))));
  return [
    el("p", {}, `Du har ${res.ep.start} EP: ${R.alder.efterAr.find((r) => r.max === null || rp.alder <= r.max).ep} för åldern och 5 per överblivet BP. Primära och yrkesfärdigheter har gratis baschans (BC). FV får inte vara högre än grundegenskapen vid start.`),
    el("div", { class: "rad" },
      el("button", { type: "button", class: "knapp", onclick: fordelaEP }, `Fördela EP automatiskt för ${res.yrke.namn.toLowerCase()}`),
      el("button", { type: "button", class: "knapp", onclick: () => { rp.fardigheter = {}; uppdatera(); } }, "Nollställ FV"),
      el("span", { class: "hjalp" }, "Fördelningen ersätter dina nuvarande FV. Yrkesfärdigheterna får mest, sedan sekundära färdigheter du har lagt till och primära färdigheter med hög grundegenskap. Lägg till sekundära färdigheter först om du vill ha med dem. Du kan justera efteråt.")),
    grupper.map(([st, titel, pris]) => {
      const lista = res.fardigheter.filter((f) => f.status === st);
      return lista.length ? [el("h3", {}, titel, el("span", { class: "pris" }, pris)), tabell(lista)] : null;
    }),
    el("h3", {}, "Lär dig en ny sekundär färdighet"),
    el("div", { class: "rad" },
      fardighetsVal("ny-sek", nySekundar, (v) => { nySekundar = v; rita(); }, (f) => f.typ !== "primar"),
      el("button", { type: "button", class: "knapp", disabled: paborjad(nySekundar), onclick: () => {
        const pris = sekundarPris(nySekundar);
        if (res.ep.kvar < pris) {
          visaNotis(`Det går inte: en ny sekundär färdighet kostar ${pris} EP per FV, och du har bara ${res.ep.kvar} EP kvar.`);
          return;
        }
        if (!rp.sekundara.includes(nySekundar)) rp.sekundara.push(nySekundar);
        nySekundar = "";
        uppdatera();
      } }, "Lägg till")),
    nySekundarInfo(res),
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
      el("h2", {}, el("input", { id: "formular-namn", class: "namnfalt", type: "text", value: rp.namn, placeholder: "Namnlös rollperson", "aria-label": "Rollpersonens namn",
        onchange: (e) => { rp.namn = e.target.value; uppdatera(); } })),
      el("p", {}, [res.ras.namn, res.yrke.namn, `${rp.alder} år`, rp.kon].filter(Boolean).join(" · "))),
    el("div", { class: "potter" },
      el("div", { class: "pott" + (res.bp.kvar < 0 ? " over" : "") }, el("span", { class: "etikett" }, "BP kvar", info("BP")),
        el("span", { class: "pott-tal" }, res.bp.kvar), el("span", { class: "matare" }, el("span", { style: `width:${bpProcent}%` })),
        el("span", { class: "hjalp" }, `av ${res.bp.start}`)),
      el("div", { class: "pott" + (res.ep.kvar < 0 ? " over" : "") }, el("span", { class: "etikett" }, "EP kvar", info("EP")),
        el("span", { class: "pott-tal" }, res.ep.kvar), el("span", { class: "matare" }, el("span", { style: `width:${epProcent}%` })),
        el("span", { class: "hjalp" }, `av ${res.ep.start}`))),
    saknas(res).length ? el("div", { class: "saknaslista", role: "status" }, el("strong", {}, "Kvar att välja"), el("ul", {}, saknas(res).map((f) => el("li", {}, f))))
      : el("p", { class: "klar" }, "Rollpersonen är klar."),
    el("dl", { class: "egenskaper" }, [...GRUNDEGENSKAPER, "STO"].map((k) => el("div", {}, el("dt", {}, k, info(k)), el("dd", {}, g[k])))),
    el("dl", { class: "nyckelvarden" },
      el("div", {}, el("dt", {}, "Kroppspoäng", info("KP")), el("dd", {}, h.totalKP)),
      el("div", {}, el("dt", {}, "Skadebonus", info("SB")), el("dd", {}, h.skadebonus)),
      el("div", {}, el("dt", {}, "Förflyttning", info("Förflyttning")), el("dd", {}, h.forflyttning)),
      el("div", {}, el("dt", {}, "Svärdshand"), el("dd", {}, res.slag.svardshand)),
      el("div", {}, el("dt", {}, "Socialt stånd"), el("dd", {}, res.slag.socialtStand)),
      el("div", {}, el("dt", {}, "Startkapital"), el("dd", {}, sm(res.slag.startkapital))),
      el("div", {}, el("dt", {}, "Längd"), el("dd", {}, h.langd ?? "–")),
      el("div", {}, el("dt", {}, "Vikt"), el("dd", {}, h.vikt ?? "–"))),
    el("h3", {}, "Kroppsdelar"),
    el("ul", { class: "kroppsdelar" }, h.kroppsdelar.map((d) => el("li", {}, el("span", {}, d.namn), el("span", { class: "num" }, d.kp)))),
    res.sarskildFormaga ? [el("h3", {}, "Särskild förmåga"), el("p", {}, el("strong", {}, res.sarskildFormaga.namn), " ", res.sarskildFormaga.effekt)] : null,
    el("p", {}, el("strong", {}, "Yrkesförmåga: "), res.yrke.yrkesformaga),
    el("h3", {}, "Färdigheter", info("B-nivå")),
    el("ul", { class: "fardighetsrader" }, res.fardigheter.filter((f) => f.fv > 0).map((f) =>
      el("li", { class: f.status }, el("span", {}, f.namn), el("span", { class: "num" }, f.kategoriB ? `${f.fv} ${slaUpp(R.fardigheter.bNivaer, f.fv)}` : f.fv)))),
  );
}

// Val som ännu inte är gjorda, per steg. Ett steg med obligatoriska val kvar går inte att lämna framåt.
function saknasPerSteg(res) {
  const lista = Object.fromEntries(STEG.map((st) => [st.id, []]));
  const yrke = yrkeAv(R, rp.yrke);
  const ras = rasAv(R, rp.ras);
  const klar = (v) => !paborjad(v ?? "");
  const valfriRas = ras.primara.find((p) => p.valfri);
  if (valfriRas && !rp.rasval.some(klar)) lista.ras.push(`Rasens valfria ${valfriRas.valfri === "vapen" ? "vapenfärdighet" : "hantverk"}`);
  yrke.fardigheter.forEach((post, i) => {
    const val = rp.yrkesval[i];
    if (typeof post === "string") {
      if (fardighetAv(R, post)?.perVal && !klar(val)) lista.yrke.push(`${fardighetAv(R, post).namn}: vad den gäller`);
    } else if (post.valEn) {
      if (!val?.id || (fardighetAv(R, val.id).perVal && !klar(val.sub))) lista.yrke.push(post.valEn.map((x) => fardighetAv(R, x.fardighet ?? x).namn).join(" eller "));
    } else if (post.antal !== null) {
      const gjorda = (post.maste?.length ?? 0) + [].concat(val ?? []).slice(post.maste?.length ?? 0).filter(klar).length;
      if (gjorda < post.antal) lista.yrke.push(`${fardighetAv(R, post.fardighet).namn}: ${post.antal - gjorda} val kvar`);
    }
  });
  if (yrke.valfri && !klar(rp.valfri)) lista.yrke.push("Den valfria yrkesfärdigheten");
  if (yrke.startbonus?.some((b) => b.valEttAv) && !yrkesNycklar().includes(rp.hantverkBonus)) lista.yrke.push("Hantverket som får gratis FV");
  if (rp.extraYrkesfardigheter.some((k) => !klar(k))) lista.extra.push("En extra yrkesfärdighet är inte färdigvald (välj klart eller ta bort den)");
  if (!rp.namn.trim()) lista.kon.push("Namn");
  if (!rp.kon) lista.kon.push("Kön");
  if (rp.sarskildaFormagor.bp && rp.sarskildaFormagor.slag === null) lista.formagor.push("Slaget för särskilda förmågor");
  lista.formagor.push(...res.saknas);
  if (rp.svardshand.slag === null && !(res.sarskildFormaga?.regel ?? []).some((d) => d.typ === "svardshand")) lista.svardshand.push("Slaget för svärdshand");
  if (rp.socialtStand.slag === null && !rp.socialtStand.valt) lista.stand.push("Slaget för socialt stånd");
  if (rp.startkapital.slag === null) lista.kapital.push("Slaget för startkapital");
  return lista;
}

function saknas(res) {
  const perSteg = saknasPerSteg(res);
  return STEG.flatMap((st, i) => perSteg[st.id].map((t) => `${t} (steg ${i + 1})`));
}

// Första steget som har obligatoriska val kvar; senare steg går inte att öppna.
function forstaOfardiga(res) {
  const perSteg = saknasPerSteg(res);
  const i = STEG.findIndex((st) => perSteg[st.id].length);
  return i === -1 ? STEG.length : i;
}

// Föreslagna grundvärden: högst där yrkets färdigheter och rasens styrkor ligger (s. 18–29).
function foreslaGrundvarden() {
  const res = rakna();
  const yrke = res.yrke;
  const ras = res.ras;
  const vikt = Object.fromEntries(GRUNDEGENSKAPER.map((g) => [g, ras.mod[g] * 0.2]));
  const lagg = (id, v) => {
    const f = fardighetAv(R, id);
    if (!f) return;
    if (GRUNDEGENSKAPER.includes(f.grundegenskap)) vikt[f.grundegenskap] += v;
    else { vikt.STY += v / 2; vikt.SMI += v / 2; } // vapen och hantverk varierar
  };
  for (const post of yrke.fardigheter) {
    if (typeof post === "string") lagg(post, 1);
    else if (post.valEn) post.valEn.forEach((x) => lagg(x.fardighet ?? x, 1 / post.valEn.length));
    else lagg(post.fardighet, post.antal ?? 2);
  }
  for (const f of R.fardigheter.lista) if (f.typ === "primar") lagg(f.id, 0.25);
  if (yrke.magiker) { vikt.INT += 3; vikt.PSY += 3; }
  vikt.FYS += 1; // kroppspoäng
  const ordning = [...GRUNDEGENSKAPER].sort((a, b) => vikt[b] - vikt[a]);
  const kostnad = R.grundegenskaper.kostnad;
  const mallar = [[16, 15, 13, 12, 10, 9], [15, 14, 12, 11, 10, 8], [14, 13, 12, 10, 9, 8], [13, 12, 11, 10, 9, 8],
    [12, 11, 10, 10, 9, 7], [11, 10, 10, 9, 8, 7], [10, 10, 9, 8, 7, 6], [9, 8, 8, 7, 6, 5], [7, 6, 6, 5, 5, 4]];
  const budget = res.bp.kvar + res.bp.utgifter.grundegenskaper - 10;
  const aldersmod = R.alder.effekter[res.alderskategori];
  for (const mall of mallar) {
    const varden = Object.fromEntries(ordning.map((g, i) => [g, mall[i]]));
    // Slutvärdet måste bli minst 3 efter ras och ålder
    for (const g of GRUNDEGENSKAPER) varden[g] = Math.min(18, Math.max(varden[g], 3 - ras.mod[g] - aldersmod[g]));
    const pris = GRUNDEGENSKAPER.reduce((summa, g) => summa + kostnad[String(varden[g])], 0);
    if (pris <= budget) {
      const fore = geKarta();
      rp.grundvarden = varden;
      jamfor(fore, geKarta());
      uppdatera();
      return;
    }
  }
  visaNotis("Det finns inte tillräckligt med BP för ett förslag. Sänk något annat först.");
}

// Automatisk fördelning av EP (s. 34–36). Varje FV läggs där det gör mest nytta just nu: yrkesfärdigheter
// väger tyngst, sedan valda sekundära färdigheter och primära färdigheter med hög grundegenskap.
// Varje höjning prövas mot reglerna, så tak och EP-gränsen hålls.
function fordelaEP() {
  const fore = structuredClone(rp);
  const foreFV = fvKarta();
  rp.fardigheter = {};
  provar = true;
  const borjan = rakna();
  const pris = R.fardigheter.kostnad;
  const vikt = {};
  for (const f of borjan.fardigheter) {
    const def = fardighetAv(R, f.nyckel);
    const ge = borjan.grundegenskaper[f.grundegenskap] ?? 10;
    if (def.typ === "sprak") vikt[f.nyckel] = 0.3;
    else if (f.status === "yrke") vikt[f.nyckel] = 4 + (def.typ === "magiskola" ? 2 : 0) + (def.id === "vapen" ? 1 : 0);
    else if (f.status === "sekundar") vikt[f.nyckel] = 3;
    else vikt[f.nyckel] = Math.max(0.3, 1 + (ge - 10) / 5);
  }
  const epPerFV = (f) => (f.status === "sekundar" && fardighetAv(R, f.nyckel).typ === "magiskola" ? pris.magiskolaSekundar : pris[f.status] ?? pris.sekundar);
  const stopp = new Set();
  for (let varv = 0; varv < 500; varv++) {
    const res = rakna();
    const kandidater = res.fardigheter.filter((f) => !stopp.has(f.nyckel) && vikt[f.nyckel] && f.fv < 30)
      .map((f) => ({ f, poang: vikt[f.nyckel] / ((f.fv + 2) * epPerFV(f)) }))
      .sort((a, b) => b.poang - a.poang);
    let hojd = false;
    for (const { f } of kandidater) {
      if (epPerFV(f) > res.ep.kvar) { stopp.add(f.nyckel); continue; }
      const gammalt = rp.fardigheter[f.nyckel];
      rp.fardigheter[f.nyckel] = f.fv + 1;
      if (!rakna().fel.length) { hojd = true; break; }
      if (gammalt === undefined) delete rp.fardigheter[f.nyckel];
      else rp.fardigheter[f.nyckel] = gammalt;
      stopp.add(f.nyckel);
    }
    if (!hojd) break;
  }
  provar = false;
  if (rakna().fel.length) rp = fore;
  jamfor(foreFV, fvKarta());
  uppdatera();
  visaNotis(`EP är fördelade. ${rakna().ep.kvar} EP blev över.`);
}

// ------------------------------------------------------------ steg 12: spara och exportera
function filnamn() {
  return `${(rp.namn || "rollperson").trim().replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.json`;
}

function stegExport(res) {
  const text = JSON.stringify(rp, null, 2);
  return [
    el("p", { class: "summering" }, `${rp.namn} är klar: ${res.ras.namn.toLowerCase()}, ${res.yrke.namn.toLowerCase()}, ${rp.alder} år.`),
    el("p", {}, "Spara rollpersonen som en JSON-fil. Filen kan läsas in igen med knappen Läs in fil högst upp, till exempel för att fortsätta på en annan dator."),
    el("div", { class: "rad" },
      el("button", { type: "button", class: "knapp primar", onclick: laddaNer }, `Ladda ner ${filnamn()}`),
      el("button", { type: "button", class: "knapp", onclick: () => kopiera(text) }, "Kopiera JSON")),
    el("details", { class: "fakta" }, el("summary", {}, "Visa JSON"),
      el("textarea", { id: "exportruta", rows: 12, readonly: true, "aria-label": "Rollpersonen som JSON" }, text)),
  ];
}

function laddaNer() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(rp, null, 2)], { type: "application/json" }));
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

// ------------------------------------------------------------ export och import
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
  const grans = forstaOfardiga(res);
  // Står man på ett steg bortom gränsen (t.ex. efter att ha ändrat yrke) flyttas man tillbaka
  if (STEG.findIndex((s) => s.id === aktivtSteg) > grans) aktivtSteg = STEG[grans].id;
  const rail = $("#steg");
  rail.replaceChildren(...STEG.map((s, i) => el("li", {},
    el("button", { type: "button", class: "steg-knapp" + (s.id === aktivtSteg ? " aktiv" : ""), "aria-current": s.id === aktivtSteg ? "step" : null,
      disabled: i > grans, title: i > grans ? "Gör klart de tidigare stegen först" : null,
      onclick: () => { aktivtSteg = s.id; uppdatera(); $("#arbetsyta").focus({ preventScroll: true }); } },
    el("span", { class: "steg-nr" }, i + 1), el("span", { class: "steg-namn" }, s.namn),
    s.bp ? el("span", { class: "steg-bp" }, bpForSteg(s.id, res)) : null))));

  const steg = STEG.find((s) => s.id === aktivtSteg);
  const index = STEG.indexOf(steg);
  const innehall = {
    ras: stegRas, alder: stegAlder, yrke: stegYrke, extra: stegExtra, kon: stegKon, egenskaper: stegEgenskaper,
    formagor: stegFormagor, svardshand: stegSvardshand, stand: stegStand, kapital: stegKapital, fardigheter: stegFardigheter,
    export: stegExport,
  }[steg.id](res);
  const kvar = saknasPerSteg(res)[steg.id];
  $("#arbetsyta").replaceChildren(
    el("header", { class: "steg-huvud" },
      el("div", { class: "steg-titel" },
        el("span", { class: "eyebrow" }, `Steg ${index + 1} av ${STEG.length}${steg.sida === "–" ? "" : ` · s. ${steg.sida}`}`),
        el("h2", {}, steg.namn)),
      el("dl", { class: "steg-potter", "aria-label": "Kvar att spendera" },
        el("div", { class: res.bp.kvar < 0 ? "over" : "" }, el("dt", {}, "BP kvar", info("BP")), el("dd", {}, res.bp.kvar)),
        el("div", { class: res.ep.kvar < 0 ? "over" : "" }, el("dt", {}, "EP kvar", info("EP")), el("dd", {}, res.ep.kvar)))),
    el("div", { class: "steg-innehall" }, innehall),
    kvar.length ? el("div", { class: "saknaslista" }, el("strong", {}, "Gör klart innan du går vidare"), el("ul", {}, kvar.map((t) => el("li", {}, t)))) : el("span"),
    el("nav", { class: "steg-fot", "aria-label": "Föregående och nästa steg" },
      index > 0 ? el("button", { type: "button", class: "knapp", onclick: () => { aktivtSteg = STEG[index - 1].id; uppdatera(); } }, `← ${STEG[index - 1].namn}`) : el("span"),
      index < STEG.length - 1 ? el("button", { type: "button", class: "knapp primar", disabled: index + 1 > grans, onclick: () => { aktivtSteg = STEG[index + 1].id; uppdatera(); } }, `${STEG[index + 1].namn} →`) : el("span")));
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
  $("#importfil").addEventListener("change", async (e) => { const fil = e.target.files[0]; if (fil) importera(await fil.text()); e.target.value = ""; });
  document.addEventListener("paste", (e) => {
    if (e.target.closest("input, textarea")) return;
    const text = e.clipboardData.getData("text");
    if (text.trim().startsWith("{")) importera(text);
  });
  // Info-cirklarnas förklaringar visas i en gemensam ruta
  const tips = el("div", { id: "tips", role: "tooltip", hidden: true });
  document.body.append(tips);
  const visa = (knapp) => {
    tips.textContent = knapp.dataset.tip;
    tips.hidden = false;
    const r = knapp.getBoundingClientRect();
    const bredd = Math.min(320, window.innerWidth - 32);
    tips.style.width = `${bredd}px`;
    tips.style.left = `${Math.max(16, Math.min(r.left + r.width / 2 - bredd / 2, window.innerWidth - bredd - 16))}px`;
    const under = r.bottom + 8;
    tips.style.top = `${under + tips.offsetHeight > window.innerHeight ? r.top - tips.offsetHeight - 8 : under}px`;
  };
  const dolj = () => { tips.hidden = true; };
  document.addEventListener("mouseover", (e) => { const k = e.target.closest?.(".info"); if (k) visa(k); });
  document.addEventListener("mouseout", (e) => { if (e.target.closest?.(".info")) dolj(); });
  document.addEventListener("focusin", (e) => { const k = e.target.closest?.(".info"); if (k) visa(k); else dolj(); });
  document.addEventListener("click", (e) => { const k = e.target.closest?.(".info"); if (k) { e.stopPropagation(); visa(k); } else dolj(); }, true);
  window.addEventListener("scroll", dolj, { passive: true });
  ritaHusregler();
  rita();
}

start().catch((e) => {
  $("#arbetsyta").replaceChildren(el("p", { class: "fellista" }, `Regelfilen ${e.message} kunde inte läsas. Kontrollera att mappen regler ligger bredvid sidan.`));
});
