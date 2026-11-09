// Widunder och Wretler: ett tillfälligt läge med husregler för Deffbas kampanj.
// Läget slås på med den stora knappen Widunder och Wretler i steg 0 och sparas i rollpersonen (rp.wretler).
// Husreglerna visas inte som en lista för spelaren; de gäller bara när rollpersonen skapas:
//   - alla inlagda böcker, lägsta erfarenhetsnivån, Syn och hörsel och Detaljerad strid; inte
//     Kejserliga vapen och förbjudna varor (sätts när knappen trycks, och steg 0 låses),
//   - socialt stånd Knapadel, som räknas som lägre medelklass, utan slag (steg 9),
//   - startkapitalet är ett lån på 5 000 sm minus värdet på yrkets startutrustning, utan slag och med en fast text (steg 10),
//     och skulden står under Pengar på rollformuläret,
//   - inget gratis startpaket (steg 12),
//   - särskilda förmågor som ger pengar (Arv, Arvinge, Gravplundrare, Ädling …) slås om i tysthet (steg 7).
//
// Läget ersätts av kampanjer med användarkonton. Ta då bort det så här:
//   1. den här filen och bilden bilder/wretler-adam.webp,
//   2. allt som importerar härifrån (sök på "wretler.js"): regelmotor.js, autofyll.js, formular.js,
//      steg/bocker.js, steg/saknas.js, steg/slag.js och steg/utrustning.js,
//   3. fältet wretler i TOM() i tillstand.js,
//   4. stilarna under "Widunder och Wretler" i index.html, test/wretler.test.mjs och testerna i test/e2e/wretler.cjs
//      (och raden för dem i test/e2e/kor.mjs).
import { allaVapen, slaUpp, standsvarde, startvaror, varukatalog } from "./regelmotor.js";
import { el } from "./ui/dom.js";

export const WRETLER = {
  namn: "Widunder och Wretler",
  stand: { namn: "Knapadel", raknasSom: "Lägre medelklass" },
  lan: 5000,
  valfriaRegler: ["syn-och-horsel", "detaljerad-strid"],
  // Medianpriset i utrustningslistan (steg 12) per sorts vapen och rustning, med alla böcker och
  // Detaljerad strid men utan kejserliga och förbjudna varor. Används för startutrustning
  // som inte finns i listan. test/wretler.test.mjs kontrollerar att värdena stämmer med listan.
  median: { narstrid: 650, avstand: 750, kast: 100, skold: 875, rustning: 1150 },
  // Yrkenas startutrustning som inte finns i utrustningslistan och som är vapen, sköld eller rustning.
  // Värdet är medianen för sorten, eller priset för en namngiven vara i listan ({ vara }). Allt annat
  // som inte finns i listan får rollpersonen gratis.
  utrustning: {
    "ceriansk-ulv": { "Ceriansk armslunga eller handarmborst": [{ vara: "Ceriansk armslunga" }] },
    dodsdansare: { "Förstklassiga vapen och rustning efter eget val (SL avgör)": ["narstrid", "rustning"] },
    huvudjagare: { "Ett valfritt handvapen och ett valfritt avståndsvapen": ["narstrid", "avstand"] },
    hyrsvard: { "Ett valfritt vapen": ["narstrid"] },
    "sabransk-okenriddare": { "Ett valfritt sabranskt närstridsvapen": ["narstrid"], "Ett valfritt skjutvapen": ["avstand"],
      "Två sabranska gasbomber": ["kast", "kast"], "Sabransk ökenrustning": ["rustning"] },
    slaghok: { "Ett lätt handvapen": ["narstrid"], "Ett avståndsvapen": ["avstand"] },
    smidesmastare: { "Förkläde av härdat läder (enda rustningen)": ["rustning"] },
    svartgardist: { "Svart rustning och vapen": ["rustning", "narstrid"] },
    tunnelkrigare: { "Ett lätt handvapen": ["narstrid"] },
    vapenmastare: { "Sina vapen": ["narstrid"] },
    cestodit: { "Rustning med behornad ordenshjälm (magisk behållare, 10 PSY)": ["rustning"], "Ett förruttnelsevapen": ["narstrid"] },
    haxjagare: { "Duglig rustning": ["rustning"], "Ett handvapen": ["narstrid"] },
    svartsyster: { "Tunn liriumrustning (abs 6)": ["rustning"] },
    warlock: { "Ett handvapen som är magisk behållare (7 PSY) och fokus": ["narstrid"] },
    agent: { "Ett valfritt handvapen": ["narstrid"] },
    argolisbroder: { "Skinande rustning": ["rustning"], "Valfritt handvapen och avståndsvapen": ["narstrid", "avstand"] },
    barsark: { "Favoritvapen": ["narstrid"], "Ett hopplock av rustningsdelar": ["rustning"] },
    gravare: { "Handvapen": ["narstrid"], "Lätt läderrustning": ["rustning"] },
    ingenjor: { "Sitt vapen": ["narstrid"] },
    klankrigare: { "Handvapen": ["narstrid"], "Sköld": ["skold"], "Avståndsvapen": ["avstand"], "Rustning värdig hans rang och klan": ["rustning"] },
    medicus: { "Vapen": ["narstrid"] },
    portvaktare: { "Portväktarnas traditionella rustning": ["rustning"], "Förnämliga vapen (donerade)": ["narstrid"] },
    prast: { "Atumsstav": ["narstrid"], "Vanligen en yxa i bältet": ["narstrid"] },
    stubbgardist: { "Rustning och vapen": ["rustning", "narstrid"] },
    svinryttare: { "Rustning med heraldiska vimplar": ["rustning"], "Vapnen han behärskar": ["narstrid"] },
    vardshusvard: { "En fin gammal yxa": ["narstrid"] },
    alderman: { "Sin välslipade yxa": ["narstrid"] },
    hetsare: { "Lättare läderrustning": ["rustning"], "Ett valfritt handvapen": ["narstrid"] },
    utstott: { "Två handvapen av god kvalitet": ["narstrid", "narstrid"] },
    "vit-apostel": { "Två valfria vapen": ["narstrid", "narstrid"] },
    husar: { "Lättare rustning med den belisariska rosen": ["rustning"], "Ett valfritt handvapen av god kvalitet": ["narstrid"] },
    bestherre: { "Piskor": [{ vara: "Piska" }] },
    drakgardist: { "Gyllene rustning med drakhjälm": ["rustning"], "Vapen av god kvalitet": ["narstrid"] },
    distributor: { "Ett handvapen": ["narstrid"] },
    pierrot: { "Två valfria lättare vapen": ["narstrid", "narstrid"] },
    huggare: { "Ett par lätta handvapen": ["narstrid", "narstrid"], "Lättare rustning": ["rustning"] },
    stormfagel: { "Kraftig läderrustning": ["rustning"] },
    flamboyant: { "Ett par värjor eller andra lätta fäktvapen": ["narstrid", "narstrid"] },
    bataljsmed: { "Två välsmidda svärd (+4 BV, +1 skada)": ["narstrid", "narstrid"], "Välsmidd rustning (25 % lättare)": ["rustning"] },
    eldsfurste: { "Ett gott handvapen (+1 skada, +2 BV)": ["narstrid"], "Lättare rustning": ["rustning"] },
    hamnare: { "Vapen": ["narstrid"] },
  },
  // Särskilda förmågor som ger pengar eller bara påverkar slagen för stånd och startkapital. Också förmågor
  // med regeln "kapital" eller en slagbonus på startkapitalet räknas hit.
  slaOmFormagor: ["Arv", "Arvinge", "Gravplundrare", "Ädling"],
  texter: {
    stand: "Du må vara en ädling, men din ätt är irrelevant och nära nog glömd och ditt stånds privilegier och din opåkallade stolthet är allt som skiljer dig från den fattiga, smutsiga pöbeln.",
    kapital: "Som knapadelsman faller det sig naturligt för dig att leva över dina tillgångar. Din natur, din släkts historik och era familjetraditioner gör något annat helt otänkbart. Din ätt har sedan länge förlorat sina besittningar, intecknat sina livegna och slösat bort sina penningar. Senast har du lånat 5000 sm, av vilka en icke obetydlig del - kanske allt! - har gått till ditt uppehälle och att hålla dina usla persedlar i något sånär brukbart skick.",
  },
};

const SORT_AV_VAPEN = { narstrid: "narstrid", projektil: "avstand", kast: "kast", skoldar: "skold" };

// Om rollpersonen skapas i läget Widunder och Wretler
export const wretlerAktiv = (rp) => Boolean(rp?.wretler);

// Slår på eller av läget. Det går bara medan böckerna går att välja, alltså innan en ras är vald.
// På: alla inlagda böcker, lägsta erfarenhetsnivån, Syn och hörsel, Detaljerad strid och inget startpaket. Av: som en ny rollperson.
export function valjWretler(regler, rp, pa) {
  if (rp.ras) return false;
  rp.wretler = Boolean(pa);
  rp.bocker = pa ? regler.bocker.lista.filter((b) => b.alltid || b.status === "inlagd").map((b) => b.id) : ["grund"];
  rp.bockerManuellt = [];
  rp.niva = 0;
  rp.valfriaRegler = pa ? [...WRETLER.valfriaRegler] : [];
  rp.startpaket = { valt: false, vapen: "" };
  return true;
}

// Värdet på yrkets startutrustning: varor i listan kostar sitt pris, vapen, sköldar och rustningar som inte
// finns i listan medianen för sin sort, och annat som inte finns i listan är gratis.
export function wretlerUtrustning(regler, rp) {
  const katalog = varukatalog(regler);
  const { varor, ovriga } = startvaror(regler, rp);
  const poster = [];
  const median = (sort, namn) => poster.push({ namn, pris: WRETLER.median[sort], median: sort });
  for (const { namn, antal = 1 } of varor) {
    const vara = katalog.find((x) => x.namn === namn);
    if (vara) { poster.push({ namn, antal, pris: vara.pris * antal }); continue; }
    const grupp = Object.keys(SORT_AV_VAPEN).find((g) => regler.vapen[g]?.some((x) => x.namn === namn));
    if (grupp) for (let i = 0; i < antal; i++) median(SORT_AV_VAPEN[grupp], namn);
  }
  const tabell = WRETLER.utrustning[rp.yrke] ?? {};
  for (const text of ovriga) {
    for (const del of tabell[text] ?? []) {
      if (typeof del === "string") median(del, text);
      else poster.push({ namn: del.vara, pris: katalog.find((x) => x.namn === del.vara)?.pris ?? 0, text });
    }
  }
  return { poster, summa: poster.reduce((a, x) => a + x.pris, 0) };
}

// Om en särskild förmåga ska slås om: den ger pengar, och pengar utöver lånet gäller inte
export const wretlerSlaOm = (rp, formaga) => wretlerAktiv(rp) && Boolean(formaga) && (WRETLER.slaOmFormagor.includes(formaga.namn)
  || (formaga.regel ?? []).some((d) => d.typ === "kapital" || (d.typ === "slagbonus" && d.startkapital)));

// Slagen i steg 9 och 10 ersätts: Knapadel räknas som lägre medelklass, och startkapitalet är lånet minus startutrustningen
export function wretlerSlag(regler, rp, slag) {
  const tabell = regler.slag.socialtStand.tabell;
  const ssResultat = standsvarde(tabell, WRETLER.stand.raknasSom);
  const [, standsklass] = slaUpp(tabell, ssResultat);
  const utrustning = wretlerUtrustning(regler, rp);
  return { ...slag, socialtStand: WRETLER.stand.namn, standsklass, ssResultat, skResultat: null,
    startkapital: Math.max(0, WRETLER.lan - utrustning.summa), wretler: { lan: WRETLER.lan, utrustning } };
}

// ------------------------------------------------------------ det spelaren ser

// Den stora knappen överst i steg 0. Den slår på läget och går direkt till steg 1, eller slår av det igen.
// Den låses med böckerna när en ras är vald.
export function wretlerKnapp({ R, rp, uppdatera, tillSteg1 }) {
  const pa = wretlerAktiv(rp);
  const last = Boolean(rp.ras);
  return el("button", { type: "button", id: "wretler-knapp", class: "wretler-knapp" + (pa ? " vald" : ""), "aria-pressed": String(pa), disabled: last,
    onclick: () => {
      if (!valjWretler(R, rp, !pa)) return;
      if (pa) uppdatera(); else tillSteg1();
    } },
  el("img", { src: "bilder/wretler-adam.webp", alt: "", width: 227, height: 280, class: "wretler-bild" }),
  el("span", { class: "wretler-text" },
    el("span", { class: "startknapp-namn" }, WRETLER.namn),
    el("span", { class: "startknapp-text" }, "Väl mött! Skapa en rollperson enligt den gode Adams anvisningar och anmaningar."),
    el("span", { class: "wretler-status" }, pa ? (last ? "Rollpersonen skapas enligt Adams anvisningar." : "Valt. Tryck igen för att skapa en vanlig rollperson.")
      : last ? "Rollpersonen skapas utan Adams anvisningar." : "")));
}

// Steg 9 Socialt stånd
export const wretlerStand = () => [
  el("p", { class: "summering", id: "wretler-stand" }, `Din rollperson har det sociala ståndet ${WRETLER.stand.namn}.`),
  el("p", { class: "wretler-citat" }, WRETLER.texter.stand),
];

// Steg 10 Startkapital
export const wretlerKapital = () => [el("p", { class: "wretler-citat", id: "wretler-kapital" }, WRETLER.texter.kapital)];

// Raden under Pengar på rollformuläret
export const wretlerSkuld = (rp) => (wretlerAktiv(rp) ? `Skuld om ${WRETLER.lan} sm` : null);
