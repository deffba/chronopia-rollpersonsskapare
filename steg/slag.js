// Svärdshand, socialt stånd och startkapital.
import { rasAv, yrkeAv, standsvarde } from "../regelmotor.js";
import { S, rasId, uppdatera, yrkeId } from "../tillstand.js";
import { el, sm } from "../ui/dom.js";
import { valLista } from "../ui/kontroller.js";
import { inteSlaget, slagSteg } from "../ui/tarningar.js";
import { svardshandGiven } from "./saknas.js";
import { wretlerAktiv, wretlerKapital, wretlerStand } from "../wretler.js";

// Klanförmågans bonus på slaget för socialt stånd eller startkapital (Dvärgar i Chronopia s. 19–25)
const klanBonus = (res, falt) => {
  const v = (res.klan?.formaga?.regel ?? []).filter((d) => d.typ === "slagbonus").reduce((a, d) => a + (d[falt] ?? 0), 0);
  return v ? [`Klanförmåga (${res.klan.formaga.namn.toLowerCase()})`, v] : null;
};

export function stegSvardshand(res) {
  const sf = svardshandGiven(res);
  if (sf) {
    return [el("p", { class: "summering" }, `${res.klan?.formaga === sf ? "Klanförmågan" : "Den särskilda förmågan"} ger ${res.slag.svardshand.toLowerCase()} rollperson, så du behöver inte slå (s. 32).`)];
  }
  return slagSteg("sh", "svardshand", "Svärdshand", "2T6",
    S.rp.svardshand.slag === null ? inteSlaget() : [`Resultat: ${S.rp.svardshand.slag + S.rp.svardshand.bp}.`, `Svärdshand: ${res.slag.svardshand}.`],
    "Slå 2T6 plus lagda BP: 2–11 höger, 12–14 vänster, 15–18 dubbelhänt, 19+ ambidextriös.");
}

export function stegStand(res) {
  if (wretlerAktiv(S.rp)) return wretlerStand(); // Widunder och Wretler: Knapadel utan slag
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
    undefined, [bonus ? [`Ras (${ras.namn.toLowerCase()})`, bonus] : null, klanBonus(res, "socialtStand")].filter(Boolean)), valja];
}

export function stegKapital(res) {
  if (wretlerAktiv(S.rp)) return wretlerKapital(res); // Widunder och Wretler: ett lån utan slag
  const halva = Math.ceil(S.rp.socialtStand.bp / 2);
  const alderEff = S.R.alder.efterAr.find((r) => r.max === null || S.rp.alder <= r.max);
  const ras = rasAv(S.R, rasId());
  const yrke = yrkeAv(S.R, yrkeId());
  const bonusar = [
    halva ? ["Halva BP från socialt stånd", halva] : null,
    ras.slagbonus.startkapital ? [`Ras (${ras.namn.toLowerCase()})`, ras.slagbonus.startkapital] : null,
    yrke.slagbonus?.startkapital ? [`Yrke (${yrke.namn.toLowerCase()})`, yrke.slagbonus.startkapital] : null,
    klanBonus(res, "startkapital"),
  ].filter(Boolean);
  const utanTak = S.rp.startkapital.slag + S.rp.startkapital.bp + bonusar.reduce((a, [, v]) => a + v, 0);
  // Tabellen för startkapital (s. 33), hopfälld som de andra referenstabellerna
  const T = S.R.slag.startkapital;
  const tabell = el("details", { class: "fakta", id: "sk-tabell" }, el("summary", {}, `Tabellen för startkapital (s. ${T.sida})`),
    el("div", { class: "tabellram" }, el("table", { class: "tabell" },
      el("thead", {}, el("tr", {}, el("th", {}, "Slag"), el("th", { class: "num" }, "Startkapital"))),
      el("tbody", {}, T.tabell.map(([grans, v], i) => {
        const fran = i === 0 ? null : T.tabell[i - 1][0] + 1;
        const text = grans === null ? `${fran}+` : fran === null ? `${grans} eller lägre` : fran === grans ? `${grans}` : `${fran}–${grans}`;
        return el("tr", { class: res.slag.skResultat != null && S.rp.startkapital.slag !== null && slagRad(T.tabell, res.slag.skResultat) === i ? "vald" : "" },
          el("td", {}, text), el("td", { class: "num" }, sm(v)));
      })))),
    el("p", { class: "hjalp" }, "Summan multipliceras sedan med åldersbonusen."));
  return [...slagSteg("sk", "startkapital", "Startkapital", "2T6",
    S.rp.startkapital.slag === null ? inteSlaget() : { rader: [
      `Resultat: ${res.slag.skResultat}${utanTak > res.slag.skResultat ? ` (${utanTak} före taket)` : ""}.`,
      `Åldersbonus: ×${String(alderEff.kapital).replace(".", ",")}.`],
    total: `Totalt startkapital: ${sm(res.slag.startkapital)}` },
    `Slå 2T6 plus lagda BP. Bonusarna nedan läggs på slaget. Resultatet kan inte bli högre än socialt stånd + ${yrke.kapitaltak ?? 10}.`, undefined, bonusar,
    [`Tak för startkapital: ${res.slag.ssResultat + (yrke.kapitaltak ?? 10)}`]), tabell];
}
const slagRad = (tabell, v) => tabell.findIndex(([g]) => g === null || v <= g);
