// Gränssnittet för Chronopia-rollpersonsskaparen. All regellogik finns i regelmotor.js.
import {
  GRUNDEGENSKAPER, raknaRollperson, rasAv, yrkeAv, fardighetAv, alderskategori, slaUpp, sarskildFormaga as sfFor, tvahandsvapen,
  paborjad, standsvarde, vapengrupp, passarBland, skolFV, besvarjelsePris, kanAnvandaVapen, varukatalog,
} from "./regelmotor.js";
import { rollformularSidor, delaRegelsidor } from "./formular.js";
import { tillFil, franFil, TOMT_SPEL } from "./sparformat.js";

const FILER = ["raser", "alder", "grundegenskaper", "fardigheter", "yrken", "slag", "vapen", "sarskilda-formagor", "husregler", "besvarjelser", "utrustning"];
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
  { id: "besvarjelser", namn: "Besvärjelser", sida: "36, 106–129" },
  { id: "utrustning", namn: "Utrustning", sida: "38, 89–102" },
  { id: "export", namn: "Spara och exportera", sida: "–" },
];

// Förklaringar till förkortningar, visas i små info-cirklar.
const FORKLARINGAR = {
  BP: "BP (bakgrundspoäng) är poängen du bygger rollpersonen med i steg 1–10: 125 från start plus åldersbonus. Det som blir över ger 5 EP per BP till färdigheterna (husregel).",
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
  stridskonster: "Skriv namnet på stridsstilen. Färdigheten används för obeväpnad strid med särskilda tekniker, som sparkar och dubbelslag. FV gäller alla tekniker i stilen. Teknikerna väljs i steg 11 och bestämmer vad varje FV kostar (s. 68–69).",
};

const SPRAK_HJALP = {
  tala: "Tala är förmågan att prata och förstå ett språk. Den visas som en B-nivå: på låga nivåer klarar rollpersonen enkla ord och fraser, på B4 talar den flytande som de flesta infödda. Välj ett språk som inte redan är ditt modersmål (s. 70).",
  "lasa-skriva": "Läsa/Skriva är förmågan att läsa och skriva ett språk. Den är skild från Tala: man kan tala ett språk utan att kunna läsa det. FV i Läsa/Skriva är också taket för lärdomsfärdigheter, Historia och Alkemi. Vissa språk, som orchiska, saknar skriftspråk (s. 66).",
};

// Rasförmågor med regeleffekter (s. 30). Förmågor som förklarar sig själva har ingen text.
const RASFORMAGOR = {
  Mörkersyn: "Ser ungefär som en katt: ganska bra även när det är mycket mörkt, men det krävs någon ljuskälla. En molnig natt är som skymning, en stjärnklar natt med fullmåne som mitt på dagen. Dimma och rök skymmer sikten helt. Bländande besvärjelser bländar dubbelt så länge (s. 30).",
  Infrasyn: "Ser värme och ser därför bra även i kolsvart mörker, helt utan ljuskälla, och rakt genom dimma och rök. Bländas av extremt starka värmekällor. Till skillnad från mörkersyn behövs inget ljus (s. 30).",
};
const RAS_SEKUNDAR_INFO = "Färdigheter som är primära för de flesta men sekundära för den här rasen. Rollpersonen får ingen baschans i dem och de kostar som sekundära färdigheter, om de inte väljs som yrkesfärdigheter (s. 14–16).";
const infoKnapp = (text, etikett) => el("button", { type: "button", class: "info", "data-tip": text, "aria-label": etikett }, "i");

const KULTURER = () => [...R.raser.map((r) => r.namn), "Staden Chronopia"];

const LARDOMSFORSLAG = ["Kunskap om magi", "Kunskap om religion", "Kunskap om demoner", "Kunskap om odöda", "Kunskap om språk"];
const SKOLOR = [["animism", "Animism"], ["elementarmagi", "Elementarmagi"], ["mentalism", "Mentalism"]];

const TOM = () => ({
  namn: "", spelare: "", kon: "", ras: "", alder: 21, yrke: "krigare", yrkesval: {}, valfri: "",
  extraYrkesfardigheter: [], rasval: [], grundvarden: { STY: 10, FYS: 10, SMI: 10, INT: 10, PSY: 10, KAR: 10 },
  stoSteg: 0, sarskildaFormagor: { bp: 0, slag: null, val: [] }, svardshand: { bp: 0, slag: null },
  socialtStand: { bp: 0, slag: null }, startkapital: { bp: 0, slag: null }, sekundara: [], fardigheter: {},
  magiformaga: { slag: null }, stridskonstTekniker: {}, stridskonstFardig: {}, besvarjelser: {}, utrustning: {}, startpaket: { valt: false, vapen: "" }, anteckningar: "",
  spel: TOMT_SPEL(),
});
// En sparad rollperson kompletteras med fält som har tillkommit sedan den sparades
const fyllUt = (data) => ({ ...TOM(), ...data, spel: { ...TOMT_SPEL(), ...(data.spel ?? {}) } });

let R; // regeldata
let rp; // rollpersonen (spelarens val)
let aktivtSteg = "ras";
let langst = 0; // längsta steg spelaren har kommit till; senare steg är släckta i sidomenyn
let giltig; // senaste rollperson som följer alla regler
let nySekundar = ""; // påbörjat val av ny sekundär färdighet
let provar = false;
let magiByte = null; // platsen där en magiskola byts ut efter ett misslyckat magiförmågeslag
let autoAnvand = { egenskaper: false, fardigheter: false }; // Återställ visas bara efter en automatisk fördelning
let ritatSteg = null; // steget som visades senast; byts det skrollas sidan upp
let sparadVidStart = null; // rollpersonen från förra besöket; sidan börjar ändå alltid med en ny
let vy = "steg"; // "steg" eller "formular" (rollformuläret för utskrift)
let blacksnal = false; // rollformuläret utan färgade ytor
let medRegler = false; // rollformuläret med sidorna Färdigheterna i korthet
// Innan en ras är vald räknar motorn som för en människa, men ingen ras visas som vald
const rasId = () => rp.ras || "manniska";

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
const kg = (n) => n.toLocaleString("sv-SE");

function spara() {
  try { localStorage.setItem(LAGRING, JSON.stringify({ rp, aktivtSteg, langst })); } catch { /* lagring är frivillig */ }
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
    if (rp.ras) sparadVidStart = null; // en ny rollperson ersätter den sparade
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
  const ras = rasAv(R, rasId());
  return {
    tala: ras.talaModersmal.map((x) => x.sprak),
    lasaSkriva: ras.lasaSkrivaModersmal.map((x) => (typeof x === "string" ? x : x.sprak)),
  };
}

function allaNycklar(yrkesfardigheter) {
  const ras = rasAv(R, rasId());
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
  const sf = sfFor(R, { ...rp, ras: rasId(), yrkesfardigheter, extraYrkesfardigheter: rp.extraYrkesfardigheter }).tillagg.sarskildaFormagor;
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
    ...rp, ras: rasId(), yrkesfardigheter, fardigheter, modersmal: modersmal(),
    svardshand: { ...rp.svardshand, slag: rp.svardshand.slag ?? 0 },
    socialtStand: { ...rp.socialtStand, slag: rp.socialtStand.slag ?? 0 },
    startkapital: { ...rp.startkapital, slag: rp.startkapital.slag ?? 0 },
  };
}

const sarskildFormaga = () => sfFor(R, { ...rp, ras: rasId(), yrkesfardigheter: yrkesNycklar() }).formaga;

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
  // Detsamma gäller tärningsrutan: ett klick på etiketten skulle slå
  return el(kontroll?.classList?.contains("valknappar") || kontroll?.classList?.contains("tarningsknapp") ? "div" : "label", { class: "falt" }, el("span", { class: "etikett" }, etikett), kontroll, hjalp ? el("span", { class: "hjalp" }, hjalp) : null);
}

function valLista(id, varde, alternativ, onchange, tomText = "Välj …") {
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
  const v = R.vapen;
  const varden = rakna().grundegenskaper;
  // Två vapen: bara närstridsvapen som rollpersonen kan hålla med en hand (s. 71–72)
  const lista = enhandsNarstrid ? v.narstrid.filter((x) => x.grupp !== "slagsmal" && !tvahandsvapen(R, x.namn, varden))
    : [...v.narstrid.filter((x) => x.grupp !== "slagsmal"), ...v.projektil, ...v.kast, ...v.skoldar];
  const sty = varden.STY;
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
      alt.map(([v, t, extra]) => el("option", { value: v, selected: v === varde, disabled: extra?.disabled }, t))]));
}

// Färgar ett talfält grönt eller rött när värdet ligger över eller under utgångsvärdet
// (grundvärde 10 för grundegenskaper, baschansen för färdigheter)
function markera(falt, varde, bas) {
  if (varde > bas) falt.classList.add("upp");
  else if (varde < bas) falt.classList.add("ner");
  return falt;
}

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
// Delval som rollpersonen redan har som yrkes-, ras- eller sekundär färdighet (utom det som är valt i just den här listan)
function redanValda(fardighetId, varde) {
  const valda = new Set([...yrkesNycklar(), ...rp.extraYrkesfardigheter, ...rp.sekundara, ...(rp.rasval ?? [])]
    .filter((k) => k?.startsWith(`${fardighetId}:`)).map((k) => k.split(":")[1]));
  valda.delete(varde);
  return valda;
}
// Gör redan valda alternativ ovalbara, som "Snickare (redan vald)"
const markeraValda = (alt, valda) => alt.map(([v, t]) => (valda.has(v) ? [v, `${t} (redan vald)`, { disabled: true }] : [v, t]));

function delvalKontroll(id, fardighetId, varde, onchange, { yrke = false } = {}) {
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
  if (fardighetId === "kulturkannedom") return valLista(id, varde, markeraValda(KULTURER().map((k) => [k, k]), redanValda(fardighetId, varde)), onchange, "Välj kultur …");
  if (fardighetId === "tala" || fardighetId === "lasa-skriva") return sprakLista(id, fardighetId, varde, onchange, yrke);
  if (fardighetId === "hantverk") {
    const lista = valLista(id, varde, markeraValda(R.fardigheter.hantverk.map(([n, g]) => [n, `${n} (${g})`]), redanValda(fardighetId, varde)), onchange, "Välj hantverk …");
    const text = R.fardigheter.hantverkBeskrivning?.[varde];
    return text ? el("div", { class: "delval-med-text" }, lista, el("p", { class: "fbeskr" }, text)) : lista;
  }
  if (fardighetId === "kanna-magi") return valLista(id, varde, markeraValda(SKOLOR, redanValda(fardighetId, varde)), onchange, "Välj skola …");
  const f = fardighetAv(R, fardighetId);
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
  const valda = new Set([...yrkesNycklar(), ...rp.extraYrkesfardigheter, ...rp.sekundara]
    .filter((k) => k.startsWith(`${fardighetId}:`)).map((k) => k.split(":")[1]));
  valda.delete(varde);
  const alt = R.fardigheter.sprak
    .filter((s) => fardighetId === "tala" || (s.skriftsprak !== false && !s.endastTala))
    .filter((s) => !yrke || (!s.aldrigYrke && (!s.endastPrimarFor || s.endastPrimarFor === rp.ras)))
    .map((s) => (egna.includes(s.id) ? [s.id, `${s.namn} (modersmål)`, { disabled: true }]
      : valda.has(s.id) ? [s.id, `${s.namn} (redan vald)`, { disabled: true }] : [s.id, s.namn]));
  return valLista(id, varde, alt, onchange, "Välj språk …");
}

function fardighetsVal(idPrefix, nyckel, onchange, filter = () => true, val = {}) {
  const [id, sub] = (nyckel ?? "").split(":");
  const lista = R.fardigheter.lista.filter(filter).sort((a, b) => a.namn.localeCompare(b.namn, "sv"));
  const f = id ? fardighetAv(R, id) : null;
  return el("div", { class: "rad" },
    valLista(`${idPrefix}-f`, id, lista.map((x) => [x.id, x.namn]), (v) => onchange(v ? (fardighetAv(R, v).perVal ? `${v}:` : v) : "")),
    f?.perVal ? delvalKontroll(`${idPrefix}-d`, id, sub, (v) => onchange(`${id}:${v}`), val) : null,
    f?.perVal ? hjalpFor(id) : null);
}

// ------------------------------------------------------------ stegen
function stegRas() {
  const valt = rp.ras ? rasAv(R, rp.ras) : null;
  const kort = R.raser.map((r) => el("button", {
    type: "button", class: "raskort" + (r.id === rp.ras ? " valt" : ""), "aria-pressed": r.id === rp.ras ? "true" : "false",
    onclick: () => {
      // Ett tryck på den valda rasen avmarkerar den
      rp.ras = r.id === rp.ras ? "" : r.id; rp.rasval = []; rp.stoSteg = 0;
      uppdatera();
    },
  },
  el("span", { class: "raskort-namn" }, r.namn)));
  const huvud = el("div", { class: "raskort-rutnat liten" }, kort);
  if (!valt) return [huvud, el("p", { class: "hjalp" }, "Välj rollpersonens ras genom att klicka på ett av korten."), fortsattSparad()];
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
    huvud,
    el("div", { class: "rasinfo" },
      el("h3", { class: "rasrubrik" }, valt.namn),
      valt.beskrivning ? el("p", { class: "raslore" }, valt.beskrivning, " (s. 14–16)") : null,
      el("dl", { class: "rasdata" },
        el("div", {}, el("dt", {}, "BP"), el("dd", {}, valt.bp)),
        el("div", {}, el("dt", {}, "Grundegenskaper"), el("dd", {}, GRUNDEGENSKAPER.filter((g) => valt.mod[g]).map((g) => `${g} ${valt.mod[g] > 0 ? "+" : "−"}${Math.abs(valt.mod[g])}`).join(" · ") || "Inga modifikationer")),
        el("div", {}, el("dt", {}, "STO"), el("dd", {}, `${valt.sto.min}–${valt.sto.max} (normalt ${valt.sto.normal})`)))),
    el("div", { class: "rutor" },
      el("div", {}, el("h4", {}, "Särskilt för ", valt.namn.toLowerCase()),
        el("ul", { class: "punkter" },
          valt.formagor.map((t) => el("li", {}, t, RASFORMAGOR[t] ? infoKnapp(RASFORMAGOR[t], `Om ${t.toLowerCase()}`) : null)),
          valt.primara.length ? el("li", {}, "Extra primära färdigheter: ", valt.primara.map((p, i) => [i ? ", " : "",
            typeof p === "string" ? [p.split(":")[1] ?? fardighetAv(R, p).namn, fardighetsInfo(p.split(":")[0])]
              : [p.valfri === "vapen" ? "valfri vapenfärdighet" : "valfritt hantverk", fardighetsInfo(p.valfri)]])) : null,
          valt.sekundara.length ? el("li", {}, "Sekundära för rasen: ", valt.sekundara.map((p) => fardighetAv(R, p).namn).join(", "),
            infoKnapp(RAS_SEKUNDAR_INFO, "Vad betyder sekundära för rasen?")) : null,
          valt.startbonus.map((b) => el("li", {}, `+${b.bc} på BC i ${fardighetAv(R, b.fardighet).namn}`, fardighetsInfo(b.fardighet))),
          Object.entries(valt.slagbonus).map(([k, v]) => el("li", {}, `+${v} på slaget för ${k === "socialtStand" ? "socialt stånd" : "startkapital"}`,
            infoKnapp(k === "socialtStand" ? "Läggs på slaget för socialt stånd i steg 9. Ett högre stånd ger bättre läs- och skrivkunnighet i modersmålet och ett högre tak för startkapitalet (s. 33)." : "Läggs på slaget för startkapital i steg 10 och ger mer pengar att köpa utrustning för (s. 33).", "Om bonusen"))),
          el("li", {}, "Talar: ", sprak(valt.talaModersmal)),
          el("li", {}, "Läser och skriver: ", sprak(valt.lasaSkrivaModersmal)))),
      extra.length ? el("div", { class: "rasval-extra" }, extra) : null),
  ];
}

// Erbjuder rollpersonen från förra besöket tills spelaren har börjat på en ny
function fortsattSparad() {
  const s = sparadVidStart;
  if (!s) return null;
  const beskr = [rasAv(R, s.rp.ras)?.namn, yrkeAv(R, s.rp.yrke)?.namn, `${s.rp.alder} år`].filter(Boolean).join(", ");
  return el("div", { class: "rutor" }, el("div", {},
    el("p", {}, el("strong", {}, "Du har en sparad rollperson från förra gången: "), `${s.rp.namn || "Namnlös"} (${beskr}).`),
    el("div", { class: "rad" },
      el("button", { type: "button", class: "knapp", id: "fortsatt-sparad", onclick: () => {
        rp = structuredClone(s.rp); aktivtSteg = s.aktivtSteg; langst = s.langst; sparadVidStart = null; uppdatera();
      } }, "Fortsätt med den"),
      el("span", { class: "hjalp" }, "Väljer du en ras börjar du på en ny rollperson, och den sparade försvinner."))));
}

function stegAlder() {
  const ras = rasAv(R, rasId());
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
    el("p", { class: "hjalp" }, "Ålderns modifikationer läggs på grundegenskaperna i steg 6. Blir något slutvärde för lågt justerar du grundvärdena där."),
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
        f.perVal ? delvalKontroll(id, post, rp.yrkesval[i], satt, { yrke: true }) : null, f.perVal ? hjalpFor(post) : null,
        post === "stridskonster" ? stridskonstInfo() : null);
    }
    if (post.valEn) {
      const val = rp.yrkesval[i] ?? {};
      const alt = post.valEn.map((x) => (typeof x === "string" ? x : x.fardighet));
      const f = val.id ? fardighetAv(R, val.id) : null;
      return el("li", {}, el("span", { class: "fnamn" }, alt.map((a) => fardighetAv(R, a).namn).join(" eller ")),
        val.id ? kortBeskrivning(val.id) : alt.map((a) => kortBeskrivning(a, true)),
        el("div", { class: "rad" },
          valLista(id, val.id, alt.map((a) => [a, fardighetAv(R, a).namn]), (v) => satt({ id: v })),
          f?.perVal ? delvalKontroll(`${id}-d`, val.id, val.sub, (v) => satt({ ...val, sub: v }), { yrke: true }) : null),
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
        }, { yrke: true })))),
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
        fardighetsVal("valfri", rp.valfri, (v) => { rp.valfri = v; uppdatera(); }, (f) => f.typ !== "primar" && magiMojlig(f), { yrke: true }),
        rp.valfri?.startsWith("stridskonster") ? stridskonstInfo() : null,
        rp.valfri ? null : el("p", { class: "hjalp" }, "Vilken sekundär färdighet som helst, som blir en yrkesfärdighet. Primära färdigheter har rollpersonen redan. En magiskola kräver ett lyckat magiförmågeslag, som görs i steg 6 när INT och PSY är bestämda.")) : null),
    yrke.automatiska.length ? el("p", { class: "hjalp" }, "Får automatiskt Känna magi och Kunskap om magi med samma FV som i sin magiskola (s. 62, 64).") : null,
  ];
}

function stegExtra(res) {
  const lista = rp.extraYrkesfardigheter;
  const k = R.yrken.extraYrkesfardigheter;
  return [
    el("p", {}, `Den första extra yrkesfärdigheten kostar ${k.forsta} BP, den andra ${k.andra} BP och varje därefter ${k.darefter} BP. En magiskola kostar ${k.magiskola} BP och kräver ett lyckat magiförmågeslag (1T100 högst (INT+PSY)/2, s. 106). Slaget görs i steg 6, när INT och PSY är bestämda.`),
    el("ul", { class: "yrkeslista" }, lista.map((nyckel, i) => el("li", {},
      fardighetsVal(`extra-${i}`, nyckel, (v) => { lista[i] = v; uppdatera(); }, magiMojlig, { yrke: true }),
      nyckel?.startsWith("stridskonster") ? stridskonstInfo() : null,
      el("button", { type: "button", class: "knapp liten", onclick: () => { lista.splice(i, 1); uppdatera(); } }, "Ta bort")))),
    el("button", { type: "button", class: "knapp", onclick: () => { lista.push(""); uppdatera(); } }, "Lägg till yrkesfärdighet"),
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
  const ras = rasAv(R, rasId());
  const aldersmod = R.alder.effekter[res.alderskategori];
  const kostnad = R.grundegenskaper.kostnad;
  const rader = GRUNDEGENSKAPER.map((g) => el("tr", {},
    el("th", { scope: "row" }, g, info(g)),
    el("td", {}, markera(tal(`ge-${g}`, rp.grundvarden[g], (v) => { rp.grundvarden[g] = Math.min(18, Math.max(3, v ?? 3)); uppdatera(); }, { min: 3, max: 18 }), rp.grundvarden[g], TOM().grundvarden[g])),
    el("td", { class: "num" }, kostnad[String(rp.grundvarden[g])] ?? "–"),
    el("td", { class: "num" }, fmtMod(ras.mod[g])),
    el("td", { class: "num" }, fmtMod(aldersmod[g])),
    el("td", { class: "num stor" + (res.grundegenskaper[g] < 3 ? " fel" : "") }, res.grundegenskaper[g])));
  const s = R.grundegenskaper.sto;
  const steg = rp.stoSteg;
  const stoBP = steg > 0 ? s.hojning[steg - 1] : steg < 0 ? -s.sankning[-steg - 1] : 0;
  return [
    el("p", {}, "Köp ett grundvärde (3–18) för varje grundegenskap. Ras och ålder läggs på efteråt. Alla slutvärden måste bli minst 3."),
    res.forLagaEgenskaper.length ? el("div", { class: "varning", role: "note" },
      el("strong", {}, "Höj grundvärdet så att slutvärdet blir minst 3. "),
      `Rasen och åldern (${R.alder.kategorier.find((k) => k.id === res.alderskategori).namn.toLowerCase()}) sänker ${res.forLagaEgenskaper.map((t) => t.split(" ")[0]).join(" och ")} för mycket. Du kan också välja en annan ålder i steg 2.`) : null,
    el("div", { class: "rad" },
      el("button", { type: "button", class: "knapp", onclick: foreslaGrundvarden }, `Föreslå värden för ${res.ras.namn.toLowerCase()} som ${res.yrke.namn.toLowerCase()}`),
      autoAnvand.egenskaper ? el("button", { type: "button", class: "knapp", onclick: () => { rp.grundvarden = TOM().grundvarden; rp.stoSteg = 0; autoAnvand.egenskaper = false; uppdatera(); } }, "Återställ") : null,
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
    res.magiformaga.behovs && [...yrkesNycklar(), ...rp.extraYrkesfardigheter].some((k) => fardighetAv(R, k)?.typ === "magiskola") ? magiformagaKontroll(res) : null,
    el("details", { class: "fakta" }, el("summary", {}, "Vad kostar grundvärdena? (s. 27)"),
      el("p", { class: "hjalp" }, "Den övre raden är grundvärdet du köper, den undre hur många BP det kostar. 3 är gratis, och kostnaden stiger brant över 12. Ett grundvärde på 13 kostar till exempel 14 BP. Kolumnen BP i tabellen ovan visar vad varje värde kostar just nu."),
      el("div", { class: "tabellram" }, el("table", { class: "tabell kostnadstabell" }, el("tbody", {},
        el("tr", {}, el("th", { scope: "row" }, "Grundvärde"), Object.keys(kostnad).map((v) => el("td", { class: "num" }, v))),
        el("tr", {}, el("th", { scope: "row" }, "BP", info("BP")), Object.values(kostnad).map((k) => el("td", { class: "num" }, k))))))),
  ];
}

// Tärningsslag: knappen spärras och tärningen snurrar en stund innan resultatet landar
let rullar = null; // id för slaget som rullas just nu
let manuellaSlag = false; // spelaren skriver in slagen själv i stället för att slå (valet finns i menyn)
const utkastSlag = {}; // inskrivna slag som ännu inte är bekräftade, per slag-id
let nyssSlaget = null; // id för slaget vars resultat precis har landat
const rulltid = () => (matchMedia("(prefers-reduced-motion: reduce)").matches ? 300 : 2500);
const tarningsIkon = () => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("class", "tarning"); svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = '<rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>'
    + [[8, 8], [16, 8], [12, 12], [8, 16], [16, 16]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="currentColor"/>`).join("");
  return svg;
};
// Tärningsrutan ligger i slagfältet. Vid klick snurrar tärningen medan "Slår …" pulserar;
// sedan tonar rutan ut och slaget visas i fältet i stället.
const TONING = 400;
// Rutans text. Rutan kan visa "Slå 2T6", "Slår …" och slaget; de två första ligger osynliga i samma ruta
// (via CSS), så att rutan är lika bred som sin längsta text och inte ändrar storlek under slaget.
const rutText = (synlig, text, klass = "") => el("span", { class: `rutetext ${klass}`.trim(), "data-a": text, "data-b": "Slår …" }, el("span", {}, synlig));
function tarningsKnapp(id, text, sla) {
  const rullarNu = rullar === id;
  return el("button", {
    type: "button", class: "knapp tarningsknapp i-falt" + (rullarNu ? " rullar" : ""), id: `${id}-sla`,
    disabled: rullar !== null, "aria-busy": rullarNu ? "true" : null,
    onclick: () => {
      if (rullar) return;
      rullar = id; rita();
      const tid = rulltid();
      if (tid > TONING * 2) setTimeout(() => document.getElementById(`${id}-sla`)?.classList.add("tona-ut"), tid - TONING);
      setTimeout(() => { rullar = null; nyssSlaget = id; sla(); }, tid);
    },
  }, tarningsIkon(), rutText(rullarNu ? "Slår …" : text, text, rullarNu ? "pulsera" : ""));
}
// Med manuella slag skriver spelaren in slaget och bekräftar det med tärningsrutan
function bekraftaSlag(id, min, max, satt) {
  const giltigt = (v) => Number.isInteger(v) && v >= min && v <= max;
  const knapp = el("button", {
    type: "button", class: "knapp tarningsknapp", id: `${id}-sla`, disabled: !giltigt(utkastSlag[id]),
    onclick: () => {
      const v = utkastSlag[id];
      if (!giltigt(v)) return;
      delete utkastSlag[id];
      nyssSlaget = id; satt(v);
    },
  }, tarningsIkon(), el("span", {}, "Bekräfta slag"));
  const falt = el("input", {
    type: "number", id: `${id}-slag`, class: "tal", min, max, step: 1, value: utkastSlag[id] ?? "",
    title: `${min}–${max}`,
    oninput: (e) => { utkastSlag[id] = e.target.value === "" ? null : Number(e.target.value); knapp.disabled = !giltigt(utkastSlag[id]); },
    onkeydown: (e) => { if (e.key === "Enter" && !knapp.disabled) knapp.click(); },
  });
  return { falt, knapp };
}
// Slagfältet (och, med manuella slag, bekräfta-knappen som läggs sist i raden)
function slagKontroll(id, etikett, text, min, max, satt, slumpa) {
  if (!manuellaSlag) return { slagfalt: falt(etikett, tarningsKnapp(id, text, () => satt(slumpa()))), knapp: null };
  const b = bekraftaSlag(id, min, max, satt);
  return { slagfalt: falt(etikett, b.falt), knapp: b.knapp };
}
const inteSlaget = () => (manuellaSlag ? "Skriv in slaget och bekräfta det." : "Slå tärningen.");
// Låst fält som visar ett gjort val (lagda BP, bonus). Tal visas i ett sifferfält precis som innan det låstes,
// så att siffran inte flyttar sig.
const lastFalt = (id, varde) => el("input", { type: typeof varde === "number" ? "number" : "text", id, class: "tal last", value: varde, readonly: true, "aria-readonly": "true", tabindex: -1 });
// Tärningsrutan när slaget har landat: tärningen ligger kvar på samma plats och slaget står bredvid den
const landatSlag = (id, varde, text) => el("div", { class: "knapp tarningsknapp i-falt landad" + (nyssSlaget === id ? " nytt" : ""), id: `${id}-slag`, "data-varde": varde },
  tarningsIkon(), rutText(varde, text, "slagvarde"));
// Resultatet under slaget; det lyser upp när tärningen nyss har landat
const resultat = (id, text) => el("div", { class: "resultat" },
  el("span", { class: "etikett" }, "Resultat"), el("p", { class: "summering" + (nyssSlaget === id ? " nytt" : "") }, text));

const bpFaltet = (etikett, kontroll) => { const f = falt(etikett, kontroll); f.classList.add("bp-falt"); return f; };

// bonusar: [[text, värde]] från ras, yrke m.m. som läggs på slaget; de visas som punkter och summeras i ett eget fält
function slagSteg(id, nyckel, titel, tarning, tolkning, hjalp, efter = () => {}, bonusar = []) {
  const s = rp[nyckel];
  const bonus = bonusar.reduce((a, [, v]) => a + v, 0);
  const bonuslista = bonusar.length ? el("ul", { class: "punkter bonuslista" }, bonusar.map(([t, v]) => el("li", {}, `${t}: ${fmtMod(v)}`))) : null;
  const [n, sidor] = tarning === "2T20" ? [2, 20] : [2, 6];
  const satt = (falt, v) => { rp[nyckel][falt] = v; efter(); uppdatera(); };
  const bonusfalt = bonus ? falt("Bonus", lastFalt(`${id}-bonus`, fmtMod(bonus))) : null;
  // När slaget är gjort ligger det fast: BP och slag går inte att ändra i efterhand
  if (s.slag !== null && s.slag !== undefined) {
    return [
      el("p", {}, hjalp),
      bonuslista,
      el("div", { class: "rad" },
        bpFaltet("BP lagda", lastFalt(`${id}-bp`, s.bp)),
        falt(`Slag (${tarning})`, landatSlag(id, s.slag, `Slå ${tarning}`)),
        bonusfalt),
      resultat(id, tolkning),
    ];
  }
  const { slagfalt, knapp } = slagKontroll(id, `Slag (${tarning})`, `Slå ${tarning}`, n, n * sidor, (v) => satt("slag", v), () => slaT(n, sidor));
  const bpFalt = rullar === id ? lastFalt(`${id}-bp`, s.bp ?? 0) : tal(`${id}-bp`, s.bp, (v) => satt("bp", Math.max(0, v ?? 0)), { min: 0 });
  return [
    el("p", {}, hjalp),
    bonuslista,
    el("div", { class: "rad" }, bpFaltet("BP att lägga", bpFalt), slagfalt, bonusfalt, knapp),
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
  // Visa bara färdigheter som kan gälla: t.ex. inte en färdighet som redan är primär eller yrkesfärdighet när
  // förmågan kräver en sekundär. Färdigheter som lärs per stad, språk osv. prövas med ett påhittat delval.
  const indata = motorIndata();
  const kan = (f) => passarBland(R, indata, f.perVal ? `${f.id}:\u0000prov` : f.id, bland);
  return fardighetsVal(id, varde, onchange, (f) => !magi(f) && f.typ !== "sprak" && kan(f));
}

function stegFormagor() {
  const sf = sarskildFormaga();
  const s = rp.sarskildaFormagor;
  const tolkning = !s.bp ? "Lägg minst 1 BP för att få slå (högst 40)." :
    s.slag === null || s.slag === undefined ? inteSlaget() :
    `${s.slag} + ${s.bp} = ${s.slag + s.bp}: ${sf?.namn}. ${sf?.effekt} (s. ${sf?.sida})`;
  // Byts förmågan ut gäller inte de gamla valen längre
  const nollstall = () => {
    const ny = sfFor(R, { ...rp, ras: rasId(), yrkesfardigheter: yrkesNycklar() }).formaga;
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
// Magiskolor visas inte om magiförmågeslaget redan har misslyckats
function magiMojlig(f) {
  if (f.typ !== "magiskola" || yrkeAv(R, rp.yrke).magiker || rp.magiformaga?.slag == null) return true;
  return rakna().magiformaga.lyckat;
}

// Platser där rollpersonen har en magiskola som den inte får lära sig (yrkes-, extra- eller sekundär färdighet)
function magiPlatser() {
  const arSkola = (k) => fardighetAv(R, k || "x")?.typ === "magiskola";
  return [
    ...(arSkola(rp.valfri) ? [{ typ: "valfri" }] : []),
    ...rp.extraYrkesfardigheter.flatMap((k, i) => (arSkola(k) ? [{ typ: "extra", i }] : [])),
    ...rp.sekundara.filter(arSkola).map((k) => ({ typ: "sekundar", nyckel: k })),
  ];
}

// Misslyckas magiförmågeslaget öppnas en dialog där magiskolan byts mot en annan färdighet direkt
function magiDialog(res) {
  $("#magidialog")?.remove();
  const misslyckat = !res.magiformaga.lyckat && rp.magiformaga?.slag != null && !yrkeAv(R, rp.yrke).magiker;
  if (!magiByte && misslyckat) magiByte = magiPlatser()[0] ?? null;
  if (!misslyckat) magiByte = null;
  document.body.classList.toggle("dialog-oppen", Boolean(magiByte));
  if (!magiByte) return;
  const m = res.magiformaga;
  const plats = magiByte;
  const varde = plats.typ === "valfri" ? rp.valfri : plats.typ === "extra" ? rp.extraYrkesfardigheter[plats.i] : plats.nyckel;
  const skolaKvar = fardighetAv(R, varde || "x")?.typ === "magiskola";
  const klar = !skolaKvar && !paborjad(varde ?? "");
  const satt = (v) => {
    if (plats.typ === "valfri") rp.valfri = v;
    else rp.extraYrkesfardigheter[plats.i] = v;
    uppdatera();
  };
  const val = plats.typ === "sekundar"
    ? el("p", {}, el("button", { type: "button", class: "knapp", onclick: () => {
      rp.sekundara = rp.sekundara.filter((k) => k !== plats.nyckel); delete rp.fardigheter[plats.nyckel]; magiByte = null; uppdatera();
    } }, `Ta bort ${fardighetAv(R, plats.nyckel).namn}`))
    : falt(plats.typ === "valfri" ? "Ny valfri yrkesfärdighet" : "Ny extra yrkesfärdighet",
      fardighetsVal("magibyte", skolaKvar ? "" : varde, satt,
        (f) => f.typ !== "magiskola" && (plats.typ !== "valfri" || f.typ !== "primar"), { yrke: true }));
  const dialog = el("div", { id: "magidialog", class: "dialog-bakgrund" },
    el("div", { class: "dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "magidialog-rubrik" },
      el("h2", { id: "magidialog-rubrik" }, "Magiförmågeslaget misslyckades"),
      el("p", {}, `Slaget blev ${m.slag}${m.mod ? ` ${m.mod > 0 ? "+" : "−"} ${Math.abs(m.mod)}` : ""}, men måste vara högst ${m.chans}. Rollpersonen kan inte lära sig magi (s. 106).`),
      el("p", {}, plats.typ === "sekundar"
        ? `${fardighetAv(R, plats.nyckel).namn} måste tas bort från de sekundära färdigheterna.`
        : `${plats.typ === "valfri" ? "Den valfria yrkesfärdigheten" : "Den extra yrkesfärdigheten"} var en magiskola. Välj en annan färdighet i stället.`),
      val,
      (varde ?? "").startsWith("stridskonster") ? stridskonstInfo() : null,
      plats.typ === "sekundar" ? null : el("div", { class: "dialog-fot" },
        el("button", { type: "button", class: "knapp primar", id: "magidialog-klar", disabled: !klar, onclick: () => { magiByte = null; rita(); } }, "Klar"))));
  document.body.append(dialog);
  if (!dialog.contains(document.activeElement)) dialog.querySelector("select, button")?.focus();
}

function magiRad(m, satt) {
  const { slagfalt, knapp } = slagKontroll("magiformaga", "Slag (1T100)", "Slå 1T100", 1, 100, satt, () => slaT(1, 100));
  return el("div", { class: "rad" }, slagfalt, m.mod ? falt("Modifikation", lastFalt("magiformaga-mod", fmtMod(m.mod))) : null, knapp);
}

function magiformagaKontroll(res) {
  const m = res.magiformaga;
  const satt = (v) => {
    rp.magiformaga = { slag: v };
    uppdatera();
  };
  return el("div", { class: "rutor" }, el("div", { class: "magislag" },
    el("h3", {}, "Magiförmågeslag"),
    el("p", { class: "hjalp" }, "Rollpersonen har en magiskola men är inte magiker. Då måste ett magiförmågeslag lyckas. Misslyckas det kan rollpersonen inte lära sig magi, och magiskolan måste bytas mot en annan färdighet."),
    el("p", {}, `Slå 1T100. Slaget${m.mod ? ` ${m.mod > 0 ? "+" : "−"} ${Math.abs(m.mod)}` : ""} måste bli högst ${m.chans}, det vill säga (INT+PSY)/2 avrundat uppåt (s. 106). Det görs en gång.`),
    m.slag === null ? magiRad(m, satt)
      : el("div", { class: "rad" },
        falt("Slag (1T100)", landatSlag("magiformaga", m.slag, "Slå 1T100")),
        m.mod ? falt("Modifikation", lastFalt("magiformaga-mod", fmtMod(m.mod))) : null),
    m.slag !== null ? resultat("magiformaga", `${m.slag}${m.mod ? ` ${m.mod > 0 ? "+" : "−"} ${Math.abs(m.mod)} = ${m.slag + m.mod}` : ""} ${m.lyckat ? "≤" : ">"} ${m.chans}: ${m.lyckat ? "Lyckat. Rollpersonen kan lära sig magi." : "Misslyckat. Rollpersonen kan inte lära sig magi."}`) : null));
}

function stegSvardshand(res) {
  const sf = sarskildFormaga();
  if (sf && ["Dubbelhänt", "Ambidextriös"].includes(sf.namn)) {
    return [el("p", { class: "summering" }, `Den särskilda förmågan ger ${sf.namn.toLowerCase()} rollperson, så du behöver inte slå (s. 32).`)];
  }
  return slagSteg("sh", "svardshand", "Svärdshand", "2T6",
    rp.svardshand.slag === null ? inteSlaget() : `${rp.svardshand.slag} + ${rp.svardshand.bp} = ${rp.svardshand.slag + rp.svardshand.bp}: ${res.slag.svardshand}.`,
    "Slå 2T6 plus lagda BP: 2–11 höger, 12–14 vänster, 15–18 dubbelhänt, 19+ ambidextriös.");
}

function stegStand(res) {
  const ras = rasAv(R, rasId());
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
    rp.socialtStand.slag === null ? inteSlaget() :
      `${rp.socialtStand.slag} + ${rp.socialtStand.bp}${bonus ? ` + ${bonus} (${ras.namn.toLowerCase()})` : ""} = ${res.slag.ssResultat}: ${res.slag.socialtStand}.`,
    "Slå 2T6 plus lagda BP. Socialt stånd påverkar läs- och skrivkunnighet i modersmålet och taket för startkapitalet.",
    undefined, bonus ? [[`Ras (${ras.namn.toLowerCase()})`, bonus]] : []), valja];
}

function stegKapital(res) {
  const halva = Math.ceil(rp.socialtStand.bp / 2);
  const alderEff = R.alder.efterAr.find((r) => r.max === null || rp.alder <= r.max);
  const ras = rasAv(R, rasId());
  const yrke = yrkeAv(R, rp.yrke);
  const bonusar = [
    halva ? ["Halva BP från socialt stånd", halva] : null,
    ras.slagbonus.startkapital ? [`Ras (${ras.namn.toLowerCase()})`, ras.slagbonus.startkapital] : null,
    yrke.slagbonus?.startkapital ? [`Yrke (${yrke.namn.toLowerCase()})`, yrke.slagbonus.startkapital] : null,
  ].filter(Boolean);
  return slagSteg("sk", "startkapital", "Startkapital", "2T6",
    rp.startkapital.slag === null ? inteSlaget() :
      `Resultat ${res.slag.skResultat} (taket är socialt stånd ${res.slag.ssResultat} + ${yrke.kapitaltak ?? 10}). Ålder ger ×${String(alderEff.kapital).replace(".", ",")}: ${sm(res.slag.startkapital)}.`,
    `Slå 2T6 plus lagda BP. Bonusarna nedan läggs på slaget. Resultatet kan inte bli högre än socialt stånd + ${yrke.kapitaltak ?? 10}.`, undefined, bonusar);
}

// EP per FV för en ny sekundär färdighet (s. 35–36)
function sekundarPris(nyckel) {
  const k = R.fardigheter.kostnad;
  if ((nyckel || "").startsWith("stridskonster")) return 3; // billigaste stilen: en teknik à 0,5 → 1, plus 2 (s. 68)
  return fardighetAv(R, nyckel || "x")?.typ === "magiskola" ? k.magiskolaSekundar : k.sekundar;
}

function nySekundarInfo(res) {
  const pris = sekundarPris(nySekundar);
  const typ = fardighetAv(R, nySekundar || "x")?.typ === "magiskola" ? "En magiskola som sekundär färdighet" : "En sekundär färdighet";
  const text = nySekundar.startsWith("stridskonster")
    ? `Stridskonster som sekundär färdighet har ingen baschans. Varje FV kostar teknikernas grundkostnad plus 2 EP, minst ${pris} EP. Teknikerna väljer du när stilen är tillagd. Du har ${res.ep.kvar} EP kvar.`
    : `${typ} har ingen baschans och kostar ${pris} EP per FV. Du har ${res.ep.kvar} EP kvar, vilket räcker till FV ${Math.floor(res.ep.kvar / pris)}.`;
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
      el("td", { class: "num" }, markera(tal(`fv-${f.nyckel}`, f.fv, (v) => { rp.fardigheter[f.nyckel] = v ?? 0; uppdatera(); }, { min: 0, max: 30 }), f.fv, f.start),
        el("span", { class: "bniva" }, f.kategoriB ? bniva(f.fv) : "")),
      el("td", { class: "num" }, f.ep || ""))))));
  const harRedan = new Set([...yrkesNycklar(), ...rp.extraYrkesfardigheter, ...rp.sekundara]);
  return [
    el("p", {}, `Du har ${res.ep.start} EP: ${R.alder.efterAr.find((r) => r.max === null || rp.alder <= r.max).ep} för åldern och 5 per överblivet BP. Primära och yrkesfärdigheter har gratis baschans (BC). FV får inte vara högre än grundegenskapen vid start.`),
    el("div", { class: "rad" },
      el("button", { type: "button", class: "knapp", onclick: fordelaEP }, `Fördela EP automatiskt för ${res.yrke.namn.toLowerCase()}`),
      autoAnvand.fardigheter ? el("button", { type: "button", class: "knapp", onclick: () => { rp.fardigheter = {}; rp.besvarjelser = {}; autoAnvand.fardigheter = false; uppdatera(); } }, "Nollställ FV") : null,
      el("span", { class: "hjalp" }, "Fördelningen ersätter dina nuvarande FV. Yrkesfärdigheterna får mest, sedan sekundära färdigheter du har lagt till och primära färdigheter med hög grundegenskap. Lägg till sekundära färdigheter först om du vill ha med dem. Du kan justera efteråt.")),
    grupper.map(([st, titel, pris]) => {
      const lista = res.fardigheter.filter((f) => f.status === st);
      return lista.length ? [el("h3", {}, titel, el("span", { class: "pris" }, pris)), tabell(lista)] : null;
    }),
    res.fardigheter.filter((f) => f.tekniker).map((f) => stridskonstTekniker(f, res)),
    el("h3", {}, "Lär dig en ny sekundär färdighet"),
    el("div", { class: "rad" },
      // Färdigheter som rollpersonen redan har visas inte; för dem med delval spärras de delval som redan finns
      fardighetsVal("ny-sek", nySekundar, (v) => { nySekundar = v; rita(); }, (f) => f.typ !== "primar" && magiMojlig(f) && (f.perVal || !harRedan.has(f.id))),
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
    res.magiformaga.behovs ? magiformagaKontroll(res) : null,
  ];
}

// Stridskonster namnges där färdigheten väljs, men teknikerna väljs i steg 11
const stridskonstInfo = () => el("p", { class: "yrkesformaga stridskonst-info", role: "note" }, el("strong", {}, "Tekniker: "),
  "Teknikerna i stilen väljer du i steg 11, Färdigheter. Där kan du också byta namn på stilen.");

// Stridskonster: spelaren sätter ihop sin stil av tekniker. Summan av deras grundkostnad,
// avrundad uppåt, är EP per FV; 2 till om stilen inte är yrkesfärdighet (s. 68).
function stridskonstTekniker(f, res) {
  const valda = rp.stridskonstTekniker[f.nyckel] ?? [];
  const lista = R.fardigheter.stridskonstTekniker;
  const kostnadFor = (t) => lista.find(([n]) => n === t)?.[1] ?? 0;
  const summa = valda.reduce((a, t) => a + kostnadFor(t), 0);
  const tillagg = f.status === "yrke" ? 0 : 2;
  const fardig = Boolean(rp.stridskonstFardig?.[f.nyckel]);
  const vaxla = (namn, pa) => {
    const ny = pa ? [...valda, namn] : valda.filter((t) => t !== namn);
    rp.stridskonstTekniker = { ...rp.stridskonstTekniker, [f.nyckel]: ny };
    uppdatera();
  };
  // En teknik till höjer priset för alla FV över baschansen; den går inte att välja om EP inte räcker.
  // Är inget FV köpt än räknas det första, eftersom stilen annars inte går att höja alls.
  const merEP = (kostnad) => Math.max(f.fv - f.start, 1) * (Math.ceil(summa + kostnad) + tillagg) - f.ep;
  const tal = (x) => x.toLocaleString("sv-SE", { minimumFractionDigits: 1 });
  const stil = f.nyckel.split(":")[1] ?? "";
  const summering = el("p", { class: "summering" }, valda.length
    ? `Grundkostnad ${tal(summa)}, avrundat uppåt ${Math.ceil(summa)}${tillagg ? `, plus 2 = ${f.epPerFV}` : ""} EP per FV.`
    : "Inga tekniker valda än. Välj minst en innan du höjer FV.");
  if (fardig) {
    return el("div", { class: "stridskonst fardig" },
      el("h3", {}, `${f.namn}: stilens tekniker`),
      el("ul", { class: "teknikbeskrivningar" }, valda.map((t) => el("li", {},
        el("strong", {}, t), el("p", { class: "hjalp" }, R.fardigheter.stridskonstBeskrivning?.[t] ?? "")))),
      summering,
      el("div", { class: "rad" }, el("button", { type: "button", class: "knapp", id: `sk-andra-${idDel(f.nyckel)}`, onclick: () => {
        rp.stridskonstFardig = { ...rp.stridskonstFardig, [f.nyckel]: false }; uppdatera();
      } }, "Ändra")));
  }
  return el("div", { class: "stridskonst" },
    el("h3", {}, `${f.namn}: stilens tekniker`),
    falt("Stilens namn", el("input", { type: "text", id: `sk-namn-${idDel(f.nyckel)}`, value: stil, maxlength: 125,
      onchange: (e) => bytStilnamn(f.nyckel, e.target.value.trim()) })),
    el("p", { class: "hjalp" }, "Välj vilka tekniker stilen består av. FV gäller alla tekniker i stilen. Varje tekniks grundkostnad läggs ihop och avrundas uppåt; det blir EP per FV",
      tillagg ? ", plus 2 eftersom stilen inte är en yrkesfärdighet. " : ". ",
      "Tekniker som skulle göra stilen dyrare än du har EP till går inte att välja (minst ett köpt FV räknas). † fungerar bara mot människoliknande motståndare (s. 68–70)."),
    el("div", { class: "teknikrutnat" }, lista.map(([namn, kostnad], i) => {
      const text = R.fardigheter.stridskonstBeskrivning?.[namn];
      const vald = valda.includes(namn);
      const for_dyr = !vald && merEP(kostnad) > res.ep.kvar;
      // Info-knappen ligger utanför etiketten, så att ett tryck på den inte kryssar i tekniken
      return el("div", { class: "teknik" + (for_dyr ? " for-dyr" : "") },
        el("label", { title: for_dyr ? `Kräver ${merEP(kostnad)} EP till, du har ${res.ep.kvar}` : null },
          el("input", { type: "checkbox", id: `teknik-${idDel(f.nyckel)}-${i}`, checked: vald, disabled: for_dyr, onchange: (e) => vaxla(namn, e.target.checked) }),
          el("span", {}, namn)),
        text ? el("button", { type: "button", class: "info", "data-tip": `${text} (s. 69–70)`, "aria-label": `Om ${namn.replace("†", "")}` }, "i") : null,
        el("span", { class: "teknikpris" }, tal(kostnad)));
    })),
    summering,
    el("div", { class: "rad" }, el("button", { type: "button", class: "knapp primar", id: `sk-fardig-${idDel(f.nyckel)}`, disabled: !valda.length, onclick: () => {
      rp.stridskonstFardig = { ...rp.stridskonstFardig, [f.nyckel]: true }; uppdatera();
    } }, "Färdigställ stridskonst")));
}

const idDel = (nyckel) => nyckel.replace(/[^a-z0-9]/gi, "-");

// Byter namn på en stridskonst överallt där nyckeln finns: yrkesval, extra yrkesfärdigheter,
// sekundära färdigheter, FV och valda tekniker
function bytStilnamn(gammal, namn) {
  const ny = `stridskonster:${namn}`;
  if (!namn || ny === gammal) { rita(); return; }
  if (rakna().fardigheter.some((x) => x.nyckel === ny)) { visaNotis(`Det finns redan en stil som heter ${namn}.`); rita(); return; }
  const gammaltNamn = gammal.split(":")[1];
  for (const [i, v] of Object.entries(rp.yrkesval)) {
    const post = yrkeAv(R, rp.yrke).fardigheter[i];
    if (post === "stridskonster" && v === gammaltNamn) rp.yrkesval[i] = namn;
    else if (v?.id === "stridskonster" && v.sub === gammaltNamn) rp.yrkesval[i] = { ...v, sub: namn };
  }
  if (rp.valfri === gammal) rp.valfri = ny;
  rp.extraYrkesfardigheter = rp.extraYrkesfardigheter.map((k) => (k === gammal ? ny : k));
  rp.sekundara = rp.sekundara.map((k) => (k === gammal ? ny : k));
  for (const falt of ["fardigheter", "stridskonstTekniker", "stridskonstFardig"]) {
    if (rp[falt] && gammal in rp[falt]) {
      rp[falt] = Object.fromEntries(Object.entries(rp[falt]).map(([k, v]) => [k === gammal ? ny : k, v]));
    }
  }
  uppdatera();
}

// ------------------------------------------------------------ besvärjelser (s. 36, 106–129)
function stegBesvarjelser(res) {
  const B = R.besvarjelser;
  const skola = skolFV(res.fardigheter);
  const kanMagi = res.yrke.magiker || res.magiformaga.lyckat;
  const psy = res.grundegenskaper.PSY;
  if (!kanMagi || skola.allman === 0) {
    return [el("p", { class: "summering" }, "Rollpersonen har ingen magiskola och kan inte lära sig besvärjelser. Gå vidare till utrustningen."),
      el("p", { class: "hjalp" }, "Magiker får en magiskola som yrkesfärdighet. Andra kan lära sig en skola som extra yrkesfärdighet i steg 4 eller som sekundär färdighet i steg 11, om magiförmågeslaget lyckas (s. 106).")];
  }
  const satt = (nyckel, fv) => {
    const ny = { ...rp.besvarjelser };
    if (fv > 0) ny[nyckel] = fv; else delete ny[nyckel];
    rp.besvarjelser = ny;
    uppdatera();
  };
  const fvFor = (nyckel) => rp.besvarjelser[nyckel] ?? 0;
  const rad = (b, nyckel, namn, extra = null) => {
    const fv = fvFor(nyckel);
    const per = besvarjelsePris(R, b.sv);
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

// ------------------------------------------------------------ utrustning (s. 38, 89–102)
let utrustningsFilter = ""; // fritextsökningen i utrustningssteget
let utrustningsKategori = "Äventyrarutrustning";

function stegUtrustning(res) {
  const U = R.utrustning;
  const varden = res.grundegenskaper;
  const u = res.utrustning;
  const katalog = varukatalog(R).filter((x) => !["Närstridsvapen", "Avståndsvapen", "Kastvapen", "Sköldar"].includes(x.kategori) || kanAnvandaVapen(R, x.namn, varden));
  const kategorier = [...new Set(katalog.map((x) => x.kategori))];
  const antal = (namn) => rp.utrustning[namn] ?? 0;
  const andra = (namn, d) => {
    const ny = { ...rp.utrustning, [namn]: Math.max(0, antal(namn) + d) };
    if (!ny[namn]) delete ny[namn];
    rp.utrustning = ny;
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
    onclick: () => { utrustningsKategori = k; utrustningsFilter = ""; rita(); },
  }, k)));
  const filtrera = () => {
    const text = utrustningsFilter.trim().toLowerCase();
    let synliga = 0;
    for (const rad of rader) {
      rad.hidden = text ? !rad.dataset.namn.includes(text) : rad.dataset.kategori !== utrustningsKategori;
      if (!rad.hidden) synliga++;
    }
    tabell.classList.toggle("sokning", !!text);
    flikar.classList.toggle("sokning", !!text);
    tabell.hidden = !synliga;
    ingenTraff.hidden = !!synliga;
    ingenTraff.textContent = synliga ? "" : `Inga varor matchar ”${utrustningsFilter.trim()}”.`;
  };
  const sok = el("input", {
    type: "search", id: "varusok", class: "sokfalt", value: utrustningsFilter, placeholder: "Sök bland alla varor …", "aria-label": "Sök utrustning",
    oninput: (e) => { utrustningsFilter = e.target.value; filtrera(); },
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
        el("input", { type: "checkbox", id: "startpaket", checked: rp.startpaket.valt, onchange: (e) => { rp.startpaket = { valt: e.target.checked, vapen: "" }; uppdatera(); } }),
        el("span", {}, el("strong", {}, "Gratis startpaket"), `: ${U.startpaket.varor.map((v) => v.replace(/ \(.*\)/, "").toLowerCase()).join(", ")} och ett enkelt vapen (högst ${U.startpaket.vapenMaxPris} sm). Husregel; fråga spelledaren.`)),
      rp.startpaket.valt ? falt("Startpaketets vapen", gruppLista("startpaket-vapen", rp.startpaket.vapen, paketVapen,
        (v) => { rp.startpaket = { ...rp.startpaket, vapen: v }; uppdatera(); }, "Välj vapen …")) : null)),
    el("h3", {}, "Köp"),
    flikar,
    sok,
    ingenTraff,
    tabell,
    u.saker.length ? [el("h3", {}, "Packning"), el("ul", { class: "packning" }, u.saker.map((x) =>
      el("li", {}, el("span", {}, sakNamn(x)), el("span", { class: "num hjalp" }, x.gratis ? "gratis" : sm(x.pris * x.antal)))))] : null,
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
      el("p", {}, [rp.ras ? res.ras.namn : null, res.yrke.namn, `${rp.alder} år`, rp.kon].filter(Boolean).join(" · "))),
    el("div", { class: "potter" },
      el("div", { class: "pott" + (res.bp.kvar < 0 ? " over" : "") }, el("span", { class: "etikett" }, "BP kvar", info("BP")),
        el("span", { class: "pott-tal" }, res.bp.kvar), el("span", { class: "matare" }, el("span", { style: `width:${bpProcent}%` })),
        el("span", { class: "hjalp" }, `av ${res.bp.start}`)),
      el("div", { class: "pott" + (res.ep.kvar < 0 ? " over" : "") }, el("span", { class: "etikett" }, "EP kvar", info("EP")),
        el("span", { class: "pott-tal" }, res.ep.kvar), el("span", { class: "matare" }, el("span", { style: `width:${epProcent}%` })),
        el("span", { class: "hjalp" }, `av ${res.ep.start}`))),
    saknas(res).length ? el("div", { class: "saknaslista", role: "status" }, el("strong", {}, "Kvar att välja"), el("ul", {}, saknas(res).map((f) => el("li", {}, f))))
      : el("p", { class: "klar" }, "Rollpersonen är klar."),
    // Förkortning och värde centrerade; infoikonen längst ned i rutan
    el("dl", { class: "egenskaper" }, [...GRUNDEGENSKAPER, "STO"].map((k) => el("div", {}, el("dt", {}, k), el("dd", {}, g[k]), el("dd", { class: "egenskap-info" }, info(k))))),
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
    el("ul", { class: "kroppsdelar" }, [0, 1].map(() => el("li", { class: "kolumnrubrik" }, el("span", {}, "Kroppsdel"), el("span", { class: "num" }, "KP"))),
      h.kroppsdelar.map((d) => el("li", {}, el("span", {}, d.namn), el("span", { class: "num" }, d.kp)))),
    res.sarskildFormaga ? [el("h3", {}, "Särskild förmåga"), el("p", {}, el("strong", {}, res.sarskildFormaga.namn), " ", res.sarskildFormaga.effekt)] : null,
    el("p", {}, el("strong", {}, "Yrkesförmåga: "), res.yrke.yrkesformaga),
    el("h3", {}, "Färdigheter", info("B-nivå")),
    el("ul", { class: "fardighetsrader" }, kolumnrubrik("Färdighet", "FV"), res.fardigheter.filter((f) => f.fv > 0).map((f) =>
      el("li", { class: f.status }, el("span", {}, f.kategoriB ? medNiva(f.namn, slaUpp(R.fardigheter.bNivaer, f.fv)) : f.namn), el("span", { class: "num" }, f.fv)))),
    res.besvarjelser.length ? [el("h3", {}, "Besvärjelser"), el("ul", { class: "fardighetsrader" }, kolumnrubrik("Besvärjelse", "FV"), res.besvarjelser.map((b) =>
      el("li", {}, el("span", {}, b.namn), el("span", { class: "num" }, b.fv))))] : null,
    res.utrustning.saker.length ? [el("h3", {}, "Utrustning"), el("ul", { class: "fardighetsrader" }, kolumnrubrik("Sak", "Vikt"), res.utrustning.saker.map((x) =>
      el("li", {}, el("span", {}, sakNamn(x)), el("span", { class: "num" }, x.vikt ? `${kg(x.vikt)} kg` : "–")))),
    el("p", {}, `Pengar kvar: ${sm(res.utrustning.kvar)}. Bördan är ${kg(res.utrustning.borda)} av ${res.utrustning.barformaga} kg (kläder räknas inte, buren rustning till hälften).`)] : null,
  );
}

// Saker som säljs i förpackningar, som "Pilar (10 st)", visas med det totala antalet: två förpackningar blir "Pilar (x20)"
function sakNamn(x) {
  const m = x.namn.match(/^(.*) \((?:(.*), )?(\d[\d ]*) st\)$/);
  if (m) return `${m[1]} (${m[2] ? `${m[2]}, ` : ""}x${Number(m[3].replace(/ /g, "")) * x.antal})`;
  return x.antal > 1 ? medNiva(x.namn, `x${x.antal}`) : x.namn; // "Trätunna (100 liter, x2)"
}

// B-nivån skrivs i parentes efter namnet, eller i namnets egen parentes: "Kulturkännedom (Dvärgar, B3)"
const medNiva = (namn, niva) => (namn.endsWith(")") ? `${namn.slice(0, -1)}, ${niva})` : `${namn} (${niva})`);
const kolumnrubrik = (namn, varde) => el("li", { class: "kolumnrubrik" }, el("span", {}, namn), el("span", { class: "num" }, varde));

// Val som ännu inte är gjorda, per steg. Ett steg med obligatoriska val kvar går inte att lämna framåt.
function saknasPerSteg(res) {
  const lista = Object.fromEntries(STEG.map((st) => [st.id, []]));
  const yrke = yrkeAv(R, rp.yrke);
  const ras = rasAv(R, rasId());
  const klar = (v) => !paborjad(v ?? "");
  if (!rp.ras) lista.ras.push("Ras");
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
  lista.egenskaper.push(...res.forLagaEgenskaper);
  lista.formagor.push(...res.saknas);
  // Magiförmågeslaget görs i steg 6 (eller 11 för en sekundär magiskola); misslyckas det ska skolan bytas ut
  if (res.vantar.length) {
    const arSkola = (k) => fardighetAv(R, k)?.typ === "magiskola";
    const iYrke = yrkesNycklar().some(arSkola);
    const iExtra = rp.extraYrkesfardigheter.some(arSkola);
    if (rp.magiformaga?.slag == null) (iYrke || iExtra ? lista.egenskaper : lista.fardigheter).push("Magiförmågeslaget");
    // Bytet görs i en dialog i samma steg som slaget, så rollpersonen skickas inte tillbaka till steg 3
    else (iYrke || iExtra ? lista.egenskaper : lista.fardigheter).push("Magiförmågeslaget misslyckades: byt magiskolan mot en annan färdighet");
  }
  for (const f of res.fardigheter.filter((x) => x.tekniker && !x.tekniker.length)) lista.fardigheter.push(`${f.namn}: välj stilens tekniker`);
  if (rp.startpaket.valt && !rp.startpaket.vapen) lista.utrustning.push("Startpaketets vapen");
  if (rp.svardshand.slag === null && !(res.sarskildFormaga?.regel ?? []).some((d) => d.typ === "svardshand")) lista.svardshand.push("Slaget för svärdshand");
  if (rp.socialtStand.slag === null && !rp.socialtStand.valt) lista.stand.push("Slaget för socialt stånd");
  if (rp.startkapital.slag === null) lista.kapital.push("Slaget för startkapital");
  return lista;
}

function saknas(res) {
  const perSteg = saknasPerSteg(res);
  return synligaSteg(res).flatMap((st, i) => perSteg[st.id].map((t) => `${t} (steg ${i + 1})`));
}

// Första steget som har obligatoriska val kvar; senare steg går inte att öppna.
function forstaOfardiga(res) {
  const perSteg = saknasPerSteg(res);
  const lista = synligaSteg(res);
  const i = lista.findIndex((st) => perSteg[st.id].length);
  return i === -1 ? lista.length : i;
}

// Steget Besvärjelser visas bara för rollpersoner som kan lära sig magi
function synligaSteg(res) {
  const kanMagi = (res.yrke.magiker || res.magiformaga.lyckat) && skolFV(res.fardigheter).allman > 0;
  return kanMagi ? STEG : STEG.filter((s) => s.id !== "besvarjelser");
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
      rp.grundvarden = varden;
      autoAnvand.egenskaper = true;
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
  const hadeBesvarjelser = Object.keys(rp.besvarjelser).length > 0;
  rp.fardigheter = {};
  rp.besvarjelser = {}; // besvärjelserna bygger på skolornas FV och väljs om i nästa steg
  provar = true;
  const borjan = rakna();
  const vikt = {};
  for (const f of borjan.fardigheter) {
    const def = fardighetAv(R, f.nyckel);
    const ge = borjan.grundegenskaper[f.grundegenskap] ?? 10;
    if (def.typ === "sprak") vikt[f.nyckel] = 0.3;
    else if (f.status === "yrke") vikt[f.nyckel] = 4 + (def.typ === "magiskola" ? 2 : 0) + (def.id === "vapen" ? 1 : 0);
    else if (f.status === "sekundar") vikt[f.nyckel] = 3;
    else vikt[f.nyckel] = Math.max(0.3, 1 + (ge - 10) / 5);
  }
  const epPerFV = (f) => f.epPerFV || 99;
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
  else autoAnvand.fardigheter = true;
  uppdatera();
  visaNotis(`EP är fördelade. ${rakna().ep.kvar} EP blev över.${hadeBesvarjelser ? " Besvärjelserna togs bort och får väljas om." : ""}`);
}

// ------------------------------------------------------------ steg 12: spara och exportera
function filnamn() {
  return `${(rp.namn || "rollperson").trim().replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.json`;
}

const filtext = () => JSON.stringify(tillFil(rp), null, 2);

function stegExport(res) {
  const text = filtext();
  return [
    el("p", { class: "summering" }, `${rp.namn} är klar: ${res.ras.namn.toLowerCase()}, ${res.yrke.namn.toLowerCase()}, ${rp.alder} år.`),
    el("p", {}, "Spara rollpersonen som en JSON-fil. Filen kan läsas in igen med knappen Läs in fil högst upp, till exempel för att fortsätta på en annan dator."),
    el("p", {}, "Rollformuläret ser ut som bokens (s. 11–12) och kan skrivas ut eller sparas som PDF. Det du skriver i det under spel, som erf och pengar, sparas i samma fil."),
    el("div", { class: "rad" },
      el("button", { type: "button", class: "knapp primar", onclick: visaFormular }, "Visa rollformuläret"),
      el("button", { type: "button", class: "knapp", onclick: laddaNer }, `Ladda ner ${filnamn()}`),
      el("button", { type: "button", class: "knapp", onclick: () => kopiera(text) }, "Kopiera JSON")),
    el("details", { class: "fakta" }, el("summary", {}, "Visa JSON"),
      el("textarea", { id: "exportruta", rows: 12, readonly: true, "aria-label": "Rollpersonen som JSON" }, text)),
  ];
}

function laddaNer() {
  const url = URL.createObjectURL(new Blob([filtext()], { type: "application/json" }));
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
    const data = franFil(JSON.parse(text));
    const fore = rp;
    rp = fyllUt(data);
    const fel = rakna().fel;
    if (fel.length) {
      rp = fore;
      throw new Error(`den bryter mot reglerna (${fel[0]})`);
    }
    langst = STEG.length - 1; // en inläst rollperson är redan genomgången
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
  $(".layout").style.display = vy === "formular" ? "none" : "";
  $("#rf-vy").hidden = vy !== "formular";
  $("#visa-formular").setAttribute("aria-pressed", String(vy === "formular"));
  if (vy === "formular") { ritaFormularVy(res); return; }
  const STEG = synligaSteg(res); // stegen som visas just nu
  const grans = forstaOfardiga(res);
  if (!STEG.some((s) => s.id === aktivtSteg)) aktivtSteg = "fardigheter"; // ett dolt steg lämnas
  // Står man på ett steg bortom gränsen (t.ex. efter att ha ändrat yrke) flyttas man tillbaka
  // (inte medan en magiskola byts ut i dialogen, då är den valfria färdigheten tillfälligt ofullständig)
  if (!magiByte && STEG.findIndex((s) => s.id === aktivtSteg) > grans) aktivtSteg = STEG[grans].id;
  langst = Math.max(langst, STEG.findIndex((s) => s.id === aktivtSteg));
  const oppna = Math.min(grans, langst);
  const rail = $("#steg");
  rail.replaceChildren(...STEG.map((s, i) => el("li", {},
    el("button", { type: "button", class: "steg-knapp" + (s.id === aktivtSteg ? " aktiv" : ""), "aria-current": s.id === aktivtSteg ? "step" : null,
      disabled: i > oppna, title: i > oppna ? "Gör klart de tidigare stegen först" : null,
      onclick: () => { aktivtSteg = s.id; uppdatera(); $("#arbetsyta").focus({ preventScroll: true }); } },
    el("span", { class: "steg-nr" }, i + 1), el("span", { class: "steg-namn" }, s.namn),
    s.bp ? el("span", { class: "steg-bp" }, bpForSteg(s.id, res)) : null))));

  const steg = STEG.find((s) => s.id === aktivtSteg);
  const index = STEG.indexOf(steg);
  const innehall = {
    ras: stegRas, alder: stegAlder, yrke: stegYrke, extra: stegExtra, kon: stegKon, egenskaper: stegEgenskaper,
    formagor: stegFormagor, svardshand: stegSvardshand, stand: stegStand, kapital: stegKapital, fardigheter: stegFardigheter,
    besvarjelser: stegBesvarjelser, utrustning: stegUtrustning, export: stegExport,
  }[steg.id](res);
  const kvar = saknasPerSteg(res)[steg.id];
  $("#arbetsyta").replaceChildren(
    el("header", { class: "steg-huvud" },
      el("div", { class: "steg-titel" },
        el("span", { class: "eyebrow" }, `Steg ${index + 1} av ${STEG.length}${steg.sida === "–" ? "" : ` · s. ${steg.sida}`}`),
        el("h2", {}, steg.namn)),
      el("dl", { class: "steg-potter", "aria-label": "Kvar att spendera" },
        el("div", { class: res.bp.kvar < 0 ? "over" : "" }, el("dt", {}, "BP kvar", info("BP")), el("dd", {}, res.bp.kvar)),
        el("div", { class: res.ep.kvar < 0 ? "over" : "" }, el("dt", {}, "EP kvar", info("EP")), el("dd", {}, res.ep.kvar)),
        // I steg där pengar spenderas visas också kvarvarande pengar av startkapitalet
        steg.id === "utrustning" ? el("div", { class: res.utrustning.kvar < 0 ? "over" : "", id: "pengar-kvar" },
          el("dt", {}, "Pengar kvar (sm)"), el("dd", {}, `${res.utrustning.kvar.toLocaleString("sv-SE")}/${res.slag.startkapital.toLocaleString("sv-SE")}`)) : null)),
    el("div", { class: "steg-innehall" }, innehall),
    kvar.length ? el("div", { class: "saknaslista" }, el("strong", {}, "Gör klart innan du går vidare"), el("ul", {}, kvar.map((t) => el("li", {}, t)))) : el("span"),
    el("nav", { class: "steg-fot", "aria-label": "Föregående och nästa steg" },
      index > 0 ? el("button", { type: "button", class: "knapp", onclick: () => { aktivtSteg = STEG[index - 1].id; uppdatera(); } }, `← ${STEG[index - 1].namn}`) : el("span"),
      index < STEG.length - 1 ? el("button", { type: "button", class: "knapp primar", disabled: index + 1 > grans, onclick: () => { aktivtSteg = STEG[index + 1].id; uppdatera(); } }, `${STEG[index + 1].namn} →`) : el("span")));
  $("#formular").replaceChildren(rollformular(res));
  if (ritatSteg !== null && ritatSteg !== aktivtSteg) skrollaUpp();
  ritatSteg = aktivtSteg;
  // Dialogen visas först när tärningen har landat
  if (nyssSlaget === "magiformaga") setTimeout(() => magiDialog(raknaRollperson(R, motorIndata())), 900);
  else if (!rullar) magiDialog(res);
  nyssSlaget = null;
}

// ------------------------------------------------------------ rollformuläret för utskrift (formular.js)
function visaFormular() {
  vy = "formular";
  rita();
  window.scrollTo(0, 0);
}

// Det som skrivs i rollformuläret påverkar inga regler, så det sparas utan att sidan ritas om
// (då skulle fältet man klickar på härnäst försvinna under muspekaren).
function sparaFormular() {
  giltig = structuredClone(rp);
  spara();
}

function ritaFormularVy(res) {
  const vyEl = $("#rf-vy");
  vyEl.classList.toggle("rf-blacksnal", blacksnal);
  const kvar = saknas(res);
  vyEl.replaceChildren(
    el("div", { class: "rf-verktyg" },
      el("button", { type: "button", class: "knapp", onclick: () => { vy = "steg"; rita(); } }, "← Tillbaka till stegen"),
      el("button", { type: "button", class: "knapp primar", onclick: () => window.print() }, "Skriv ut eller spara som PDF"),
      el("button", { type: "button", class: "knapp", onclick: laddaNer }, `Ladda ner ${filnamn()}`),
      el("label", {}, el("input", { type: "checkbox", id: "blacksnal", checked: blacksnal,
        onchange: (e) => { blacksnal = e.target.checked; vyEl.classList.toggle("rf-blacksnal", blacksnal); } }), "Spara bläck"),
      el("label", {}, el("input", { type: "checkbox", id: "med-regler", checked: medRegler,
        onchange: (e) => { medRegler = e.target.checked; rita(); } }), "Ta med färdigheterna i korthet"),
      el("p", { class: "hjalp" }, "Skriv direkt i de gula fälten. Det sparas i rollpersonen och följer med när du laddar ner filen. ",
        "Grundegenskaper, FV och KP ändras i stegen. Välj A4 och skala 100 % när du skriver ut.")),
    ...(kvar.length ? [el("div", { class: "saknaslista rf-ofardig" }, el("strong", {}, "Rollpersonen är inte klar än"), el("ul", {}, kvar.map((t) => el("li", {}, t))))] : []),
    el("div", { class: "rf-sidor" }, rollformularSidor({ R, rp, res, el, sakNamn, andrat: sparaFormular, medRegler })));
  if (medRegler) {
    delaRegelsidor(vyEl, el);
    // Texternas höjd beror på typsnitten, så sidorna delas om när de har laddats
    document.fonts?.ready.then(() => { if (vy === "formular" && medRegler) delaRegelsidor(vyEl, el); });
  }
}

// Vid stegbyte glider sidan snabbt upp till toppen i stället för att hoppa dit
function skrollaUpp() {
  const fran = window.scrollY;
  if (fran <= 0) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { window.scrollTo(0, 0); return; }
  const tid = Math.min(450, 200 + fran / 10);
  const borjan = performance.now();
  cancelAnimationFrame(skrollaUpp.ram);
  const steg = (nu) => {
    const t = Math.min(1, (nu - borjan) / tid);
    window.scrollTo(0, fran * (1 - (1 - (1 - t) ** 3))); // avtar mjukt mot slutet
    if (t < 1) skrollaUpp.ram = requestAnimationFrame(steg);
  };
  skrollaUpp.ram = requestAnimationFrame(steg);
}

function bpForSteg(id, res) {
  const u = res.bp.utgifter;
  const v = { ras: u.ras, extra: u.extraYrkesfardigheter, egenskaper: u.grundegenskaper, formagor: u.sarskildaFormagor,
    svardshand: u.svardshand, stand: u.socialtStand, kapital: u.startkapital }[id];
  return v ? `${v} BP` : "";
}

async function start() {
  const data = await Promise.all(FILER.map((n) => fetch(`regler/${n}.json`).then((r) => {
    if (!r.ok) throw new Error(`regler/${n}.json`);
    return r.json();
  })));
  R = Object.fromEntries(FILER.map((n, i) => [n, data[i]]));
  // Sidan börjar alltid med en ny rollperson. En sparad rollperson från förra besöket erbjuds i steg 1.
  try {
    const sparad = JSON.parse(localStorage.getItem(LAGRING) ?? "null");
    if (sparad?.rp?.ras) {
      rp = fyllUt(sparad.rp);
      if (!rakna().fel.length) sparadVidStart = { rp, aktivtSteg: sparad.aktivtSteg ?? "ras", langst: sparad.langst ?? 0 };
    }
  } catch { /* ingen sparad rollperson */ }
  rp = TOM();
  aktivtSteg = "ras";
  langst = 0;
  giltig = structuredClone(rp);
  const lardomar = el("datalist", { id: "lardomar" }, LARDOMSFORSLAG.map((t) => el("option", { value: t })));
  document.body.append(lardomar);

  // "Ny rollperson" kräver två tryck. Andra trycket ska ske inom 5 sekunder, som räknas ned på knappen.
  const ny = $("#ny");
  const bekraftaText = ny.querySelector(".ny-bekrafta");
  let nedrakning = null;
  const avbryt = () => { clearInterval(nedrakning); nedrakning = null; ny.classList.remove("bekrafta"); };
  ny.addEventListener("click", () => {
    if (!nedrakning) {
      let kvar = 5;
      ny.classList.add("bekrafta");
      bekraftaText.textContent = `Bekräfta (${kvar})`;
      nedrakning = setInterval(() => {
        kvar -= 1;
        if (kvar <= 0) avbryt();
        else bekraftaText.textContent = `Bekräfta (${kvar})`;
      }, 1000);
      return;
    }
    avbryt();
    rp = TOM(); aktivtSteg = "ras"; langst = 0; vy = "steg"; nySekundar = ""; magiByte = null; autoAnvand = { egenskaper: false, fardigheter: false }; utrustningsFilter = ""; uppdatera();
  });
  $("#visa-formular").addEventListener("click", () => {
    $("#menypanel").hidden = true; $("#menyknapp").setAttribute("aria-expanded", "false");
    if (vy === "formular") { vy = "steg"; rita(); } else visaFormular();
  });
  $("#importfil").addEventListener("change", async (e) => { const fil = e.target.files[0]; if (fil) importera(await fil.text()); e.target.value = ""; });
  document.addEventListener("paste", (e) => {
    if (e.target.closest("input, textarea")) return;
    const text = e.clipboardData.getData("text");
    if (text.trim().startsWith("{")) importera(text);
  });
  // Växeln mellan utseendena Modern och Klassisk; valet sparas i webbläsaren
  const visaStil = () => document.querySelectorAll(".stilval button").forEach((k) => {
    k.setAttribute("aria-pressed", String((document.documentElement.dataset.stil ?? "modern") === k.dataset.stil)); // Klassisk är standard (se index.html)
  });
  document.querySelectorAll(".stilval button").forEach((k) => k.addEventListener("click", () => {
    if (k.dataset.stil === "klassisk") document.documentElement.dataset.stil = "klassisk";
    else delete document.documentElement.dataset.stil;
    try { localStorage.setItem("chronopia-stil", k.dataset.stil); } catch { /* frivilligt */ }
    visaStil();
  }));
  visaStil();
  // Hamburgermenyn stängs med Escape, ett klick utanför eller när ett val är gjort
  const menyknapp = $("#menyknapp");
  const menypanel = $("#menypanel");
  const visaMeny = (oppen) => { menypanel.hidden = !oppen; menyknapp.setAttribute("aria-expanded", String(oppen)); };
  menyknapp.addEventListener("click", () => visaMeny(menypanel.hidden));
  document.addEventListener("click", (e) => { if (!menypanel.hidden && !e.target.closest(".meny")) visaMeny(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menypanel.hidden) { visaMeny(false); menyknapp.focus(); } });
  $("#importfil").addEventListener("change", () => visaMeny(false));
  // Manuella tärningsslag är avstängda från början; valet sparas i webbläsaren
  const manuell = $("#manuella-slag");
  try { manuellaSlag = localStorage.getItem("chronopia-manuella-slag") === "ja"; } catch { /* frivilligt */ }
  manuell.checked = manuellaSlag;
  manuell.addEventListener("change", () => {
    manuellaSlag = manuell.checked;
    try { localStorage.setItem("chronopia-manuella-slag", manuellaSlag ? "ja" : "nej"); } catch { /* frivilligt */ }
    rita();
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
  rita();
}

start().catch((e) => {
  $("#arbetsyta").replaceChildren(el("p", { class: "fellista" }, `Regelfilen ${e.message} kunde inte läsas. Kontrollera att mappen regler ligger bredvid sidan.`));
});
