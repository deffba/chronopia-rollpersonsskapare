// Färdigheter, stridskonster och fördelning av EP.
import { yrkeAv, fardighetAv, slaUpp, paborjad, teknikLista } from "../regelmotor.js";
import { rita, visaNotis } from "../app.js";
import { S, rakna, uppdatera, yrkeId, yrkesNycklar } from "../tillstand.js";
import { el } from "../ui/dom.js";
import { falt, fardighetsInfo, fardighetsVal, info, markera, tal } from "../ui/kontroller.js";
import { magiBehovs, magiMojlig, oppnaMagiModal } from "../ui/magimodal.js";
import { valdBeskrivning } from "./yrkesfardigheter.js";

// EP per FV för en ny sekundär färdighet (s. 35–36)
function sekundarPris(nyckel) {
  const k = S.R.fardigheter.kostnad;
  if ((nyckel || "").startsWith("stridskonster")) return 3; // billigaste stilen: en teknik à 0,5 → 1, plus 2 (s. 68)
  if ((nyckel || "").startsWith("vapentekniker")) return 1; // billigaste egna stilen: en teknik à 0,5 → 1 (V&R s. 15)
  return fardighetAv(S.R, nyckel || "x")?.typ === "magiskola" ? k.magiskolaSekundar : k.sekundar;
}

function nySekundarInfo(res) {
  const pris = sekundarPris(S.nySekundar);
  const typ = fardighetAv(S.R, S.nySekundar || "x")?.typ === "magiskola" ? "En magiskola som sekundär färdighet" : "En sekundär färdighet";
  const text = S.nySekundar.startsWith("stridskonster")
    ? `Stridskonster som sekundär färdighet har ingen baschans. Varje FV kostar teknikernas grundkostnad plus 2 EP, minst ${pris} EP. Teknikerna väljer du när stilen är tillagd. Du har ${res.ep.kvar} EP kvar.`
    : `${typ} har ingen baschans och kostar ${pris} EP per FV. Du har ${res.ep.kvar} EP kvar, vilket räcker till FV ${Math.floor(res.ep.kvar / pris)}.`;
  return el("p", { class: res.ep.kvar < pris ? "hjalp felrad" : "hjalp" },
    text, res.ep.kvar < pris ? " Du har inte råd med fler sekundära färdigheter." : " Välj färdighet, fyll i vad den gäller och tryck Lägg till.");
}

export function stegFardigheter(res) {
  const grupper = [["primar", "Primära färdigheter", "2 EP per FV"], ["yrke", "Yrkesfärdigheter", "3 EP per FV"], ["sekundar", "Sekundära färdigheter", "5 EP per FV"]];
  const bniva = (fv) => slaUpp(S.R.fardigheter.bNivaer, fv);
  const tabell = (lista) => el("div", { class: "tabellram" }, el("table", { class: "tabell fardighetstabell" },
    el("thead", {}, el("tr", {}, el("th", {}, "Färdighet"), el("th", {}, "Grundeg."), el("th", { class: "num" }, "Start", info("BC")), el("th", { class: "num" }, "FV", info("FV")), el("th", { class: "num" }, "EP", info("EP")))),
    el("tbody", {}, lista.map((f) => el("tr", {},
      el("td", {}, f.namn, fardighetsInfo(f.nyckel), S.rp.sekundara.includes(f.nyckel) && f.status === "sekundar" ? el("button", {
        type: "button", class: "lank", "aria-label": `Ta bort ${f.namn}`,
        onclick: () => { S.rp.sekundara = S.rp.sekundara.filter((k) => k !== f.nyckel); delete S.rp.fardigheter[f.nyckel]; uppdatera(); },
      }, "ta bort") : null),
      el("td", {}, f.grundegenskap),
      el("td", { class: "num" }, f.start),
      el("td", { class: "num" }, markera(tal(`fv-${f.nyckel}`, f.fv, (v) => { S.rp.fardigheter[f.nyckel] = v ?? 0; uppdatera(); }, { min: 0, max: 30 }), f.fv, f.start),
        el("span", { class: "bniva" }, f.kategoriB ? bniva(f.fv) : "")),
      el("td", { class: "num" }, f.ep || ""))))));
  const harRedan = new Set([...yrkesNycklar(), ...S.rp.extraYrkesfardigheter, ...S.rp.sekundara]);
  return [
    el("p", {}, `Du har ${res.ep.start} EP: ${S.R.alder.efterAr.find((r) => r.max === null || S.rp.alder <= r.max).ep} för åldern och 5 per överblivet BP. Primära och yrkesfärdigheter har gratis baschans (BC). FV får inte vara högre än grundegenskapen vid start.`),
    el("div", { class: "rad" },
      el("button", { type: "button", class: "knapp", onclick: fordelaEP }, `Fördela EP automatiskt för ${res.yrke.namn.toLowerCase()}`),
      S.autoAnvand.fardigheter ? el("button", { type: "button", class: "knapp", onclick: () => { S.rp.fardigheter = {}; S.rp.besvarjelser = {}; S.autoAnvand.fardigheter = false; uppdatera(); } }, "Nollställ FV") : null,
      el("span", { class: "hjalp" }, "Fördelningen ersätter dina nuvarande FV. Yrkesfärdigheterna får mest, sedan sekundära färdigheter du har lagt till och primära färdigheter med hög grundegenskap. Lägg till sekundära färdigheter först om du vill ha med dem. Du kan justera efteråt.")),
    grupper.map(([st, titel, pris]) => {
      const lista = res.fardigheter.filter((f) => f.status === st);
      return lista.length ? [el("h3", {}, titel, el("span", { class: "pris" }, pris)), tabell(lista)] : null;
    }),
    res.fardigheter.filter((f) => f.tekniker).map((f) => stridskonstTekniker(f, res)),
    el("h3", {}, "Lär dig en ny sekundär färdighet"),
    el("div", { class: "rad" },
      // Färdigheter som rollpersonen redan har visas inte; för dem med delval spärras de delval som redan finns
      fardighetsVal("ny-sek", S.nySekundar, (v) => { S.nySekundar = v; rita(); }, (f) => f.typ !== "primar" && magiMojlig(f) && (f.perVal || !harRedan.has(f.id))),
      el("button", { type: "button", class: "knapp", disabled: paborjad(S.nySekundar), onclick: () => {
        const pris = sekundarPris(S.nySekundar);
        if (res.ep.kvar < pris) {
          visaNotis(`Det går inte: en ny sekundär färdighet kostar ${pris} EP per FV, och du har bara ${res.ep.kvar} EP kvar.`);
          return;
        }
        if (!S.rp.sekundara.includes(S.nySekundar)) S.rp.sekundara.push(S.nySekundar);
        S.nySekundar = "";
        uppdatera();
        // En magiskola utan lyckat magiförmågeslag: slaget görs direkt
        if (magiBehovs(rakna())) oppnaMagiModal();
      } }, "Lägg till")),
    valdBeskrivning(S.nySekundar),
    nySekundarInfo(res),
  ];
}

// Stridskonster namnges där färdigheten väljs, men teknikerna väljs i steg 11
export const stridskonstInfo = () => el("p", { class: "yrkesformaga stridskonst-info", role: "note" }, el("strong", {}, "Tekniker: "),
  "Teknikerna i stilen väljer du i steg 11, Färdigheter. Där kan du också byta namn på stilen.");

// Stridskonster och Vapentekniker: spelaren sätter ihop sin stil av tekniker. Summan av deras grundkostnad,
// avrundad uppåt, är EP per FV; för Stridskonster 2 till om stilen inte är yrkesfärdighet (s. 68).
// En svärdsskolas stridskonst (V&R s. 32–33) har färdiga tekniker och ett eget pris (RB-009).
function stridskonstTekniker(f, res) {
  const def = fardighetAv(S.R, f.nyckel);
  const vr = def.id === "vapentekniker";
  const sidor = (namn) => (S.R.fardigheter.stridskonstTekniker.some(([n]) => n === namn) ? "s. 69–70" : "Vapen & rustningar s. 16");
  const tal = (x) => x.toLocaleString("sv-SE", { minimumFractionDigits: 1 });
  const beskrivningar = (lista) => el("ul", { class: "teknikbeskrivningar" }, lista.map((t) => el("li", {},
    el("strong", {}, t), el("p", { class: "hjalp" }, S.R.fardigheter.stridskonstBeskrivning?.[t] ?? ""))));
  if (f.skola) {
    return el("div", { class: "stridskonst fardig", "data-skola": f.skola.id },
      el("h3", {}, `${f.namn}: ${f.skola.skola}`),
      el("p", { class: "hjalp" }, `Svärdsskolans färdiga stridskonst (Vapen & rustningar s. ${f.skola.kalla.sida}). ${f.skola.vem}`),
      beskrivningar(f.skola.tekniker),
      el("p", { class: "summering" }, f.status === "yrke"
        ? `Som yrkesfärdighet kostar den ${f.epPerFV} EP per FV, som en vanlig yrkesfärdighet.`
        : `Skolans pris: ${f.epPerFV} EP per FV.`));
  }
  const valda = S.rp.stridskonstTekniker[f.nyckel] ?? [];
  const lista = teknikLista(S.R, def);
  const kostnadFor = (t) => lista.find(([n]) => n === t)?.[1] ?? 0;
  const summa = valda.reduce((a, t) => a + kostnadFor(t), 0);
  const tillagg = !vr && f.status !== "yrke" ? 2 : 0;
  const fardig = Boolean(S.rp.stridskonstFardig?.[f.nyckel]);
  const vaxla = (namn, pa) => {
    const ny = pa ? [...valda, namn] : valda.filter((t) => t !== namn);
    S.rp.stridskonstTekniker = { ...S.rp.stridskonstTekniker, [f.nyckel]: ny };
    uppdatera();
  };
  // En teknik till höjer priset för alla FV över baschansen; den går inte att välja om EP inte räcker.
  // Är inget FV köpt än räknas det första, eftersom stilen annars inte går att höja alls.
  const pris = (x) => Math.max(vr ? 1 : 0, Math.ceil(x)) + tillagg;
  const merEP = (kostnad) => Math.max(f.fv - f.start, 1) * pris(summa + kostnad) - f.ep;
  const stil = f.nyckel.split(":")[1] ?? "";
  const summering = el("p", { class: "summering" }, valda.length
    ? `Grundkostnad ${tal(summa)}, avrundat uppåt ${Math.ceil(summa)}${tillagg ? `, plus 2 = ${f.epPerFV}` : ""} EP per FV.`
    : "Inga tekniker valda än. Välj minst en innan du höjer FV.");
  if (fardig) {
    return el("div", { class: "stridskonst fardig" },
      el("h3", {}, `${f.namn}: stilens tekniker`),
      beskrivningar(valda),
      summering,
      el("div", { class: "rad" }, el("button", { type: "button", class: "knapp", id: `sk-andra-${idDel(f.nyckel)}`, onclick: () => {
        S.rp.stridskonstFardig = { ...S.rp.stridskonstFardig, [f.nyckel]: false }; uppdatera();
      } }, "Ändra")));
  }
  const rutnat = (grupp, forskjut) => el("div", { class: "teknikrutnat" }, grupp.map(([namn, kostnad], k) => {
    const i = forskjut + k;
    const text = S.R.fardigheter.stridskonstBeskrivning?.[namn];
    const vald = valda.includes(namn);
    const for_dyr = !vald && merEP(kostnad) > res.ep.kvar;
    // Info-knappen ligger utanför etiketten, så att ett tryck på den inte kryssar i tekniken
    return el("div", { class: "teknik" + (for_dyr ? " for-dyr" : "") },
      el("label", { title: for_dyr ? `Kräver ${merEP(kostnad)} EP till, du har ${res.ep.kvar}` : null },
        el("input", { type: "checkbox", id: `teknik-${idDel(f.nyckel)}-${i}`, checked: vald, disabled: for_dyr, onchange: (e) => vaxla(namn, e.target.checked) }),
        el("span", {}, namn)),
      text ? el("button", { type: "button", class: "info", "data-tip": `${text} (${sidor(namn)})`, "aria-label": `Om ${namn.replace("†", "")}` }, "i") : null,
      el("span", { class: "teknikpris" }, tal(kostnad)));
  }));
  const vapenLista = vr ? S.R.fardigheter.vapenTekniker : [];
  return el("div", { class: "stridskonst" },
    el("h3", {}, `${f.namn}: stilens tekniker`),
    falt("Stilens namn", el("input", { type: "text", id: `sk-namn-${idDel(f.nyckel)}`, value: stil, maxlength: 125,
      onchange: (e) => bytStilnamn(f.nyckel, e.target.value.trim()) })),
    el("p", { class: "hjalp" }, "Välj vilka tekniker stilen består av. FV gäller alla tekniker i stilen. Varje tekniks grundkostnad läggs ihop och avrundas uppåt; det blir EP per FV",
      tillagg ? ", plus 2 eftersom stilen inte är en yrkesfärdighet. " : ". ",
      vr ? "Vapentekniker kan blandas med grundreglernas obeväpnade tekniker (Vapen & rustningar s. 15). " : "",
      "Tekniker som skulle göra stilen dyrare än du har EP till går inte att välja (minst ett köpt FV räknas). † fungerar bara mot människoliknande motståndare (s. 68–70)."),
    vr ? [el("h4", {}, "Vapentekniker (Vapen & rustningar s. 16)"), rutnat(vapenLista, 0), el("h4", {}, "Obeväpnade tekniker (s. 68–70)")] : null,
    rutnat(S.R.fardigheter.stridskonstTekniker, vapenLista.length),
    summering,
    el("div", { class: "rad" }, el("button", { type: "button", class: "knapp primar", id: `sk-fardig-${idDel(f.nyckel)}`, disabled: !valda.length, onclick: () => {
      S.rp.stridskonstFardig = { ...S.rp.stridskonstFardig, [f.nyckel]: true }; uppdatera();
    } }, "Färdigställ stridskonst")));
}

const idDel = (nyckel) => nyckel.replace(/[^a-z0-9]/gi, "-");

// Byter namn på en stridskonst överallt där nyckeln finns: yrkesval, extra yrkesfärdigheter,
// sekundära färdigheter, FV och valda tekniker
function bytStilnamn(gammal, namn) {
  const fid = gammal.split(":")[0];
  const ny = `${fid}:${namn}`;
  if (!namn || ny === gammal) { rita(); return; }
  if (rakna().fardigheter.some((x) => x.nyckel === ny)) { visaNotis(`Det finns redan en stil som heter ${namn}.`); rita(); return; }
  const gammaltNamn = gammal.split(":")[1];
  for (const [i, v] of Object.entries(S.rp.yrkesval)) {
    const post = yrkeAv(S.R, yrkeId()).fardigheter[i];
    if (post === fid && v === gammaltNamn) S.rp.yrkesval[i] = namn;
    else if (v?.id === fid && v.sub === gammaltNamn) S.rp.yrkesval[i] = { ...v, sub: namn };
    else if (post?.fardighet === fid && Array.isArray(v) && v.includes(gammaltNamn)) S.rp.yrkesval[i] = v.map((x) => (x === gammaltNamn ? namn : x));
  }
  if (S.rp.valfri === gammal) S.rp.valfri = ny;
  S.rp.extraYrkesfardigheter = S.rp.extraYrkesfardigheter.map((k) => (k === gammal ? ny : k));
  S.rp.sekundara = S.rp.sekundara.map((k) => (k === gammal ? ny : k));
  for (const falt of ["fardigheter", "stridskonstTekniker", "stridskonstFardig"]) {
    if (S.rp[falt] && gammal in S.rp[falt]) {
      S.rp[falt] = Object.fromEntries(Object.entries(S.rp[falt]).map(([k, v]) => [k === gammal ? ny : k, v]));
    }
  }
  uppdatera();
}

// Automatisk fördelning av EP (s. 34–36). Varje FV läggs där det gör mest nytta just nu: yrkesfärdigheter
// väger tyngst, sedan valda sekundära färdigheter och primära färdigheter med hög grundegenskap.
// Varje höjning prövas mot reglerna, så tak och EP-gränsen hålls. reserv är EP som lämnas kvar
// (utvecklarläget sparar EP till besvärjelser). Ger false och lämnar rollpersonen orörd om det inte gick.
export function epFordelning(reserv = 0) {
  const fore = structuredClone(S.rp);
  const provadeFore = S.provar;
  S.rp.fardigheter = {};
  S.rp.besvarjelser = {}; // besvärjelserna bygger på skolornas FV och väljs om i nästa steg
  S.provar = true;
  const borjan = rakna();
  const vikt = {};
  for (const f of borjan.fardigheter) {
    const def = fardighetAv(S.R, f.nyckel);
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
      if (epPerFV(f) > res.ep.kvar - reserv) { stopp.add(f.nyckel); continue; }
      const gammalt = S.rp.fardigheter[f.nyckel];
      S.rp.fardigheter[f.nyckel] = f.fv + 1;
      if (!rakna().fel.length) { hojd = true; break; }
      if (gammalt === undefined) delete S.rp.fardigheter[f.nyckel];
      else S.rp.fardigheter[f.nyckel] = gammalt;
      stopp.add(f.nyckel);
    }
    if (!hojd) break;
  }
  S.provar = provadeFore;
  if (!rakna().fel.length) return true;
  S.rp = fore;
  return false;
}

function fordelaEP() {
  const hadeBesvarjelser = Object.keys(S.rp.besvarjelser).length > 0;
  if (epFordelning()) S.autoAnvand.fardigheter = true;
  uppdatera();
  visaNotis(`EP är fördelade. ${rakna().ep.kvar} EP blev över.${hadeBesvarjelser ? " Besvärjelserna togs bort och får väljas om." : ""}`);
}
