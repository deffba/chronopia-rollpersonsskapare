// Rollformuläret i bokens layout (s. 11–12), för utskrift och för att fylla i under spel.
// Värden som reglerna räknar fram (grundegenskaper, FV, KP) visas som text och ändras i stegen.
// Det spelaren skriver under spel (erf, hjältepoäng, pengar, egen utrustning) sparas i rp.spel.
import { GRUNDEGENSKAPER, egenskapsvarde, slaUpp, fardighetAv, yrkesformagaText, bNivaText, vapengrupp } from "./regelmotor.js";
import { wretlerSkuld } from "./wretler.js";

// Rader per lista. Får inte allt plats fortsätter listan på sida 3.
// Besvärjelserna står alltid på en egen sida (sida 3), i två kolumner med minst besvarjelser rader vardera.
const RADER = { formagor: 6, primar: 25, yrke: 12, sprak: 11, sekundar: 33, vapen: 6, besvarjelser: 20, utrustning: 8 };
const NAMN = { STY: "Styrka", FYS: "Fysik", SMI: "Smidighet", INT: "Intelligens", PSY: "Psyke", KAR: "Karisma", STO: "Storlek" };
const STATUSNAMN = { primar: "Primär", yrke: "Yrke", sekundar: "Sekundär" };

export function rollformularSidor({ R, rp, res: raknat, el, sakNamn, andrat, medRegler = false, tom = false, utrustningsrader = RADER.utrustning, formagorader = RADER.formagor }) {
  // Ett tomt formulär (tom: true) har samma layout men inga värden; rutorna för KP och PSY ritas i ett fast antal
  const res = tom ? tomtResultat(raknat) : raknat;
  const antalRutor = (n, tomt) => (tom ? tomt : n);
  const spel = rp.spel;
  const hpStart = tom ? 0 : raknat.hjaltepoang?.kvar ?? 0;
  const g = res.grundegenskaper;
  const h = res.harledda;

  // ------------------------------------------------------------ byggstenar
  const text = (t) => el("span", { class: "rf-varde" }, t ?? "");
  const inmatning = (varde, satt, attr = {}) => el("input", {
    type: "text", class: "rf-in", value: varde ?? "", autocomplete: "off", ...attr,
    onchange: (e) => { satt(e.target.value.trim()); andrat(); },
  });
  // I ett tomt formulär blir varje ruta ett ifyllbart fält (också i PDF:en), annars visas värdet
  const ifyll = (innehall, etikett) => (tom ? inmatning("", () => {}, { "aria-label": etikett }) : innehall);
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
  const tak = (f) => (f.status === "sekundar" ? `max ${egenskapsvarde(g, f.grundegenskap) ?? "–"}` : null);
  const fardighetsrad = (f) => el("div", { class: "rf-rad" + (f.kategoriB ? " kat-b" : "") },
    el("span", { class: "rf-cell rf-namn" }, el("span", { class: "rf-bock", title: "Bocka vid första lyckade slaget efter sömn (s. 74)" }),
      el("span", { class: "rf-namntext" }, f.status === "primar" && f.grundegenskap ? `${f.namn} (${f.grundegenskap})` : f.namn),
      f.kategoriB ? el("small", {}, bNivaText(R, f.fv, f.bNivaLagre)) : null,
      tak(f) ? el("small", {}, tak(f)) : null,
      f.sinne ? el("small", { title: "Syn och hörsel (Vapen & rustningar s. 3)" }, `${f.sinne > 0 ? "+" : "−"}${Math.abs(f.sinne)} sinne`) : null,
      sidhanvisning(sidaFor(f.nyckel))),
    el("span", { class: "rf-cell rf-erf" + (f.kategoriB ? " b" : "") }, erfFalt(f.nyckel, f.namn)),
    el("span", { class: "rf-cell rf-tal" }, f.fv));
  // Tomma rader för det som lärs under spel; bockrutan bara där färdigheter kan få EP
  // I ett tomt formulär går varje ruta att fylla i
  const tomRad = (celler, bock, etikett = "Rad") => el("div", { class: "rf-rad tom" }, Array.from({ length: celler }, (_, i) =>
    el("span", { class: "rf-cell" + (i === 0 ? " rf-namn" : tom ? " rf-tal" : "") }, i === 0 && bock ? el("span", { class: "rf-bock" }) : null,
      tom ? inmatning("", () => {}, { "aria-label": i === 0 ? etikett : `${etikett} kolumn ${i + 1}` }) : null)));
  const fyll = (rader, antal, celler, bock = false, etikett) => [...rader.slice(0, antal), ...Array.from({ length: Math.max(0, antal - rader.length) }, () => tomRad(celler, bock, etikett))];
  const lista = (klass, rubrikEl, rader, antal, celler = 3, bock = true) => el("div", { class: `rf-lista ${klass}` }, rubrikEl,
    fyll(rader, antal, celler, bock, rubrikEl.querySelector(".rf-rubrik-titel")?.textContent));

  // ------------------------------------------------------------ indelning
  const idFor = (f) => fardighetAv(R, f.nyckel)?.id;
  // Alla färdigheter rollpersonen har, även de med FV 0 (t.ex. en nyss vald sekundär färdighet)
  const synliga = res.fardigheter;
  const arVapen = (f) => idFor(f) === "vapen";
  const arSprak = (f) => ["tala", "lasa-skriva"].includes(idFor(f));
  // Vapenfärdigheterna står bland de andra färdigheterna, under den status de har för rollpersonen.
  // Vapen/sköld på sida 2 visar bara vapnen rollpersonen äger, med FV från färdigheterna.
  const grupp = (status) => synliga.filter((f) => f.status === status && !arSprak(f));
  const listor = { primar: grupp("primar"), yrke: grupp("yrke"), sekundar: grupp("sekundar") };
  const sprak = synliga.filter(arSprak);
  const overflode = [
    ...Object.entries(listor).flatMap(([k, l]) => l.slice(RADER[k])),
    ...sprak.slice(RADER.sprak),
  ];

  // Särskilda förmågor med en kort förklaring: rasens, den slagna, yrkesförmågan och stridskonstens tekniker
  const formagor = [
    ...(res.ras?.formagor ?? []).map((t) => ({ namn: t, text: `Rasförmåga (${res.ras.namn.toLowerCase()})` })),
    ...[...(res.sarskildaFormagorna ?? [res.sarskildFormaga]), ...(res.extraFormagor ?? [])].filter(Boolean).map((f) => ({ namn: f.namn, text: f.effekt })),
    // Dvärgar i Chronopia: klanförmågan (s. 18–26) och levande tatueringar (s. 27–28)
    res.klan?.formaga ? { namn: `${res.klan.formaga.namn} (klan ${res.klan.klan.namn})`, text: res.klan.formaga.effekt } : null,
    ...(res.tatueringar?.lista ?? []).map((t) => ({ namn: `Tatuering: ${t.namn}`, text: `${t.effekt} Kostnad ${t.kostnad}, ${t.antal} (${t.fran}).` })),
    rp.yrke ? { namn: `Yrkesförmåga (${res.yrke.namn.toLowerCase()})`, text: yrkesformagaText(res.yrke, rp) } : null,
    ...(res.sinnen?.sinnen ?? []).filter((x) => x.niva).map((x) => ({ namn: `${x.namn}: ${x.niva.toLowerCase()}`, text: `${x.mod > 0 ? "+" : x.mod < 0 ? "−" : "±"}${Math.abs(x.mod)} på ${x.text}` })),
    ...res.fardigheter.filter((f) => f.tekniker?.length).map((f) => ({ namn: f.namn, text: `Tekniker: ${f.tekniker.join(", ")}` })),
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
          falt("Ras", 4, ifyll(text(rp.ras ? res.ras.namn + (res.klan?.klan ? ` (${res.klan.klan.namn})` : "") : ""), "Ras"), "s2"),
          falt("Kön", 6, ifyll(text(rp.kon), "Kön"), "s2"),
          falt("Socialt stånd", 8, ifyll(text(res.slag.socialtStand), "Socialt stånd"), "s2"),
          falt("Yrke", 5, ifyll(text(rp.yrke ? res.yrke.namn : ""), "Yrke"), "s2"),
          falt("Svärdshand", 7, ifyll(text(res.slag.svardshand), "Svärdshand"), "s2"),
          falt("Ålder", 9, ifyll(text(rp.alder == null ? "" : `${rp.alder} år`), "Ålder"), "s2"))),
      el("div", { class: "rf-kropp1" },
        el("div", { class: "rf-vanster" },
          el("div", { class: "rf-lista rf-egenskaper" }, rubrik("Grundegenskap", ["Värde"]),
            [...GRUNDEGENSKAPER, "STO"].map((k, i) => el("div", { class: "rf-rad" },
              el("span", { class: "rf-cell rf-namn" }, `${NAMN[k]} (${k})`, i === 0 ? el("span", { class: "rf-nr" }, 11) : null),
              el("span", { class: "rf-cell rf-tal stor" }, ifyll(g[k], NAMN[k]))))),
          lista("rf-fardigheter", rubrik("Primära färdigheter", ["erf", "FV"], 15), listor.primar.map(fardighetsrad), RADER.primar)),
        el("div", { class: "rf-hoger" },
          el("div", { class: "rf-hoger-kolumner" },
            el("div", { class: "rf-mitt" },
              el("div", { class: "rf-lista rf-formagor" }, rubrik("Särskilda förmågor", [], 14),
                fyll(formagor.slice(0, formagorader).map((f) => el("div", { class: "rf-rad" }, el("span", { class: "rf-cell rf-namn rf-formaga", title: f.text },
                  el("strong", {}, f.namn), el("span", {}, f.text)))), RADER.formagor, 1, false, "Särskild förmåga")),
              el("div", { class: "rf-hjaltepoang" }, el("span", {}, "Hjältepoäng"),
                // Hjältepoäng som blev över vid skapandet (RB-003) räknas in; spel.hjaltepoang är det som har ändrats sedan
                inmatning((spel.hjaltepoang ?? 0) + hpStart || "", (v) => { spel.hjaltepoang = Math.max(0, heltal(v) ?? 0) - hpStart; }, { inputmode: "numeric", "aria-label": "Hjältepoäng" })),
              lista("rf-fardigheter", rubrik("Yrkesfärdigheter", ["erf", "FV"], 16), listor.yrke.map(fardighetsrad), RADER.yrke),
              lista("rf-sprak", rubrik("Språk (INT)", ["FV", "B-FV"], 17), sprak.slice(0, RADER.sprak).map((f) => el("div", { class: "rf-rad" },
                el("span", { class: "rf-cell rf-namn" }, el("span", { class: "rf-namntext" }, f.namn), sidhanvisning(sidaFor(f.nyckel))),
                el("span", { class: "rf-cell rf-tal" }, f.fv), el("span", { class: "rf-cell rf-tal" }, bNiva(f.fv)))), RADER.sprak, 3, false)),
            lista("rf-fardigheter rf-sek", rubrik("Sek. färdigheter", ["erf", "FV"], 18), listor.sekundar.map(fardighetsrad), RADER.sekundar))))),
    sidfot(el, 1));

  // ------------------------------------------------------------ sida 2
  // Vapen/sköld: bara vapen och sköldar som rollpersonen äger (köpta, från yrket eller startpaketet).
  // FV kommer från vapenfärdigheten för vapnet; ett vapen av mästarkvalitet använder sitt vanliga vapens
  // färdighet. Utan egen färdighet ger en färdighet i samma vapengrupp halva FV (s. 71–72). Annars är FV tomt.
  const katalog = Object.fromEntries([...R.vapen.narstrid, ...R.vapen.projektil, ...R.vapen.kast, ...R.vapen.skoldar].map((v) => [v.namn, v]));
  const vapenFV = Object.fromEntries(synliga.filter(arVapen).map((f) => [f.nyckel.slice("vapen:".length), f]));
  const agda = [...new Set(res.utrustning.saker.filter((x) => katalog[x.namn]).map((x) => x.namn))];
  const fvForVapen = (namn) => {
    const v = katalog[namn];
    const egen = vapenFV[namn] ?? vapenFV[v.somVapen];
    if (egen) return { fv: egen.fv };
    const grupp = vapengrupp(R, v.somVapen ?? namn, g.STY);
    const basta = Math.max(0, ...Object.entries(vapenFV).filter(([n]) => vapengrupp(R, n, g.STY) === grupp).map(([, f]) => f.fv));
    const gruppnamn = R.vapen.grupper.find((x) => x.id === grupp)?.namn ?? grupp;
    return basta ? { fv: Math.floor(basta / 2), not: `halva FV, ${gruppnamn.toLowerCase()}` } : { fv: "" };
  };
  const vapenrader = agda.map((namn) => {
    const v = katalog[namn];
    const { fv, not } = fvForVapen(namn);
    return el("div", { class: "rf-rad" },
      el("span", { class: "rf-cell rf-namn" }, el("span", { class: "rf-namntext" }, namn),
        not ? el("small", { title: "Ingen egen vapenfärdighet: halva FV i en annan färdighet i samma vapengrupp (s. 71)" }, not) : null),
      el("span", { class: "rf-cell rf-tal" }, fv),
      el("span", { class: "rf-cell rf-tal" }, v.skada ?? ""),
      el("span", { class: "rf-cell rf-tal" }, v.bv ?? ""),
      el("span", { class: "rf-cell rf-tal" }, v.langd ?? ""),
      el("span", { class: "rf-cell rf-tal" }, v.rackvidd ?? ""),
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
    el("div", { class: "rf-del-namn" }, d.namn.replace("Höger", "H.").replace("Vänster", "V."), tom ? el("span", { class: "rf-del-kp" }, "(", inmatning("", () => {}, { "aria-label": `KP ${d.namn}` }), ")") : el("span", {}, `(${d.kp})`)),
    rutor(antalRutor(d.kp, 8), "kp"),
    el("div", { class: "rf-del-rad" }, el("span", {}, "Rustning"), el("span", { class: "rf-linje" }, ifyll(rustning[d.id]?.namn.join(", ") ?? "", `Rustning ${d.namn}`))),
    el("div", { class: "rf-del-rad" }, el("span", {}, "Abs"), el("span", { class: "rf-linje" }, ifyll(rustning[d.id]?.abs || "", `Abs ${d.namn}`))));
  const delar = Object.fromEntries(h.kroppsdelar.map((d) => [d.id, d]));

  const maxGange = R.utrustning.barformaga.at(-1).gange;
  const pengar = spel.pengar ?? { bors: { gm: "", sm: String(res.utrustning.kvar), km: "" }, bank: { gm: "", sm: "", km: "" }, juveler: "" };
  const pengarFalt = (var_, mynt) => inmatning(pengar[var_][mynt], (v) => {
    spel.pengar ??= structuredClone(pengar);
    spel.pengar[var_][mynt] = v;
  }, { "aria-label": `${mynt} ${var_ === "bors" ? "i börs" : "på bank"}` });

  // Utrustning: köpta saker först, sedan rader spelaren själv skriver i
  const kopta = [...(tom ? [] : res.startutrustning ?? []).map((t) => ({ namn: t, vikt: "", last: true })),
    ...res.utrustning.saker.map((x) => ({ namn: sakNamn(x), vikt: x.vikt ? x.vikt.toLocaleString("sv-SE") : "", last: true }))];
  const egnaPlatser = Math.max(4, utrustningsrader * 2 - kopta.length);
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
  // Sida 2 har plats för utrustningsrader rader per kolumn; resten fortsätter på sida 3 (Mer utrustning).
  // Tar rutorna ovanför (magi, alver, detaljerad strid) mer plats får sidan färre rader (utrustningsplats).
  const sakPlatser = utrustningsrader * 2;
  const kolumner = (rader, platser) => [0, 1].map((k) => el("div", { class: "rf-lista rf-sakkolumn" },
    fyll(rader.slice(k * platser / 2, (k + 1) * platser / 2), platser / 2, 2)));
  const sakkolumner = kolumner(sakrader.slice(0, sakPlatser), sakPlatser);
  const merSaker = sakrader.slice(sakPlatser);
  const merPlatser = merSaker.length + (merSaker.length % 2);

  // Detaljerad strid (V&R s. 18–19, 26–30, 69; RB-017): en egen ruta på sida 2, bara när regeln är på.
  // Axelskydd står på armarna i kroppsdelarna ovan, så formuläret behöver ingen egen variant.
  const sh = res.stridshandlingar;
  const rvapen = res.utrustning.saker.filter((x) => x.kategori === "Rustningsvapen").map((x) => {
    const v = R.utrustning.varor.find((y) => y.namn === x.namn);
    return `${x.namn.replace(/^Rustningsvapen: /, "")}${x.antal > 1 ? ` ×${x.antal}` : ""} (${[v?.skada, v?.bv ? `BV ${v.bv}` : null].filter(Boolean).join(", ")})`;
  });
  const dsRad = (etikett, varde) => el("div", { class: "rf-rad" }, el("span", { class: "rf-cell rf-namn" }, el("strong", {}, `${etikett}: `), varde));
  const detaljeradStrid = sh ? el("div", { class: "rf-lista rf-detaljerad", id: "rf-detaljerad-strid" }, rubrik("Detaljerad strid"),
    dsRad("Handlingar per SR", tom ? "" : `${sh.antal} (${sh.bas} av SMI${sh.borda ? `, ${sh.borda} av bördan` : ""})`),
    dsRad("+1 handling vardera", sh.extra.join(", ")),
    dsRad("Börda", tom ? "" : sh.borda ? `${sh.borda} handlingar` : "inget avdrag"),
    dsRad("Rustningsvapen", tom ? "" : rvapen.join("; ") || "inga"),
    el("div", { class: "rf-rad rf-detaljerad-not" }, el("span", { class: "rf-cell rf-namn" }, `Träffområden och kritiska träffar: Vapen & rustningar s. ${sh.sida}, 26–30.`))) : null;

  // Magi i Chronopia: familjarer (s. 40–43) och minimagiska besvärjelser (s. 19) i en egen ruta på sida 2,
  // bara när rollpersonen har några
  const fam = res.familjarer?.lista ?? [];
  const mini = res.minimagi?.valda ?? [];
  const famText = (f) => `${f.namn} (${["STO", "STY", "FYS", "SMI", "INT", "PSY", "KP"].map((k) => `${k} ${f[k]}`).join(", ")}${f.gratis ? `; gratis, ${f.kallaGratis}` : ""})`;
  const magiRuta = fam.length || mini.length ? el("div", { class: "rf-lista rf-detaljerad", id: "rf-magi" }, rubrik("Familjarer och minimagi"),
    fam.length ? dsRad(fam.length > 1 ? "Familjarer" : "Familjar", fam.map(famText).join("; ")) : null,
    mini.length ? dsRad(`Minimagi (FV ${res.minimagi.fv})`, mini.map((m) => m.namn).join(", ")) : null,
    el("div", { class: "rf-rad rf-detaljerad-not" }, el("span", { class: "rf-cell rf-namn" }, "Familjarerna: Magi i Chronopia s. 40–43. Minimagi: s. 19–20."))) : null;

  // Alver i Chronopia: masker (s. 41–42), dockor (s. 25–27), bestar (s. 37–38), drakalvens defekter (s. 33)
  // och pierrotens täckyrke (s. 44) i en egen ruta på sida 2, bara när rollpersonen har något av dem
  const alv = [
    ...(res.masker?.lista ?? []).map((m) => ["Mask", `${m.egenskaper.map((e) => e.namn).join(" + ")} (${m.bp} BP)`]),
    ...(res.dockor?.lista ?? []).map((d) => ["Docka", `${d.namn}, livsgnista ${d.gnista}${d.fardigheter ? ` (${d.fardigheter})` : ""}`]),
    ...(res.bestar ?? []).map((b) => ["Best", `${b.namn} (STO ${b.STO}, STY ${b.STY}, FYS ${b.FYS}, SMI ${b.SMI}, INT ${b.INT}, PSY ${b.PSY}, KP ${b.KP}, SB ${b.SB}; ${b.fardigheter})`]),
    ...(res.defekter ?? []).map((d) => ["Defekt", `${d.namn}: ${d.effekt}`]),
    res.tackyrke?.yrke ? ["Täckyrke", `${res.tackyrke.yrke.namn} (${res.tackyrke.fardigheter.map((k) => res.fardigheter.find((f) => f.nyckel === k)?.namn ?? k).join(", ")})`] : null,
  ].filter(Boolean);
  const alvRuta = alv.length ? el("div", { class: "rf-lista rf-detaljerad", id: "rf-alver" }, rubrik("Alver i Chronopia"),
    alv.map(([etikett, varde]) => dsRad(etikett, varde))) : null;

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
              el("div", { class: "rf-strid-rad" }, el("span", { class: "rf-bar" }, "Skadebonus"), el("span", { class: "rf-ruta-stor" }, ifyll(h.skadebonus, "Skadebonus"), el("span", { class: "rf-nr" }, 19))),
              el("div", { class: "rf-strid-rad rf-strid-etiketter" }, el("span"), el("span", {}, "Normal"), el("span", {}, "Maximal")),
              el("div", { class: "rf-strid-rad" }, el("span", { class: "rf-bar" }, "Bärförmåga"), el("span", { class: "rf-ruta-stor" }, ifyll(`${res.utrustning.barformaga} kg`, "Bärförmåga normal")), el("span", { class: "rf-ruta-stor" }, ifyll(`${res.utrustning.barformaga * maxGange} kg`, "Bärförmåga maximal"))),
              el("div", { class: "rf-strid-rad" }, el("span", { class: "rf-bar" }, "Förflyttning"), el("span", { class: "rf-ruta-stor" }, ifyll(h.forflyttning, "Förflyttning"), el("span", { class: "rf-nr" }, 20)), el("span", { class: "rf-ruta-stor" }))),
            el("div", { class: "rf-strid-h" },
              el("div", { class: "rf-poang" }, el("span", { class: "rf-bar" }, "Tot. KP"), el("span", { class: "rf-ruta-stor" }, ifyll(h.totalKP, "Tot KP"), el("span", { class: "rf-nr" }, 13)), rutor(antalRutor(h.totalKP, 20), "tio")),
              el("div", { class: "rf-poang" }, el("span", { class: "rf-bar" }, "PSY"), el("span", { class: "rf-ruta-stor" }, ifyll(g.PSY, "PSY"), el("span", { class: "rf-nr" }, 12)), rutor(antalRutor(g.PSY, 20), "tio")))),
          lista("rf-vapen", rubrik("Vapen/sköld", ["FV", "Skada", "BV", "Längd", "Räckv", "Vikt"]), vapenrader, Math.max(RADER.vapen, vapenrader.length), 7, false)),
        el("div", { class: "rf-hoger2" },
          // Utseende och bakgrund står överst; besvärjelserna har en egen sida (sida 3)
          el("div", { class: "rf-block rf-utseende" }, rubrik("Utseende och bakgrund"),
            [h.langd, h.vikt].some(Boolean) ? el("p", { class: "rf-utseende-matt" }, [h.langd, h.vikt].filter(Boolean).join(", ")) : null,
            el("textarea", { class: "rf-in rf-textyta linjerad", "aria-label": "Utseende och bakgrund",
              onchange: (e) => { rp.anteckningar = e.target.value; andrat(); } }, rp.anteckningar)),
          el("div", { class: "rf-lista rf-pengar" }, rubrik("Pengar", ["gm", "sm", "km"], 21),
            ["bors", "bank"].map((var_) => el("div", { class: "rf-rad" }, el("span", { class: "rf-cell rf-namn" }, var_ === "bors" ? "i börs" : "på bank"),
              ["gm", "sm", "km"].map((m) => el("span", { class: "rf-cell rf-tal" }, pengarFalt(var_, m))))),
            el("div", { class: "rf-rad rf-juveler" }, el("span", { class: "rf-cell rf-namn" }, "Juveler",
              inmatning(pengar.juveler, (v) => { spel.pengar ??= structuredClone(pengar); spel.pengar.juveler = v; }, { "aria-label": "Juveler" }))),
            !tom && wretlerSkuld(rp) ? el("div", { class: "rf-rad rf-juveler rf-skuld" }, el("span", { class: "rf-cell rf-namn" }, wretlerSkuld(rp))) : null),
          detaljeradStrid,
          magiRuta,
          alvRuta)),
      el("div", { class: "rf-utrustning" }, rubrik("Utrustning", ["Vikt", "", "Vikt"]), el("div", { class: "rf-sakkolumner" }, sakkolumner))),
    sidfot(el, 2));

  // ------------------------------------------------------------ sida 3: besvärjelserna och det som inte fick plats
  // Besvärjelserna får en egen sida när rollpersonen har några. Det tomma formuläret har sidan med tomma rader.
  const besvarjelsesrad = (b) => el("div", { class: "rf-rad" },
    el("span", { class: "rf-cell rf-namn" }, el("span", { class: "rf-bock" }), el("span", { class: "rf-namntext" }, b.namn), el("small", {}, `SV ${b.sv}`),
      sidhanvisning(R.besvarjelser.lista.find((x) => x.id === b.id)?.sida)),
    el("span", { class: "rf-cell rf-erf" }, erfFalt(b.nyckel, b.namn)),
    el("span", { class: "rf-cell rf-tal" }, b.fv));
  const besvarjelser = res.besvarjelser.map(besvarjelsesrad);
  const besvPerKolumn = Math.max(RADER.besvarjelser, Math.ceil(besvarjelser.length / 2));
  const besvarjelseRuta = besvarjelser.length || tom ? el("div", { class: "rf-besvarjelser", id: "rf-besvarjelser" },
    [0, 1].map((k) => lista("rf-besvarjelsekolumn", rubrik("Besvärjelser", ["erf", "FV"]),
      besvarjelser.slice(k * besvPerKolumn, (k + 1) * besvPerKolumn), besvPerKolumn))) : null;
  const flerFormagor = formagor.slice(formagorader);
  const sida3 = besvarjelseRuta || overflode.length || flerFormagor.length || merSaker.length ? el("section", { class: "rf-sida rf-sida3", "aria-label": "Rollformulär sida 3" },
    el("div", { class: "rf-band" }, "Drakar & Demoner"),
    el("div", { class: "rf-ram" },
      besvarjelseRuta,
      flerFormagor.length ? el("div", { class: "rf-lista rf-formagor" }, rubrik("Fler särskilda förmågor"), flerFormagor.map((f) => el("div", { class: "rf-rad" },
        el("span", { class: "rf-cell rf-namn rf-formaga" }, el("strong", {}, f.namn), el("span", {}, f.text))))) : null,
      overflode.length ? el("div", { class: "rf-lista rf-overflode" }, rubrik("Fler färdigheter", ["Typ", "erf", "FV"]), overflode.map((f) => el("div", { class: "rf-rad" },
        el("span", { class: "rf-cell rf-namn" }, el("span", { class: "rf-bock" }), el("span", { class: "rf-namntext" }, f.namn), f.kategoriB ? el("small", {}, bNivaText(R, f.fv, f.bNivaLagre)) : null, sidhanvisning(sidaFor(f.nyckel))),
        el("span", { class: "rf-cell" }, arSprak(f) ? "Språk" : STATUSNAMN[f.status]),
        el("span", { class: "rf-cell rf-erf" + (f.kategoriB ? " b" : "") }, arSprak(f) ? null : erfFalt(f.nyckel, f.namn)),
        el("span", { class: "rf-cell rf-tal" }, f.fv)))) : null,
      merSaker.length ? el("div", { class: "rf-utrustning rf-mer-utrustning" }, rubrik("Mer utrustning", ["Vikt", "", "Vikt"]),
        el("div", { class: "rf-sakkolumner" }, kolumner(merSaker, merPlatser))) : null),
    sidfot(el, 3)) : null;
  const sidor = [sida1, sida2, sida3].filter(Boolean);

  return [...sidor, ...(medRegler ? [regelsida(sidor.length + 1)] : [])];

  // ------------------------------------------------------------ sida 4 och framåt: färdigheterna i korthet (valfri)
  // Rollpersonens färdigheter, yrkesfärdigheterna först. delaRegelsidor fördelar dem på sidor.
  function regelsida(nr) {
    const egna = {};
    for (const f of res.fardigheter) (egna[idFor(f)] ??= []).push(f);
    const statusFor = (x) => {
      const mina = egna[x.id] ?? [];
      if (mina.some((f) => f.status === "yrke")) return "yrke";
      return mina[0]?.status;
    };
    const typnamn = { primar: "Primär", sekundar: "Sekundär", magiskola: "Magiskola", sprak: "Språk" };
    const post = (x) => {
      const mina = egna[x.id] ?? [];
      return el("div", { class: "rf-regel" },
        el("p", { class: "rf-regel-namn" }, el("strong", {}, x.namn),
          el("span", {}, [x.grundegenskap === "varierar" ? "grundegenskap varierar" : x.grundegenskap, typnamn[x.typ], x.kategoriB ? "kategori B" : null, `s. ${x.sida}`].filter(Boolean).join(" · "))),
        el("p", {}, x.beskrivning),
        mina.length ? el("p", { class: "rf-regel-egen" }, "Rollpersonen: ", mina.map((f) => `${f.namn} FV ${f.kategoriB ? `${f.fv} (${bNivaText(R, f.fv, f.bNivaLagre)})` : f.fv}`).join(", ")) : null);
    };
    const grupper = [
      [`Yrkesfärdigheter (${res.yrke.namn.toLowerCase()})`, "yrke"],
      ["Primära färdigheter", "primar"],
      ["Sekundära färdigheter", "sekundar"],
    ];
    const lista = R.fardigheter.lista.filter((x) => egna[x.id]).sort((a, b) => a.namn.localeCompare(b.namn, "sv"));
    const poster = grupper.flatMap(([titel, st]) => {
      const valda = lista.filter((x) => statusFor(x) === st);
      return valda.length ? [el("h3", { class: "rf-regel-rubrik" }, titel), ...valda.map(post)] : [];
    });
    const sida = tomRegelsida(el, nr);
    sida.querySelector(".rf-regelkolumn").append(...poster);
    return sida;
  }
}

// Sidfoten: CHRONOPIA som i sidhuvudet, sidnumret mitt under
function sidfot(el, nr) {
  return el("div", { class: "rf-band rf-fot" }, el("span", { class: "rf-fot-titel" }, "Chronopia"), el("span", { class: "rf-sidnr" }, String(nr)));
}

function tomRegelsida(el, nr) {
  return el("section", { class: "rf-sida rf-regelsida", "aria-label": `Färdigheterna i korthet, sida ${nr}` },
    el("div", { class: "rf-band" }, "Drakar & Demoner"),
    el("div", { class: "rf-ram" },
      el("div", { class: "rf-rubrik" }, el("span", { class: "rf-rubrik-titel" }, "Färdigheterna i korthet"), el("span", { class: "rf-rubrik-kol bred" }, "Egna sammanfattningar, se boken för hela reglerna")),
      el("div", { class: "rf-regelkolumner" }, el("div", { class: "rf-regelkolumn" }), el("div", { class: "rf-regelkolumn" }))),
    sidfot(el, nr));
}

// Fördelar färdigheterna på regelsidorna efter hur mycket som får plats. Körs när sidorna finns
// i dokumentet, eftersom texternas höjd beror på typsnitten.
// Anpassar ett ritat formulär (i rot) efter hur mycket som får plats. rita(val) ritar sidorna på nytt med
// rollformularSidor och de ändrade valen. Får inte all utrustning plats på sida 2 ritas sidorna om med färre
// rader där; resten hamnar på sida 3. Sedan görs för långa texter mindre (passaTexter), och får de särskilda
// förmågorna på sida 1 ändå inte plats flyttas de sista till sida 3.
export function anpassaFormular(rot, rita, omRitad = false) {
  const val = {};
  const sidor = () => rot.querySelector(".rf-sidor");
  if (omRitad) sidor().replaceChildren(...rita(val)); // börja om från standardlayouten, t.ex. när typsnitten har laddats
  const plats = utrustningsplats(rot);
  if (plats) { val.utrustningsrader = plats; sidor().replaceChildren(...rita(val)); }
  passaTexter(rot);
  const formagor = formageplats(rot);
  if (formagor) { val.formagorader = formagor; sidor().replaceChildren(...rita(val)); passaTexter(rot); }
}

// Hur många särskilda förmågor som får plats i rutan på sida 1, eller null om alla får plats
function formageplats(rot) {
  const ruta = rot.querySelector(".rf-mitt > .rf-formagor");
  if (!ruta || ruta.scrollHeight <= ruta.clientHeight + 1) return null;
  const botten = ruta.getBoundingClientRect().bottom + .5;
  const rader = [...ruta.querySelectorAll(".rf-rad:not(.tom)")];
  return Math.max(1, rader.filter((r) => r.getBoundingClientRect().bottom <= botten).length);
}

// Hur många utrustningsrader per kolumn som får plats på sida 2 när formuläret är ritat (i rot), eller null
// om alla får plats. Raderna är minst --rf-rad höga; utan plats för dem skulle de hamna under sidfoten.
export function utrustningsplats(rot) {
  const kol = rot.querySelector(".rf-sida:not(.rf-sida3) .rf-sakkolumner");
  const rad = kol?.querySelector(".rf-sakkolumn .rf-rad");
  if (!rad) return null;
  const ram = kol.closest(".rf-ram");
  const per = kol.querySelector(".rf-sakkolumn").querySelectorAll(".rf-rad").length;
  const minsta = parseFloat(getComputedStyle(rad).flexBasis) || rad.getBoundingClientRect().height;
  const plats = Math.floor((ram.getBoundingClientRect().bottom - kol.getBoundingClientRect().top + 0.5) / minsta);
  return plats < per ? Math.max(1, plats) : null;
}

// Text som inte får plats i sin ruta (t.ex. "Administration (Chronopia)" bland yrkesfärdigheterna) kortas inte.
// Den görs först mindre på en rad, ned till 7 pt, och bryts sedan på två rader och görs mindre, ned till 5,5 pt.
// Körs när sidorna finns i dokumentet med rätt typsnitt, både på skärmen och innan PDF:en ritas.
const PT = 96 / 72;
const TEXTRUTOR = ".rf-namntext, .rf-varde, .rf-linje, .rf-sakkolumn .rf-namn";
export function passaTexter(rot) {
  const rutor = [...rot.querySelectorAll(TEXTRUTOR)];
  for (const e of rutor) { e.classList.remove("rf-tat", "bryt"); e.style.fontSize = ""; } // körs om när typsnitten har laddats
  for (const e of rutor) passaText(e);
  // Särskilda förmågor på sida 1: förklaringarna görs mindre tills alla får plats i rutan
  for (const ruta of rot.querySelectorAll(".rf-mitt > .rf-formagor")) {
    const texter = [...ruta.querySelectorAll(".rf-formaga > span")];
    texter.forEach((t) => { t.style.fontSize = ""; });
    if (!texter.length) continue;
    for (let pt = 6.4; ruta.scrollHeight > ruta.clientHeight + 1 && pt >= 5.5 - .01; pt -= .2) texter.forEach((t) => { t.style.fontSize = `${pt}pt`; });
    // Tomma rader som har tryckts ihop för mycket tas bort; den sista förmågan får platsen
    const smala = [...ruta.querySelectorAll(".rf-rad.tom")].filter((r) => r.getBoundingClientRect().height < 3.5 * 96 / 25.4);
    if (smala.length) {
      smala.forEach((r) => r.remove());
      [...ruta.querySelectorAll(".rf-rad:not(.tom)")].at(-1).style.flex = "1 0 auto";
    }
  }
}

function passaText(e) {
  if (e.querySelector("input, textarea")) return;
  const ruta = e.classList.contains("rf-cell") ? null : e.closest(".rf-cell");
  const bas = parseFloat(getComputedStyle(e).fontSize);
  const forMycket = () => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1
    || (ruta && ruta.scrollHeight > ruta.clientHeight + 1)
    || (e.classList.contains("bryt") && e.getBoundingClientRect().height > 2.2 * parseFloat(e.style.fontSize) * 1.05);
  if (!forMycket()) return;
  e.classList.add("rf-tat");
  const prova = (px) => { e.style.fontSize = `${px}px`; return !forMycket(); };
  const enRad = Math.min(bas, 7 * PT);
  for (let px = bas - .25 * PT; px >= enRad - .01; px -= .25 * PT) if (prova(px)) return;
  e.classList.add("bryt");
  for (let px = enRad; px >= 5.5 * PT - .01; px -= .25 * PT) if (prova(px)) return;
}

export function delaRegelsidor(rot, el) {
  const forsta = rot.querySelector(".rf-regelsida");
  if (!forsta) return;
  const poster = [...rot.querySelectorAll(".rf-regelsida .rf-regelkolumn > *")];
  rot.querySelectorAll(".rf-regelsida").forEach((s, i) => { if (i > 0) s.remove(); });
  forsta.querySelectorAll(".rf-regelkolumn").forEach((k) => k.replaceChildren());
  let sida = forsta;
  let nr = Number(forsta.querySelector(".rf-sidnr").textContent);
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

// Rollpersonens uträknade värden utan innehåll, för ett tomt rollformulär. Strukturen (kroppsdelarna) behålls.
function tomtResultat(res) {
  return { ...res, ras: null, yrke: res.yrke, sarskildFormaga: null, extraFormagor: [], fardigheter: [], besvarjelser: [],
    grundegenskaper: {}, slag: { ...res.slag, socialtStand: "", svardshand: "" },
    harledda: { ...res.harledda, skadebonus: "", forflyttning: "", totalKP: "", langd: "", vikt: "", kroppsdelar: res.harledda.kroppsdelar.map((d) => ({ ...d, kp: "" })) },
    utrustning: { ...res.utrustning, saker: [], kvar: "" } };
}
