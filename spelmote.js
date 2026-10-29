// Spelmötesdelen: det som händer med rollpersonen efter skapandet (kapitel 4, s. 73–76).
// Spelmöten, träning och förbättringar förs in som poster i loggen (utveckling.js). Varje post
// kontrolleras mot reglerna innan den förs in, så att rollpersonen aldrig hamnar i ett otillåtet läge.
// Byggstenarna (el, falt, tärningsrutor …) kommer från app.js, som för rollformuläret (formular.js).
import { GRUNDEGENSKAPER, fardighetAv, status, epPerFV, besvarjelsePris, slaUpp, skolFV } from "./regelmotor.js";
import {
  kravdaHpSlag, psyOkning, psyMod, traning, traningsdagar, borsen, besvarjelseAv, laggTill,
} from "./utveckling.js";

const DELAR = [
  { id: "oversikt", namn: "Översikt" },
  { id: "session", namn: "Spelmöte" },
  { id: "traning", namn: "Träning" },
  { id: "forbattring", namn: "Förbättra" },
  { id: "logg", namn: "Logg" },
];
const FORBATTRINGSSTEG = ["Erfarenhet", "Hjältepoäng för FV", "Grundegenskaper", "Särskild förmåga", "Sammanfattning"];
const idag = () => new Date().toISOString().slice(0, 10);

let del = "oversikt";
let session = null; // utkast till spelmötet
let trn = null; // utkast till träningen
let forb = null; // utkast till förbättringen
let forbSteg = 0;
let angraBekrafta = 0; // tid då ångra-knappen trycktes första gången

const nySession = () => ({ datum: idag(), titel: "", ep: {}, avslutat: false, psyKamp: false, psy: null, hp: 0, mynt: { gm: 0, sm: 0, km: 0 }, in: [], ut: [], anteckning: "", nyFardighet: "", vald: "" });
const nyTraning = () => ({ datum: idag(), nyckel: "", nyFardighet: "", metod: "ensam", lararFV: 18, lararInt: false, bok: false, kodex: false, timmar: 8, antal: 1, veckor: [] });
const nyForbattring = () => ({ datum: idag(), vila: false, fv: {}, besvarjelser: {}, egenskaper: {}, hpSlag: [], formaga: null, formagaHp: 1 });

export const spelDelar = () => DELAR;
export const aktivDel = () => del;
export function valjDel(id) { del = id; }
// Ny eller inläst rollperson: alla utkast kastas
export function nollstallSpel() { del = "oversikt"; session = null; trn = null; forb = null; forbSteg = 0; }

// ctx: R, rp(), res (den utvecklade rollpersonen), rakna(rp), forIn(post), angra(), rita(), och byggstenar från app.js
export function spelInnehall(ctx) {
  const delar = { oversikt, session: sessionVy, traning: traningVy, forbattring: forbattringVy, logg: loggVy };
  return delar[del](ctx);
}

// ------------------------------------------------------------ byggstenar
function siffra(ctx, id, varde, onchange, { min, max, disabled } = {}) {
  return ctx.el("input", {
    type: "number", id, class: "tal", value: varde ?? 0, min, max, step: 1, disabled,
    onchange: (e) => {
      let v = e.target.value === "" ? 0 : Math.round(Number(e.target.value));
      if (Number.isNaN(v)) v = 0;
      if (min !== undefined) v = Math.max(min, v);
      if (max !== undefined) v = Math.min(max, v);
      onchange(v);
      ctx.rita();
    },
  });
}

function kryss(ctx, id, varde, text, onchange) {
  return ctx.el("label", { class: "kryss" }, ctx.el("input", { type: "checkbox", id, checked: varde, onchange: (e) => { onchange(e.target.checked); ctx.rita(); } }), ctx.el("span", {}, text));
}

const fmt = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");
const summa = (l) => l.reduce((a, b) => a + b, 0);

// Namn på en färdighet eller besvärjelse
function namnPa(ctx, nyckel) {
  const { res, R } = ctx;
  return res.fardigheter.find((f) => f.nyckel === nyckel)?.namn ?? res.besvarjelser.find((b) => b.nyckel === nyckel)?.namn
    ?? besvarjelseAv(R, nyckel)?.namn ?? ctx.namnFor(nyckel);
}

// Rullgardin med rollpersonens färdigheter och besvärjelser i grupper. avB: kategori B går inte att välja.
function egnaFardigheter(ctx, id, varde, onchange, { avB = false, tomText = "Välj färdighet …" } = {}) {
  const { res } = ctx;
  const grupp = (st) => res.fardigheter.filter((f) => f.status === st)
    .map((f) => [f.nyckel, f.kategoriB && avB ? `${f.namn} (kategori B: bara träning)` : f.namn, { disabled: f.kategoriB && avB }]);
  const grupper = [["Primära", grupp("primar")], ["Yrkesfärdigheter", grupp("yrke")], ["Sekundära", grupp("sekundar")],
    ["Besvärjelser", res.besvarjelser.map((b) => [b.nyckel, b.namn])]].filter(([, l]) => l.length);
  return ctx.gruppLista(id, varde, grupper, onchange, tomText);
}

// Val av färdighet: en rollpersonen har, eller en ny
function fardighetsvaljare(ctx, utkast, idPrefix, { avB = false, onval }) {
  const { el } = ctx;
  const harRedan = new Set(ctx.res.fardigheter.map((f) => f.nyckel));
  return el("div", { class: "spel-valjare" },
    ctx.falt("Färdighet rollpersonen har", egnaFardigheter(ctx, `${idPrefix}-egen`, utkast.vald, (v) => { utkast.vald = v; if (v) onval(v); ctx.rita(); }, { avB })),
    el("div", { class: "falt" }, el("span", { class: "etikett" }, "Eller en ny färdighet"),
      el("div", { class: "rad" },
        ctx.fardighetsVal(`${idPrefix}-ny`, utkast.nyFardighet, (v) => { utkast.nyFardighet = v; ctx.rita(); },
          (f) => (f.perVal || !harRedan.has(f.id)) && !(avB && f.kategoriB)),
        el("button", { type: "button", class: "knapp", id: `${idPrefix}-ny-lagg`, disabled: ctx.paborjad(utkast.nyFardighet) || harRedan.has(utkast.nyFardighet),
          onclick: () => { onval(utkast.nyFardighet); utkast.nyFardighet = ""; ctx.rita(); } }, "Välj"))));
}

// Tärningsruta för ett slag i ett utkast. satt(v) sparar slaget.
function slag(ctx, id, etikett, tarning, varde, satt, [n, sidor]) {
  if (varde !== null && varde !== undefined) return ctx.falt(etikett, ctx.landatSlag(id, varde, `Slå ${tarning}`, { sidor, antal: n }));
  const { slagfalt, knapp } = ctx.slagKontroll(id, etikett, `Slå ${tarning}`, n, n * sidor, (v) => { satt(v); ctx.rita(); }, () => ctx.slaT(n, sidor), sidor);
  return [slagfalt, knapp];
}

// ------------------------------------------------------------ översikt
function oversikt(ctx) {
  const { el, R, res } = ctx;
  const rp = ctx.rp();
  const logg = rp.utveckling?.logg ?? [];
  const antal = (typ) => logg.filter((p) => p.typ === typ).length;
  const rader = epRader(ctx);
  const hp = rp.spel.hjaltepoang ?? 0;
  return [
    el("p", {}, "Här för du in det som händer med rollpersonen efter skapandet: erfarenhet, hjältepoäng, pengar och utrustning efter varje spelmöte, träning mellan äventyren och förbättringar när erfarenheten räcker till högre FV (kapitel 4, s. 73–76). Allt sparas i rollpersonens fil, så ladda ner den efter varje spelmöte."),
    el("dl", { class: "nyckelvarden spel-siffror" },
      el("div", {}, el("dt", {}, "Spelmöten"), el("dd", {}, antal("session"))),
      el("div", {}, el("dt", {}, "Träningar"), el("dd", {}, antal("traning"))),
      el("div", {}, el("dt", {}, "Förbättringar"), el("dd", {}, antal("forbattring"))),
      el("div", {}, el("dt", {}, "Hjältepoäng", ctx.infoText("Hjältepoäng (HP) får rollpersonen för hjältedåd. De används till att höja CL inför ett slag, köpa en särskild förmåga eller höja grundegenskaper (s. 75–76).")), el("dd", {}, hp)),
      el("div", {}, el("dt", {}, "Igenkänd", ctx.infoText(R.erfarenhet.hjaltepoang.igenkanning + " SL justerar chansen efter var rollpersonen är och hur länge sedan bragderna var (s. 75).")), el("dd", {}, `${res.utveckling.hpSamlade} %`))),
    el("h3", {}, "Osparade erfarenhetspoäng", ctx.info("EP")),
    rader.length ? el("div", { class: "tabellram" }, el("table", { class: "tabell" },
      el("thead", {}, el("tr", {}, el("th", {}, "Färdighet"), el("th", { class: "num" }, "FV"), el("th", { class: "num" }, "EP"), el("th", { class: "num" }, "EP per FV"), el("th", { class: "num" }, "Räcker till"))),
      el("tbody", {}, rader.map((r) => el("tr", {}, el("td", {}, r.namn), el("td", { class: "num" }, r.fv), el("td", { class: "num" }, r.ep), el("td", { class: "num" }, r.pris),
        el("td", { class: "num" }, r.ep >= r.pris ? `+${Math.floor(r.ep / r.pris)} FV` : "–"))))))
      : el("p", { class: "hjalp" }, "Inga osparade EP. De förs in under Spelmöte eller Träning."),
    el("div", { class: "rad" },
      el("button", { type: "button", class: "knapp primar", onclick: () => { del = "session"; ctx.rita(); } }, "För in ett spelmöte"),
      el("button", { type: "button", class: "knapp", onclick: () => { del = "traning"; ctx.rita(); } }, "För in träning"),
      el("button", { type: "button", class: "knapp", disabled: !rader.some((r) => r.ep >= r.pris) && hp < 1, onclick: () => { del = "forbattring"; ctx.rita(); } }, "Förbättra rollpersonen")),
    hjaltedad(ctx),
  ];
}

// Rader för färdigheter och besvärjelser med osparade EP
function epRader(ctx, rp = ctx.rp(), res = ctx.res) {
  const { R } = ctx;
  return Object.entries(rp.spel.erf).filter(([, n]) => n > 0).map(([nyckel, ep]) => {
    const f = res.fardigheter.find((x) => x.nyckel === nyckel);
    const b = res.besvarjelser.find((x) => x.nyckel === nyckel);
    const besv = besvarjelseAv(R, nyckel);
    const ff = fardighetAv(R, nyckel);
    const pris = f?.epPerFV ?? b?.epPerFV ?? (besv ? besvarjelsePris(R, besv.sv) : ff ? epPerFV(R, status(R, ctx.indata(), nyckel), ff, []) : Infinity);
    return { nyckel, namn: namnPa(ctx, nyckel), ep, pris, fv: f?.fv ?? b?.fv ?? 0, besvarjelse: Boolean(besv), kategoriB: f?.kategoriB ?? ff?.kategoriB };
  }).sort((a, b) => a.namn.localeCompare(b.namn, "sv"));
}

function hjaltedad(ctx) {
  const { el, R } = ctx;
  return el("details", { class: "fakta" }, el("summary", {}, "Hjältedåd och hjältepoäng (s. 75–76)"),
    el("p", {}, "SL delar ut hjältepoäng för fantastiska bragder. Tabellen är en riktlinje. SL kan också dra av HP för extremt ohjältemodiga handlingar, som att överge sina vänner i farans stund."),
    el("div", { class: "tabellram" }, el("table", { class: "tabell" }, el("thead", {}, el("tr", {}, el("th", {}, "Dåd"), el("th", { class: "num" }, "HP"))),
      el("tbody", {}, R.erfarenhet.hjaltepoang.dad.map(([d, hp]) => el("tr", {}, el("td", {}, d), el("td", { class: "num" }, hp)))))),
    el("p", {}, el("strong", {}, "Höja CL: "), R.erfarenhet.hjaltepoang.hojaCL, " Det görs under spel: dra av HP:n på formuläret."));
}

// ------------------------------------------------------------ spelmöte
function sessionVy(ctx) {
  const { el, R, res } = ctx;
  const rp = ctx.rp();
  session ??= nySession();
  const s = session;
  const E = R.erfarenhet;
  const bonus = summa(Object.values(s.ep).map((x) => x.bonus ?? 0));
  const laggTillEp = (nyckel) => { s.ep[nyckel] ??= { aventyr: 0, bonus: 0 }; s.vald = ""; };
  const magiker = Boolean(res.yrke.magiker);
  const mod = psyMod(R, res);
  const bors = borsen(rp.spel, res.utrustning.kvar);
  const egna = rp.spel.utrustning.filter((r) => r.namn);
  const psyText = magiker ? "Övervann rollpersonen ett offers motstånd i en kamp PSY mot PSY?" : "Övervann rollpersonen en magikers anfall i en kamp PSY mot PSY?";
  const psy = s.psy;
  const P = E.psyHojning[magiker ? "magiker" : "ickeMagiker"];
  const psyNu = res.grundegenskaper.PSY;
  const psyTolkning = () => {
    if (!psy?.slag) return psyNu > P.tak ? `PSY är över ${P.tak}, så bara en etta höjer den.` : `Slå 1T20. ${P.bas} − PSY ${psyNu} = ${P.bas - psyNu} eller lägre${mod ? ` (med ${fmt(mod)} på slaget)` : ""} höjer PSY med 1; en etta höjer mer.`;
    if (behoverT3(psy) && psy.t3 == null) return "En etta! Slå 1T3 för hur mycket PSY höjs.";
    return psy.okning ? `PSY höjs med ${psy.okning} till ${psyNu + psy.okning}. Ökningen kommer gradvis under en vecka (s. 75).` : "PSY höjs inte den här gången.";
  };
  // En etta kräver ett slag om 1T3, utom för en icke-magiker med PSY över taket (då blir det alltid +1)
  const behoverT3 = (x) => x?.slag === 1 && (psyNu <= P.tak || P.ettaOverTak === "1T3");
  const satsPsy = (falt, v) => {
    s.psy = { ...s.psy, [falt]: v };
    if (!behoverT3(s.psy) || s.psy.t3 != null) s.psy.okning = psyOkning(R, { magiker, psy: psyNu, slag: s.psy.slag, t3: s.psy.t3 ?? 0, mod });
  };

  return [
    el("p", {}, "För in det som hände under spelmötet. Allt kontrolleras mot reglerna när du sparar."),
    el("div", { class: "rad" },
      ctx.falt("Datum", el("input", { type: "date", id: "session-datum", value: s.datum, onchange: (e) => { s.datum = e.target.value; } })),
      ctx.falt("Äventyr eller rubrik", el("input", { type: "text", id: "session-titel", value: s.titel, placeholder: "t.ex. Skuggorna i Chronopia, del 2", onchange: (e) => { s.titel = e.target.value; } }))),

    el("h3", {}, "Erfarenhetspoäng", ctx.info("EP")),
    el("p", { class: "hjalp" }, `Första gången en färdighet lyckas efter en sömn om minst ${E.aventyr.somnTimmar} timmar (${E.aventyr.somnTimmarAlver} för alver) ger den ${E.aventyr.ep} EP, och ett perfekt slag ger ${E.aventyr.epPerfekt} EP. Färdigheter i kategori B blir bara bättre genom träning (s. 74). Bocka för på formuläret under spel och för över EP här.`),
    fardighetsvaljare(ctx, s, "session-ep", { avB: true, onval: laggTillEp }),
    Object.keys(s.ep).length ? el("div", { class: "tabellram" }, el("table", { class: "tabell", id: "session-eptabell" },
      el("thead", {}, el("tr", {}, el("th", {}, "Färdighet"), el("th", { class: "num" }, "EP från äventyret"), el("th", { class: "num" }, "Bonuspoäng"), el("th", {}))),
      el("tbody", {}, Object.entries(s.ep).map(([k, v]) => el("tr", {},
        el("td", {}, namnPa(ctx, k)),
        el("td", { class: "num" }, siffra(ctx, `ep-${k}`, v.aventyr, (n) => { v.aventyr = n; }, { min: 0, max: 99 })),
        el("td", { class: "num" }, siffra(ctx, `bonus-${k}`, v.bonus, (n) => { v.bonus = n; }, { min: 0, max: E.bonus.maxPerAventyr, disabled: !s.avslutat })),
        el("td", {}, el("button", { type: "button", class: "lank", onclick: () => { delete s.ep[k]; ctx.rita(); } }, "ta bort"))))))) : null,

    el("h3", {}, "Äventyrets slut"),
    kryss(ctx, "session-avslutat", s.avslutat, "Äventyret avslutades under spelmötet", (v) => {
      s.avslutat = v;
      if (!v) { for (const x of Object.values(s.ep)) x.bonus = 0; s.psyKamp = false; s.psy = null; }
    }),
    s.avslutat ? [
      el("p", { class: "hjalp" }, `Efter ett äventyr kan SL dela ut bonuspoäng: ${E.bonus.exempel.map(([t, a, b]) => `${t.toLowerCase()} ${a}–${b}`).join(", ")}. Högst ${E.bonus.maxPerAventyr} sammanlagt, och spelaren fördelar dem över färdigheterna med SL:s godkännande (s. 74).`),
      el("p", { class: bonus > E.bonus.maxPerAventyr ? "hjalp felrad" : "hjalp" }, `Bonuspoäng: ${bonus} av ${E.bonus.maxPerAventyr}.`),
      kryss(ctx, "session-psykamp", s.psyKamp, psyText, (v) => { s.psyKamp = v; if (!v) s.psy = null; }),
      s.psyKamp ? [
        el("p", { class: "hjalp" }, "Kampen måste ha gällt något på riktigt, i en allvarlig situation (SL avgör). Man slår en gång efter ett färdigspelat äventyr (s. 75)."),
        el("div", { class: "rad" },
          slag(ctx, "psy-1t20", "Slag (1T20)", "1T20", psy?.slag, (v) => satsPsy("slag", v), [1, 20]),
          behoverT3(psy) ? slag(ctx, "psy-1t3", "Slag (1T3)", "1T3", psy?.t3, (v) => satsPsy("t3", v), [1, 3]) : null),
        el("p", { class: "summering" }, psyTolkning())] : null] : null,

    el("h3", {}, "Hjältepoäng"),
    el("div", { class: "rad" }, ctx.falt("Hjältepoäng från SL", siffra(ctx, "session-hp", s.hp, (n) => { s.hp = n; }, { min: -99, max: 99 }),
      `Rollpersonen har ${rp.spel.hjaltepoang ?? 0} HP. Negativt tal om SL drar av HP.`)),
    hjaltedad(ctx),

    el("h3", {}, "Pengar i börsen"),
    el("p", { class: "hjalp" }, `Nu: ${["gm", "sm", "km"].map((m) => `${bors[m] ?? "?"} ${m}`).join(", ")}. Skriv hur mycket som har kommit in (positivt) eller gått åt (negativt).`),
    el("div", { class: "rad" }, ["gm", "sm", "km"].map((m) => ctx.falt(m, siffra(ctx, `session-${m}`, s.mynt[m], (n) => { s.mynt[m] = n; }, { min: -999999, max: 999999 })))),

    el("h3", {}, "Utrustning"),
    el("div", { class: "rad" },
      ctx.falt("Ny sak", el("input", { type: "text", id: "session-sak", placeholder: "t.ex. Silverring" })),
      ctx.falt("Vikt (kg)", el("input", { type: "text", id: "session-vikt", class: "tal", inputmode: "decimal" })),
      el("button", { type: "button", class: "knapp", onclick: () => {
        const namn = document.getElementById("session-sak").value.trim();
        if (!namn) return;
        s.in.push({ namn, vikt: document.getElementById("session-vikt").value.trim() });
        ctx.rita();
      } }, "Lägg till")),
    s.in.length ? el("ul", { class: "punkter" }, s.in.map((x, i) => el("li", {}, `${x.namn}${x.vikt ? ` (${x.vikt} kg)` : ""}`,
      el("button", { type: "button", class: "lank", onclick: () => { s.in.splice(i, 1); ctx.rita(); } }, "ta bort")))) : null,
    res.utrustning.saker.length || egna.length ? el("details", { class: "fakta", open: s.ut.length ? true : null },
      el("summary", {}, "Förlorat eller förbrukat"),
      el("ul", { class: "spel-kryss" },
        [...res.utrustning.saker.flatMap((x) => Array.from({ length: x.antal }, (_, j) => ({ namn: x.namn, kopt: true, nr: j, visa: ctx.sakNamn({ ...x, antal: 1 }) }))),
        ...egna.map((x, j) => ({ namn: x.namn, vikt: x.vikt, nr: j, visa: x.namn }))]
        .map((x) => {
          const valt = s.ut.some((u) => u.namn === x.namn && u.kopt === x.kopt && u.nr === x.nr);
          return el("li", {}, kryss(ctx, `ut-${x.kopt ? "k" : "e"}-${x.nr}-${x.namn}`, valt, x.visa, (v) => {
            if (v) s.ut.push({ namn: x.namn, kopt: x.kopt, nr: x.nr, vikt: x.vikt });
            else s.ut = s.ut.filter((u) => !(u.namn === x.namn && u.kopt === x.kopt && u.nr === x.nr));
          }));
        }))) : null,

    el("h3", {}, "Anteckningar"),
    el("textarea", { id: "session-anteckning", rows: 4, placeholder: "Vad hände? Viktiga personer, platser, ledtrådar …", onchange: (e) => { s.anteckning = e.target.value; } }, s.anteckning),

    el("div", { class: "rad spel-spara" },
      el("button", { type: "button", class: "knapp primar", id: "spara-session", disabled: ctx.rullar() || (s.psyKamp && s.psy?.okning == null), onclick: () => {
        const ep = Object.fromEntries(Object.entries(s.ep).filter(([, v]) => v.aventyr || v.bonus));
        const post = {
          typ: "session", datum: s.datum, titel: s.titel.trim(), avslutat: s.avslutat, ep,
          erf: Object.fromEntries(Object.entries(ep).map(([k, v]) => [k, v.aventyr + v.bonus])),
          hp: s.hp, hpFatt: Math.max(0, s.hp), mynt: Object.fromEntries(Object.entries(s.mynt).filter(([, n]) => n)),
          in: s.in, ut: s.ut.map(({ namn, kopt, vikt }) => (kopt ? { namn, kopt } : { namn, vikt })),
          psy: s.psyKamp ? { slag: s.psy.slag, t3: s.psy.t3 ?? null, okning: s.psy.okning } : null, anteckning: s.anteckning.trim(),
        };
        if (ctx.forIn(post)) { session = null; del = "oversikt"; ctx.visaNotis("Spelmötet är infört. Ladda ner rollpersonen för att spara filen."); ctx.rita(); }
      } }, "Spara spelmötet"),
      el("button", { type: "button", class: "knapp", onclick: () => { session = null; ctx.rita(); } }, "Rensa")),
  ];
}

// ------------------------------------------------------------ träning
function traningVy(ctx) {
  const { el, R, res } = ctx;
  trn ??= nyTraning();
  const t = trn;
  const E = R.erfarenhet;
  const besv = t.nyckel ? besvarjelseAv(R, t.nyckel) : null;
  const f = t.nyckel && !besv ? fardighetAv(R, t.nyckel) : null;
  const info = t.nyckel ? traning(R, res, t) : null;
  const fvNu = res.fardigheter.find((x) => x.nyckel === t.nyckel)?.fv ?? res.besvarjelser.find((x) => x.nyckel === t.nyckel)?.fv ?? 0;
  const slagRad = (v) => Array.from({ length: info.slagPerVecka }, (_, i) => v.slag?.[i] ?? null);
  // Veckorna följer antalet; slag som redan finns ligger kvar
  if (info) t.veckor = Array.from({ length: t.antal }, (_, i) => ({ slag: slagRad(t.veckor[i] ?? {}), ep: t.veckor[i]?.ep ?? [] }));
  const lyckat = (s) => s !== null && s + info.mod <= info.cl;
  const epFor = (v) => summa(v.slag.map((s, i) => (lyckat(s) ? v.ep[i] ?? 0 : 0)));
  const slaAlla = () => {
    for (const v of t.veckor) {
      v.slag = v.slag.map(() => ctx.slaT(1, 20));
      v.ep = v.slag.map((s) => (lyckat(s) ? (info.ep === "1T4" ? ctx.slaT(1, 4) : info.ep) : 0));
    }
    ctx.rita();
  };
  const smNu = borsen(ctx.rp().spel, res.utrustning.kvar).sm;
  const klara = info && t.veckor.every((v) => v.slag.every((s) => s !== null) && v.slag.every((s, i) => !lyckat(s) || (v.ep[i] ?? 0) > 0));
  const totalEp = info ? summa(t.veckor.map(epFor)) : 0;
  const kostnad = info ? info.kostnad * t.antal : 0;
  const metoder = [["ensam", "Ensam"], ["larare", "Lärare i grupp"], ["privat", "Privatlärare"]];
  const slagText = info ? `${info.slagPerVecka === 1 ? "Ett slag" : "Två slag"} per vecka: 1T20${info.mod ? ` ${fmt(info.mod)}` : ""} mot ${info.grundegenskap} ${info.cl}, alltså ${info.cl - info.mod} eller lägre på tärningen. Lyckat slag ger ${info.ep} EP.` : "";

  return [
    el("p", {}, `Mellan äventyren kan rollpersonen träna, men inte under ett pågående äventyr. Normal träning är ${E.ensamtraning.timmarPerDag} timmar om dagen ${E.ensamtraning.dagarPerVecka} dagar i veckan. Den som tränar måste ha tillgång till det som behövs, som en smedja eller ett vapen och ett ställe att öva (s. 74). Färdigheter i kategori B kan bara bli bättre så här.`),
    ctx.falt("Datum", el("input", { type: "date", id: "traning-datum", value: t.datum, onchange: (e) => { t.datum = e.target.value; } })),
    t.nyckel ? el("p", { class: "summering" }, `Tränar: ${namnPa(ctx, t.nyckel)} (FV ${fvNu}). `, el("button", { type: "button", class: "lank", onclick: () => { t.nyckel = ""; t.veckor = []; ctx.rita(); } }, "byt"))
      : [fardighetsvaljare(ctx, t, "traning", { onval: (k) => { t.nyckel = k; t.veckor = []; } }), nyBesvarjelse(ctx, (k) => { t.nyckel = k; t.veckor = []; ctx.rita(); })],
    info ? [
      ctx.falt("Hur", ctx.valLista("traning-metod", t.metod, metoder, (v) => { t.metod = v || "ensam"; t.veckor = []; ctx.rita(); })),
      t.metod === "ensam"
        ? el("p", { class: "hjalp" }, besv ? `Ensam lär man sig en besvärjelse ur en magisk kodex, 20–30 sidor handskriven text om den. Slaget är ett Medelsvårt INT-slag med +1 på tärningen för varje INT under ${E.besvarjelseEnsam.modPerIntUnder}, och ett lyckat slag ger ${E.besvarjelseEnsam.ep} EP (s. 75).`
          : "Ensamträning är långsam: slå ett Medelsvårt grundegenskapsslag varje vecka. Lyckas det får rollpersonen 1T4 EP, annars var veckan bortkastad (s. 74).")
        : el("p", { class: "hjalp" }, `En lärare måste vara mästare, minst FV ${E.larare.minFV} (B4), ha INT ${E.larare.minINT} eller mer och ha högre FV än eleven. Eleven slår två slag i veckan; varje FV över 18 hos läraren ger −2 på slagen, och en ensam elev får −5 men betalar dubbelt. Läraren kostar ${E.larare.kostnadPerVecka.toLocaleString("sv-SE")} sm i veckan, ${E.larare.kostnadMagi.toLocaleString("sv-SE")} sm för magi (s. 74).`),
      t.metod !== "ensam" ? el("div", { class: "rad" },
        ctx.falt("Lärarens FV", siffra(ctx, "traning-lararfv", t.lararFV, (n) => { t.lararFV = n; }, { min: 1, max: 99 })),
        kryss(ctx, "traning-lararint", t.lararInt, `Läraren har INT ${E.larare.minINT} eller mer`, (v) => { t.lararInt = v; })) : null,
      t.metod === "ensam" && besv ? kryss(ctx, "traning-kodex", t.kodex, "Rollpersonen har en magisk kodex för besvärjelsen", (v) => { t.kodex = v; }) : null,
      t.metod === "ensam" && f?.grundegenskap === "INT" ? kryss(ctx, "traning-bok", t.bok, "Rollpersonen har en bok som berättar mer än hon redan vet (SL avgör)", (v) => { t.bok = v; }) : null,
      el("div", { class: "rad" },
        ctx.falt("Timmar om dagen", ctx.valLista("traning-timmar", String(t.timmar), [["8", "8 timmar"], ["6", "6 timmar"], ["4", "4 timmar"]], (v) => { t.timmar = Number(v || 8); ctx.rita(); })),
        ctx.falt("Träningsveckor", siffra(ctx, "traning-veckor", t.antal, (n) => { t.antal = n; }, { min: 1, max: 52 }))),
      el("p", { class: "hjalp" }, `${slagText} Tid: ${traningsdagar(R, t.antal, t.timmar)} dagar${t.timmar < 8 ? " (färre timmar om dagen förlänger tiden)" : ""}. Kostnad: ${kostnad ? `${kostnad.toLocaleString("sv-SE")} sm` : "inget"}.`),
      kostnad > (smNu ?? 0) ? el("p", { class: "hjalp felrad" }, `Rollpersonen har ${smNu ?? "?"} sm i börsen och har inte råd. Lägg till pengar under Spelmöte (till exempel växlade guldmynt) eller träna färre veckor.`) : null,
      el("div", { class: "rad" }, el("button", { type: "button", class: "knapp", id: "traning-sla", onclick: slaAlla }, ctx.tarningsIkon(), el("span", {}, `Slå för ${t.antal === 1 ? "veckan" : `alla ${t.antal} veckor`}`))),
      el("div", { class: "tabellram" }, el("table", { class: "tabell", id: "traning-tabell" },
        el("thead", {}, el("tr", {}, el("th", {}, "Vecka"), ...Array.from({ length: info.slagPerVecka }, (_, i) => [el("th", { class: "num" }, info.slagPerVecka > 1 ? `Slag ${i + 1}` : "Slag"), el("th", { class: "num" }, "EP")]))),
        el("tbody", {}, t.veckor.map((v, w) => el("tr", {}, el("td", {}, w + 1),
          v.slag.map((s, i) => [
            el("td", { class: "num" }, siffra(ctx, `traning-${w}-${i}`, s ?? "", (n) => { v.slag[i] = n; if (!lyckat(n)) v.ep[i] = 0; else if (info.ep !== "1T4") v.ep[i] = info.ep; }, { min: 1, max: 20 }),
              s !== null ? el("span", { class: lyckat(s) ? "bniva ok" : "bniva" }, lyckat(s) ? "lyckat" : "miss") : null),
            el("td", { class: "num" }, lyckat(s) && info.ep === "1T4" ? siffra(ctx, `traning-ep-${w}-${i}`, v.ep[i] ?? "", (n) => { v.ep[i] = n; }, { min: 1, max: 4 }) : lyckat(s) ? info.ep : "–")])))))),
      el("p", { class: "summering" }, klara ? `Träningen ger ${totalEp} EP i ${namnPa(ctx, t.nyckel)}.` : "Slå för veckorna, eller skriv in slagen."),
      el("div", { class: "rad spel-spara" },
        el("button", { type: "button", class: "knapp primar", id: "spara-traning", disabled: !klara || kostnad > (smNu ?? 0), onclick: () => {
          const post = {
            typ: "traning", datum: t.datum, nyckel: t.nyckel, metod: t.metod, timmar: t.timmar,
            ...(t.metod === "ensam" ? (besv ? { kodex: t.kodex } : { bok: t.bok }) : { lararFV: t.lararFV, lararInt: t.lararInt }),
            veckor: t.veckor.map((v) => ({ slag: v.slag, ep: v.slag.map((s, i) => (lyckat(s) ? v.ep[i] : 0)) })),
            erf: totalEp ? { [t.nyckel]: totalEp } : {}, mynt: kostnad ? { sm: -kostnad } : {},
          };
          if (ctx.forIn(post)) { trn = null; del = "oversikt"; ctx.visaNotis(`Träningen är införd: ${totalEp} EP. Ladda ner rollpersonen för att spara filen.`); ctx.rita(); }
        } }, "Spara träningen"),
        el("button", { type: "button", class: "knapp", onclick: () => { trn = null; ctx.rita(); } }, "Rensa"))] : null,
  ];
}

// Besvärjelser rollpersonen kan börja lära sig: skolvärde högst FV i skolan (s. 106). Besvärjelser som
// gäller en grupp varelser eller en elementar lärs per grupp; de väljs med sin grupp.
function nyBesvarjelse(ctx, onval) {
  const { el, R, res } = ctx;
  const B = R.besvarjelser;
  if (!B || !(res.yrke.magiker || res.magiformaga.lyckat)) return null;
  const skola = skolFV(res.fardigheter);
  const har = new Set(res.besvarjelser.map((b) => b.nyckel));
  const alt = (b) => {
    const val = b.perVal === "varelsegrupp" ? B.varelsegrupper : b.perVal === "elementar" ? B.elementarer : null;
    return val ? val.map((v) => [`${b.id}:${v}`, `${b.namn} (${v})`]) : [[b.id, b.namn]];
  };
  const grupper = Object.entries(B.skolor).map(([id, namn]) => [namn, B.lista.filter((b) => b.skola === id && b.sv <= skola[id]).flatMap(alt).filter(([k]) => !har.has(k))])
    .filter(([, l]) => l.length);
  if (!grupper.length) return null;
  return ctx.falt("Eller en ny besvärjelse", ctx.gruppLista("traning-besv", "", grupper.map(([n, l]) => [n, l.map(([k, t]) => [k, `${t}`])]), (v) => { if (v) onval(v); }, "Välj besvärjelse …"),
    "Bara besvärjelser med skolvärde högst FV i skolan går att lära sig (s. 106).");
}

// ------------------------------------------------------------ förbättring
// Posten som utkastet ger, och rollpersonen efteråt
function forbattringsPost(ctx) {
  const { R, res } = ctx;
  const rp = ctx.rp();
  const f = forb;
  const erf = {};
  for (const [k, n] of Object.entries(f.fv)) if (n) erf[k] = -n * prisFor(ctx, k);
  for (const [k, n] of Object.entries(f.besvarjelser)) if (n) erf[k] = -n * besvarjelsePris(R, besvarjelseAv(R, k).sv);
  const hojda = summa(Object.values(f.egenskaper));
  const post = {
    typ: "forbattring", datum: f.datum, vila: f.vila,
    fv: Object.fromEntries(Object.entries(f.fv).filter(([, n]) => n)), besvarjelser: Object.fromEntries(Object.entries(f.besvarjelser).filter(([, n]) => n)),
    egenskaper: Object.fromEntries(Object.entries(f.egenskaper).filter(([, n]) => n)), erf, hpSlag: f.hpSlag, formaga: f.formaga,
  };
  const efter0 = laggTill(rp, { ...post, hp: 0 }, res.utrustning.kvar);
  const resEfter = ctx.rakna(efter0);
  // Slag som inte längre behövs tas bort
  const krav = kravdaHpSlag(R, res, resEfter);
  post.hpSlag = f.hpSlag = f.hpSlag.filter((x) => krav.some((k) => k.nyckel === x.nyckel && k.grans === x.grans));
  post.hp = summa(post.hpSlag.map((x) => x.slag)) - R.erfarenhet.hjaltepoang.egenskap.hp * hojda - (f.formaga?.hp ?? 0);
  const efter = laggTill(rp, post, res.utrustning.kvar);
  return { post, efter, resEfter: ctx.rakna(efter), krav };
}

function prisFor(ctx, nyckel) {
  return epRader(ctx).find((r) => r.nyckel === nyckel)?.pris ?? ctx.res.fardigheter.find((f) => f.nyckel === nyckel)?.epPerFV;
}

function forbattringVy(ctx) {
  const { el } = ctx;
  forb ??= nyForbattring();
  const p = forbattringsPost(ctx);
  const fel = ctx.kontrollera(p.post, p.efter, p.resEfter);
  const vyer = [forbErfarenhet, forbHpSlag, forbEgenskaper, forbFormaga, forbSammanfattning];
  return [
    el("p", {}, "Här växlas erfarenhetspoäng till FV och hjältepoäng till grundegenskaper eller en särskild förmåga. Förbättringen sker mellan äventyren."),
    el("ol", { class: "spel-steg", "aria-label": "Förbättringens steg" }, FORBATTRINGSSTEG.map((namn, i) => el("li", {},
      el("button", { type: "button", class: "valknapp" + (i === forbSteg ? " vald" : ""), "aria-current": i === forbSteg ? "step" : null, onclick: () => { forbSteg = i; ctx.rita(); } }, `${i + 1}. ${namn}`)))),
    el("div", { class: "spel-steginnehall" }, vyer[forbSteg](ctx, p, fel)),
    el("nav", { class: "steg-fot forb-fot", "aria-label": "Förbättringens steg" },
      forbSteg > 0 ? el("button", { type: "button", class: "knapp", onclick: () => { forbSteg -= 1; ctx.rita(); } }, `← ${FORBATTRINGSSTEG[forbSteg - 1]}`) : el("button", { type: "button", class: "knapp", onclick: () => { forb = null; forbSteg = 0; del = "oversikt"; ctx.rita(); } }, "Avbryt"),
      forbSteg < FORBATTRINGSSTEG.length - 1 ? el("button", { type: "button", class: "knapp primar", onclick: () => { forbSteg += 1; ctx.rita(); } }, `${FORBATTRINGSSTEG[forbSteg + 1]} →`) : el("span")),
  ];
}

function hpTillganglig(ctx, p) {
  return (ctx.rp().spel.hjaltepoang ?? 0) + p.post.hp;
}

function forbErfarenhet(ctx, p) {
  const { el, R } = ctx;
  const rader = epRader(ctx);
  const radEfter = (k) => p.resEfter.fardigheter.find((f) => f.nyckel === k) ?? p.resEfter.besvarjelser.find((b) => b.nyckel === k);
  const kvarEp = (k) => p.efter.spel.erf[k] ?? 0;
  const andra = (r, d) => {
    const m = r.besvarjelse ? forb.besvarjelser : forb.fv;
    m[r.nyckel] = Math.max(0, (m[r.nyckel] ?? 0) + d);
    ctx.rita();
  };
  return [
    el("p", {}, `EP kan växlas till FV först när rollpersonen får en sammanhängande vila om minst ${R.erfarenhet.omvandling.viladagar} dagar, inte under ett pågående äventyr. Varje FV kostar lika mycket som när rollpersonen skapades: 2 EP för primära, 3 för yrkesfärdigheter och 5 för sekundära. EP som blir över ligger kvar (s. 74–75).`),
    kryss(ctx, "forb-vila", forb.vila, `Rollpersonen har vilat minst ${R.erfarenhet.omvandling.viladagar} dagar i sträck`, (v) => { forb.vila = v; }),
    rader.length ? el("div", { class: "tabellram" }, el("table", { class: "tabell", id: "forb-eptabell" },
      el("thead", {}, el("tr", {}, el("th", {}, "Färdighet"), el("th", { class: "num" }, "EP kvar"), el("th", { class: "num" }, "EP per FV"), el("th", { class: "num" }, "FV"), el("th", { class: "num" }, "Höjning"), el("th", { class: "num" }, "Ny FV"))),
      el("tbody", {}, rader.map((r) => {
        const n = (r.besvarjelse ? forb.besvarjelser : forb.fv)[r.nyckel] ?? 0;
        const ny = radEfter(r.nyckel);
        const tak = ny?.tak ?? Infinity;
        const kanUpp = forb.vila && kvarEp(r.nyckel) >= r.pris && (ny?.fv ?? 0) < tak;
        return el("tr", {},
          el("td", {}, r.namn, tak !== Infinity && tak <= (ny?.fv ?? 0) + 1 ? el("small", { class: "hjalp" }, ` högst ${tak}`) : null),
          el("td", { class: "num" }, kvarEp(r.nyckel)), el("td", { class: "num" }, r.pris), el("td", { class: "num" }, r.fv),
          el("td", { class: "num stegare" },
            el("button", { type: "button", class: "knapp liten", id: `forb-ner-${r.nyckel}`, "aria-label": `Sänk ${r.namn}`, disabled: !n, onclick: () => andra(r, -1) }, "−"),
            el("span", {}, n ? `+${n}` : "0"),
            el("button", { type: "button", class: "knapp liten", id: `forb-upp-${r.nyckel}`, "aria-label": `Höj ${r.namn}`, disabled: !kanUpp, onclick: () => andra(r, 1) }, "+")),
          el("td", { class: "num" }, ny?.fv ?? r.fv));
      })))) : el("p", { class: "hjalp" }, "Rollpersonen har inga osparade EP."),
    forb.vila ? null : el("p", { class: "hjalp" }, "Bocka i vilan för att kunna höja FV."),
  ];
}

function forbHpSlag(ctx, p) {
  const { el } = ctx;
  if (!p.krav.length) return [el("p", {}, "En färdighet som når FV 21, 41, 61 och så vidare ger 1T4 hjältepoäng (s. 76). Ingen färdighet gör det med förbättringen som den ser ut nu.")];
  return [
    el("p", {}, "En färdighet som når FV 21, 41, 61 och så vidare ger 1T4 hjältepoäng (s. 76). Slå för var och en. Poängen kan användas direkt i nästa steg."),
    el("ul", { class: "yrkeslista" }, p.krav.map((k) => {
      const gjort = forb.hpSlag.find((x) => x.nyckel === k.nyckel && x.grans === k.grans);
      return el("li", {}, el("span", { class: "fnamn" }, `${k.namn} når FV ${k.grans}`),
        el("div", { class: "rad" }, slag(ctx, `hp-${k.nyckel}-${k.grans}`, "HP (1T4)", "1T4", gjort?.slag, (v) => { forb.hpSlag.push({ nyckel: k.nyckel, grans: k.grans, slag: v }); }, [1, 4])));
    })),
  ];
}

function forbEgenskaper(ctx, p) {
  const { el, R } = ctx;
  const H = R.erfarenhet.hjaltepoang.egenskap;
  const hp = hpTillganglig(ctx, p);
  const fore = ctx.res.grundegenskaper;
  const efter = p.resEfter.grundegenskaper;
  return [
    el("p", {}, `För ${H.hp} hjältepoäng höjs en grundegenskap ett poäng, utom STO. Höjningen är permanent och obegränsad (s. 76). FV i primära färdigheter och yrkesfärdigheter som bygger på grundegenskapen höjs lika mycket (s. 45); sekundära färdigheter påverkas inte.`),
    el("p", { class: "summering" }, `Hjältepoäng att använda: ${hp}.`),
    el("div", { class: "tabellram" }, el("table", { class: "tabell", id: "forb-egenskaper" },
      el("thead", {}, el("tr", {}, el("th", {}, "Grundegenskap"), el("th", { class: "num" }, "Nu"), el("th", { class: "num" }, "Höjning"), el("th", { class: "num" }, "Ny"))),
      el("tbody", {}, [...GRUNDEGENSKAPER, "STO"].map((g) => {
        const n = forb.egenskaper[g] ?? 0;
        return el("tr", {}, el("td", {}, g, ctx.info(g)), el("td", { class: "num" }, fore[g]),
          el("td", { class: "num stegare" }, g === "STO" ? el("span", { class: "hjalp" }, "kan inte höjas") : [
            el("button", { type: "button", class: "knapp liten", id: `forb-${g}-ner`, "aria-label": `Sänk ${g}`, disabled: !n, onclick: () => { forb.egenskaper[g] = n - 1; ctx.rita(); } }, "−"),
            el("span", {}, n ? `+${n}` : "0"),
            el("button", { type: "button", class: "knapp liten", id: `forb-${g}-upp`, "aria-label": `Höj ${g}`, disabled: hp < H.hp, onclick: () => { forb.egenskaper[g] = n + 1; ctx.rita(); } }, "+")]),
          el("td", { class: "num" }, efter[g]));
      })))),
  ];
}

function forbFormaga(ctx, p) {
  const { el, R } = ctx;
  const S = R.erfarenhet.hjaltepoang.sarskildFormaga;
  const hp = hpTillganglig(ctx, p);
  const f = forb.formaga;
  const tabell = R["sarskilda-formagor"];
  const traff = f ? tabell.find(({ slag: [a, b] }) => f.slag + f.hp * S.bonusPerHp >= a && (b === null || f.slag + f.hp * S.bonusPerHp <= b)) : null;
  const hogst = Math.min(S.max, hp + (f?.hp ?? 0));
  const val = (i) => f?.val?.[i];
  const sattVal = (i, v) => { f.val ??= []; f.val[i] = v; ctx.rita(); };
  const valen = (traff?.regel ?? []).map((d, i) => {
    if (d.typ === "fv" && d.valj) {
      const valda = [].concat(val(i) ?? []);
      return el("li", {}, el("span", { class: "fnamn" }, d.valj > 1 ? `Välj ${d.valj} färdigheter` : "Välj färdighet"),
        el("div", { class: "rad" }, Array.from({ length: d.valj }, (_, j) => ctx.valjFardighet(`forb-sf-${i}-${j}`, d.bland, valda[j], (v) => { const ny = [...valda]; ny[j] = v; sattVal(i, ny); }))));
    }
    if (d.typ === "egenskapVal") {
      const v = val(i) ?? {};
      const antal = v.lage === "en" ? 1 : v.lage === "tre" ? 3 : 0;
      const eg = v.egenskaper ?? [];
      return el("li", {}, el("span", { class: "fnamn" }, "Höj grundegenskaper"),
        el("div", { class: "rad" },
          ctx.valLista(`forb-sf-${i}-lage`, v.lage, [["tre", "+1 på tre olika"], ["en", "+2 på en"]], (lage) => sattVal(i, { lage, egenskaper: [] })),
          Array.from({ length: antal }, (_, j) => ctx.valLista(`forb-sf-${i}-${j}`, eg[j], GRUNDEGENSKAPER.map((g) => [g, g]), (g) => { const ny = [...eg]; ny[j] = g; sattVal(i, { ...v, egenskaper: ny }); }))));
    }
    return null;
  }).filter(Boolean);
  return [
    el("p", {}, `För hjältepoäng kan rollpersonen slå en gång till på tabellen över särskilda förmågor (s. 30–32): ${S.tarning} plus ${S.bonusPerHp} för varje HP. Minst ${S.min} och högst ${S.max} HP, och bara mellan äventyren (s. 76). Steget är frivilligt.`),
    el("p", { class: "summering" }, `Hjältepoäng att använda: ${hp}.`),
    f ? null : hogst < S.min ? el("p", { class: "hjalp" }, "Rollpersonen har inga hjältepoäng att lägga här.") : el("div", { class: "rad" },
      ctx.falt("HP att lägga", siffra(ctx, "forb-sf-hp", Math.min(forb.formagaHp, hogst), (n) => { forb.formagaHp = n; }, { min: S.min, max: hogst })),
      slag(ctx, "forb-sf", `Slag (${S.tarning})`, S.tarning, null, (v) => { forb.formaga = { hp: Math.min(forb.formagaHp, hogst), slag: v, val: [] }; }, [2, 20])),
    f && traff ? [
      el("div", { class: "rad" }, ctx.falt("HP lagda", el("input", { class: "tal last", value: f.hp, readonly: true })), ctx.falt(`Slag (${S.tarning})`, ctx.landatSlag("forb-sf", f.slag, `Slå ${S.tarning}`, { sidor: 20 }))),
      el("p", { class: "summering" }, `${f.slag} + ${f.hp * S.bonusPerHp} = ${f.slag + f.hp * S.bonusPerHp}: ${traff.namn}. ${traff.effekt} (s. ${traff.sida})`),
      valen.length ? [el("h3", {}, "Val för förmågan"), el("ul", { class: "yrkeslista" }, valen)] : null,
      traff.regel ? null : el("p", { class: "hjalp" }, "Förmågan påverkar inga värden på formuläret, men står med bland särskilda förmågor.")] : null,
  ];
}

function forbSammanfattning(ctx, p, fel) {
  const { el } = ctx;
  const post = p.post;
  const andringar = [
    ...Object.entries(post.fv).map(([k, n]) => `${namnPa(ctx, k)}: FV +${n} (${-post.erf[k]} EP)`),
    ...Object.entries(post.besvarjelser).map(([k, n]) => `${namnPa(ctx, k)}: FV +${n} (${-post.erf[k]} EP)`),
    ...post.hpSlag.map((x) => `${namnPa(ctx, x.nyckel)} nådde FV ${x.grans}: ${x.slag} HP`),
    ...Object.entries(post.egenskaper).map(([g, n]) => `${g} +${n} (${n * ctx.R.erfarenhet.hjaltepoang.egenskap.hp} HP)`),
    post.formaga ? `Särskild förmåga för ${post.formaga.hp} HP: ${p.resEfter.extraFormagor.at(-1)?.namn ?? "?"}` : null,
  ].filter(Boolean);
  const kvarSlag = p.krav.filter((k) => !forb.hpSlag.some((x) => x.nyckel === k.nyckel && x.grans === k.grans));
  return [
    andringar.length ? el("ul", { class: "punkter" }, andringar.map((t) => el("li", {}, t))) : el("p", {}, "Inget är ändrat än."),
    el("p", { class: "summering" }, `Hjältepoäng efteråt: ${p.efter.spel.hjaltepoang}.`),
    kvarSlag.length ? [el("p", {}, "Slå för hjältepoängen först:"), forbHpSlag(ctx, p)] : null,
    fel.length && andringar.length ? el("div", { class: "saknaslista" }, el("strong", {}, "Det här måste rättas"), el("ul", {}, fel.map((t) => el("li", {}, t)))) : null,
    el("div", { class: "rad spel-spara" },
      el("button", { type: "button", class: "knapp primar", id: "spara-forbattring", disabled: Boolean(fel.length) || !andringar.length || ctx.rullar(), onclick: () => {
        if (ctx.forIn(p.post)) { forb = null; forbSteg = 0; del = "oversikt"; ctx.visaNotis("Förbättringen är införd. Ladda ner rollpersonen för att spara filen."); ctx.rita(); }
      } }, "Spara förbättringen")),
  ];
}

// ------------------------------------------------------------ logg
function beskriv(ctx, p) {
  const ep = Object.entries(p.erf ?? {}).filter(([, n]) => n).map(([k, n]) => `${namnPa(ctx, k)} ${fmt(n)} EP`);
  const mynt = Object.entries(p.mynt ?? {}).filter(([, n]) => n).map(([m, n]) => `${fmt(n)} ${m}`);
  const delar = [];
  if (p.typ === "session") {
    if (ep.length) delar.push(ep.join(", "));
    if (p.hp) delar.push(`${fmt(p.hp)} HP`);
    if (p.psy) delar.push(p.psy.okning ? `PSY +${p.psy.okning}` : "PSY-slaget höjde inte");
    if (mynt.length) delar.push(mynt.join(", "));
    if (p.in?.length) delar.push(`Fick ${p.in.map((x) => x.namn).join(", ")}`);
    if (p.ut?.length) delar.push(`Förlorade ${p.ut.map((x) => x.namn).join(", ")}`);
  } else if (p.typ === "traning") {
    const metod = { ensam: "ensam", larare: `med lärare (FV ${p.lararFV})`, privat: `med privatlärare (FV ${p.lararFV})` }[p.metod];
    delar.push(`${namnPa(ctx, p.nyckel)} ${metod}, ${p.veckor.length} veckor: ${summa(Object.values(p.erf))} EP`);
    if (mynt.length) delar.push(mynt.join(", "));
  } else {
    const fv = [...Object.entries(p.fv ?? {}), ...Object.entries(p.besvarjelser ?? {})].map(([k, n]) => `${namnPa(ctx, k)} +${n}`);
    if (fv.length) delar.push(`FV: ${fv.join(", ")}`);
    const eg = Object.entries(p.egenskaper ?? {}).map(([g, n]) => `${g} +${n}`);
    if (eg.length) delar.push(eg.join(", "));
    if (p.formaga) delar.push(`Särskild förmåga (${p.formaga.hp} HP)`);
    if (p.hp) delar.push(`${fmt(p.hp)} HP`);
  }
  return delar.join(". ");
}

function loggVy(ctx) {
  const { el } = ctx;
  const logg = ctx.rp().utveckling?.logg ?? [];
  const typnamn = { session: "Spelmöte", traning: "Träning", forbattring: "Förbättring" };
  const bekrafta = Date.now() - angraBekrafta < 5000;
  return [
    el("p", {}, "Allt som har förts in sedan rollpersonen skapades, det senaste först. Den senaste posten kan ångras; då tas allt den ändrade tillbaka."),
    logg.length ? el("ol", { class: "spel-logg", reversed: true }, [...logg].reverse().map((p, i) => el("li", {},
      el("div", { class: "spel-logg-huvud" }, el("strong", {}, typnamn[p.typ]), p.titel ? ` · ${p.titel}` : "", el("span", { class: "hjalp" }, ` ${p.datum ?? ""}`)),
      el("p", {}, beskriv(ctx, p) || "Inget ändrat."),
      p.anteckning ? el("p", { class: "hjalp" }, p.anteckning) : null,
      i === 0 ? el("button", { type: "button", class: "knapp" + (bekrafta ? " fara" : ""), id: "angra-senaste", onclick: () => {
        if (!bekrafta) { angraBekrafta = Date.now(); ctx.rita(); setTimeout(() => ctx.rita(), 5100); return; }
        angraBekrafta = 0;
        ctx.angra();
      } }, bekrafta ? "Tryck igen för att ångra" : "Ångra den här posten") : null)))
      : el("p", { class: "hjalp" }, "Inget är infört än."),
  ];
}

// Siffror för sidopanelen: osparade EP och hjältepoäng
export function spelPotter(ctx) {
  const rader = epRader(ctx);
  return { ep: summa(rader.map((r) => r.ep)), hp: ctx.rp().spel.hjaltepoang ?? 0, bniva: (fv) => slaUpp(ctx.R.fardigheter.bNivaer, fv) };
}
