// Gränssnittet för Chronopia-rollpersonsskaparen: startar appen, ritar vyerna och kopplar ihop modulerna.
// All regellogik finns i regelmotor.js. Stegen ligger i steg/, gemensamma kontroller i ui/.
import { STANDARDVARDEN, fardighetAv, paborjad, namnFor } from "./regelmotor.js";
import { rollformularSidor, delaRegelsidor } from "./formular.js";
import { tillFil, franFil } from "./sparformat.js";
import { laggTill, angraSenaste, kontrolleraPost } from "./utveckling.js";
import { spelInnehall, spelDelar, aktivDel, valjDel, nollstallSpel, spelPotter } from "./spelmote.js";
import { stegAlder } from "./steg/alder.js";
import { stegBesvarjelser } from "./steg/besvarjelser.js";
import { stegBocker } from "./steg/bocker.js";
import { grundvardesForslag, stegEgenskaper } from "./steg/egenskaper.js";
import { filnamn, laddaNer, stegExport } from "./steg/export.js";
import { epFordelning, stegFardigheter } from "./steg/fardigheter.js";
import { stegFormagor } from "./steg/formagor.js";
import { stegKon } from "./steg/kon.js";
import { stegRas } from "./steg/ras.js";
import { bpForSteg, ejTillagd, forstaOfardiga, saknas, saknasPerSteg, synligaSteg } from "./steg/saknas.js";
import { stegKapital, stegStand, stegSvardshand } from "./steg/slag.js";
import { stegUtrustning } from "./steg/utrustning.js";
import { stegYrke } from "./steg/yrke.js";
import { stegExtra } from "./steg/yrkesfardigheter.js";
import { LARDOMSFORSLAG, STEG } from "./texter.js";
import { S, FILER, fyllUt, harLogg, LAGRING, motorIndata, rakna, raknaFor, spara, TOM, uppdatera, vaxladeBp, yrkesNycklar } from "./tillstand.js";
import { $, el, slaT } from "./ui/dom.js";
import { falt, fardighetsVal, gruppLista, info, infoKnapp, valLista } from "./ui/kontroller.js";
import { magiGorOm, magiMisslyckat, magiModal, magiPlatser, MAGISLAG, oppnaMagiModal } from "./ui/magimodal.js";
import { rollformular, sakNamn } from "./ui/sammanfattning.js";
import { regelresonemang, startsida } from "./ui/startsida.js";
import { landatSlag, rullar, slagKontroll, tarningsIkon, valjFardighet } from "./ui/tarningar.js";

// ------------------------------------------------------------ export och import
function importera(text) {
  try {
    const data = franFil(JSON.parse(text));
    const fore = S.rp;
    S.rp = fyllUt(data);
    const fel = rakna().fel;
    if (fel.length) {
      S.rp = fore;
      throw new Error(`den bryter mot reglerna (${fel[0]})`);
    }
    S.langst = STEG.length - 1; // en inläst rollperson är redan genomgången
    nollstallSpel();
    // En rollperson som har spelats öppnas i spelmötesdelen; skapandet är då låst
    S.vy = harLogg() ? "spel" : S.vy === "formular" ? "formular" : "steg";
    visaNotis(`${S.rp.namn || "Rollpersonen"} är inläst.`);
    uppdatera();
  } catch (e) {
    visaNotis(`Det gick inte att läsa in rollpersonen: ${e.message}. Kontrollera att det är en sparad rollperson i JSON-format.`);
  }
}

const efterNotis = []; // poängloggen i utvecklarläget samlar ändringar som regelkontrollen stoppade
export function visaNotis(text) {
  const n = $("#notis");
  n.textContent = text;
  n.hidden = false;
  clearTimeout(visaNotis.t);
  visaNotis.t = setTimeout(() => { n.hidden = true; }, 6000);
  for (const fn of efterNotis) fn(text);
}

// ------------------------------------------------------------ ritning
const efterRita = []; // utvecklarläget följer varje ändring (poängloggen och den automatiska ifyllningen)
export function rita() {
  ritaVy();
  foljHistorik();
  for (const fn of efterRita) fn();
}

// Varje steg (och rollformuläret och spelmötena) får en post i webbläsarens historik,
// så att bakåtknappen går till föregående steg i stället för att lämna sidan. Adressen (t.ex. ?dev) ändras inte.
const platsNu = () => (S.vy === "steg" ? S.aktivtSteg : S.vy);
function foljHistorik() {
  const plats = platsNu();
  if (history.state?.plats === plats) return;
  if (history.state?.plats) history.pushState({ plats }, "");
  else history.replaceState({ plats }, "");
}
function gaTillPlats(plats) {
  if (["formular", "start", "regler"].includes(plats)) S.vy = plats;
  else if (plats === "spel") S.vy = S.spelSynlig && !saknas(rakna()).length ? "spel" : "steg";
  else { S.vy = "steg"; S.aktivtSteg = plats; } // ritaVy flyttar tillbaka till första ofärdiga steget om det behövs
  rita();
}

function ritaVy() {
  // Grundvärdena sätts först när steg 6 öppnas: alla börjar på 10 och kostar BP därifrån
  if (S.aktivtSteg === "egenskaper" && !S.rp.grundvarden) {
    S.rp.grundvarden = STANDARDVARDEN();
    if (!rakna().fel.length) { S.giltig = structuredClone(S.rp); spara(); } else S.rp.grundvarden = null;
  }
  const res = rakna();
  if (S.vy === "steg" && harLogg()) S.vy = "spel"; // efter första posten går skapandet inte att ändra
  const helsida = ["start", "regler"].includes(S.vy);
  $(".layout").style.display = S.vy === "formular" || helsida ? "none" : "";
  $("#rf-vy").hidden = S.vy !== "formular";
  $("#start-vy").hidden = !helsida;
  document.body.dataset.vy = S.vy;
  if (helsida) { ritaHelsida(); return; }
  $("#visa-formular").setAttribute("aria-pressed", String(S.vy === "formular"));
  $("#visa-spel").setAttribute("aria-pressed", String(S.vy === "spel"));
  if (S.vy === "formular") { ritaFormularVy(res); return; }
  if (S.vy === "spel") { ritaSpelvy(res); return; }
  const STEG = synligaSteg(res); // stegen som visas just nu
  const grans = forstaOfardiga(res);
  if (!STEG.some((s) => s.id === S.aktivtSteg)) S.aktivtSteg = "fardigheter"; // ett dolt steg lämnas
  // Står man på ett steg bortom gränsen (t.ex. efter att ha ändrat yrke) flyttas man tillbaka
  if (STEG.findIndex((s) => s.id === S.aktivtSteg) > grans) S.aktivtSteg = STEG[grans].id;
  S.langst = Math.max(S.langst, STEG.findIndex((s) => s.id === S.aktivtSteg));
  const oppna = Math.min(grans, S.langst);
  const tillagg = ejTillagd(S.aktivtSteg);
  const rail = $("#steg");
  rail.replaceChildren(...STEG.map((s, i) => el("li", {},
    el("button", { type: "button", class: "steg-knapp" + (s.id === S.aktivtSteg ? " aktiv" : ""), "aria-current": s.id === S.aktivtSteg ? "step" : null,
      disabled: i > oppna, title: i > oppna ? "Gör klart de tidigare stegen först" : null,
      onclick: () => {
        if (tillagg && i > STEG.findIndex((x) => x.id === S.aktivtSteg)) { visaNotis(tillagg); return; }
        S.aktivtSteg = s.id; uppdatera(); $("#arbetsyta").focus({ preventScroll: true });
      } },
    el("span", { class: "steg-nr" }, i), el("span", { class: "steg-namn" }, s.namn), // steg 0 är böckerna
    s.bp ? el("span", { class: "steg-bp" }, bpForSteg(s.id, res)) : null))));

  const steg = STEG.find((s) => s.id === S.aktivtSteg);
  const index = STEG.indexOf(steg);
  const innehall = {
    bocker: stegBocker, ras: stegRas, alder: stegAlder, yrke: stegYrke, extra: stegExtra, kon: stegKon, egenskaper: stegEgenskaper,
    formagor: stegFormagor, svardshand: stegSvardshand, stand: stegStand, kapital: stegKapital, fardigheter: stegFardigheter,
    besvarjelser: stegBesvarjelser, utrustning: stegUtrustning, export: stegExport,
  }[steg.id](res);
  // Ett steg kan lägga en del under knapparna (t.ex. förmågetabellen i steg 7)
  const efterFot = Array.isArray(innehall) && innehall.at(-1)?.classList?.contains("efter-fot") ? innehall.pop() : null;
  const kvar = saknasPerSteg(res)[steg.id];
  // Är magiförmågeslaget det enda som återstår i steget öppnar Nästa-knappen modalen med slaget
  const baraMagi = kvar.length > 0 && kvar.every((t) => t === MAGISLAG) && index === grans;
  const synligKvar = kvar.filter((t) => t !== MAGISLAG);
  $("#arbetsyta").replaceChildren(
    el("header", { class: "steg-huvud" },
      el("div", { class: "steg-titel" },
        el("span", { class: "eyebrow" }, `Steg ${index} av ${STEG.length - 1}${steg.sida === "–" ? "" : ` · s. ${steg.sida}`}`),
        el("h2", {}, steg.namn)),
      el("dl", { class: "steg-potter", "aria-label": "Kvar att spendera" },
        el("div", { class: res.bp.kvar < 0 ? "over" : "", id: "bp-kvar", title: vaxladeBp(res) ? `${vaxladeBp(res)} BP växlade till ${vaxladeBp(res) * 5} EP` : null },
          el("dt", {}, "BP kvar", info("BP")), el("dd", {}, res.bp.kvar - vaxladeBp(res))),
        el("div", { class: res.ep.kvar < 0 ? "over" : "" }, el("dt", {}, "EP kvar", info("EP")), el("dd", {}, res.ep.kvar)),
        // I steg där pengar spenderas visas också kvarvarande pengar av startkapitalet
        steg.id === "utrustning" ? el("div", { class: res.utrustning.kvar < 0 ? "over" : "", id: "pengar-kvar" },
          el("dt", {}, "Pengar kvar (sm)"), el("dd", {}, `${res.utrustning.kvar.toLocaleString("sv-SE")}/${res.slag.startkapital.toLocaleString("sv-SE")}`)) : null)),
    el("div", { class: "steg-innehall" }, innehall),
    synligKvar.length ? el("div", { class: "saknaslista" }, el("strong", {}, "Gör klart innan du går vidare"), el("ul", {}, synligKvar.map((t) => el("li", {}, t)))) : el("span"),
    baraMagi ? el("p", { class: "hjalp magi-ledning" }, "Rollpersonen har en magiskola men är inte magiker. När du går vidare avgör ett magiförmågeslag om rollpersonen kan lära sig magi.") : el("span"),
    el("nav", { class: "steg-fot", "aria-label": "Föregående och nästa steg" },
      index > 0 ? el("button", { type: "button", class: "knapp", onclick: () => { S.aktivtSteg = STEG[index - 1].id; uppdatera(); } }, `← ${STEG[index - 1].namn}`) : el("span"),
      index < STEG.length - 1 ? el("div", { class: "nasta-kolumn" }, magiGorOm(steg.id), el("button", { type: "button", class: "knapp primar" + (tillagg ? " sparrad" : ""), id: "nasta-steg",
        disabled: index + 1 > grans && !baraMagi, "aria-disabled": tillagg ? "true" : null, onclick: () => {
        if (tillagg) { visaNotis(tillagg); return; }
        if (baraMagi) { oppnaMagiModal(STEG[index + 1].id); return; }
        S.aktivtSteg = STEG[index + 1].id; uppdatera();
      } }, baraMagi ? "MAGIFÖRMÅGESLAG" : `${STEG[index + 1].namn} →`)) : magiGorOm(steg.id) ?? el("span")),
    efterFot ?? el("span"));
  $("#formular").replaceChildren(rollformular(res));
  if (S.ritatSteg !== null && S.ritatSteg !== S.aktivtSteg) skrollaUpp();
  S.ritatSteg = S.aktivtSteg;
  // Dialogen visas först när tärningen har landat
  // Ett misslyckat magiförmågeslag med magiskolor kvar (t.ex. efter autofyll eller en lägre INT) visas i modalen
  if (!magiModal && !rullar && magiMisslyckat(res) && magiPlatser().length) oppnaMagiModal();
  // Förmågans modal (steg 7) ritas med steget; sidan bakom rullar inte, och fokus flyttas in i modalen
  const sfModal = $("#sf-modal");
  if (sfModal) {
    document.body.classList.add("dialog-oppen");
    if (!sfModal.contains(document.activeElement)) sfModal.querySelector("select:not([disabled]), button:not([disabled]), button")?.focus({ preventScroll: true });
  } else if (!magiModal) document.body.classList.remove("dialog-oppen");
  S.nyssSlaget = null;
}

// ------------------------------------------------------------ startsidan och regelresonemang (ui/startsida.js)
export function visaStart() { S.vy = "start"; rita(); window.scrollTo(0, 0); }
function ritaHelsida() {
  const sida = S.vy === "start"
    ? startsida({ skapa: () => { S.vy = "steg"; rita(); window.scrollTo(0, 0); }, laddaNerTomt: laddaNerTomPdf, regler: () => { S.vy = "regler"; rita(); window.scrollTo(0, 0); } })
    : regelresonemang({ tillbaka: visaStart, rita });
  $("#start-vy").replaceChildren(el("h2", { class: "start-rubrik" }, S.vy === "start" ? "Välkommen" : "Regelresonemang"), sida);
  S.ritatSteg = S.vy;
}

// ------------------------------------------------------------ spelmöten och förbättring (spelmote.js)
export function oppnaSpel() {
  const kvar = saknas(rakna());
  if (kvar.length) { visaNotis(`Gör klart rollpersonen först: ${kvar[0]}.`); return; }
  S.vy = "spel";
  rita();
  window.scrollTo(0, 0);
}

// För in en post i loggen om den följer reglerna
function forIn(post) {
  const fore = rakna();
  const efter = laggTill(S.rp, post, fore.utrustning.kvar);
  const fel = kontrolleraPost(S.R, motorIndata(), efter, fore, raknaFor(efter), post);
  if (fel.length) { visaNotis(`Det går inte: ${fel[0]}.`); return false; }
  S.rp = efter;
  S.giltig = structuredClone(S.rp);
  spara();
  return true;
}

function angra() {
  const efter = angraSenaste(S.rp, rakna().utrustning.kvar);
  if (raknaFor(efter).fel.length) { visaNotis("Det går inte att ångra posten."); return; }
  S.rp = efter;
  S.giltig = structuredClone(S.rp);
  spara();
  visaNotis(harLogg() ? "Den senaste posten är ångrad." : "Posten är ångrad. Loggen är tom, så skapandet går att ändra igen.");
  rita();
}

export const spelCtx = (res) => ({
  R: S.R, res, rp: () => S.rp, indata: motorIndata, rakna: raknaFor, forIn, angra, rita, visaNotis,
  kontrollera: (post, efter, resEfter) => kontrolleraPost(S.R, motorIndata(), efter, res, resEfter, post),
  el, falt, valLista, gruppLista, fardighetsVal, valjFardighet, info, infoText: (text) => infoKnapp(text, "Förklaring"),
  slagKontroll, landatSlag, tarningsIkon, slaT, sakNamn, paborjad, rullar: () => rullar !== null,
  namnFor: (k) => { const f = fardighetAv(S.R, k); return f ? namnFor(S.R, f, k) : k; },
});

function ritaSpelvy(res) {
  const ctx = spelCtx(res);
  const delar = spelDelar();
  const aktiv = delar.find((d) => d.id === aktivDel());
  const pott = spelPotter(ctx);
  $("#steg").replaceChildren(...delar.map((d, i) => el("li", {},
    el("button", { type: "button", class: "steg-knapp" + (d.id === aktiv.id ? " aktiv" : ""), "aria-current": d.id === aktiv.id ? "step" : null,
      onclick: () => { valjDel(d.id); rita(); $("#arbetsyta").focus({ preventScroll: true }); } },
    el("span", { class: "steg-nr" }, i + 1), el("span", { class: "steg-namn" }, d.namn)))));
  $("#arbetsyta").replaceChildren(
    el("header", { class: "steg-huvud" },
      el("div", { class: "steg-titel" },
        el("span", { class: "eyebrow" }, `Spelmöten · ${S.rp.namn} · s. 73–76`),
        el("h2", {}, aktiv.namn)),
      el("dl", { class: "steg-potter", "aria-label": "Att använda" },
        el("div", {}, el("dt", {}, "Osparade EP", info("EP")), el("dd", {}, pott.ep)),
        el("div", {}, el("dt", {}, "Hjältepoäng"), el("dd", {}, pott.hp)))),
    el("div", { class: "steg-innehall" }, spelInnehall(ctx)),
    el("nav", { class: "steg-fot spel-fot", "aria-label": "Rollpersonen" },
      harLogg() ? el("span", { class: "hjalp" }, "Skapandet är låst eftersom rollpersonen har spelats. Ångra alla poster i loggen för att ändra det.")
        : el("button", { type: "button", class: "knapp", onclick: () => { S.vy = "steg"; rita(); } }, "← Tillbaka till skapandet"),
      el("div", { class: "rad" },
        el("button", { type: "button", class: "knapp", onclick: visaFormular }, "Rollformulär"),
        el("button", { type: "button", class: "knapp primar", onclick: laddaNer }, `Ladda ner ${filnamn()}`))));
  $("#formular").replaceChildren(rollformular(res));
  const nu = `spel-${aktiv.id}`;
  if (S.ritatSteg !== null && S.ritatSteg !== nu) skrollaUpp();
  S.ritatSteg = nu;
  S.nyssSlaget = null;
}

// ------------------------------------------------------------ rollformuläret för utskrift (formular.js)
export function visaFormular() {
  S.vy = "formular";
  rita();
  window.scrollTo(0, 0);
}

// Det som skrivs i rollformuläret påverkar inga regler, så det sparas utan att sidan ritas om
// (då skulle fältet man klickar på härnäst försvinna under muspekaren).
function sparaFormular() {
  S.giltig = structuredClone(S.rp);
  spara();
}

function ritaFormularVy(res) {
  const vyEl = $("#rf-vy");
  vyEl.classList.toggle("rf-blacksnal", S.blacksnal);
  const kvar = saknas(res);
  vyEl.replaceChildren(
    el("div", { class: "rf-verktyg" },
      el("button", { type: "button", class: "knapp", onclick: () => { S.vy = harLogg() ? "spel" : "steg"; rita(); } }, harLogg() ? "← Tillbaka till spelmötena" : "← Tillbaka till stegen"),
      el("button", { type: "button", class: "knapp primar", id: "pdf-ladda-ner", onclick: laddaNerPdf }, "Ladda ner som PDF"),
      el("button", { type: "button", class: "knapp", onclick: laddaNer }, `Ladda ner ${filnamn()}`),
      el("label", {}, el("input", { type: "checkbox", id: "blacksnal", checked: S.blacksnal,
        onchange: (e) => { S.blacksnal = e.target.checked; vyEl.classList.toggle("rf-blacksnal", S.blacksnal); } }), "Spara bläck"),
      el("label", {}, el("input", { type: "checkbox", id: "med-regler", checked: S.medRegler,
        onchange: (e) => { S.medRegler = e.target.checked; rita(); } }), "Ta med färdigheterna i korthet"),
      el("p", { class: "hjalp" }, "Skriv direkt i de gula fälten. Det sparas i rollpersonen och följer med när du laddar ner filen. ",
        harLogg() ? "Grundegenskaper, FV och KP ändras under Spelmöten (Förbättra). " : "Grundegenskaper, FV och KP ändras i stegen. ")),
    ...(kvar.length ? [el("div", { class: "saknaslista rf-ofardig" }, el("strong", {}, "Rollpersonen är inte klar än"), el("ul", {}, kvar.map((t) => el("li", {}, t))))] : []),
    el("div", { class: "rf-sidor" }, rollformularSidor({ R: S.R, rp: S.rp, res, el, sakNamn, andrat: sparaFormular, medRegler: S.medRegler })));
  if (S.medRegler) {
    delaRegelsidor(vyEl, el);
    // Texternas höjd beror på typsnitten, så sidorna delas om när de har laddats
    document.fonts?.ready.then(() => { if (S.vy === "formular" && S.medRegler) delaRegelsidor(vyEl, el); });
  }
}

// Utskriftsdialogen (Ctrl+P eller Cmd+P) föreslår sidans titel som filnamn, så titeln är rollpersonens namn medan den visas
const SIDTITEL = document.title;
function namnSomTitel() { document.title = S.rp.namn.trim() || SIDTITEL; }

// Rollformuläret som PDF-fil (formularpdf.js), med rollpersonens namn som filnamn. Samma fil i alla webbläsare.
const pdfNamn = () => `${(S.rp.namn.trim() || "Rollformulär").replace(/[\\/:*?"<>|]+/g, "-")}.pdf`;
export const laddaNerPdf = (e) => skapaPdf(e, {
  rp: S.rp, res: () => rakna(), medRegler: S.medRegler, blacksnal: S.blacksnal, titel: S.rp.namn.trim(), namn: pdfNamn(), andrat: sparaFormular });
// Ett tomt rollformulär: samma formulär utan värden, med ifyllbara fält
export const laddaNerTomPdf = (e) => { const rp = TOM(); return skapaPdf(e, {
  rp, res: () => raknaFor(rp), tom: true, medRegler: false, blacksnal: false, titel: "Rollformulär", namn: "Rollformulär.pdf", andrat: () => {} }); };
async function skapaPdf(e, { rp, res, tom = false, medRegler, blacksnal, titel, namn, andrat }) {
  const knapp = e?.currentTarget;
  const text = knapp?.textContent;
  if (knapp) { knapp.disabled = true; knapp.textContent = "Skapar PDF …"; }
  try {
    const { rollformularPdf } = await import("./formularpdf.js");
    const pdf = await rollformularPdf({
      sidor: rollformularSidor({ R: S.R, rp, res: res(), el, sakNamn, andrat, medRegler, tom }),
      blacksnal, titel, efterTypsnitt: (rot) => { if (medRegler) delaRegelsidor(rot, el); },
    });
    const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
    const a = el("a", { href: url, download: namn });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    visaNotis(`${namn} laddas ner.`);
  } catch (fel) {
    console.error(fel);
    visaNotis("Det gick inte att skapa PDF:en. Kontrollera nätverket och försök igen.");
  } finally {
    if (knapp) { knapp.disabled = false; knapp.textContent = text; }
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

async function start() {
  const data = await Promise.all(FILER.map((n) => fetch(`regler/${n}.json`).then((r) => {
    if (!r.ok) throw new Error(`regler/${n}.json`);
    return r.json();
  })));
  S.R = Object.fromEntries(FILER.map((n, i) => [n, data[i]]));
  // Sidan börjar alltid med en ny rollperson. En sparad rollperson från förra besöket erbjuds i steg 1.
  try {
    const sparad = JSON.parse(localStorage.getItem(LAGRING) ?? "null");
    if (sparad?.rp?.ras) {
      S.rp = fyllUt(sparad.rp);
      if (!rakna().fel.length) S.sparadVidStart = { rp: S.rp, aktivtSteg: sparad.aktivtSteg ?? "bocker", langst: sparad.langst ?? 0 };
    }
  } catch { /* ingen sparad rollperson */ }
  S.rp = TOM();
  S.aktivtSteg = "bocker";
  S.langst = 0;
  S.giltig = structuredClone(S.rp);
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
    S.rp = TOM(); S.aktivtSteg = "bocker"; S.langst = 0; S.vy = "steg"; nollstallSpel(); S.nySekundar = ""; S.nyExtra = ""; S.autoAnvand = { egenskaper: false, fardigheter: false }; S.utrustningsFilter = ""; uppdatera();
  });
  $("#till-start").addEventListener("click", () => {
    $("#menypanel").hidden = true; $("#menyknapp").setAttribute("aria-expanded", "false");
    visaStart();
  });
  $("#hem").addEventListener("click", (e) => { e.preventDefault(); visaStart(); });
  visaVersion();
  $("#visa-spel").addEventListener("click", () => {
    $("#menypanel").hidden = true; $("#menyknapp").setAttribute("aria-expanded", "false");
    oppnaSpel();
  });
  $("#visa-formular").addEventListener("click", () => {
    $("#menypanel").hidden = true; $("#menyknapp").setAttribute("aria-expanded", "false");
    if (S.vy === "formular") { S.vy = harLogg() ? "spel" : "steg"; rita(); } else visaFormular();
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
  try { S.manuellaSlag = localStorage.getItem("chronopia-manuella-slag") === "ja"; } catch { /* frivilligt */ }
  manuell.checked = S.manuellaSlag;
  manuell.addEventListener("change", () => {
    S.manuellaSlag = manuell.checked;
    try { localStorage.setItem("chronopia-manuella-slag", S.manuellaSlag ? "ja" : "nej"); } catch { /* frivilligt */ }
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
  // Även Ctrl+P eller Cmd+P föreslår rollpersonens namn som filnamn
  window.addEventListener("beforeprint", namnSomTitel);
  window.addEventListener("afterprint", () => { document.title = SIDTITEL; });
  window.addEventListener("popstate", (e) => { if (e.state?.plats) gaTillPlats(e.state.plats); });
  startaUtvecklarlage();
  rita();
}

// Versionen och när sidan senast publicerades står i version.json. Publiceringen (GitHub Actions) fyller i tid och commit.
async function visaVersion() {
  try {
    const v = await (await fetch("version.json", { cache: "no-store" })).json();
    const tid = v.publicerad ? new Date(v.publicerad).toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" }) : null;
    $("#version").textContent = [`v${v.version}`, tid ? `uppdaterad ${tid}` : "lokal version", v.commit].filter(Boolean).join(" · ");
    if (v.publicerad) $("#version").title = `Publicerad ${v.publicerad}`;
  } catch { /* versionen är bara information */ }
}

// ------------------------------------------------------------ utvecklarläge (utvecklarlage.js)
// Slås på med ?dev i adressen och av med ?dev=av. Valet sparas i webbläsaren. Modulen laddas bara när läget är på.
function startaUtvecklarlage() {
  const param = new URLSearchParams(location.search).get("dev");
  let pa = false;
  try {
    if (param !== null) localStorage.setItem("chronopia-dev", param === "av" ? "nej" : "ja");
    pa = localStorage.getItem("chronopia-dev") === "ja";
  } catch { pa = param !== null && param !== "av"; }
  if (!pa) return;
  S.spelSynlig = true;
  $("#visa-spel").hidden = false;
  import("./utvecklarlage.js").then((m) => m.starta({
    R: S.R, STEG, el, TOM, tillFil, visaNotis, yrkesNycklar, saknas, rakna,
    // Kör fn med en tillfällig rollperson och ger tillbaka den; spelarens rollperson rörs inte
    med(tillfallig, fn) {
      const fore = S.rp;
      const provadeFore = S.provar;
      S.rp = tillfallig;
      S.provar = true;
      try { fn(() => S.rp); return S.rp; } finally { S.rp = fore; S.provar = provadeFore; }
    },
    grundvardesForslag, epFordelning,
    ladda(ny, steg) {
      importera(JSON.stringify(tillFil(ny)));
      if (S.rp.namn === ny.namn) { S.aktivtSteg = steg; S.vy = "steg"; S.nySekundar = ""; S.nyExtra = ""; S.utrustningsFilter = ""; rita(); }
    },
    visaFormular,
    // För poängloggen och den automatiska ifyllningen: läget just nu och en krok som körs efter varje ritning
    nu: () => S.rp, uppdatera, rita, saknasPerSteg, synligaSteg, motorIndata, efterRita: (fn) => { efterRita.push(fn); fn(); }, efterNotis: (fn) => efterNotis.push(fn),
    lage: () => ({ vy: S.vy, aktivtSteg: S.aktivtSteg, rullar, magiModal: Boolean(magiModal), provar: S.provar }),
    tillatOmslag() { S.omslag = true; rita(); },
    stangAv() { try { localStorage.setItem("chronopia-dev", "nej"); } catch { /* frivilligt */ } },
  }));
}

start().catch((e) => {
  $("#arbetsyta").replaceChildren(el("p", { class: "fellista" }, `Regelfilen ${e.message} kunde inte läsas. Kontrollera att mappen regler ligger bredvid sidan.`));
});
