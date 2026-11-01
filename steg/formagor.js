// Steg 7: särskilda förmågor.
import { GRUNDEGENSKAPER, sarskildFormaga as sfFor, tillgangligaFormagetabeller, formagetabell, slagIntervall } from "../regelmotor.js";
import { rita } from "../app.js";
import { S, motorIndata, sarskildFormaga, uppdatera } from "../tillstand.js";
import { el } from "../ui/dom.js";
import { falt, valLista } from "../ui/kontroller.js";
import { inteSlaget, lastFalt, rullar, slagSteg, valjFardighet } from "../ui/tarningar.js";

// Vilken tabell som visas i förmågekorten (flikarna) och vilket kort som är uppfällt. Ligger utanför rollpersonen,
// så att de står kvar när steget ritas om (t.ex. när BP ändras).
let formageFlik = null;
let oppetFormagekort = null; // { tabell, nr, vanster, uppat }
let formageModal = false; // modalen med förmågan som slaget gav; öppnas när tärningen har landat

// Korten för en tabell. Ett kort visar slaget och namnet; ett klick fäller upp det över korten bredvid
// (rutnätet ändrar inte storlek), ett nytt klick fäller ihop det. Kortet öppnar sig åt det håll där det finns plats.
function formagekort(tabell, traff) {
  const oppet = oppetFormagekort?.tabell === tabell.id ? oppetFormagekort : null;
  return el("div", { class: "formagekort", id: `sf-kort-${tabell.id}`, role: "list", lang: "sv" }, tabell.rader.map((x, nr) => {
    const arOppet = oppet?.nr === nr;
    return el("div", { class: "formageplats", role: "listitem" }, el("button", {
      type: "button", class: "formagekort-knapp" + (x === traff ? " markerad" : "") + (arOppet ? " oppen" : "")
        + (arOppet && oppet.vanster ? " vanster" : "") + (arOppet && oppet.uppat ? " uppat" : ""),
      "aria-expanded": arOppet ? "true" : "false", "data-namn": x.namn,
      onclick: (e) => {
        if (arOppet) oppetFormagekort = null;
        else {
          const kort = e.currentTarget.getBoundingClientRect(), natet = e.currentTarget.closest(".formagekort").getBoundingClientRect();
          oppetFormagekort = { tabell: tabell.id, nr,
            vanster: kort.left + kort.width / 2 > natet.left + natet.width / 2, uppat: kort.top + kort.height / 2 > natet.top + natet.height / 2 };
        }
        rita();
      },
    },
    el("span", { class: "formagekort-slag" }, slagIntervall(x)),
    el("span", { class: "formagekort-namn" }, x.namn),
    arOppet ? el("span", { class: "formagekort-effekt" }, x.effekt, el("span", { class: "formagekort-sida" }, ` (s. ${x.sida})`)) : null));
  }));
}

export function stegFormagor() {
  const sf = sarskildFormaga();
  const s = S.rp.sarskildaFormagor;
  const oslaget = s.slag === null || s.slag === undefined;
  const tabeller = tillgangligaFormagetabeller(S.R, motorIndata());
  const tabell = formagetabell(S.R, motorIndata()) ?? tabeller[0];
  const tolkning = s.avstar ? "Rollpersonen får ingen särskild förmåga." :
    !s.bp ? "Lägg minst 1 BP för att få slå (högst 40), eller kryssa i rutan om du inte vill lägga BP här." :
    oslaget ? inteSlaget() :
    [`Resultat: ${s.slag + s.bp}.`, `${sf?.namn}: ${sf?.effekt} (s. ${sf?.sida})`];
  // Byts förmågan ut gäller inte de gamla valen längre. BP här betyder att spelaren inte längre avstår.
  const nollstall = () => {
    if (S.rp.sarskildaFormagor.bp) S.rp.sarskildaFormagor.avstar = false;
    if (oslaget && S.rp.sarskildaFormagor.slag != null) formageModal = true; // slaget har just landat
    if (S.rp.sarskildaFormagor.slag == null) formageModal = false;
    const ny = sfFor(S.R, { ...motorIndata(), sarskildaFormagor: S.rp.sarskildaFormagor }).formaga;
    if (ny?.namn !== S.rp.sarskildaFormagor.formaga) S.rp.sarskildaFormagor.val = [];
    S.rp.sarskildaFormagor.formaga = ny?.namn;
  };
  const val = (i) => S.rp.sarskildaFormagor.val?.[i];
  const sattVal = (i, v) => { S.rp.sarskildaFormagor.val ??= []; S.rp.sarskildaFormagor.val[i] = v; uppdatera(); };
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

  // Har rollpersonen fler tabeller att välja på (expansioner) väljs tabellen i en rullgardin bredvid tärningsrutan.
  // Med bara grundreglernas tabell visas varken rullgardin eller flikar.
  const flera = tabeller.length > 1;
  const tabellval = !flera ? null : oslaget && rullar !== "sf"
    ? falt("Tabell", el("select", { id: "sf-tabell", onchange: (e) => {
      S.rp.sarskildaFormagor.tabell = e.target.value; formageFlik = e.target.value; nollstall(); uppdatera();
    } }, tabeller.map((t) => el("option", { value: t.id, selected: t.id === tabell?.id }, `${t.namn} (${t.tarning})`))))
    : falt("Tabell", lastFalt("sf-tabell", tabell?.namn ?? ""));
  // Spelaren måste uttryckligen avstå för att gå vidare utan BP här
  // Med lagda BP går rutan inte att kryssa i, och texten är struken
  const avsta = oslaget ? el("label", { class: "avsta" + (s.bp ? " inaktiv" : "") },
    el("input", { type: "checkbox", id: "sf-avsta", checked: !!s.avstar, disabled: rullar === "sf" || !!s.bp, onchange: (e) => {
      S.rp.sarskildaFormagor = { ...S.rp.sarskildaFormagor, avstar: e.target.checked, ...(e.target.checked ? { bp: 0 } : {}) };
      uppdatera();
    } }),
    el("span", {}, el("strong", {}, "Jag vill inte lägga BP på särskilda förmågor."), " Utan BP får rollpersonen ingen särskild förmåga.")) : null;

  // Modalen när slaget har landat: förmågan, vad den gör och valen den kräver. Den stängs med FORTSÄTT när valen är gjorda.
  const ingaVarden = "Förmågan påverkar inga värden på rollformuläret. Skriv in den i anteckningarna om den behöver beskrivas mer.";
  const visaModal = formageModal && !oslaget && !!sf && rullar === null;
  let modal = null;
  if (visaModal) {
    const svar = sfFor(S.R, motorIndata());
    const klar = !svar.saknas.length && !svar.fel.length;
    const fortsatt = el("button", { type: "button", class: "knapp primar", id: "sf-modal-fortsatt", disabled: !klar,
      onclick: () => { formageModal = false; rita(); } }, "FORTSÄTT");
    modal = el("div", { class: "dialog-bakgrund", id: "sf-modal" },
      el("div", { class: "dialog formagedialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "sf-modal-namn" },
        el("p", { class: "eyebrow" }, tabeller.length > 1 ? `Särskild förmåga · ${tabell.namn}` : "Särskild förmåga"),
        el("h2", { id: "sf-modal-namn" }, sf.namn),
        el("p", { class: "formagedialog-slag" }, `Slaget blev ${s.slag} + ${s.bp} BP = ${s.slag + s.bp}.`),
        el("p", { class: "formagedialog-effekt" }, sf.effekt, el("span", { class: "formagekort-sida" }, ` (s. ${sf.sida})`)),
        delar.length ? [el("h3", {}, "Val för förmågan"), el("ul", { class: "yrkeslista" }, delar)] : null,
        !sf.regel ? el("p", { class: "hjalp" }, ingaVarden) : null,
        !klar && delar.length ? el("p", { class: "hjalp" }, "Gör valen ovan för att gå vidare.") : null,
        el("div", { class: "dialog-fot" }, fortsatt)));
  }

  const visad = tabeller.find((t) => t.id === formageFlik) ?? tabell ?? tabeller[0];
  const flikar = flera ? el("div", { class: "flikar", role: "tablist", id: "sf-flikar" }, tabeller.map((t) => el("button", {
    type: "button", class: "valknapp" + (t === visad ? " vald" : ""), role: "tab", "aria-selected": t === visad ? "true" : "false", "data-tabell": t.id,
    onclick: () => { formageFlik = t.id; rita(); },
  }, t.namn))) : null;

  return [
    ...slagSteg("sf", "sarskildaFormagor", "Särskilda förmågor", tabell?.tarning ?? "2T20", tolkning,
      `Lägg 1–40 BP och slå ${tabell?.tarning ?? "2T20"}. Summan avgör förmågan. SL får justera resultatet.`, nollstall, [], [],
      { fore: tabellval, kanSla: !!s.bp, under: avsta }),
    // Valen står i modalen så länge den är öppen (samma id får inte finnas två gånger)
    delar.length && !visaModal ? [el("h3", {}, "Val för förmågan"), el("ul", { class: "yrkeslista" }, delar)] : null,
    sf && !sf.regel ? el("p", { class: "hjalp" }, ingaVarden) : null,
    visaModal ? modal : null,
    // Tabellen ritas under stegets knappar (ritaVy flyttar den dit), eftersom den är lång
    el("div", { class: "steg-innehall efter-fot" },
      el("h3", {}, flera ? "Tabellerna" : `Tabellen (s. ${visad?.sida})`),
      flikar,
      flera ? el("p", { class: "hjalp" }, `${visad.namn}, ${visad.tarning}+BP (s. ${visad.sida}). Tryck på en förmåga för att läsa om den.`)
        : el("p", { class: "hjalp" }, "Tryck på en förmåga för att läsa om den. Siffrorna är summan av slaget och de lagda BP."),
      visad ? formagekort(visad, visad === tabell ? sf : null) : null),
  ];
}
