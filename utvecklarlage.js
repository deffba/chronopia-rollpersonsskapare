// Utvecklarläget: färdiga testrollpersoner med ett klick, för att snabbt kunna prova stegen, rollformuläret
// och det som händer efter skapandet. Slås på med ?dev i adressen och av med ?dev=av (se app.js).
//
// Rollpersonerna skrivs inte för hand. De byggs med samma regler och automatik som stegen (föreslagna
// grundvärden, automatisk EP-fördelning) utifrån önskemålen i testrollpersoner.js, och kontrolleras sedan
// av regelmotorn precis som en inläst fil. Går ett önskemål inte längre efter en regeländring väljs något
// annat tillåtet i stället, och det sägs till i en notis.
import { rasAv, yrkeAv, fardighetAv, skolFV, kanAnvandaVapen, varukatalog, tvahandsvapen } from "./regelmotor.js";
import { TESTROLLPERSONER } from "./testrollpersoner.js";

const LAGEN = [
  ["export", "Sista steget"],
  ["fardigheter", "Färdigheter"],
  ["ras", "Steg 1"],
  ["formular", "Rollformuläret"],
];

// ------------------------------------------------------------ bygget
// Bygger en testrollperson. foljRecept = false väljer allt utom ras, yrke och namn automatiskt.
// Ger { rp, fel } där fel är regelbrott och val som saknas (tom lista = rollpersonen är klar och tillåten).
export function bygg(api, recept, { foljRecept = true } = {}) {
  const { R } = api;
  const onskat = (v) => (foljRecept ? v : undefined);
  let fel = [];
  const rp = api.med(api.TOM(), (nu) => {
    const r = nu();
    Object.assign(r, { namn: recept.namn, spelare: "Test", kon: recept.kon, ras: recept.ras, alder: recept.alder, yrke: recept.yrke,
      anteckningar: recept.anteckningar ?? "" });
    const ras = rasAv(R, r.ras);
    const yrke = yrkeAv(R, r.yrke);
    const anvanda = new Set();
    const ta = (fid, val) => { anvanda.add(`${fid}:${val}`); return val; };

    // Rasens valfria primära färdighet (vapen eller hantverk)
    const valfriRas = ras.primara.find((p) => p.valfri)?.valfri;
    if (valfriRas) {
      const [fid, val] = (onskat(recept.rasval) ?? "").split(":");
      r.rasval = [`${valfriRas}:${ta(valfriRas, fid === valfriRas && val ? val : autoDelval(api, r, valfriRas, anvanda))}`];
    }

    // Yrkets färdigheter, post för post som i steg 3
    const val = onskat(recept.val) ?? {};
    yrke.fardigheter.forEach((post, i) => {
      if (typeof post === "string") {
        const f = fardighetAv(R, post);
        if (f?.perVal) r.yrkesval[i] = ta(post, typeof val[post] === "string" ? val[post] : autoDelval(api, r, post, anvanda));
      } else if (post.valEn) {
        const alt = post.valEn.map((x) => (typeof x === "string" ? x : x.fardighet));
        const id = alt.find((a) => a in val) ?? alt[0];
        const f = fardighetAv(R, id);
        r.yrkesval[i] = f?.perVal ? { id, sub: ta(id, typeof val[id] === "string" ? val[id] : autoDelval(api, r, id, anvanda)) } : { id };
      } else if (post.antal) {
        const fasta = post.maste ?? [];
        const lista = [...fasta];
        for (const v of [].concat(val[post.fardighet] ?? [])) if (lista.length < post.antal && !anvanda.has(`${post.fardighet}:${v}`)) lista.push(ta(post.fardighet, v));
        while (lista.length < post.antal) lista.push(ta(post.fardighet, autoDelval(api, r, post.fardighet, anvanda)));
        fasta.forEach((m) => anvanda.add(`${post.fardighet}:${m}`));
        r.yrkesval[i] = lista;
      }
    });
    const bonus = yrke.startbonus?.find((b) => b.valEttAv);
    if (bonus) r.hantverkBonus = api.yrkesNycklar().find((k) => k.startsWith("hantverk:")) ?? "";

    // Den valfria yrkesfärdigheten: en sekundär färdighet som rollpersonen inte redan har
    if (yrke.valfri) {
      const har = new Set(api.yrkesNycklar().map((k) => k.split(":")[0]));
      const kan = (id) => { const f = fardighetAv(R, id); return f && f.typ === "sekundar" && !f.perVal && !har.has(id) && !MAGI.includes(id); };
      const onskad = onskat(recept.valfri);
      r.valfri = onskad && kan(onskad) ? onskad : R.fardigheter.lista.find((f) => kan(f.id))?.id ?? "";
    }

    // Stridskonsternas tekniker
    for (const nyckel of [...api.yrkesNycklar(), r.valfri].filter((k) => k?.startsWith("stridskonster:"))) {
      const finns = new Set(R.fardigheter.stridskonstTekniker.map(([t]) => t));
      const valda = (onskat(recept.tekniker) ?? []).filter((t) => finns.has(t));
      r.stridskonstTekniker[nyckel] = valda.length ? valda : [R.fardigheter.stridskonstTekniker[0][0]];
      r.stridskonstFardig[nyckel] = true;
    }

    // Grundegenskaper som knappen Föreslå värden (sparar 10 BP till steg 7–10)
    r.grundvarden = api.grundvardesForslag() ?? r.grundvarden;
    if (api.rakna().magiformaga.behovs) r.magiformaga = { slag: 1 };

    // Särskild förmåga. Kräver förmågan val som receptet inte har, prövas andra slag tills en förmåga utan val kommer upp.
    const sf = recept.sarskildFormaga ?? { bp: 5, slag: 10 };
    const provaSlag = (slag) => {
      r.sarskildaFormagor = { bp: sf.bp, slag, val: [] };
      const res = api.rakna();
      r.sarskildaFormagor.formaga = res.sarskildFormaga?.namn;
      return !res.fel.length && !res.saknas.length;
    };
    if (!provaSlag(onskat(sf.slag) ?? 0)) {
      const slag = Array.from({ length: 39 }, (_, i) => i + 2).find(provaSlag);
      if (slag === undefined) provaSlag(sf.slag);
    }

    // Svärdshand, socialt stånd och startkapital med fasta slag
    const slag = { svardshand: 6, socialtStand: 7, startkapital: 9, ...recept.slag };
    const sfSvardshand = (api.rakna().sarskildFormaga?.regel ?? []).some((d) => d.typ === "svardshand");
    r.svardshand = { bp: 0, slag: sfSvardshand ? null : slag.svardshand };
    r.socialtStand = { bp: 0, slag: slag.socialtStand };
    r.startkapital = { bp: 0, slag: slag.startkapital };

    // EP som knappen Fördela EP, med en del sparad till besvärjelser
    const kanMagi = () => { const res = api.rakna(); return (res.yrke.magiker || res.magiformaga.lyckat) && skolFV(res.fardigheter).allman > 0; };
    api.epFordelning(kanMagi() ? recept.epTillBesvarjelser ?? 40 : 0);
    if (kanMagi()) kopBesvarjelser(api, nu(), onskat(recept.besvarjelser) ?? []);

    kopUtrustning(api, nu(), onskat(recept.startpaketVapen), onskat(recept.kop) ?? []);

    const res = api.rakna();
    fel = [...res.fel, ...api.saknas(res)];
  });
  return { rp, fel };
}

const MAGI = ["kanna-magi", "magisk-kanalisering", "magistudier", "animism", "elementarmagi", "mentalism"];

// Ett tillåtet delval för en färdighet som inte redan är vald: vapen, språk, hantverk, stad osv.
function autoDelval(api, rp, fid, anvanda) {
  const { R } = api;
  const ledig = (v) => !anvanda.has(`${fid}:${v}`);
  if (fid === "vapen") return R.vapen.narstrid.filter((x) => x.grupp !== "slagsmal").map((x) => x.namn).find(ledig);
  if (fid === "tva-vapen") {
    const enhand = R.vapen.narstrid.filter((x) => x.grupp !== "slagsmal" && !tvahandsvapen(R, x.namn, api.rakna().grundegenskaper)).map((x) => x.namn);
    return `${enhand[0]}+${enhand[1] ?? enhand[0]}`;
  }
  if (fid === "tala" || fid === "lasa-skriva") {
    const ras = rasAv(R, rp.ras);
    const egna = fid === "tala" ? ras.talaModersmal.map((x) => x.sprak) : ras.lasaSkrivaModersmal.map((x) => x.sprak ?? x);
    return R.fardigheter.sprak.find((s) => !egna.includes(s.id) && ledig(s.id) && !s.aldrigYrke && (!s.endastPrimarFor || s.endastPrimarFor === rp.ras)
      && (fid === "tala" || (s.skriftsprak !== false && !s.endastTala)))?.id;
  }
  if (fid === "hantverk") return R.fardigheter.hantverk.map(([n]) => n).find(ledig);
  if (fid === "kanna-magi") return ["animism", "elementarmagi", "mentalism"].find(ledig);
  if (fid === "kulturkannedom") return ["Staden Chronopia", ...R.raser.map((r) => r.namn)].find(ledig);
  const f = fardighetAv(R, fid);
  const forslag = { stad: "Chronopia", kontinent: "Chronopias kontinent", djur: "Hästar", instrument: "Luta", stil: "Testkonst", amne: "Kunskap om magi" }[f?.perVal];
  return [forslag, ...Array.from({ length: 9 }, (_, i) => `Test ${i + 1}`)].filter(Boolean).find(ledig);
}

// Besvärjelser för EP som är kvar: först de önskade, sedan de billigaste. FV höjs ett i taget på varje
// besvärjelse i tur och ordning tills EP tar slut eller reglerna säger stopp.
function kopBesvarjelser(api, rp, onskade) {
  const { R } = api;
  const skola = skolFV(api.rakna().fardigheter);
  const kanLara = (b) => !b.perVal && (skola[b.skola] ?? 0) >= b.sv;
  const lista = R.besvarjelser.lista;
  const ordning = [...onskade.map((id) => lista.find((b) => b.id === id)).filter(Boolean),
    ...[...lista].sort((a, b) => a.sv - b.sv)].filter(kanLara);
  const valda = [...new Set(ordning.map((b) => b.id))].slice(0, 5);
  const stopp = new Set();
  for (let varv = 0; varv < 200 && stopp.size < valda.length; varv++) {
    for (const id of valda) {
      if (stopp.has(id)) continue;
      const fore = rp.besvarjelser[id] ?? 0;
      rp.besvarjelser = { ...rp.besvarjelser, [id]: fore + 1 };
      if (api.rakna().fel.length) {
        const ny = { ...rp.besvarjelser };
        if (fore) ny[id] = fore; else delete ny[id];
        rp.besvarjelser = ny;
        stopp.add(id);
      }
    }
  }
}

// Gratis startpaket med ett vapen rollpersonen kan hantera, och sedan önskade köp så länge pengarna räcker
function kopUtrustning(api, rp, onskatVapen, kop) {
  const { R } = api;
  const varden = api.rakna().grundegenskaper;
  const katalog = varukatalog(R);
  const max = R.utrustning.startpaket.vapenMaxPris;
  const kanna = new Set(api.rakna().fardigheter.filter((f) => f.nyckel.startsWith("vapen:") && f.fv > 0).map((f) => f.nyckel.split(":")[1]));
  const enkla = katalog.filter((x) => ["Närstridsvapen", "Avståndsvapen", "Kastvapen"].includes(x.kategori) && x.pris <= max && kanAnvandaVapen(R, x.namn, varden))
    .sort((a, b) => Number(kanna.has(b.namn)) - Number(kanna.has(a.namn)));
  const prova = (andra, tillbaka) => { andra(); if (api.rakna().fel.length) { tillbaka(); return false; } return true; };
  for (const vapen of [onskatVapen, ...enkla.map((x) => x.namn)].filter((v) => v && enkla.some((x) => x.namn === v))) {
    if (prova(() => { rp.startpaket = { valt: true, vapen }; }, () => { rp.startpaket = { valt: false, vapen: "" }; })) break;
  }
  for (const namn of kop) {
    if (!katalog.some((x) => x.namn === namn)) continue;
    const fore = rp.utrustning;
    prova(() => { rp.utrustning = { ...fore, [namn]: (fore[namn] ?? 0) + 1 }; }, () => { rp.utrustning = fore; });
  }
}

// Bygger efter önskemålen, och om det inte går helt automatiskt
export function byggTestrollperson(api, recept) {
  const enligt = bygg(api, recept);
  if (!enligt.fel.length) return { ...enligt, avvek: null };
  const auto = bygg(api, recept, { foljRecept: false });
  return { ...auto, avvek: enligt.fel[0] };
}

// Osparade erf på några färdigheter och en besvärjelse, så att förbättringen efter ett spelmöte har något att slå för
function medErf(api, rp) {
  let lista = [];
  api.med(structuredClone(rp), () => { lista = api.rakna().fardigheter; });
  const erf = {};
  lista.filter((f) => f.status === "yrke" && f.fv > 0).sort((a, b) => b.fv - a.fv).slice(0, 3).forEach((f) => { erf[f.nyckel] = 2; });
  lista.filter((f) => f.status === "primar" && f.fv > 0).sort((a, b) => b.fv - a.fv).slice(0, 2).forEach((f) => { erf[f.nyckel] = 1; });
  const besv = Object.keys(rp.besvarjelser ?? {})[0];
  if (besv) erf[besv] = 1;
  rp.spel = { ...rp.spel, erf };
  return rp;
}

// ------------------------------------------------------------ menyn
const STIL = `
.dev-markering { position: fixed; left: 12px; bottom: 12px; z-index: 40; padding: 3px 8px; border-radius: 4px;
  background: #b4462d; color: #fff; font: 700 .72rem/1.4 system-ui, sans-serif; letter-spacing: .08em; pointer-events: none; }
.menydel.utvecklarlage { border-top: 2px dashed #b4462d; }
.utvecklarlage .etikett { color: #b4462d; }
.utvecklarlage .knapp { width: 100%; justify-content: center; }
.utvecklarlage select { width: 100%; }
.utvecklarlage .dev-rad { display: flex; gap: 6px; }
.utvecklarlage .dev-rad .knapp { flex: 1; }
@media print { .dev-markering { display: none; } }
`;

export function starta(api) {
  const { el } = api;
  document.head.append(el("style", {}, STIL));
  document.body.append(el("div", { class: "dev-markering", "aria-hidden": "true" }, "UTVECKLARLÄGE"));

  let lage = "export";
  let erf = false;
  const hamta = (recept) => {
    const { rp, fel, avvek } = byggTestrollperson(api, recept);
    if (fel.length) {
      console.error("Testrollpersonen bryter mot reglerna:", recept.id, fel);
      api.visaNotis(`${recept.etikett} gick inte att bygga: ${fel[0]}.`);
      return null;
    }
    if (avvek) console.warn(`Önskemålen för ${recept.id} i testrollpersoner.js följer inte reglerna längre (${avvek}); valen gjordes automatiskt.`);
    return { rp: erf ? medErf(api, rp) : rp, avvek };
  };
  const stangMeny = () => {
    document.querySelector("#menypanel").hidden = true;
    document.querySelector("#menyknapp").setAttribute("aria-expanded", "false");
  };
  const ladda = (recept) => {
    stangMeny();
    const bygget = hamta(recept);
    if (!bygget) return;
    api.ladda(bygget.rp, lage === "formular" ? "export" : lage);
    if (lage === "formular") api.visaFormular();
    if (bygget.avvek) api.visaNotis(`${bygget.rp.namn} är inläst, men önskemålen i testrollpersoner.js gick inte (${bygget.avvek}), så valen gjordes automatiskt.`);
  };
  const laddaNerAlla = () => {
    stangMeny();
    for (const recept of TESTROLLPERSONER) {
      const bygget = hamta(recept);
      if (!bygget) continue;
      const url = URL.createObjectURL(new Blob([JSON.stringify(api.tillFil(bygget.rp), null, 2)], { type: "application/json" }));
      const a = el("a", { href: url, download: `test-${recept.id}.json` });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  const panel = document.querySelector("#menypanel");
  panel.append(el("div", { class: "menydel utvecklarlage" },
    el("span", { class: "etikett" }, "Utvecklarläge: testrollpersoner"),
    TESTROLLPERSONER.map((recept) => el("button", { type: "button", class: "knapp", id: `dev-${recept.id}`,
      onclick: () => ladda(recept) }, recept.etikett)),
    el("label", {}, el("span", { class: "hjalp" }, "Öppna i"),
      el("select", { id: "dev-lage", onchange: (e) => { lage = e.target.value; } },
        LAGEN.map(([v, t]) => el("option", { value: v, selected: v === lage }, t)))),
    el("label", { class: "vaxel" }, el("input", { type: "checkbox", id: "dev-erf", onchange: (e) => { erf = e.target.checked; } }),
      el("span", {}, "Med erf att förbättra")),
    el("div", { class: "dev-rad" },
      el("button", { type: "button", class: "knapp liten", id: "dev-ladda-ner", onclick: laddaNerAlla }, "Ladda ner alla"),
      el("button", { type: "button", class: "knapp liten", id: "dev-av", onclick: () => {
        api.stangAv();
        location.search = "";
      } }, "Stäng av"))));

  // För automatiska tester: window.chronopiaDev.bygg("krigare") ger { rp, fel, avvek }. Ett eget recept går också.
  const receptFor = (x) => (typeof x === "string" ? TESTROLLPERSONER.find((r) => r.id === x) : x);
  window.chronopiaDev = {
    recept: TESTROLLPERSONER,
    bygg: (x) => byggTestrollperson(api, receptFor(x)),
    byggAuto: (x) => bygg(api, receptFor(x), { foljRecept: false }),
    ladda: (id) => ladda(TESTROLLPERSONER.find((x) => x.id === id)),
  };
}
