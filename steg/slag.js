// Svärdshand, socialt stånd och startkapital.
import { rasAv, yrkeAv, standsvarde } from "../regelmotor.js";
import { S, rasId, sarskildFormaga, uppdatera, yrkeId } from "../tillstand.js";
import { el, sm } from "../ui/dom.js";
import { valLista } from "../ui/kontroller.js";
import { inteSlaget, slagSteg } from "../ui/tarningar.js";

export function stegSvardshand(res) {
  const sf = sarskildFormaga();
  if (sf && ["Dubbelhänt", "Ambidextriös"].includes(sf.namn)) {
    return [el("p", { class: "summering" }, `Den särskilda förmågan ger ${sf.namn.toLowerCase()} rollperson, så du behöver inte slå (s. 32).`)];
  }
  return slagSteg("sh", "svardshand", "Svärdshand", "2T6",
    S.rp.svardshand.slag === null ? inteSlaget() : [`Resultat: ${S.rp.svardshand.slag + S.rp.svardshand.bp}.`, `Svärdshand: ${res.slag.svardshand}.`],
    "Slå 2T6 plus lagda BP: 2–11 höger, 12–14 vänster, 15–18 dubbelhänt, 19+ ambidextriös.");
}

export function stegStand(res) {
  const ras = rasAv(S.R, rasId());
  const bonus = ras.slagbonus.socialtStand ?? 0;
  const tabell = S.R.slag.socialtStand.tabell;
  if (S.rp.socialtStand.valt) {
    return [
      el("p", { class: "summering" }, `Valt stånd: ${S.rp.socialtStand.valt}. Det räknas som slagresultatet ${res.slag.ssResultat} för startkapitalet.`),
      el("button", { type: "button", class: "knapp", onclick: () => { S.rp.socialtStand.valt = ""; uppdatera(); } }, "Slå i stället"),
    ];
  }
  const valja = S.rp.socialtStand.slag === null ? el("details", { class: "fakta" }, el("summary", {}, "Välj stånd i stället för att slå (om SL tillåter)"),
    el("p", { class: "hjalp" }, "Huvudregeln är att slå. Om spelledaren går med på det kan du välja stånd direkt. Då räknas det lägsta slagresultatet för det ståndet, och du lägger inga BP här."),
    valLista("valt-stand", "", tabell.map(([, n]) => [n, `${n} (${standsvarde(tabell, n)}+)`]), (v) => { if (v) { S.rp.socialtStand = { bp: 0, slag: null, valt: v }; uppdatera(); } }, "Välj stånd …")) : null;
  return [...slagSteg("ss", "socialtStand", "Socialt stånd", "2T6",
    S.rp.socialtStand.slag === null ? inteSlaget() : [`Resultat: ${res.slag.ssResultat}.`, `Socialt stånd: ${res.slag.socialtStand}.`],
    "Slå 2T6 plus lagda BP. Socialt stånd påverkar läs- och skrivkunnighet i modersmålet och taket för startkapitalet. Hälften av de BP du lägger här (avrundat uppåt) läggs också som bonus på slaget för startkapital i steg 10.",
    undefined, bonus ? [[`Ras (${ras.namn.toLowerCase()})`, bonus]] : []), valja];
}

export function stegKapital(res) {
  const halva = Math.ceil(S.rp.socialtStand.bp / 2);
  const alderEff = S.R.alder.efterAr.find((r) => r.max === null || S.rp.alder <= r.max);
  const ras = rasAv(S.R, rasId());
  const yrke = yrkeAv(S.R, yrkeId());
  const bonusar = [
    halva ? ["Halva BP från socialt stånd", halva] : null,
    ras.slagbonus.startkapital ? [`Ras (${ras.namn.toLowerCase()})`, ras.slagbonus.startkapital] : null,
    yrke.slagbonus?.startkapital ? [`Yrke (${yrke.namn.toLowerCase()})`, yrke.slagbonus.startkapital] : null,
  ].filter(Boolean);
  const utanTak = S.rp.startkapital.slag + S.rp.startkapital.bp + bonusar.reduce((a, [, v]) => a + v, 0);
  return slagSteg("sk", "startkapital", "Startkapital", "2T6",
    S.rp.startkapital.slag === null ? inteSlaget() : { rader: [
      `Resultat: ${res.slag.skResultat}${utanTak > res.slag.skResultat ? ` (${utanTak} före taket)` : ""}.`,
      `Åldersbonus: ×${String(alderEff.kapital).replace(".", ",")}.`],
    total: `Totalt startkapital: ${sm(res.slag.startkapital)}` },
    `Slå 2T6 plus lagda BP. Bonusarna nedan läggs på slaget. Resultatet kan inte bli högre än socialt stånd + ${yrke.kapitaltak ?? 10}.`, undefined, bonusar,
    [`Tak för startkapital: ${res.slag.ssResultat + (yrke.kapitaltak ?? 10)}`]);
}
