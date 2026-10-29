// Poängloggen i utvecklarläget: varje post som ger eller tar BP, EP eller pengar, steg för steg, och
// dessutom grundegenskapernas delar, tärningsslagen och vikten som rollpersonen bär.
// Loggen är ingen historik. Den räknas fram på nytt ur rollpersonen vid varje ändring, så ett val som byts
// ut eller ångras försvinner ur loggen (byts rasen syns bara den nya rasen). Summan av posterna jämförs
// med det som visas på sidan, och stämmer de inte överens sägs det till längst ned i loggen.
// Undantaget är ändringar som regelkontrollen stoppade: de är händelser och sparas medan sidan är öppen.
import { GRUNDEGENSKAPER, rasAv, yrkeAv, fardighetAv, namnFor, alderseffekter, slaUpp, sarskildFormaga } from "./regelmotor.js";

// [typ, text i filtret, ikryssad från början, etikett på raden]
const TYPER = [["BP", "BP", true, "BP"], ["EP", "EP", true, "EP"], ["Guld", "Guld", true, "sm"], ["GE", "GE", true, "GE"],
  ["Slag", "Slag", false, "T"], ["Vikt", "Vikt", false, "kg"], ["Nekad", "Stopp", true, "!"]];
const ENHET = { BP: "BP", EP: "EP", Guld: "sm", Vikt: "kg" };
const kgText = (n) => (Math.round(n * 10) / 10).toLocaleString("sv-SE");
const LAGRING = "chronopia-dev-logg";

// ------------------------------------------------------------ posterna
// Ger [{ id, steg, typ, text, andring, kvar }] i stegens ordning. kvar är saldot efter posten, räknat per typ
// (för grundegenskaperna per egenskap). Tärningsslagen har ingen ändring, bara visa (slaget).
export function poster(api) {
  const { R } = api;
  const rp = api.nu();
  const res = api.rakna();
  const synliga = api.synligaSteg(res);
  const lista = [];
  const lagg = (stegId, typ, id, text, andring, extra = {}) => {
    lista.push({ id: `${stegId}|${typ}|${id}`, steg: stegEtikett(synliga, stegId), typ, text, andring, ...extra });
  };
  const ras = rasAv(R, rp.ras || "manniska");
  const yrke = yrkeAv(R, rp.yrke || "krigare"); // som i app.js: inget yrke valt räknas som krigare, som saknar bonusar
  const alder = alderseffekter(R, rp.alder);
  // Grundegenskaperna: en rad per del som ändrar värdet, med egenskapens värde hittills
  const ge = (stegId, g, id, text, andring) => { if (andring) lagg(stegId, "GE", `${g}-${id}`, `${g}: ${text}`, andring, { saldo: `GE-${g}`, enhet: g }); };
  const aldersmod = R.alder.effekter[res.alderskategori];
  const egenskapsbonus = sarskildFormaga(R, api.motorIndata()).tillagg.egenskapsbonus ?? {};
  const fmt = (n) => (n > 0 ? `+ ${n}` : n < 0 ? `− ${-n}` : "");

  lagg(null, "BP", "start", "Startpoäng", R.grundegenskaper.startBP);

  // 1. Ras
  lagg("ras", "BP", "ras", rp.ras ? `Ras: ${ras.namn}` : "Ingen ras vald än", -res.bp.utgifter.ras);
  if (rp.ras) {
    for (const g of GRUNDEGENSKAPER) ge("ras", g, "ras", `ras (${ras.namn.toLowerCase()})`, ras.mod[g]);
    ge("ras", "STO", "ras", `normalvärde för ${ras.namn.toLowerCase()}`, ras.sto.normal);
  }

  // 2. Ålder
  if (alder.bp) lagg("alder", "BP", "alder", `Ålder ${rp.alder} år ger extra BP`, alder.bp);
  lagg("alder", "EP", "alder", `Ålder ${rp.alder} år ger start-EP`, alder.ep);
  const kategori = R.alder.kategorier.find((x) => x.id === res.alderskategori)?.namn.toLowerCase() ?? res.alderskategori;
  for (const g of GRUNDEGENSKAPER) ge("alder", g, "alder", `ålder ${rp.alder} år (${kategori})`, aldersmod[g]);

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
  if (rp.grundvarden) for (const g of GRUNDEGENSKAPER) ge("egenskaper", g, "grund", "grundvärde", rp.grundvarden[g]);
  const sto = rp.stoSteg ?? 0;
  if (sto) {
    const s = R.grundegenskaper.sto;
    lagg("egenskaper", "BP", "sto", `STO: ${ras.sto.normal} → ${res.grundegenskaper.STO}`, sto > 0 ? -s.hojning[sto - 1] : s.sankning[-sto - 1]);
    ge("egenskaper", "STO", "steg", sto > 0 ? "höjd med BP" : "sänkt (ger BP)", sto);
  }
  // Magiförmågeslaget görs när INT och PSY är bestämda
  const m = res.magiformaga;
  if (m.slag !== null && m.slag !== undefined) {
    lagg("egenskaper", "Slag", "magi", `Magiförmåga: 1T100 ${m.slag}${m.mod ? ` ${fmt(m.mod)} = ${m.slag + m.mod}` : ""}, högst ${m.chans} ((INT+PSY)/2): ${m.lyckat ? "lyckat" : "misslyckat"}`, null, { visa: `${m.slag}` });
  }

  // 7–10. BP lagda på slagen
  const slagText = (s, utfall) => (s.slag === null || s.slag === undefined ? "inte slaget än" : `slag ${s.slag}: ${utfall}`);
  const gjort = (s) => s.slag !== null && s.slag !== undefined;
  const sf = rp.sarskildaFormagor;
  if (sf.bp) lagg("formagor", "BP", "sf", `BP på slaget, ${slagText(sf, res.sarskildFormaga?.namn ?? "ingen förmåga")}`, -sf.bp);
  if (gjort(sf) && sf.bp) lagg("formagor", "Slag", "sf", `Särskild förmåga: 2T20 ${sf.slag} + ${sf.bp} BP = ${sf.slag + sf.bp}: ${res.sarskildFormaga?.namn ?? "ingen förmåga"}`, null, { visa: `${sf.slag}` });
  for (const g of [...GRUNDEGENSKAPER, "STO"]) ge("formagor", g, "sf", `särskild förmåga (${res.sarskildFormaga?.namn ?? "?"})`, egenskapsbonus[g]);
  if (rp.svardshand.bp) lagg("svardshand", "BP", "sh", `BP på slaget, ${slagText(rp.svardshand, res.slag.svardshand)}`, -rp.svardshand.bp);
  if (gjort(rp.svardshand)) {
    const sh = rp.svardshand;
    lagg("svardshand", "Slag", "sh", `Svärdshand: 2T6 ${sh.slag}${sh.bp ? ` + ${sh.bp} BP = ${sh.slag + sh.bp}` : ""}: ${res.slag.svardshand}`, null, { visa: `${sh.slag}` });
  }
  if (rp.socialtStand.bp) lagg("stand", "BP", "ss", `BP på slaget, ${slagText(rp.socialtStand, res.slag.socialtStand)} (halva BP läggs också på startkapitalet)`, -rp.socialtStand.bp);
  const ss = rp.socialtStand;
  const rasbonus = ras.slagbonus.socialtStand ?? 0;
  if (ss.valt) lagg("stand", "Slag", "ss", `Socialt stånd valt utan slag: ${ss.valt} (räknas som ${res.slag.ssResultat})`, null, { visa: "valt" });
  else if (gjort(ss)) {
    lagg("stand", "Slag", "ss", `Socialt stånd: 2T6 ${ss.slag}${ss.bp ? ` + ${ss.bp} BP` : ""}${rasbonus ? ` ${fmt(rasbonus)} (ras)` : ""} = ${res.slag.ssResultat}: ${res.slag.socialtStand}`, null, { visa: `${ss.slag}` });
  }
  if (rp.startkapital.bp) lagg("kapital", "BP", "sk", `BP på slaget, ${slagText(rp.startkapital, `resultat ${res.slag.skResultat}`)}`, -rp.startkapital.bp);
  if (gjort(rp.startkapital)) {
    const sk = rp.startkapital;
    const bonusar = [[Math.ceil(ss.bp / 2), "halva BP från ståndet"], [ras.slagbonus.startkapital ?? 0, "ras"], [yrke.slagbonus?.startkapital ?? 0, "yrke"]].filter(([v]) => v);
    const summa = sk.slag + sk.bp + bonusar.reduce((a, [v]) => a + v, 0);
    lagg("kapital", "Slag", "sk", `Startkapital: 2T6 ${sk.slag}${sk.bp ? ` + ${sk.bp} BP` : ""}${bonusar.map(([v, t]) => ` ${fmt(v)} (${t})`).join("")} = ${summa}${summa > res.slag.skResultat ? `, taket ger ${res.slag.skResultat}` : ""}`, null, { visa: `${sk.slag}` });
  }
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

  // Vikten som bärs (s. 100): kläder räknas inte och en buren rustning väger hälften. Bärförmågan är STY kg.
  const u = res.utrustning;
  for (const x of u.saker) {
    const bars = x.kategori === "Kläder" ? 0 : x.kategori === "Rustning" ? x.vikt / 2 : x.vikt;
    const not = x.kategori === "Kläder" ? ", kläder räknas inte" : x.kategori === "Rustning" ? ", buren rustning räknas till hälften" : "";
    lagg("utrustning", "Vikt", `v-${x.gratis ? "p" : "k"}-${x.namn}`, `${x.antal} × ${x.namn}${x.gratis ? " (startpaket)" : ""}: ${kgText(x.vikt)} kg${not}`, bars);
  }
  if (u.belastning) {
    lagg("utrustning", "Vikt", "belastning", `Över bärförmågan (STY ${u.barformaga} kg)${u.belastning.mod === null ? `: ${u.belastning.text}` : `: ${tecken(u.belastning.mod)} på förflyttning, SMI och CL i SMI-baserade färdigheter. ${u.belastning.text}`}`, 0, { visa: "för tungt", varning: true });
  }

  const saldo = { BP: 0, EP: 0, Guld: 0, Vikt: 0 };
  for (const p of lista) {
    if (typeof p.andring !== "number") continue;
    const nyckel = p.saldo ?? p.typ;
    saldo[nyckel] = Math.round(((saldo[nyckel] ?? 0) + p.andring) * 10) / 10;
    p.kvar = saldo[nyckel];
    if (p.typ === "GE") p.kvarText = ""; // slutvärdet står på egenskapens sista rad (nedan)
    if (p.typ === "Vikt") { p.kvarText = `${kgText(p.kvar)}/${u.barformaga} kg`; if (p.kvar > u.barformaga) p.varning = true; }
  }
  // Grundegenskaperna byggs upp av ras, ålder, grundvärde och förmåga; värdet hittills säger inget förrän
  // alla delar är med, så bara egenskapens sista rad visar slutvärdet (och bara när grundvärdena är satta)
  if (rp.grundvarden) {
    const sista = new Map(lista.filter((p) => p.typ === "GE").map((p) => [p.saldo, p]));
    for (const p of sista.values()) p.kvarText = `= ${p.enhet} ${p.kvar}`;
  }
  const sidan = { BP: res.bp.kvar, EP: res.ep.kvar, Guld: u.kvar, Vikt: u.borda };
  if (rp.ras && res.grundegenskaperSatta) for (const g of [...GRUNDEGENSKAPER, "STO"]) sidan[`GE-${g}`] = res.grundegenskaper[g];
  const avvikelser = Object.keys(sidan).filter((t) => Math.round((saldo[t] ?? 0) * 10) !== Math.round(sidan[t] * 10))
    .map((t) => `${t.replace("GE-", "")}: loggen ger ${saldo[t] ?? 0}, sidan visar ${sidan[t]}`);
  return { lista, saldo, sidan, avvikelser };
}

function stegEtikett(synliga, stegId) {
  const i = synliga.findIndex((s) => s.id === stegId);
  return stegId === null ? "Start" : i === -1 ? stegId : `${i + 1}. ${synliga[i].namn}`;
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
.pl-filter { display: flex; flex-wrap: wrap; align-items: center; gap: 3px 8px; padding: 4px 8px; font-size: 11px; border-bottom: 1px solid rgba(255, 255, 255, .12); }
.pl-filter label { display: inline-flex; align-items: center; gap: 3px; cursor: pointer; white-space: nowrap; }
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
.pl-typ.GE { background: #c9a6e0; } .pl-typ.Slag { background: #b8c2cc; } .pl-typ.Vikt { background: #a8d5c2; } .pl-typ.Nekad { background: #ff8a75; }
.pl-rad.varning .pl-kvar, .pl-rad.varning .pl-andring { color: #ffb4a3; font-weight: 700; }
.pl-rad.nekad { background: rgba(200, 60, 40, .22); }
.pl-rad.nekad .pl-text, .pl-rad.nekad .pl-andring { color: #ffb4a3; }
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
  const forval = Object.fromEntries(TYPER.map(([typ, , pa]) => [typ, pa]));
  let inst = { filter: forval, hojd: null, hel: false, liten: false, synlig: true };
  try { inst = { ...inst, ...JSON.parse(localStorage.getItem(LAGRING) ?? "{}") }; } catch { /* frivilligt */ }
  inst.filter = { ...forval, ...inst.filter }; // typer som har tillkommit sedan inställningen sparades
  const etikett = Object.fromEntries(TYPER.map(([typ, , , e]) => [typ, e]));

  // Ändringar som regelkontrollen stoppade ("Det går inte: …"). De går inte att räkna fram, så de sparas
  // som händelser (de senaste 30) och står sist i loggen.
  const nekade = [];
  let nekadNr = 0;
  api.efterNotis((text) => {
    if (!text.startsWith("Det går inte")) return;
    const { aktivtSteg } = api.lage();
    const tid = new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    nekade.push({ id: `nekad|${++nekadNr}`, steg: stegEtikett(api.synligaSteg(api.rakna()), aktivtSteg), typ: "Nekad",
      text: `${tid} ${text.replace(/^Det går inte: /, "").replace(/\.$/, "")}`, andring: null, visa: "stoppad" });
    if (nekade.length > 30) nekade.shift();
  });
  const sparaInst = () => { try { localStorage.setItem(LAGRING, JSON.stringify(inst)); } catch { /* frivilligt */ } };

  document.head.append(el("style", {}, STIL));
  const rader = el("ol", { class: "pl-rader", "aria-live": "polite" });
  const fot = el("div", { class: "pl-fot", role: "alert", hidden: true });
  const saldoText = Object.fromEntries(["BP", "EP", "Guld"].map((typ) => [typ, el("b", { id: `pl-saldo-${typ}` })]));
  const helKnapp = el("button", { type: "button", class: "pl-knapp", id: "pl-hel" });
  const litenKnapp = el("button", { type: "button", class: "pl-knapp", id: "pl-liten" });
  const handtag = el("div", { class: "pl-handtag", title: "Dra uppåt för att göra loggen högre" });
  const filter = el("div", { class: "pl-filter" },
    TYPER.map(([typ, text]) => el("label", { title: `Visa rader för ${{ GE: "grundegenskaper", Slag: "tärningsslag", Vikt: "buren vikt", Nekad: "ändringar som regelkontrollen stoppade" }[typ] ?? text}.${saldoText[typ] ? " Talet är vad som är kvar." : ""}` },
      el("input", { type: "checkbox", id: `pl-filter-${typ}`, checked: inst.filter[typ],
        onchange: (e) => { inst.filter[typ] = e.target.checked; sparaInst(); ritaLogg(); } }), text, saldoText[typ] ?? null)));
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
  const andringText = (p) => p.visa ?? `${p.typ === "Vikt" ? `+${kgText(p.andring)}` : tecken(p.andring)} ${p.enhet ?? ENHET[p.typ]}`;
  const kvarText = (p) => p.kvarText ?? (typeof p.kvar === "number" ? `kvar ${p.kvar.toLocaleString("sv-SE")}` : "");
  const alla = () => [...aktuellt.lista, ...nekade];
  const nyckel = (p) => `${p.andring}|${p.visa ?? ""}|${p.text}`;
  function ritaLogg() {
    const synliga = alla().filter((p) => inst.filter[p.typ]);
    const nya = [];
    rader.replaceChildren(...synliga.map((p) => {
      const ny = senast !== null && senast.get(p.id) !== nyckel(p);
      const tecknet = typeof p.andring !== "number" || p.typ === "Vikt" ? "noll" : p.andring > 0 ? "plus" : p.andring < 0 ? "minus" : "noll";
      const rad = el("li", { class: `pl-rad ${tecknet}${p.varning ? " varning" : ""}${p.typ === "Nekad" ? " nekad" : ""}${ny ? " ny" : ""}`, "data-typ": p.typ },
        el("span", { class: "pl-steg" }, p.steg),
        el("span", { class: "pl-text" }, el("span", { class: `pl-typ ${p.typ}` }, etikett[p.typ]), p.text),
        el("span", { class: "pl-andring" }, andringText(p)),
        el("span", { class: "pl-kvar", title: p.typ === "GE" ? "Slutvärdet" : p.typ === "Vikt" ? "Buren vikt hittills av bärförmågan" : "Kvar efter raden" }, kvarText(p)));
      if (ny) nya.push(rad);
      return rad;
    }));
    if (!synliga.length) rader.append(el("li", { class: "pl-tom" }, "Inga rader. Kryssa i en typ ovan."));
    // Den första nya raden skrollas fram i loggen (bara inne i loggen, sidan står still)
    if (nya.length) {
      const r = nya[0];
      if (r.offsetTop < rader.scrollTop || r.offsetTop + r.offsetHeight > rader.scrollTop + rader.clientHeight) {
        rader.scrollTop = r.offsetTop - rader.clientHeight / 3;
      }
    }
  }
  function kopiera() {
    const text = ["Steg\tTyp\tHändelse\tÄndring\tKvar", ...alla().filter((p) => inst.filter[p.typ])
      .map((p) => [p.steg, p.typ, p.text, andringText(p), kvarText(p)].join("\t"))].join("\n");
    navigator.clipboard?.writeText(text).then(() => api.visaNotis("Poängloggen är kopierad."), () => api.visaNotis("Kunde inte kopiera."));
  }

  api.efterRita(() => {
    if (!inst.synlig) return;
    let utfall;
    try { utfall = poster(api); } catch (e) { console.error("Poängloggen kunde inte räknas fram", e); return; }
    aktuellt = utfall;
    for (const typ of Object.keys(saldoText)) saldoText[typ].textContent = utfall.saldo[typ].toLocaleString("sv-SE");
    ritaLogg();
    // Loggen säger bara till när summan inte stämmer med det som visas på sidan
    fot.hidden = !utfall.avvikelser.length;
    fot.textContent = `Stämmer inte med sidan: ${utfall.avvikelser.join("; ")}`;
    senast = new Map(alla().map((p) => [p.id, nyckel(p)]));
    placera();
  });

  return {
    visa(pa) { inst.synlig = pa; sparaInst(); placera(); if (pa) { senast = null; api.rita?.(); } },
    synlig: () => inst.synlig,
  };
}
