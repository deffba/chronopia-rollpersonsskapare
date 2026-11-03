// Steg 7: särskilda förmågor.
import { GRUNDEGENSKAPER, raknaFamiljarer, familjarAv, kallText, sarskildFormaga as sfFor, tillgangligaFormagetabeller, formagetabell, formageslag, nivaFor, slagIntervall, tarningAv } from "../regelmotor.js";
import { rita } from "../app.js";
import { S, motorIndata, rakna, uppdatera } from "../tillstand.js";
import { el, slaT } from "../ui/dom.js";
import { falt, valLista } from "../ui/kontroller.js";
import { inteSlaget, landatSlag, lastFalt, rullar, slagKontroll, slagSteg, valjFardighet } from "../ui/tarningar.js";

// Vilken tabell som visas i förmågekorten (flikarna) och vilket kort som är uppfällt. Ligger utanför rollpersonen,
// så att de står kvar när steget ritas om (t.ex. när BP ändras).
let formageFlik = null;
let oppetFormagekort = null; // { tabell, nr, vanster, uppat }
let formageModal = null; // slaget (0, 1, 2) vars förmåga visas i modalen; öppnas när tärningen har landat
let aktivPlats = 0; // vilket av slagen som visas när erfarenhetsnivån ger flera särskilda förmågor (RB-001)

// Slag nummer i (0 = rp.sarskildaFormagor, 1 och 2 = rp.sarskildaFormagor.fler). Saknas slaget läggs det till.
function formagePlats(i) {
  const s = S.rp.sarskildaFormagor;
  if (i === 0) return s;
  s.fler ??= [];
  while (s.fler.length < i) s.fler.push({ bp: 0, slag: null, val: [], avstar: false });
  return s.fler[i - 1];
}
// Sidhänvisning för en förmåga: "s. 30" i grundreglerna, "Vapen & rustningar s. 14" för en expansions tabell
const sidaFor = (tabell, rad) => (tabell?.kalla ? `${tabell.namn} s. ${rad.sida}` : `s. ${rad.sida}`);

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
  const antal = formageslag(S.R, motorIndata()).length;
  // Steget börjar alltid på Förmåga 1, även för en ny rollperson efter en med flera förmågor
  if (aktivPlats >= antal || S.ritatSteg !== "formagor") aktivPlats = 0;
  for (let i = 1; i < antal; i++) formagePlats(i);
  const plats = aktivPlats;
  const pid = plats === 0 ? "sf" : `sf${plats + 1}`; // id:n för första slaget är desamma som med en förmåga
  const hamta = () => formagePlats(plats);
  const s = hamta();
  const alla = sfFor(S.R, motorIndata());
  const svar = alla.perSlag[plats];
  const sf = svar?.formaga;
  const oslaget = s.slag === null || s.slag === undefined;
  const tabeller = tillgangligaFormagetabeller(S.R, motorIndata());
  const tabell = formagetabell(S.R, motorIndata(), s) ?? tabeller[0];
  const maxBP = tabell?.maxBP ?? S.R.slag.sarskildaFormagor.maxBP;
  const tolkning = s.avstar ? (antal > 1 ? `Rollpersonen får ingen särskild förmåga ${plats + 1}.` : "Rollpersonen får ingen särskild förmåga.") :
    !s.bp ? `Lägg minst 1 BP för att få slå (högst ${maxBP}), eller kryssa i rutan om du inte vill lägga BP här.` :
    oslaget ? inteSlaget() :
    svar?.dubblett !== undefined ? [`Resultat: ${s.slag + s.bp}.`, `${sf?.namn}, som rollpersonen redan har (förmåga ${svar.dubblett + 1}). Slå om.`] :
    [`Resultat: ${s.slag + s.bp}.`, `${sf?.namn}: ${sf?.effekt} (${sf ? sidaFor(tabell, sf) : ""})`];
  // Byts förmågan ut gäller inte de gamla valen längre. BP här betyder att spelaren inte längre avstår.
  const nollstall = () => {
    const nu = hamta();
    if (nu.bp) nu.avstar = false;
    if (oslaget && nu.slag != null) formageModal = plats; // slaget har just landat
    if (nu.slag == null) formageModal = null;
    const ny = sfFor(S.R, motorIndata()).perSlag[plats]?.formaga;
    if (ny?.namn !== nu.formaga) nu.val = [];
    nu.formaga = ny?.namn;
    // Hjältepoäng som har använts kan försvinna med förmågan; räcker de inte längre görs köpen om
    const hp = sfFor(S.R, motorIndata()).hjaltepoang;
    if (hp && hp.spenderat > hp.totalt) S.rp.hjaltepoangKop = {};
  };
  const val = (i) => hamta().val?.[i];
  const sattVal = (i, v) => { const nu = hamta(); nu.val ??= []; nu.val[i] = v; uppdatera(); };
  const delar = (sf?.regel ?? []).map((del, i) => {
    if (del.typ === "fv" && del.valj) {
      const valda = [].concat(val(i) ?? []);
      return el("li", {}, el("span", { class: "fnamn" }, del.valj > 1 ? `Välj ${del.valj} färdigheter` : "Välj färdighet"),
        el("div", { class: "rad" }, Array.from({ length: del.valj }, (_, j) => valjFardighet(`${pid}-${i}-${j}`, del.bland, valda[j], (v) => {
          const ny = [...valda]; ny[j] = v; sattVal(i, ny);
        }))));
    }
    if (del.typ === "egenskapVal") {
      const v = val(i) ?? {};
      const antalEg = v.lage === "en" ? 1 : v.lage === "tre" ? 3 : 0;
      const egenskaper = v.egenskaper ?? [];
      return el("li", {}, el("span", { class: "fnamn" }, "Höj grundegenskaper"),
        el("div", { class: "rad" },
          valLista(`${pid}-${i}-lage`, v.lage, [["tre", "+1 på tre olika"], ["en", "+2 på en"]], (lage) => sattVal(i, { lage, egenskaper: [] })),
          Array.from({ length: antalEg }, (_, j) => valLista(`${pid}-${i}-${j}`, egenskaper[j], GRUNDEGENSKAPER.map((g) => [g, g]), (g) => {
            const ny = [...egenskaper]; ny[j] = g; sattVal(i, { ...v, egenskaper: ny });
          }))));
    }
    if (del.typ === "hjaltepoang") {
      // Hjältepoängen slås direkt i dialogen (RB-003)
      const { n, sidor } = tarningAv(del.tarning);
      const id = `${pid}-hp-${i}`;
      const v = val(i);
      if (Number.isInteger(v?.slag)) {
        return el("li", {}, el("span", { class: "fnamn" }, "Hjältepoäng"),
          falt(`Slag (${del.tarning})`, landatSlag(id, v.slag, `Slå ${del.tarning}`, { tarningar: v.tarningar, sidor, antal: n })),
          el("p", { class: "hjalp" }, `Rollpersonen får ${v.slag} hjältepoäng. De kan användas redan nu för att höja grundegenskaper (5 HP per poäng), och resten står på rollformuläret.`));
      }
      let tarningar = null;
      const slumpa = () => { tarningar = Array.from({ length: n }, () => slaT(1, sidor)); return tarningar.reduce((a, b) => a + b, 0); };
      const { slagfalt, knapp } = slagKontroll(id, `Slag (${del.tarning})`, `Slå ${del.tarning}`, n, n * sidor,
        (slag) => sattVal(i, { slag, tarningar: S.manuellaSlag ? null : tarningar }), slumpa, sidor);
      return el("li", {}, el("span", { class: "fnamn" }, `Slå ${del.tarning} hjältepoäng`), el("div", { class: "rad" }, slagfalt, knapp));
    }
    if (del.typ === "familjar") {
      // Spiritus familiarius: en valfri familjar gratis (Magi i Chronopia s. 17)
      const lista = S.R.foljeslagare?.familjarer?.lista ?? [];
      return el("li", {}, el("span", { class: "fnamn" }, "Välj familjar"),
        valLista(`${pid}-${i}-familjar`, val(i), lista.map((f) => [f.id, `${f.namn} (värd ${f.bp} BP)`]), (v) => sattVal(i, v || undefined)),
        val(i) ? el("p", { class: "hjalp" }, familjarAv(S.R, val(i))?.beskrivning) : null);
    }
    return null;
  }).filter(Boolean);

  // Har rollpersonen fler tabeller att välja på (expansioner) väljs tabellen i en rullgardin bredvid tärningsrutan.
  // Med bara grundreglernas tabell visas varken rullgardin eller flikar.
  const flera = tabeller.length > 1;
  const tabellval = !flera ? null : oslaget && rullar !== pid
    ? falt("Tabell", el("select", { id: `${pid}-tabell`, onchange: (e) => {
      hamta().tabell = e.target.value; formageFlik = e.target.value;
      // Fler BP än den nya tabellen tillåter sänks till det högsta tillåtna
      const max = tabeller.find((t) => t.id === e.target.value)?.maxBP;
      if (max && hamta().bp > max) hamta().bp = max;
      nollstall(); uppdatera();
    } }, tabeller.map((t) => el("option", { value: t.id, selected: t.id === tabell?.id }, `${t.namn} (${t.tarning}, högst ${t.maxBP ?? 40} BP)`))))
    : falt("Tabell", lastFalt(`${pid}-tabell`, tabell?.namn ?? ""));
  // Spelaren måste uttryckligen avstå för att gå vidare utan BP här
  // Med lagda BP går rutan inte att kryssa i, och texten är struken
  const avsta = oslaget ? el("label", { class: "avsta" + (s.bp ? " inaktiv" : "") },
    el("input", { type: "checkbox", id: `${pid}-avsta`, checked: !!s.avstar, disabled: rullar === pid || !!s.bp, onchange: (e) => {
      Object.assign(hamta(), { avstar: e.target.checked, ...(e.target.checked ? { bp: 0 } : {}) });
      uppdatera();
    } }),
    el("span", {}, el("strong", {}, antal > 1 ? `Jag vill inte lägga BP på särskild förmåga ${plats + 1}.` : "Jag vill inte lägga BP på särskilda förmågor."),
      antal > 1 ? " Utan BP blir det ingen förmåga för det här slaget." : " Utan BP får rollpersonen ingen särskild förmåga.")) : null;

  // Modalen när slaget har landat: förmågan, vad den gör och valen den kräver. Den stängs med FORTSÄTT när valen är gjorda.
  const ingaVarden = "Förmågan påverkar inga värden på rollformuläret. Skriv in den i anteckningarna om den behöver beskrivas mer.";
  const visaModal = formageModal === plats && !oslaget && !!sf && rullar === null;
  let modal = null;
  if (visaModal && svar.dubblett !== undefined) {
    // Samma förmåga som ett tidigare slag: slå om med samma BP
    const slaOm = el("button", { type: "button", class: "knapp primar", id: "sf-modal-sla-om",
      onclick: () => { Object.assign(hamta(), { slag: null, val: [], formaga: undefined }); formageModal = null; uppdatera(); } }, "SLÅ OM");
    modal = el("div", { class: "dialog-bakgrund", id: "sf-modal" },
      el("div", { class: "dialog formagedialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "sf-modal-namn" },
        el("p", { class: "eyebrow" }, `Särskild förmåga ${plats + 1}${tabeller.length > 1 ? ` · ${tabell.namn}` : ""}`),
        el("h2", { id: "sf-modal-namn" }, sf.namn),
        el("p", { class: "formagedialog-slag" }, `Slaget blev ${s.slag} + ${s.bp} BP = ${s.slag + s.bp}.`),
        el("p", { class: "formagedialog-effekt", id: "sf-modal-dubblett" }, `Rollpersonen har redan ${sf.namn} (förmåga ${svar.dubblett + 1}). Slå om; de lagda BP står kvar.`),
        el("div", { class: "dialog-fot" }, slaOm)));
  } else if (visaModal) {
    const klar = !svar.saknas.length && !svar.fel.length;
    const fortsatt = el("button", { type: "button", class: "knapp primar", id: "sf-modal-fortsatt", disabled: !klar,
      onclick: () => { formageModal = null; rita(); } }, "FORTSÄTT");
    modal = el("div", { class: "dialog-bakgrund", id: "sf-modal" },
      el("div", { class: "dialog formagedialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "sf-modal-namn" },
        el("p", { class: "eyebrow" }, [antal > 1 ? `Särskild förmåga ${plats + 1}` : "Särskild förmåga", tabeller.length > 1 ? ` · ${tabell.namn}` : ""].join("")),
        el("h2", { id: "sf-modal-namn" }, sf.namn),
        el("p", { class: "formagedialog-slag" }, `Slaget blev ${s.slag} + ${s.bp} BP = ${s.slag + s.bp}.`),
        el("p", { class: "formagedialog-effekt" }, sf.effekt, el("span", { class: "formagekort-sida" }, ` (${sidaFor(tabell, sf)})`)),
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

  // Flera förmågor: ett slag i taget, med knappar för att byta slag
  const platser = antal > 1 ? el("div", { class: "flikar sf-platser", role: "tablist", id: "sf-platser" }, Array.from({ length: antal }, (_, i) => {
    const p = i === 0 ? S.rp.sarskildaFormagor : S.rp.sarskildaFormagor.fler[i - 1];
    const namn = alla.perSlag[i]?.formaga?.namn ?? (p.avstar ? "avstår" : p.bp && p.slag == null ? "inte slaget" : "ingen än");
    return el("button", { type: "button", class: "valknapp" + (i === plats ? " vald" : ""), role: "tab", "aria-selected": i === plats ? "true" : "false", "data-plats": i,
      disabled: rullar !== null, onclick: () => { aktivPlats = i; rita(); } }, `Förmåga ${i + 1}: ${namn}`);
  })) : null;

  const hp = alla.hjaltepoang;
  return [
    antal > 1 ? el("p", { class: "hjalp" }, `Erfarenhetsnivån ${(nivaFor(S.R, motorIndata()).namn ?? "").toLowerCase()} ger ${antal} slag för särskilda förmågor. Varje slag kostar sina egna BP, och du väljer tabell för varje slag.`) : null,
    platser,
    ...slagSteg(pid, plats === 0 ? "sarskildaFormagor" : hamta, "Särskilda förmågor", tabell?.tarning ?? "2T20", tolkning,
      `Lägg 1–${maxBP} BP och slå ${tabell?.tarning ?? "2T20"}. Summan avgör förmågan. SL får justera resultatet.`, nollstall, [], [],
      { fore: tabellval, kanSla: !!s.bp, under: avsta }),
    // Valen står i modalen så länge den är öppen (samma id får inte finnas två gånger)
    delar.length && !visaModal ? [el("h3", {}, "Val för förmågan"), el("ul", { class: "yrkeslista" }, delar)] : null,
    sf && !sf.regel ? el("p", { class: "hjalp" }, ingaVarden) : null,
    hp?.totalt > 0 && !visaModal ? hjaltepoangKop(hp) : null,
    !visaModal ? familjarRuta() : null,
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

// Hjältepoäng från särskilda förmågor kan användas redan när rollpersonen skapas (RB-003):
// 5 HP höjer en grundegenskap ett poäng, utom STO (s. 76). Det som blir över står på rollformuläret.
function hjaltepoangKop(hp) {
  const pris = S.R.erfarenhet.hjaltepoang.egenskap.hp;
  const kop = S.rp.hjaltepoangKop ?? {};
  const andra = (g, d) => { const n = Math.max(0, (kop[g] ?? 0) + d); S.rp.hjaltepoangKop = { ...kop, [g]: n }; if (!n) delete S.rp.hjaltepoangKop[g]; uppdatera(); };
  return el("div", { class: "rutor", id: "hjaltepoang" }, el("div", {},
    el("h3", {}, "Hjältepoäng"),
    el("p", {}, `Rollpersonen har ${hp.totalt} hjältepoäng. ${hp.kvar} är kvar att använda.`),
    el("p", { class: "hjalp" }, `Du kan använda hjältepoängen redan nu: ${pris} HP höjer en grundegenskap ett poäng, utom STO (s. 76, RB-003). `,
      "De som blir över står på rollformuläret och kan användas under spel."),
    el("div", { class: "hp-kop" }, GRUNDEGENSKAPER.map((g) => el("div", { class: "hp-rad" },
      el("span", { class: "fnamn" }, g),
      el("button", { type: "button", class: "knapp liten", id: `hp-${g}-ner`, "aria-label": `Sänk ${g}`, disabled: !kop[g], onclick: () => andra(g, -1) }, "−"),
      el("span", { class: "hp-antal", id: `hp-${g}` }, kop[g] ? `+${kop[g]}` : "0"),
      el("button", { type: "button", class: "knapp liten", id: `hp-${g}-upp`, "aria-label": `Höj ${g}`, disabled: hp.kvar < pris, onclick: () => andra(g, 1) }, "+"))))));
}

// Familjarer (Magi i Chronopia s. 40–43) köps för BP här i steg 7. Erfarenhetsnivån avgör hur många
// rollpersonen får ha (RB-010); de som yrket eller Spiritus familiarius ger är gratis.
function familjarRuta() {
  const F = S.R.foljeslagare?.familjarer;
  const fam = rakna().familjarer ?? raknaFamiljarer(S.R, motorIndata()); // med gratis familjarer från förmågorna
  if (!F || !fam.tillganglig) return null;
  const kopta = S.rp.familjarer ?? [];
  const antal = (id) => kopta.filter((x) => x === id).length;
  const andra = (id, d) => {
    const ny = [...kopta];
    if (d > 0) ny.push(id); else ny.splice(ny.lastIndexOf(id), 1);
    S.rp.familjarer = ny;
    uppdatera();
  };
  const gratis = fam.lista.filter((f) => f.gratis);
  const varden = (f) => ["STO", "STY", "FYS", "SMI", "INT", "PSY", "KP"].map((g) => `${g} ${f[g]}`).join(", ");
  return el("div", { class: "rutor", id: "familjarer" }, el("div", {},
    el("h3", {}, "Familjarer"),
    el("p", {}, `Rollpersonen får ha högst ${fam.tak} köpt${fam.tak === 1 ? "" : "a"} familjar${fam.tak === 1 ? "" : "er"} och har köpt ${fam.antal}. De kostar ${fam.bp} BP.`),
    el("p", { class: "hjalp" }, `${F.text} (${kallText(S.R, F, "")}).`),
    gratis.length ? el("p", { id: "familjarer-gratis" }, `Gratis: ${gratis.map((f) => `${f.namn} (${f.kallaGratis})`).join(", ")}.`) : null,
    el("div", { class: "tabellram" }, el("table", { class: "tabell varutabell" },
      el("thead", {}, el("tr", {}, el("th", {}, "Familjar"), el("th", {}, "BP"), el("th", {}, "Värden"), el("th", {}, "Antal"))),
      el("tbody", {}, F.lista.map((f) => {
        const n = antal(f.id);
        const sparrad = f.villkor?.yrken && !f.villkor.yrken.includes(S.rp.yrke);
        return el("tr", { "data-familjar": f.id, class: sparrad ? "sparrad" : "" },
          el("td", {}, el("strong", {}, f.namn), el("div", { class: "hjalp" }, f.beskrivning, sparrad ? " Bara för chronomager och divinatorer." : "")),
          el("td", {}, String(f.bp)),
          el("td", { class: "hjalp" }, varden(f), f.fardigheter ? el("div", {}, f.fardigheter) : null),
          el("td", { class: "antal" },
            el("button", { type: "button", class: "knapp liten", "aria-label": `Ta bort ${f.namn}`, disabled: !n, onclick: () => andra(f.id, -1) }, "−"),
            el("span", { id: `familjar-${f.id}` }, String(n)),
            el("button", { type: "button", class: "knapp liten", "aria-label": `Köp ${f.namn}`, disabled: sparrad || fam.antal >= fam.tak, onclick: () => andra(f.id, 1) }, "+")));
      }))))));
}
