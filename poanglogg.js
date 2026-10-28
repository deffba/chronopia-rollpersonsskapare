// Poängloggen i utvecklarläget: varje post som ger eller tar BP, EP eller pengar, steg för steg.
// Loggen är ingen historik. Den räknas fram på nytt ur rollpersonen vid varje ändring, så ett val som byts
// ut eller ångras försvinner ur loggen (byts rasen syns bara den nya rasen). Summan av posterna jämförs
// med det som visas på sidan, och stämmer de inte överens sägs det till längst ned i loggen.
import { GRUNDEGENSKAPER, rasAv, yrkeAv, fardighetAv, namnFor, alderseffekter, slaUpp } from "./regelmotor.js";

const TYPER = [["BP", "BP"], ["EP", "EP"], ["Guld", "Guld (sm)"]];
const ENHET = { BP: "BP", EP: "EP", Guld: "sm" };
const LAGRING = "chronopia-dev-logg";

// ------------------------------------------------------------ posterna
// Ger [{ id, steg, typ, text, andring, kvar }] i stegens ordning. kvar är saldot efter posten.
export function poster(api) {
  const { R } = api;
  const rp = api.nu();
  const res = api.rakna();
  const synliga = api.synligaSteg(res);
  const lista = [];
  const lagg = (stegId, typ, id, text, andring) => {
    const i = synliga.findIndex((s) => s.id === stegId);
    const steg = stegId === null ? "Start" : i === -1 ? stegId : `${i + 1}. ${synliga[i].namn}`;
    lista.push({ id: `${stegId}|${typ}|${id}`, steg, typ, text, andring });
  };
  const ras = rasAv(R, rp.ras || "manniska");
  const yrke = yrkeAv(R, rp.yrke);
  const alder = alderseffekter(R, rp.alder);

  lagg(null, "BP", "start", "Startpoäng", R.grundegenskaper.startBP);

  // 1. Ras
  lagg("ras", "BP", "ras", rp.ras ? `Ras: ${ras.namn}` : "Ingen ras vald än", -res.bp.utgifter.ras);

  // 2. Ålder
  if (alder.bp) lagg("alder", "BP", "alder", `Ålder ${rp.alder} år ger extra BP`, alder.bp);
  lagg("alder", "EP", "alder", `Ålder ${rp.alder} år ger start-EP`, alder.ep);

  // 3. Yrke
  if (yrke.extraBP) lagg("yrke", "BP", "extraBP", `${yrke.namn}: extra BP`, yrke.extraBP.antal);

  // 4. Fler yrkesfärdigheter, med samma prisordning som regelmotorn (s. 27)
  const k = R.yrken.extraYrkesfardigheter;
  let vanliga = 0;
  rp.extraYrkesfardigheter.forEach((nyckel, i) => {
    const f = fardighetAv(R, nyckel || "x");
    let pris;
    if (f?.typ === "magiskola") pris = k.magiskola;
    else { vanliga += 1; pris = vanliga === 1 ? k.forsta : vanliga === 2 ? k.andra : k.darefter; }
    const namn = f && !nyckel.endsWith(":") ? namnFor(R, f, nyckel) : "inte färdigvald";
    lagg("extra", "BP", `extra${i}`, `Extra yrkesfärdighet ${i + 1}: ${namn}`, -pris);
  });

  // 6. Grundegenskaper: grundvärdets pris och STO. Grundvärdena finns först när steg 6 har öppnats.
  if (!rp.grundvarden) lagg("egenskaper", "BP", "ge", "Grundegenskaper: inte satta än", 0);
  else for (const g of GRUNDEGENSKAPER) {
    const grund = rp.grundvarden[g];
    lagg("egenskaper", "BP", `ge-${g}`, `${g}: grundvärde ${grund} (blir ${res.grundegenskaper[g]})`, -(R.grundegenskaper.kostnad[String(grund)] ?? 0));
  }
  const sto = rp.stoSteg ?? 0;
  if (sto) {
    const s = R.grundegenskaper.sto;
    lagg("egenskaper", "BP", "sto", `STO: ${ras.sto.normal} → ${res.grundegenskaper.STO}`, sto > 0 ? -s.hojning[sto - 1] : s.sankning[-sto - 1]);
  }

  // 7–10. BP lagda på slagen
  const slagText = (s, utfall) => (s.slag === null || s.slag === undefined ? "inte slaget än" : `slag ${s.slag}: ${utfall}`);
  const sf = rp.sarskildaFormagor;
  if (sf.bp) lagg("formagor", "BP", "sf", `BP på slaget, ${slagText(sf, res.sarskildFormaga?.namn ?? "ingen förmåga")}`, -sf.bp);
  if (rp.svardshand.bp) lagg("svardshand", "BP", "sh", `BP på slaget, ${slagText(rp.svardshand, res.slag.svardshand)}`, -rp.svardshand.bp);
  if (rp.socialtStand.bp) lagg("stand", "BP", "ss", `BP på slaget, ${slagText(rp.socialtStand, res.slag.socialtStand)} (halva BP läggs också på startkapitalet)`, -rp.socialtStand.bp);
  if (rp.startkapital.bp) lagg("kapital", "BP", "sk", `BP på slaget, ${slagText(rp.startkapital, `resultat ${res.slag.skResultat}`)}`, -rp.startkapital.bp);
  // Startkapitalet: tabellvärdet för slaget gånger ålderns faktor. Det som är över kommer från förmågan Arv.
  // Innan slaget är gjort räknar sidan som om det blev 0, och det gör loggen också.
  const kapital = slaUpp(R.slag.startkapital.tabell, res.slag.skResultat) * alder.kapital;
  const oslaget = rp.startkapital.slag === null || rp.startkapital.slag === undefined;
  lagg("kapital", "Guld", "sk", `Startkapital: ${oslaget ? "inte slaget än, räknas som slag 0 tills vidare" : `resultat ${res.slag.skResultat}`}, ålder ×${String(alder.kapital).replace(".", ",")}`, kapital);
  if (res.slag.startkapital !== kapital) lagg("kapital", "Guld", "arv", `Särskild förmåga: ${res.sarskildFormaga?.namn ?? "arv"}`, res.slag.startkapital - kapital);

  // 11. Färdigheter: oanvända BP blir EP (husregel), och varje köpt FV
  const bpKvar = Math.max(0, res.bp.kvar);
  lagg("fardigheter", "EP", "vaxling", `Oanvända BP: ${bpKvar} × 5 EP (husregel, följer BP kvar)`, bpKvar * 5);
  for (const f of res.fardigheter.filter((x) => x.ep > 0)) {
    lagg("fardigheter", "EP", `f-${f.nyckel}`, `${f.namn}: FV ${f.start} → ${f.fv} (${f.fv - f.start} × ${f.epPerFV} EP)`, -f.ep);
  }

  // 12. Besvärjelser
  for (const b of res.besvarjelser) lagg("besvarjelser", "EP", `b-${b.nyckel}`, `${b.namn}: FV ${b.fv} (${b.fv} × ${b.epPerFV} EP)`, -b.ep);

  // 13. Utrustning: startpaketet är gratis, inköpen dras från startkapitalet
  const gratis = res.utrustning.saker.filter((x) => x.gratis);
  if (gratis.length) lagg("utrustning", "Guld", "startpaket", `Startpaket (gratis): ${gratis.map((x) => x.namn).join(", ")}`, 0);
  for (const x of res.utrustning.saker.filter((y) => !y.gratis)) {
    lagg("utrustning", "Guld", `u-${x.namn}`, `Köp: ${x.antal} × ${x.namn} (${x.pris.toLocaleString("sv-SE")} sm/st)`, -x.pris * x.antal);
  }

  const saldo = { BP: 0, EP: 0, Guld: 0 };
  for (const p of lista) { saldo[p.typ] += p.andring; p.kvar = saldo[p.typ]; }
  const sidan = { BP: res.bp.kvar, EP: res.ep.kvar, Guld: res.utrustning.kvar };
  const avvikelser = Object.keys(saldo).filter((t) => Math.round(saldo[t] * 100) !== Math.round(sidan[t] * 100))
    .map((t) => `${t}: loggen ger ${saldo[t]}, sidan visar ${sidan[t]}`);
  return { lista, saldo, sidan, avvikelser };
}

// ------------------------------------------------------------ fönstret
const STIL = `
.poanglogg { position: fixed; z-index: 45; display: flex; flex-direction: column; box-sizing: border-box;
  color: #ece6e2; background: rgba(28, 24, 22, .78); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
  border: 1px solid rgba(180, 70, 45, .7); border-radius: 6px; box-shadow: 0 6px 24px rgba(0, 0, 0, .35);
  font: 12px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif; container-type: inline-size; }
.poanglogg.hel { inset: 12px !important; width: auto !important; height: auto !important; }
.poanglogg.liten .pl-filter, .poanglogg.liten .pl-rader, .poanglogg.liten .pl-fot, .poanglogg.liten .pl-handtag { display: none; }
.poanglogg.liten { height: auto !important; }
.pl-handtag { position: absolute; left: 0; right: 0; top: -4px; height: 9px; cursor: ns-resize; touch-action: none; }
.pl-handtag::after { content: ""; position: absolute; right: -1px; top: 3px; width: 14px; height: 14px;
  border-top: 2px solid #e0886f; border-right: 2px solid #e0886f; border-top-right-radius: 6px; }
.poanglogg.hel .pl-handtag { display: none; }
.pl-huvud { display: flex; align-items: center; gap: 4px; padding: 6px 8px 4px; border-bottom: 1px solid rgba(255, 255, 255, .12); }
.pl-huvud strong { flex: 1; min-width: 0; overflow: hidden; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #f0a48e; white-space: nowrap; }
.pl-auto { font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #b3a7a2; }
.pl-auto[aria-pressed="true"] { color: #1d1917; background: #9fd3a6; border-color: #9fd3a6; }
.pl-knapp { all: unset; cursor: pointer; min-width: 12px; padding: 0 3px; flex: none; border-radius: 3px; text-align: center; color: #ece6e2;
  border: 1px solid rgba(255, 255, 255, .25); font-size: 12px; line-height: 18px; }
.pl-knapp:hover, .pl-knapp:focus-visible { background: rgba(255, 255, 255, .14); }
.pl-filter { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; padding: 5px 8px; border-bottom: 1px solid rgba(255, 255, 255, .12); }
.pl-filter label { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; white-space: nowrap; }
.pl-filter input { margin: 0; accent-color: #e0886f; }
.pl-filter b { font-variant-numeric: tabular-nums; }
.pl-rader { flex: 1; min-height: 0; overflow-y: auto; margin: 0; padding: 2px 0; list-style: none; overscroll-behavior: contain; }
.pl-rad { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; grid-template-areas: "steg andring kvar" "text text text";
  gap: 0 8px; padding: 3px 8px; border-bottom: 1px solid rgba(255, 255, 255, .06); }
.pl-steg { grid-area: steg; color: #b3a7a2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pl-text { grid-area: text; }
.pl-andring { grid-area: andring; text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
.pl-kvar { grid-area: kvar; text-align: right; color: #b3a7a2; font-variant-numeric: tabular-nums; white-space: nowrap; min-width: 4.5em; }
.pl-rad.minus .pl-andring { color: #f09a86; }
.pl-rad.plus .pl-andring { color: #9fd3a6; }
.pl-rad.noll .pl-andring { color: #b3a7a2; }
.pl-typ { display: inline-block; min-width: 2.4em; margin-right: 4px; padding: 0 3px; border-radius: 3px; font-size: 10px; font-weight: 700; text-align: center; color: #1d1917; }
.pl-typ.BP { background: #e3b778; } .pl-typ.EP { background: #8fb8e0; } .pl-typ.Guld { background: #e8d36a; }
@container (min-width: 560px) {
  .pl-rad { grid-template-columns: 11em minmax(0, 1fr) 7em 7em; grid-template-areas: "steg text andring kvar"; }
}
.pl-rad.ny { animation: pl-ny 1.6s ease-out; }
@keyframes pl-ny { from { background: rgba(240, 164, 142, .45); } to { background: transparent; } }
.pl-tom { padding: 8px; color: #b3a7a2; }
.pl-fot { padding: 4px 8px; border-top: 1px solid rgba(255, 255, 255, .12); color: #ffb4a3; font-weight: 700; }
.pl-fot[hidden] { display: none; }
body.dev-logg .dev-markering { display: none; }
@media (prefers-reduced-motion: reduce) { .pl-rad.ny { animation: none; outline: 1px solid rgba(240, 164, 142, .6); } }
@media print { .poanglogg { display: none; } }
`;

const tecken = (n) => (n > 0 ? `+${n.toLocaleString("sv-SE")}` : n < 0 ? `−${(-n).toLocaleString("sv-SE")}` : "±0");

export function startaPoanglogg(api, { autofyllKnapp } = {}) {
  const { el } = api;
  let inst = { filter: { BP: true, EP: true, Guld: true }, hojd: null, hel: false, liten: false, synlig: true };
  try { inst = { ...inst, ...JSON.parse(localStorage.getItem(LAGRING) ?? "{}") }; } catch { /* frivilligt */ }
  const sparaInst = () => { try { localStorage.setItem(LAGRING, JSON.stringify(inst)); } catch { /* frivilligt */ } };

  document.head.append(el("style", {}, STIL));
  const rader = el("ol", { class: "pl-rader", "aria-live": "polite" });
  const fot = el("div", { class: "pl-fot", role: "alert", hidden: true });
  const saldoText = Object.fromEntries(TYPER.map(([typ]) => [typ, el("b", { id: `pl-saldo-${typ}` })]));
  const helKnapp = el("button", { type: "button", class: "pl-knapp", id: "pl-hel" });
  const litenKnapp = el("button", { type: "button", class: "pl-knapp", id: "pl-liten" });
  const handtag = el("div", { class: "pl-handtag", title: "Dra uppåt för att göra loggen högre" });
  const filter = el("div", { class: "pl-filter" },
    TYPER.map(([typ, text]) => el("label", { title: `Visa rader för ${text}. Talet är vad som är kvar.` },
      el("input", { type: "checkbox", id: `pl-filter-${typ}`, checked: inst.filter[typ],
        onchange: (e) => { inst.filter[typ] = e.target.checked; sparaInst(); ritaLogg(); } }), typ, saldoText[typ])));
  const panel = el("section", { class: "poanglogg", id: "poanglogg", "aria-label": "Poänglogg (utvecklarläge)" },
    handtag,
    el("div", { class: "pl-huvud" }, el("strong", {}, "Poänglogg"), autofyllKnapp ?? null,
      el("button", { type: "button", class: "pl-knapp", id: "pl-kopiera", title: "Kopiera de synliga raderna som text", "aria-label": "Kopiera", onclick: kopiera }, "⧉"),
      litenKnapp, helKnapp),
    filter, rader, fot);
  document.body.append(panel);

  // Standardstorleken är platsen under stegen i vänsterspalten (som stegen ligger när sidan inte är skrollad).
  // Loggen kan dras högre men aldrig lägre än så.
  const standard = () => {
    const rail = document.querySelector(".stegrail");
    const layout = document.querySelector(".layout");
    const r = rail?.getBoundingClientRect();
    if (!r || !r.width || innerWidth <= 760) {
      const w = Math.min(320, innerWidth - 24);
      return { left: 12, width: w, hojd: Math.min(220, innerHeight - 24) };
    }
    const topp = layout.getBoundingClientRect().top + scrollY + rail.offsetHeight + 16;
    return { left: r.left, width: r.width, hojd: Math.max(150, innerHeight - topp - 12) };
  };
  const placera = () => {
    const s = standard();
    panel.style.left = `${s.left}px`;
    panel.style.bottom = "12px";
    panel.style.width = `${s.width}px`;
    const max = innerHeight - 24;
    panel.style.height = `${Math.min(max, Math.max(s.hojd, inst.hojd ?? 0))}px`;
    panel.classList.toggle("hel", inst.hel);
    panel.classList.toggle("liten", inst.liten && !inst.hel);
    panel.hidden = !inst.synlig;
    document.body.classList.toggle("dev-logg", inst.synlig);
    helKnapp.textContent = inst.hel ? "⤡" : "⤢";
    helKnapp.title = inst.hel ? "Tillbaka till vanlig storlek (Esc)" : "Helskärm";
    helKnapp.setAttribute("aria-label", helKnapp.title);
    litenKnapp.textContent = inst.liten ? "▴" : "▾";
    litenKnapp.title = inst.liten ? "Visa loggen" : "Fäll ihop loggen";
    litenKnapp.setAttribute("aria-label", litenKnapp.title);
    litenKnapp.hidden = inst.hel;
  };
  helKnapp.addEventListener("click", () => { inst.hel = !inst.hel; sparaInst(); placera(); });
  litenKnapp.addEventListener("click", () => { inst.liten = !inst.liten; sparaInst(); placera(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && inst.hel) { inst.hel = false; sparaInst(); placera(); } });
  addEventListener("resize", placera);

  // Dra i överkanten (eller hörnet uppe till höger) för att ändra höjden
  handtag.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    handtag.setPointerCapture(e.pointerId);
    const fran = e.clientY;
    const hojd = panel.getBoundingClientRect().height;
    const flytta = (ev) => {
      inst.hojd = Math.min(innerHeight - 24, Math.max(standard().hojd, hojd + fran - ev.clientY));
      placera();
    };
    const slapp = () => {
      handtag.removeEventListener("pointermove", flytta);
      handtag.removeEventListener("pointerup", slapp);
      handtag.removeEventListener("pointercancel", slapp);
      if (inst.hojd !== null && inst.hojd <= standard().hojd) inst.hojd = null; // tillbaka till standard
      sparaInst();
    };
    handtag.addEventListener("pointermove", flytta);
    handtag.addEventListener("pointerup", slapp);
    handtag.addEventListener("pointercancel", slapp);
  });

  let senast = null; // id → ändring vid förra ritningen, för att lysa upp det som är nytt eller ändrat
  let aktuellt = { lista: [] };
  function ritaLogg() {
    const synliga = aktuellt.lista.filter((p) => inst.filter[p.typ]);
    const nya = [];
    rader.replaceChildren(...synliga.map((p) => {
      const ny = senast !== null && senast.get(p.id) !== p.andring;
      const rad = el("li", { class: `pl-rad ${p.andring > 0 ? "plus" : p.andring < 0 ? "minus" : "noll"}${ny ? " ny" : ""}`, "data-typ": p.typ },
        el("span", { class: "pl-steg" }, p.steg),
        el("span", { class: "pl-text" }, el("span", { class: `pl-typ ${p.typ}` }, p.typ === "Guld" ? "sm" : p.typ), p.text),
        el("span", { class: "pl-andring" }, `${tecken(p.andring)} ${ENHET[p.typ]}`),
        el("span", { class: "pl-kvar", title: "Kvar efter raden" }, `kvar ${p.kvar.toLocaleString("sv-SE")}`));
      if (ny) nya.push(rad);
      return rad;
    }));
    if (!synliga.length) rader.append(el("li", { class: "pl-tom" }, "Inga rader. Kryssa i BP, EP eller Guld ovan."));
    // Den första nya raden skrollas fram i loggen (bara inne i loggen, sidan står still)
    if (nya.length) {
      const r = nya[0];
      if (r.offsetTop < rader.scrollTop || r.offsetTop + r.offsetHeight > rader.scrollTop + rader.clientHeight) {
        rader.scrollTop = r.offsetTop - rader.clientHeight / 3;
      }
    }
  }
  function kopiera() {
    const text = ["Steg\tTyp\tHändelse\tÄndring\tKvar", ...aktuellt.lista.filter((p) => inst.filter[p.typ])
      .map((p) => [p.steg, p.typ, p.text, `${tecken(p.andring)} ${ENHET[p.typ]}`, p.kvar].join("\t"))].join("\n");
    navigator.clipboard?.writeText(text).then(() => api.visaNotis("Poängloggen är kopierad."), () => api.visaNotis("Kunde inte kopiera."));
  }

  api.efterRita(() => {
    if (!inst.synlig) return;
    let utfall;
    try { utfall = poster(api); } catch (e) { console.error("Poängloggen kunde inte räknas fram", e); return; }
    aktuellt = utfall;
    for (const [typ] of TYPER) saldoText[typ].textContent = utfall.saldo[typ].toLocaleString("sv-SE");
    ritaLogg();
    // Loggen säger bara till när summan inte stämmer med det som visas på sidan
    fot.hidden = !utfall.avvikelser.length;
    fot.textContent = `Stämmer inte med sidan: ${utfall.avvikelser.join("; ")}`;
    senast = new Map(utfall.lista.map((p) => [p.id, p.andring]));
    placera();
  });

  return {
    visa(pa) { inst.synlig = pa; sparaInst(); placera(); if (pa) { senast = null; api.rita?.(); } },
    synlig: () => inst.synlig,
  };
}
