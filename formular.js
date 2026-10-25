// Rollformuläret i bokens layout (s. 11–12), för utskrift och för att fylla i under spel.
// Värden som reglerna räknar fram (grundegenskaper, FV, KP) visas som text och ändras i stegen.
// Det spelaren skriver under spel (erf, hjältepoäng, pengar, egen utrustning) sparas i rp.spel.
import { GRUNDEGENSKAPER, slaUpp, fardighetAv } from "./regelmotor.js";

// Rader per lista. Får inte allt plats fortsätter listan på sida 3.
const RADER = { formagor: 5, primar: 25, yrke: 12, sprak: 12, sekundar: 32, vapen: 7, besvarjelser: 23, utrustning: 9 };
const NAMN = { STY: "Styrka", FYS: "Fysik", SMI: "Smidighet", INT: "Intelligens", PSY: "Psyke", KAR: "Karisma", STO: "Storlek" };
const STATUSNAMN = { primar: "Primär", yrke: "Yrke", sekundar: "Sekundär" };

export function rollformularSidor({ R, rp, res, el, sakNamn, andrat, medRegler = false }) {
  const spel = rp.spel;
  const g = res.grundegenskaper;
  const h = res.harledda;

  // ------------------------------------------------------------ byggstenar
  const text = (t) => el("span", { class: "rf-varde" }, t ?? "");
  const inmatning = (varde, satt, attr = {}) => el("input", {
    type: "text", class: "rf-in", value: varde ?? "", autocomplete: "off", ...attr,
    onchange: (e) => { satt(e.target.value.trim()); andrat(); },
  });
  const heltal = (v) => (/^-?\d+$/.test(v) ? Number(v) : null);
  const falt = (etikett, nr, innehall, klass = "") => el("div", { class: `rf-falt ${klass}` },
    el("span", { class: "rf-etikett" }, etikett), nr ? el("span", { class: "rf-nr", "aria-hidden": "true" }, nr) : null, innehall);
  const rubrik = (titel, kolumner = [], nr = null) => el("div", { class: "rf-rubrik" },
    el("span", { class: "rf-rubrik-titel" }, titel), nr ? el("span", { class: "rf-nr ljus", "aria-hidden": "true" }, nr) : null,
    kolumner.map((k) => el("span", { class: "rf-rubrik-kol" }, k)));
  const rutor = (antal, klass = "") => el("span", { class: `rf-rutor ${klass}`, "aria-label": `${antal} rutor` },
    Array.from({ length: antal }, () => el("span", { class: "rf-ruta" })));

  // erf-rutan: osparade EP. Kategori B kan inte få EP genom äventyr (s. 74) men väl genom träning.
  const erfFalt = (nyckel, namn) => inmatning(spel.erf[nyckel] ?? "", (v) => {
    const n = heltal(v);
    if (n && n > 0) spel.erf[nyckel] = n; else delete spel.erf[nyckel];
  }, { inputmode: "numeric", "aria-label": `erf för ${namn}` });

  const bNiva = (fv) => slaUpp(R.fardigheter.bNivaer, fv);
  // Sidan där färdighetens regler står, i parentes efter namnet
  const sidaFor = (nyckel) => fardighetAv(R, nyckel)?.sida;
  const sidhanvisning = (sida) => (sida ? el("small", { class: "rf-sida-ref" }, `(s. ${sida})`) : null);
  const tak = (f) => (f.status === "sekundar" ? `max ${g[f.grundegenskap] ?? "–"}` : null);
  const fardighetsrad = (f) => el("div", { class: "rf-rad" + (f.kategoriB ? " kat-b" : "") },
    el("span", { class: "rf-cell rf-namn" }, el("span", { class: "rf-bock", title: "Bocka vid första lyckade slaget efter sömn (s. 74)" }),
      el("span", { class: "rf-namntext" }, f.status === "primar" && f.grundegenskap ? `${f.namn} (${f.grundegenskap})` : f.namn),
      f.kategoriB ? el("small", {}, bNiva(f.fv)) : null,
      tak(f) ? el("small", {}, tak(f)) : null,
      sidhanvisning(sidaFor(f.nyckel))),
    el("span", { class: "rf-cell rf-erf" + (f.kategoriB ? " b" : "") }, erfFalt(f.nyckel, f.namn)),
    el("span", { class: "rf-cell rf-tal" }, f.fv));
  // Tomma rader för det som lärs under spel; bockrutan bara där färdigheter kan få EP
  const tomRad = (celler, bock) => el("div", { class: "rf-rad tom" }, Array.from({ length: celler }, (_, i) =>
    el("span", { class: "rf-cell" + (i === 0 ? " rf-namn" : "") }, i === 0 && bock ? el("span", { class: "rf-bock" }) : null)));
  const fyll = (rader, antal, celler, bock = false) => [...rader.slice(0, antal), ...Array.from({ length: Math.max(0, antal - rader.length) }, () => tomRad(celler, bock))];
  const lista = (klass, rubrikEl, rader, antal, celler = 3, bock = true) => el("div", { class: `rf-lista ${klass}` }, rubrikEl, fyll(rader, antal, celler, bock));

  // ------------------------------------------------------------ indelning
  const idFor = (f) => fardighetAv(R, f.nyckel)?.id;
  // Alla färdigheter rollpersonen har, även de med FV 0 (t.ex. en nyss vald sekundär färdighet)
  const synliga = res.fardigheter;
  const arVapen = (f) => idFor(f) === "vapen";
  const arSprak = (f) => ["tala", "lasa-skriva"].includes(idFor(f));
  const grupp = (status) => synliga.filter((f) => f.status === status && !arVapen(f) && !arSprak(f));
  const listor = { primar: grupp("primar"), yrke: grupp("yrke"), sekundar: grupp("sekundar") };
  const sprak = synliga.filter(arSprak);
  const overflode = [
    ...Object.entries(listor).flatMap(([k, l]) => l.slice(RADER[k])),
    ...sprak.slice(RADER.sprak),
  ];

  // Särskilda förmågor: rasens, den slagna och yrkesförmågan. Hela texterna står på sida 3.
  const formagor = [
    ...(res.ras?.formagor ?? []).map((t) => ({ namn: t })),
    res.sarskildFormaga ? { namn: res.sarskildFormaga.namn } : null,
    { namn: `Yrkesförmåga (${res.yrke.namn.toLowerCase()})` },
  ].filter(Boolean);

  // ------------------------------------------------------------ sida 1
  const sida1 = el("section", { class: "rf-sida", "aria-label": "Rollformulär sida 1" },
    el("div", { class: "rf-band" }, "Drakar & Demoner"),
    el("div", { class: "rf-ram" },
      el("div", { class: "rf-topp" },
        el("div", { class: "rf-titel" }, el("span", {}, "Roll-"), el("span", {}, "formulär")),
        el("div", { class: "rf-huvud" },
          falt("Spelare", 1, inmatning(rp.spelare, (v) => { rp.spelare = v; }, { "aria-label": "Spelare" }), "s3"),
          falt("Spelledare", 2, inmatning(spel.spelledare, (v) => { spel.spelledare = v; }, { "aria-label": "Spelledare" }), "s3"),
          falt("Namn", 3, inmatning(rp.namn, (v) => { rp.namn = v; }, { "aria-label": "Namn" }), "s6"),
          falt("Ras", 4, text(rp.ras ? res.ras.namn : ""), "s2"),
          falt("Kön", 6, text(rp.kon), "s2"),
          falt("Socialt stånd", 8, text(res.slag.socialtStand), "s2"),
          falt("Yrke", 5, text(res.yrke.namn), "s2"),
          falt("Svärdshand", 7, text(res.slag.svardshand), "s2"),
          falt("Ålder", 9, text(`${rp.alder} år`), "s2"))),
      el("div", { class: "rf-kropp1" },
        el("div", { class: "rf-vanster" },
          el("div", { class: "rf-lista rf-egenskaper" }, rubrik("Grundegenskap", ["Värde"]),
            [...GRUNDEGENSKAPER, "STO"].map((k, i) => el("div", { class: "rf-rad" },
              el("span", { class: "rf-cell rf-namn" }, `${NAMN[k]} (${k})`, i === 0 ? el("span", { class: "rf-nr" }, 11) : null),
              el("span", { class: "rf-cell rf-tal stor" }, g[k])))),
          lista("rf-fardigheter", rubrik("Primära färdigheter", ["erf", "FV"], 15), listor.primar.map(fardighetsrad), RADER.primar)),
        el("div", { class: "rf-hoger" },
          el("div", { class: "rf-hoger-kolumner" },
            el("div", { class: "rf-mitt" },
              el("div", { class: "rf-lista rf-formagor" }, rubrik("Särskilda förmågor", [], 14),
                fyll(formagor.map((f) => el("div", { class: "rf-rad" }, el("span", { class: "rf-cell rf-namn" }, f.namn))), RADER.formagor, 1)),
              el("div", { class: "rf-hjaltepoang" }, el("span", {}, "Hjältepoäng"),
                inmatning(spel.hjaltepoang || "", (v) => { spel.hjaltepoang = Math.max(0, heltal(v) ?? 0); }, { inputmode: "numeric", "aria-label": "Hjältepoäng" })),
              lista("rf-fardigheter", rubrik("Yrkesfärdigheter", ["erf", "FV"], 16), listor.yrke.map(fardighetsrad), RADER.yrke),
              lista("rf-sprak", rubrik("Språk (INT)", ["FV", "B-FV"], 17), sprak.slice(0, RADER.sprak).map((f) => el("div", { class: "rf-rad" },
                el("span", { class: "rf-cell rf-namn" }, el("span", { class: "rf-namntext" }, f.namn), sidhanvisning(sidaFor(f.nyckel))),
                el("span", { class: "rf-cell rf-tal" }, f.fv), el("span", { class: "rf-cell rf-tal" }, bNiva(f.fv)))), RADER.sprak, 3, false)),
            lista("rf-fardigheter rf-sek", rubrik("Sek. färdigheter", ["erf", "FV"], 18), listor.sekundar.map(fardighetsrad), RADER.sekundar))))),
    el("div", { class: "rf-band rf-fot" }, "1"));

  // ------------------------------------------------------------ sida 2
  const katalog = Object.fromEntries([...R.vapen.narstrid, ...R.vapen.projektil, ...R.vapen.kast, ...R.vapen.skoldar].map((v) => [v.namn, v]));
  const vapenFV = Object.fromEntries(synliga.filter(arVapen).map((f) => [f.nyckel.slice("vapen:".length), f]));
  const agda = res.utrustning.saker.filter((x) => katalog[x.namn]).map((x) => x.namn);
  const vapennamn = [...new Set([...Object.keys(vapenFV), ...agda])];
  const vapenrader = vapennamn.map((namn) => {
    const v = katalog[namn] ?? {};
    const f = vapenFV[namn];
    return el("div", { class: "rf-rad" },
      el("span", { class: "rf-cell rf-namn" }, el("span", { class: "rf-bock" }), el("span", { class: "rf-namntext" }, namn), sidhanvisning(sidaFor("vapen:" + namn))),
      el("span", { class: "rf-cell rf-tal" }, f?.fv ?? ""),
      el("span", { class: "rf-cell rf-tal" }, v.skada ?? ""),
      el("span", { class: "rf-cell rf-tal" }, v.bv ?? ""),
      el("span", { class: "rf-cell rf-tal" }, v.langd ?? ""),
      el("span", { class: "rf-cell rf-tal" }, v.rackvidd ?? ""),
      el("span", { class: "rf-cell rf-erf" }, f ? erfFalt(f.nyckel, namn) : null),
      el("span", { class: "rf-cell rf-tal" }, v.vikt ? `${v.vikt.toLocaleString("sv-SE")}` : ""));
  });

  // Rustning per kroppsdel från köpt rustning (s. 91–93); flera lager visas tillsammans med högsta absorberingen
  const rustning = {};
  for (const x of res.utrustning.saker.filter((s) => s.kategori === "Rustning")) {
    const r = R.utrustning.rustningar.find((y) => y.namn === x.namn);
    for (const del of r?.delar ?? []) {
      const d = (rustning[del] ??= { namn: [], abs: 0 });
      d.namn.push(r.namn);
      d.abs = Math.max(d.abs, r.absorbering);
    }
  }
  const kroppsdel = (d) => el("div", { class: `rf-kroppsdel del-${d.id}` },
    el("div", { class: "rf-del-namn" }, d.namn.replace("Höger", "H.").replace("Vänster", "V."), el("span", {}, `(${d.kp})`)),
    rutor(d.kp, "kp"),
    el("div", { class: "rf-del-rad" }, el("span", {}, "Rustning"), el("span", { class: "rf-linje" }, rustning[d.id]?.namn.join(", ") ?? "")),
    el("div", { class: "rf-del-rad" }, el("span", {}, "Abs"), el("span", { class: "rf-linje" }, rustning[d.id]?.abs || "")));
  const delar = Object.fromEntries(h.kroppsdelar.map((d) => [d.id, d]));

  const maxGange = R.utrustning.barformaga.at(-1).gange;
  const pengar = spel.pengar ?? { bors: { gm: "", sm: String(res.utrustning.kvar), km: "" }, bank: { gm: "", sm: "", km: "" }, juveler: "" };
  const pengarFalt = (var_, mynt) => inmatning(pengar[var_][mynt], (v) => {
    spel.pengar ??= structuredClone(pengar);
    spel.pengar[var_][mynt] = v;
  }, { "aria-label": `${mynt} ${var_ === "bors" ? "i börs" : "på bank"}` });

  // Utrustning: köpta saker först, sedan rader spelaren själv skriver i
  const kopta = res.utrustning.saker.map((x) => ({ namn: sakNamn(x), vikt: x.vikt ? x.vikt.toLocaleString("sv-SE") : "", last: true }));
  const egnaPlatser = Math.max(4, RADER.utrustning * 2 - kopta.length);
  const egna = Array.from({ length: Math.max(egnaPlatser, spel.utrustning.length + 1) }, (_, i) => ({ ...(spel.utrustning[i] ?? { namn: "", vikt: "" }), i }));
  const sattEgen = (i, falt_, v) => {
    while (spel.utrustning.length <= i) spel.utrustning.push({ namn: "", vikt: "" });
    spel.utrustning[i][falt_] = v;
    while (spel.utrustning.length && !spel.utrustning.at(-1).namn && !spel.utrustning.at(-1).vikt) spel.utrustning.pop();
  };
  const sakrader = [
    ...kopta.map((x) => el("div", { class: "rf-rad" }, el("span", { class: "rf-cell rf-namn" }, x.namn), el("span", { class: "rf-cell rf-tal" }, x.vikt))),
    ...egna.map((x) => el("div", { class: "rf-rad" },
      el("span", { class: "rf-cell rf-namn" }, inmatning(x.namn, (v) => sattEgen(x.i, "namn", v), { "aria-label": "Utrustning" })),
      el("span", { class: "rf-cell rf-tal" }, inmatning(x.vikt, (v) => sattEgen(x.i, "vikt", v), { "aria-label": "Vikt", inputmode: "decimal" })))),
  ];
  const sakPlatser = Math.max(RADER.utrustning * 2, sakrader.length + (sakrader.length % 2));
  const sakkolumner = [0, 1].map((k) => el("div", { class: "rf-lista rf-sakkolumn" },
    fyll(sakrader.slice(k * sakPlatser / 2, (k + 1) * sakPlatser / 2), sakPlatser / 2, 2)));

  const sida2 = el("section", { class: "rf-sida", "aria-label": "Rollformulär sida 2" },
    el("div", { class: "rf-band" }, "Drakar & Demoner"),
    el("div", { class: "rf-ram" },
      el("div", { class: "rf-kropp2" },
        el("div", { class: "rf-vanster2" },
          el("div", { class: "rf-figur" }, el("span", { class: "rf-nr" }, 22),
            el("div", { class: "rf-delar-v" }, ["huvud", "hoger-arm", "mage", "hoger-ben"].map((id) => kroppsdel(delar[id]))),
            el("div", { class: "rf-gubbe", html: GUBBE }),
            el("div", { class: "rf-delar-h" }, ["brostkorg", "vanster-arm", "vanster-ben"].map((id) => kroppsdel(delar[id])))),
          el("div", { class: "rf-strid" },
            el("div", { class: "rf-strid-v" },
              el("div", { class: "rf-strid-rad" }, el("span", { class: "rf-bar" }, "Skadebonus"), el("span", { class: "rf-ruta-stor" }, h.skadebonus, el("span", { class: "rf-nr" }, 19))),
              el("div", { class: "rf-strid-rad rf-strid-etiketter" }, el("span"), el("span", {}, "Normal"), el("span", {}, "Maximal")),
              el("div", { class: "rf-strid-rad" }, el("span", { class: "rf-bar" }, "Bärförmåga"), el("span", { class: "rf-ruta-stor" }, `${res.utrustning.barformaga} kg`), el("span", { class: "rf-ruta-stor" }, `${res.utrustning.barformaga * maxGange} kg`)),
              el("div", { class: "rf-strid-rad" }, el("span", { class: "rf-bar" }, "Förflyttning"), el("span", { class: "rf-ruta-stor" }, h.forflyttning, el("span", { class: "rf-nr" }, 20)), el("span", { class: "rf-ruta-stor" }))),
            el("div", { class: "rf-strid-h" },
              el("div", { class: "rf-poang" }, el("span", { class: "rf-bar" }, "Tot. KP"), el("span", { class: "rf-ruta-stor" }, h.totalKP, el("span", { class: "rf-nr" }, 13)), rutor(h.totalKP, "tio")),
              el("div", { class: "rf-poang" }, el("span", { class: "rf-bar" }, "PSY"), el("span", { class: "rf-ruta-stor" }, g.PSY, el("span", { class: "rf-nr" }, 12)), rutor(g.PSY, "tio")))),
          lista("rf-vapen", rubrik("Vapen/sköld", ["FV", "Skada", "BV", "Längd", "Räckv", "Erf", "Vikt"]), vapenrader, Math.max(RADER.vapen, vapenrader.length), 8)),
        el("div", { class: "rf-hoger2" },
          lista("rf-besvarjelser", rubrik("Besvärjelser", ["erf", "FV"]), res.besvarjelser.map((b) => el("div", { class: "rf-rad" },
            el("span", { class: "rf-cell rf-namn" }, el("span", { class: "rf-bock" }), el("span", { class: "rf-namntext" }, b.namn), el("small", {}, `SV ${b.sv}`),
              sidhanvisning(R.besvarjelser.lista.find((x) => x.id === b.id)?.sida)),
            el("span", { class: "rf-cell rf-erf" }, erfFalt(b.nyckel, b.namn)),
            el("span", { class: "rf-cell rf-tal" }, b.fv))), Math.max(RADER.besvarjelser, res.besvarjelser.length)),
          el("div", { class: "rf-lista rf-pengar" }, rubrik("Pengar", ["gm", "sm", "km"], 21),
            ["bors", "bank"].map((var_) => el("div", { class: "rf-rad" }, el("span", { class: "rf-cell rf-namn" }, var_ === "bors" ? "i börs" : "på bank"),
              ["gm", "sm", "km"].map((m) => el("span", { class: "rf-cell rf-tal" }, pengarFalt(var_, m))))),
            el("div", { class: "rf-rad rf-juveler" }, el("span", { class: "rf-cell rf-namn" }, "Juveler",
              inmatning(pengar.juveler, (v) => { spel.pengar ??= structuredClone(pengar); spel.pengar.juveler = v; }, { "aria-label": "Juveler" })))))),
      el("div", { class: "rf-utrustning" }, rubrik("Utrustning", ["Vikt", "", "Vikt"]), el("div", { class: "rf-sakkolumner" }, sakkolumner))),
    el("div", { class: "rf-band rf-fot" }, "2"));

  // ------------------------------------------------------------ sida 3: hela texterna och det som inte fick plats
  const stilar = res.fardigheter.filter((f) => f.tekniker?.length);
  const textblock = (titel, ...innehall) => el("div", { class: "rf-block" }, rubrik(titel), el("div", { class: "rf-blocktext" }, innehall));
  const sida3 = el("section", { class: "rf-sida rf-sida3", "aria-label": "Rollformulär sida 3" },
    el("div", { class: "rf-band" }, "Drakar & Demoner"),
    el("div", { class: "rf-ram" },
      textblock("Förmågor",
        res.ras?.formagor?.length ? el("p", {}, el("strong", {}, `${res.ras.namn}: `), res.ras.formagor.join(". "), ".") : null,
        res.sarskildFormaga ? el("p", {}, el("strong", {}, `${res.sarskildFormaga.namn}: `), res.sarskildFormaga.effekt) : null,
        el("p", {}, el("strong", {}, `Yrkesförmåga (${res.yrke.namn.toLowerCase()}): `), res.yrke.yrkesformaga),
        stilar.map((f) => el("p", {}, el("strong", {}, `${f.namn}, tekniker: `), f.tekniker.join(", ")))),
      overflode.length ? el("div", { class: "rf-lista rf-overflode" }, rubrik("Fler färdigheter", ["Typ", "erf", "FV"]), overflode.map((f) => el("div", { class: "rf-rad" },
        el("span", { class: "rf-cell rf-namn" }, el("span", { class: "rf-bock" }), el("span", { class: "rf-namntext" }, f.namn), f.kategoriB ? el("small", {}, bNiva(f.fv)) : null, sidhanvisning(sidaFor(f.nyckel))),
        el("span", { class: "rf-cell" }, arSprak(f) ? "Språk" : STATUSNAMN[f.status]),
        el("span", { class: "rf-cell rf-erf" + (f.kategoriB ? " b" : "") }, arSprak(f) ? null : erfFalt(f.nyckel, f.namn)),
        el("span", { class: "rf-cell rf-tal" }, f.fv)))) : null,
      textblock("Utseende och bakgrund", [h.langd, h.vikt].some(Boolean) ? el("p", {}, el("strong", {}, "Längd och vikt: "), [h.langd, h.vikt].filter(Boolean).join(", ")) : null,
        el("textarea", { class: "rf-in rf-textyta", rows: 6, "aria-label": "Utseende och bakgrund",
        onchange: (e) => { rp.anteckningar = e.target.value; andrat(); } }, rp.anteckningar)),
      el("div", { class: "rf-block rf-anteckningar" }, rubrik("Anteckningar"), el("textarea", { class: "rf-in rf-textyta linjerad", "aria-label": "Anteckningar",
        onchange: (e) => { spel.anteckningar = e.target.value; andrat(); } }, spel.anteckningar)),
      el("p", { class: "rf-forklaring" }, "Bockrutan framför en färdighet bockas vid första lyckade slaget efter minst sex timmars sömn (två för alver). ",
        "Varje bock ger 1 streck i erf, ett perfekt slag 1T4. Gråa erf-rutor är kategori B, som bara kan höjas genom träning. ",
        "EP blir FV först efter en vila på minst sju dagar (s. 74).")),
    el("div", { class: "rf-band rf-fot" }, "3"));

  return [sida1, sida2, sida3, ...(medRegler ? [regelsida(4)] : [])];

  // ------------------------------------------------------------ sida 4 och framåt: färdigheterna i korthet (valfri)
  // Alla färdigheter i spelet, med rollpersonens yrkesfärdigheter först. delaRegelsidor fördelar dem på sidor.
  function regelsida(nr) {
    const egna = {};
    for (const f of res.fardigheter) (egna[idFor(f)] ??= []).push(f);
    const statusFor = (x) => {
      const mina = egna[x.id] ?? [];
      if (mina.some((f) => f.status === "yrke")) return "yrke";
      if (mina.length) return mina[0].status;
      if (res.ras?.primara?.includes(x.id)) return "primar";
      if (res.ras?.sekundara?.includes(x.id)) return "sekundar";
      return x.typ === "primar" ? "primar" : "sekundar";
    };
    const typnamn = { primar: "Primär", sekundar: "Sekundär", magiskola: "Magiskola", sprak: "Språk" };
    const post = (x) => {
      const mina = egna[x.id] ?? [];
      return el("div", { class: "rf-regel" },
        el("p", { class: "rf-regel-namn" }, el("strong", {}, x.namn),
          el("span", {}, [x.grundegenskap === "varierar" ? "grundegenskap varierar" : x.grundegenskap, typnamn[x.typ], x.kategoriB ? "kategori B" : null, `s. ${x.sida}`].filter(Boolean).join(" · "))),
        el("p", {}, x.beskrivning),
        mina.length ? el("p", { class: "rf-regel-egen" }, "Rollpersonen: ", mina.map((f) => `${f.namn} FV ${f.kategoriB ? `${f.fv} (${bNiva(f.fv)})` : f.fv}`).join(", ")) : null);
    };
    const grupper = [
      [`Yrkesfärdigheter (${res.yrke.namn.toLowerCase()})`, "yrke"],
      ["Primära färdigheter", "primar"],
      ["Sekundära färdigheter", "sekundar"],
    ];
    const lista = [...R.fardigheter.lista].sort((a, b) => a.namn.localeCompare(b.namn, "sv"));
    const poster = grupper.flatMap(([titel, st]) => {
      const valda = lista.filter((x) => statusFor(x) === st);
      return valda.length ? [el("h3", { class: "rf-regel-rubrik" }, titel), ...valda.map(post)] : [];
    });
    const sida = tomRegelsida(el, nr);
    sida.querySelector(".rf-regelkolumn").append(...poster);
    return sida;
  }
}

function tomRegelsida(el, nr) {
  return el("section", { class: "rf-sida rf-regelsida", "aria-label": `Färdigheterna i korthet, sida ${nr}` },
    el("div", { class: "rf-band" }, "Drakar & Demoner"),
    el("div", { class: "rf-ram" },
      el("div", { class: "rf-rubrik" }, el("span", { class: "rf-rubrik-titel" }, "Färdigheterna i korthet"), el("span", { class: "rf-rubrik-kol bred" }, "Egna sammanfattningar, se boken för hela reglerna")),
      el("div", { class: "rf-regelkolumner" }, el("div", { class: "rf-regelkolumn" }), el("div", { class: "rf-regelkolumn" }))),
    el("div", { class: "rf-band rf-fot" }, String(nr)));
}

// Fördelar färdigheterna på regelsidorna efter hur mycket som får plats. Körs när sidorna finns
// i dokumentet, eftersom texternas höjd beror på typsnitten.
export function delaRegelsidor(rot, el) {
  const forsta = rot.querySelector(".rf-regelsida");
  if (!forsta) return;
  const poster = [...rot.querySelectorAll(".rf-regelsida .rf-regelkolumn > *")];
  rot.querySelectorAll(".rf-regelsida").forEach((s, i) => { if (i > 0) s.remove(); });
  forsta.querySelectorAll(".rf-regelkolumn").forEach((k) => k.replaceChildren());
  let sida = forsta;
  let nr = Number(forsta.querySelector(".rf-fot").textContent);
  let kolumner = [...sida.querySelectorAll(".rf-regelkolumn")];
  let k = 0;
  for (const post of poster) {
    kolumner[k].append(post);
    if (kolumner[k].scrollHeight <= kolumner[k].clientHeight + 1 || kolumner[k].children.length === 1) continue;
    post.remove();
    k += 1;
    if (k === kolumner.length) {
      nr += 1;
      const ny = tomRegelsida(el, nr);
      sida.after(ny);
      sida = ny;
      kolumner = [...sida.querySelectorAll(".rf-regelkolumn")];
      k = 0;
    }
    // En rubrik ska inte bli ensam längst ned i en kolumn
    const forra = k === 0 ? sida.previousElementSibling?.querySelectorAll(".rf-regelkolumn")[1] : kolumner[k - 1];
    if (forra?.lastElementChild?.matches(".rf-regel-rubrik")) kolumner[k].append(forra.lastElementChild);
    kolumner[k].append(post);
  }
}

// Gubben på sida 2, ritad i bokens stil: en stående figur i kontur.
const GUBBE = `<svg viewBox="0 0 100 260" aria-hidden="true" focusable="false"><path d="M50 6c-9 0-14 7-14 16 0 7 3 13 7 16v6c-9 2-19 4-24 9-5 6-7 22-9 36-2 13-4 26-2 34 1 4 6 5 8 1 2-6 3-20 6-32l4-17c1 14 0 30-1 42-2 18-6 40-6 60 0 17 1 34 3 46 1 5 9 5 11 1l3-18c1-14 2-36 6-56 2-10 4-14 8-14s6 4 8 14c4 20 5 42 6 56l3 18c2 4 10 4 11-1 2-12 3-29 3-46 0-20-4-42-6-60-1-12-2-28-1-42l4 17c3 12 4 26 6 32 2 4 7 3 8-1 2-8 0-21-2-34-2-14-4-30-9-36-5-5-15-7-24-9v-6c4-3 7-9 7-16 0-9-5-16-14-16z"/></svg>`;
