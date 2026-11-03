// Tärningsslag: tärningsknapparna, inskrivna slag och slag-stegen (steg 7–10).
import { fardighetAv, passarBland, tarningAv, magiskolor } from "../regelmotor.js";
import { rita } from "../app.js";
import { fmtMod } from "../steg/alder.js";
import { S, motorIndata, spara, uppdatera } from "../tillstand.js";
import { el } from "./dom.js";
import { delvalKontroll, falt, fardighetsVal, tal, valLista } from "./kontroller.js";

// Tärningsslag: knappen spärras och tärningen snurrar en stund innan resultatet landar
export let rullar = null; // id för slaget som rullas just nu
const utkastSlag = {}; // inskrivna slag som ännu inte är bekräftade, per slag-id
const rulltid = () => (matchMedia("(prefers-reduced-motion: reduce)").matches ? 300 : 2500);
// T20 ritas som en sexhörning med en triangel i mitten (som en tjugosidig tärning sedd rakt framifrån)
const T20_FORM = '<polygon points="12,2 20.7,7 20.7,17 12,22 3.3,17 3.3,7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'
  + '<polygon points="12,5.5 18.2,16.2 5.8,16.2" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round" opacity=".55"/>';
const T20_KANTER = '<path d="M12 2v3.5M20.7 7l-2.5 9.2M3.3 7l2.5 9.2M12 22l-6.2-5.8M12 22l6.2-5.8M3.3 17l2.5-.8M20.7 17l-2.5-.8M3.3 7L12 5.5M20.7 7L12 5.5" stroke="currentColor" stroke-width=".8" opacity=".45"/>';
export const tarningsIkon = (sidor = 6) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("class", "tarning"); svg.setAttribute("aria-hidden", "true");
  if (sidor === 20) { svg.innerHTML = T20_FORM + T20_KANTER; return svg; }
  svg.innerHTML = '<rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>'
    + [[8, 8], [16, 8], [12, 12], [8, 16], [16, 16]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="currentColor"/>`).join("");
  return svg;
};
// Två tärningar (1–6) som ger summan, för ett inskrivet slag där bara summan är känd. Den första väljs
// slumpvis (eller så jämnt som möjligt) bland de värden som går, den andra får resten.
function delaSumma(summa, slump = true, sidor = 6) {
  const lagst = Math.max(1, summa - sidor), hogst = Math.min(sidor, summa - 1);
  const forsta = slump ? lagst + Math.floor(Math.random() * (hogst - lagst + 1)) : Math.ceil(summa / 2);
  return [forsta, summa - forsta];
}
// En tärning för ett visst värde: en sexsidig med prickar, en T20 (sexhörning) med siffran
const PRICKAR = { 1: [[12, 12]], 2: [[8, 8], [16, 16]], 3: [[7, 7], [12, 12], [17, 17]], 4: [[8, 8], [16, 8], [8, 16], [16, 16]],
  5: [[8, 8], [16, 8], [12, 12], [8, 16], [16, 16]], 6: [[8, 7], [16, 7], [8, 12], [16, 12], [8, 17], [16, 17]] };
const tarningsSida = (v, sidor = 6) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("class", sidor === 6 ? "tarning sida" : "tarning sida t20"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", String(v));
  svg.innerHTML = sidor === 6
    ? '<rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>'
      + PRICKAR[v].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="currentColor"/>`).join("")
    : '<polygon points="12,1.5 21,6.75 21,17.25 12,22.5 3,17.25 3,6.75" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'
      + `<text x="12" y="15.6" text-anchor="middle" font-size="${v > 9 ? 9 : 10}" font-weight="700" fill="currentColor" font-family="sans-serif">${v}</text>`;
  return svg;
};
// Tärningsrutan ligger i slagfältet. Vid klick snurrar tärningen medan "Slår …" pulserar;
// sedan tonar rutan ut och slaget visas i fältet i stället.
const TONING = 400;
// Rutans text. Rutan kan visa "Slå 2T6", "Slår …" och slaget; de två första ligger osynliga i samma ruta
// (via CSS), så att rutan är lika bred som sin längsta text och inte ändrar storlek under slaget.
const rutText = (synlig, text, klass = "") => el("span", { class: `rutetext ${klass}`.trim(), "data-a": text, "data-b": "Slår …" }, el("span", {}, synlig));
function tarningsKnapp(id, text, sla, sidor = 6) {
  const rullarNu = rullar === id;
  return el("button", {
    type: "button", class: "knapp tarningsknapp i-falt" + (rullarNu ? " rullar" : ""), id: `${id}-sla`,
    disabled: rullar !== null, "aria-busy": rullarNu ? "true" : null,
    onclick: () => {
      if (rullar) return;
      rullar = id; rita();
      const tid = rulltid();
      if (tid > TONING * 2) setTimeout(() => document.getElementById(`${id}-sla`)?.classList.add("tona-ut"), tid - TONING);
      setTimeout(() => { rullar = null; S.nyssSlaget = id; sla(); }, tid);
    },
  }, tarningsIkon(sidor), rutText(rullarNu ? "Slår …" : text, text, rullarNu ? "pulsera" : ""));
}
// Med manuella slag skriver spelaren in slaget och bekräftar det med tärningsrutan
function bekraftaSlag(id, min, max, satt, sidor = 6) {
  const giltigt = (v) => Number.isInteger(v) && v >= min && v <= max;
  const knapp = el("button", {
    type: "button", class: "knapp tarningsknapp", id: `${id}-sla`, disabled: !giltigt(utkastSlag[id]),
    onclick: () => {
      const v = utkastSlag[id];
      if (!giltigt(v)) return;
      delete utkastSlag[id];
      S.nyssSlaget = id; satt(v);
    },
  }, tarningsIkon(sidor), el("span", {}, "Bekräfta slag"));
  const falt = el("input", {
    type: "number", id: `${id}-slag`, class: "tal", min, max, step: 1, value: utkastSlag[id] ?? "",
    title: `${min}–${max}`,
    oninput: (e) => { utkastSlag[id] = e.target.value === "" ? null : Number(e.target.value); knapp.disabled = !giltigt(utkastSlag[id]); },
    onkeydown: (e) => { if (e.key === "Enter" && !knapp.disabled) knapp.click(); },
  });
  return { falt, knapp };
}
// Slagfältet (och, med manuella slag, bekräfta-knappen som läggs sist i raden)
export function slagKontroll(id, etikett, text, min, max, satt, slumpa, sidor = 6) {
  if (!S.manuellaSlag) return { slagfalt: falt(etikett, tarningsKnapp(id, text, () => satt(slumpa()), sidor)), knapp: null };
  const b = bekraftaSlag(id, min, max, satt, sidor);
  return { slagfalt: falt(etikett, b.falt), knapp: b.knapp };
}
export const inteSlaget = () => (S.manuellaSlag ? "Skriv in slaget och bekräfta det." : "Slå tärningen.");
// Låst fält som visar ett gjort val (lagda BP, bonus). Tal visas i ett sifferfält precis som innan det låstes,
// så att siffran inte flyttar sig.
export const lastFalt = (id, varde) => el("input", { type: typeof varde === "number" ? "number" : "text", id, class: "tal last", value: varde, readonly: true, "aria-readonly": "true", tabindex: -1 });
// Tärningsrutan när slaget har landat: tärningen ligger kvar på samma plats och slaget står bredvid den.
// Slaget visas som tärningar: T6 med prickar, T20 med siffran. Bonusar (lagda BP, ras, yrke …) står var för sig
// efter tärningarna, t.ex. ⚃ + ⚁ + 2 + 4. Saknas tärningarna (slag sparat före den här versionen) delas summan upp.
// Andra tärningar (T3, T4 …) visas som summan.
export function landatSlag(id, varde, text, { tarningar = null, bonusar = [], sidor = 6, antal = 2 } = {}) {
  bonusar = bonusar.filter(Boolean);
  const summan = (t) => Array.isArray(t) && t.length === antal && t.every((x) => x >= 1 && x <= sidor) && t.reduce((a, b) => a + b, 0) === varde;
  if (!summan(tarningar) && varde >= antal && varde <= antal * sidor) tarningar = antal === 1 ? [varde] : antal === 2 ? delaSumma(varde, false, sidor) : null;
  const kanda = (sidor === 6 || sidor === 20) && summan(tarningar);
  const bonusText = bonusar.map((b) => (b > 0 ? ` + ${b}` : ` − ${-b}`)).join("");
  const innehall = kanda ? el("span", { class: "slagvarde tarningsrad" }, tarningar.flatMap((t, i) => [i ? " + " : null, tarningsSida(t, sidor)]), bonusText)
    : rutText(`${varde}${bonusText}`, text, "slagvarde");
  return el("div", { class: "knapp tarningsknapp i-falt landad" + (kanda ? " med-tarningar" : "") + (S.nyssSlaget === id ? " nytt" : ""), id: `${id}-slag`, "data-varde": varde },
    kanda ? null : tarningsIkon(sidor), innehall);
}
const SLAGETS_VAL = { sf: "sarskildaFormagor", sh: "svardshand", ss: "socialtStand", sk: "startkapital", magiformaga: "magiformaga" };
const omslagKnapp = (id, hamta) => (S.omslag ? el("button", { type: "button", class: "knapp omslag", id: `${id}-las-upp`,
  title: "Utvecklarläge: ta bort slaget och slå om", onclick: () => {
    if (hamta) hamta().slag = null;
    else S.rp[SLAGETS_VAL[id]] = { ...S.rp[SLAGETS_VAL[id]], slag: null };
    S.giltig = structuredClone(S.rp);
    spara();
    rita();
  } }, "Lås upp") : null);
// Resultatet under slaget som punkter (text, lista med rader eller { rader, total }); det lyser upp när tärningen
// nyss har landat. En total står på en egen rad under punkterna.
const resultat = (id, tolkning) => {
  const { rader, total } = typeof tolkning === "string" || Array.isArray(tolkning) ? { rader: tolkning } : tolkning;
  return el("div", { class: "resultat" },
    el("span", { class: "etikett" }, "Resultat"), el("ul", { class: "punkter summering resultatlista" + (S.nyssSlaget === id ? " nytt" : "") }, [].concat(rader).filter(Boolean).map((t) => el("li", {}, t))),
    total ? el("p", { class: "resultat-total", id: `${id}-total` }, total) : null);
};

const bpFaltet = (etikett, kontroll) => { const f = falt(etikett, kontroll); f.classList.add("bp-falt"); return f; };

// bonusar: [[text, värde]] från ras, yrke m.m. som läggs på slaget; de visas som punkter (med extraRader sist).
// Lagda BP räknas också som en bonus när de är fler än 0, men står bara i BP-fältet, inte bland punkterna.
// Bonusarna visas var för sig i tärningsrutan, t.ex. 2T6+2+4.
// Tillval: fore = fält som står före slaget (t.ex. vilken tabell som slås på), kanSla = false spärrar tärningen,
// under = det som står direkt under raden med slaget, bpLast = BP-fältet går inte att ändra (ett gratisslag).
// nyckel är namnet på slaget i rollpersonen (t.ex. "svardshand") eller en funktion som ger slaget
// (t.ex. ett av de fler slagen för särskilda förmågor).
export function slagSteg(id, nyckel, titel, tarning, tolkning, hjalp, efter = () => {}, fastaBonusar = [], extraRader = [], { fore = null, kanSla = true, under = null, bpLast = false } = {}) {
  const hamta = typeof nyckel === "function" ? nyckel : () => S.rp[nyckel];
  const s = hamta();
  const bonusar = [s.bp > 0 ? ["BP lagda", s.bp] : null, ...fastaBonusar].filter(Boolean);
  const punkter = [...fastaBonusar.map(([t, v]) => `${t}: ${fmtMod(v)}`), ...extraRader];
  const bonuslista = punkter.length ? el("ul", { class: "punkter bonuslista" }, punkter.map((t) => el("li", {}, t))) : null;
  const { n, sidor } = tarningAv(tarning);
  tarning += bonusar.map(([, v]) => (v > 0 ? `+${v}` : `−${-v}`)).join("");
  const satt = (falt, v) => { hamta()[falt] = v; efter(); uppdatera(); };
  // När slaget är gjort ligger det fast: BP och slag går inte att ändra i efterhand
  if (s.slag !== null && s.slag !== undefined) {
    return [
      el("p", {}, hjalp),
      bonuslista,
      el("div", { class: "rad" },
        bpFaltet("BP lagda", lastFalt(`${id}-bp`, s.bp)),
        fore,
        falt(`Slag (${tarning})`, landatSlag(id, s.slag, `Slå ${tarning}`, { tarningar: s.tarningar, bonusar: bonusar.map(([, v]) => v), sidor, antal: n })),
        omslagKnapp(id, typeof nyckel === "function" ? hamta : null)),
      resultat(id, tolkning),
    ];
  }
  // Varje tärning sparas också, så att den kan visas med sina prickar (ett inskrivet slag delas upp på två tärningar)
  const sla = () => { const t = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * sidor)); hamta().tarningar = t; return t.reduce((a, b) => a + b, 0); };
  const { slagfalt, knapp } = slagKontroll(id, `Slag (${tarning})`, `Slå ${tarning}`, n, n * sidor, (v) => { if (S.manuellaSlag) hamta().tarningar = delaSumma(v, true, sidor); satt("slag", v); }, sla, sidor);
  if (!kanSla) for (const e of [slagfalt, knapp].filter(Boolean)) for (const k of e.matches("button, input") ? [e] : e.querySelectorAll("button, input")) k.disabled = true;
  const bpFalt = rullar === id || bpLast ? lastFalt(`${id}-bp`, s.bp ?? 0) : tal(`${id}-bp`, s.bp, (v) => satt("bp", Math.max(0, v ?? 0)), { min: 0 });
  return [
    el("p", {}, hjalp),
    bonuslista,
    el("div", { class: "rad" }, bpFaltet("BP att lägga", bpFalt), fore, slagfalt, knapp),
    under,
    el("p", { class: "summering" }, tolkning),
  ];
}

// Väljare för en färdighet som en särskild förmåga gäller ("bland" enligt sarskilda-formagor.json).
export function valjFardighet(id, bland, varde, onchange) {
  if (bland === "sprak") {
    return delvalKontroll(id, "tala", varde?.split(":")[1], (v) => onchange(v ? `tala:${v}` : ""));
  }
  // En lista med färdigheter, t.ex. stridsfärdigheterna i Mindirs klanförmåga; de med delval (vapen) väljs med delvalet
  if (Array.isArray(bland)) return fardighetsVal(id, varde, onchange, (f) => bland.includes(f.id));
  // En valfri magiskola (Durbans klanförmåga Magiker, RB-021)
  if (bland === "magiskola") return valLista(id, varde, magiskolor(S.R, motorIndata()).map((f) => [f.id, f.namn]), onchange, "Välj magiskola …");
  const fast = fardighetAv(S.R, bland);
  if (fast) {
    if (!fast.perVal) return el("span", {}, fast.namn);
    return delvalKontroll(id, bland, varde?.split(":")[1], (v) => onchange(v ? `${bland}:${v}` : ""));
  }
  const magi = (f) => f.typ === "magiskola" || ["kanna-magi", "magisk-kanalisering", "magistudier"].includes(f.id);
  // Visa bara färdigheter som kan gälla: t.ex. inte en färdighet som redan är primär eller yrkesfärdighet när
  // förmågan kräver en sekundär. Färdigheter som lärs per stad, språk osv. prövas med ett påhittat delval.
  const indata = motorIndata();
  const kan = (f) => passarBland(S.R, indata, f.perVal ? `${f.id}:\u0000prov` : f.id, bland);
  return fardighetsVal(id, varde, onchange, (f) => !magi(f) && f.typ !== "sprak" && kan(f));
}
