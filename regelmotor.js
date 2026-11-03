// Regelmotor för Chronopia-rollpersonsskaparen.
// Tar regeldata (regler-json) och en rollperson (spelarens val) och räknar fram allt som följer av reglerna.
// Sidhänvisningar avser tryckta sidor i regelboken.

export const GRUNDEGENSKAPER = ["STY", "FYS", "SMI", "INT", "PSY", "KAR"];
// Grundvärdet 10 i alla grundegenskaper, som tabellen i steg 6 börjar med (s. 27)
export const STANDARDVARDEN = () => Object.fromEntries(GRUNDEGENSKAPER.map((g) => [g, 10]));

// Ett påbörjat val, t.ex. "vapen:" innan vapnet är valt eller "tva-vapen:Dolk+" innan det andra vapnet är valt.
export const paborjad = (nyckel) => !nyckel || nyckel.endsWith(":") || nyckel.endsWith("+");

// Slår upp i en tabell av [övre gräns, värde]; null som gräns betyder "och uppåt".
export function slaUpp(tabell, varde) {
  for (const [grans, ...resten] of tabell) {
    if (grans === null || varde <= grans) return resten.length === 1 ? resten[0] : resten;
  }
  return undefined;
}

// Böckerna. Varje regelpost kan ha kalla: { bok, sida } (regler/bocker.json). En post utan kalla hör till grundreglerna.
// Rollpersonen skapas med böckerna i rp.bocker (steg 0); grundreglerna är alltid med.
export const bokFor = (post) => post?.kalla?.bok ?? "grund";
export const valdaBocker = (rp) => ["grund", ...(rp?.bocker ?? []), ...(rp?.expansioner ?? [])];
export const iBocker = (post, rp) => valdaBocker(rp).includes(bokFor(post));

// Färdigheter som en expansion ändrar (medBok, t.ex. Heraldik i V&R s. 15). Grundreglernas fält sparas
// och bokens fält läggs på när boken är vald. Reglerna ändras på plats, så anropet görs före varje uträkning.
export function tillampaBocker(regler, rp) {
  const bocker = valdaBocker(rp);
  for (const f of regler.fardigheter?.lista ?? []) {
    if (!f.medBok) continue;
    f._grund ??= Object.fromEntries(Object.values(f.medBok).flatMap((a) => Object.keys(a)).map((k) => [k, f[k]]));
    Object.assign(f, f._grund);
    for (const [bok, andring] of Object.entries(f.medBok)) if (bocker.includes(bok)) Object.assign(f, andring);
  }
  return regler;
}
// Allmän heraldik (V&R s. 15): B-nivån räknas så många steg lägre
export function bNivaLagre(regler, nyckel) {
  const f = fardighetAv(regler, nyckel);
  const sub = nyckel.split(":")[1];
  return f?.allman && sub?.toLowerCase() === f.allman.namn.toLowerCase() ? f.allman.bNivaLagre : 0;
}
// B-nivåns namn för ett FV, med den nivå som gäller när den räknas lägre: "B2 (gäller som B0)"
export function bNivaText(regler, fv, lagre = 0) {
  const nivaer = regler.fardigheter.bNivaer;
  const namn = slaUpp(nivaer, fv);
  if (!lagre) return namn;
  const i = nivaer.findIndex(([, n]) => n === namn);
  return `${namn} (gäller som ${nivaer[Math.max(0, i - lagre)][1]})`;
}
export const bokNamn = (regler, id) => regler.bocker?.lista.find((b) => b.id === id)?.namn ?? id;
// Sidhänvisning för en post: "s. 30" i grundreglerna, "Vapen & rustningar s. 3" i en expansion
export const kallText = (regler, post, grundSida) => (bokFor(post) === "grund" ? grundSida : `${bokNamn(regler, bokFor(post))} s. ${post.kalla.sida}`);

// Det som går att välja med rollpersonens böcker
export const valbaraRaser = (regler, rp) => regler.raser.filter((r) => iBocker(r, rp));
export const valbaraYrken = (regler, rp) => regler.yrken.lista.filter((y) => iBocker(y, rp));
export const valbaraFardigheter = (regler, rp) => regler.fardigheter.lista.filter((f) => fardighetValbar(regler, rp, f));
// Med kanna: skolorna för Känna magi, som också yrken utan magi (Svartsyster) har
export const magiskolor = (regler, rp, kanna = false) => regler.fardigheter.lista.filter((f) => f.typ === "magiskola"
  && fardighetValbar(regler, kanna ? { ...rp, yrke: yrkeAv(regler, rp.yrke)?.utanMagi ? "" : rp.yrke } : rp, f));
// Kulturer för Kulturkännedom: rasernas kulturer och de övriga i färdighetens data (s. 62)
// Valfria regler som de valda böckerna erbjuder (V&R s. 3: Syn och hörsel, RB-002), och om en är påslagen
export const valfriaRegler = (regler, rp) => {
  const regler_ = (regler.bocker?.lista ?? []).filter((b) => valdaBocker(rp).includes(b.id)).flatMap((b) => (b.valfriaRegler ?? []).map((v) => ({ ...v, kalla: { bok: b.id, sida: v.sida } })));
  return regler_.filter((v, i) => regler_.findIndex((x) => x.id === v.id) === i);
};
export const regelPa = (regler, rp, id) => (rp.valfriaRegler ?? []).includes(id) && valfriaRegler(regler, rp).some((v) => v.id === id);

// Syn och hörsel (V&R s. 3, RB-002): BP + 1T6 per sinne ger nivån i tabellen och en modifikation.
// Ger null när regeln inte är påslagen. mod: färdighets-id (eller "avstandsvapen") → summerad modifikation.
export function raknaSinnen(regler, rp) {
  if (!regelPa(regler, rp, "syn-och-horsel")) return null;
  const regel = valfriaRegler(regler, rp).find((v) => v.id === "syn-och-horsel");
  const mod = {};
  const sinnen = regel.sinnen.map((sinne) => {
    const s = rp.sinnen?.[sinne.id] ?? { bp: 0, slag: null };
    const varde = s.slag == null ? null : s.slag + (s.bp ?? 0);
    const rad = varde == null ? null : regel.tabell.find(([max]) => max === null || varde <= max);
    const m = rad ? rad[2] : 0;
    if (rad) for (const f of [...sinne.fardigheter, ...(sinne.avstandsvapen ? ["avstandsvapen"] : [])]) mod[f] = (mod[f] ?? 0) + m;
    return { ...sinne, bp: s.bp ?? 0, slag: s.slag, varde, niva: rad?.[1] ?? null, mod: m };
  });
  return { regel, sinnen, mod, bp: sinnen.reduce((a, x) => a + x.bp, 0) };
}

// Modifikationen från syn och hörsel för en färdighet; avståndsvapen räknas på vapnets tabell
export function sinnesMod(regler, sinnen, nyckel) {
  if (!sinnen) return 0;
  const [id, val] = nyckel.split(":");
  const avstand = id === "vapen" && [...regler.vapen.projektil, ...regler.vapen.kast].some((x) => x.namn === val);
  return (sinnen.mod[id] ?? 0) + (avstand ? sinnen.mod.avstandsvapen ?? 0 : 0);
}

export const kulturer = (regler, rp) => [...valbaraRaser(regler, rp).map((r) => r.namn), ...(fardighetAv(regler, "kulturkannedom").ovrigaKulturer ?? [])];

// Erfarenhetsnivån (V&R s. 3 och de andra expansionerna, RB-001): BP från start och antal särskilda förmågor.
// Nivåerna kommer från den första valda boken som har nivåer; utan en sådan bok gäller grundreglerna (en nivå).
// Med flera sådana böcker (V&R och Magi) är BP och förmågor desamma (RB-001); namnen visas ihop ("Krigare / Magus")
// och Magis tak för familjarer (s. 8, RB-010) följer med.
export function nivaer(regler, rp) {
  const bocker = (regler.bocker?.lista ?? []).filter((b) => b.nivaer && valdaBocker(rp).includes(b.id));
  if (!bocker.length) return null;
  const [bok] = bocker;
  return bok.nivaer.lista.map((n, i) => {
    const alla = bocker.map((b) => b.nivaer.lista[i]);
    const familjarer = alla.find((x) => x.familjarer !== undefined)?.familjarer;
    return { ...n, namn: [...new Set(alla.map((x) => x.namn))].join(" / "), bok: bok.id, sida: bok.nivaer.sida,
      ...(familjarer !== undefined ? { familjarer } : {}) };
  });
}
export function nivaFor(regler, rp) {
  const lista = nivaer(regler, rp);
  return lista?.[rp?.niva ?? 0] ?? { namn: null, bp: regler.grundegenskaper.startBP, formagor: 1 };
}

// Yrkets villkor (design-expansioner.md): t.ex. { ras: ["dvarg"] }, { ras: ["manniska"], kon: "Kvinna", fodd: "…" }.
// Ger en förklaring om rollpersonen inte uppfyller det. Födelsemånen finns inte i grundreglerna; den står som
// bakgrund på rollformuläret och kontrolleras inte (RB-018).
export function yrkeVillkor(regler, rp, yrke) {
  const v = yrke?.villkor;
  if (!v) return null;
  const rasFel = v.ras && rp.ras && !v.ras.includes(rp.ras);
  const konFel = v.kon && rp.kon && rp.kon !== v.kon;
  // Klanen (Dvärgar i Chronopia s. 4, 11): Präst kräver klan Mindir
  const klanFel = v.klan && !rasFel && !v.klan.includes(rp.klan?.id);
  return rasFel || konFel || klanFel ? villkorText(regler, v) : null;
}
const ochLista = (namn) => (namn.length > 1 ? `${namn.slice(0, -1).join(", ")} och ${namn.at(-1)}` : namn[0]);
export function villkorText(regler, v) {
  const delar = [v.ras ? ochLista(v.ras.map((id) => rasAv(regler, id)?.namn ?? id)) : null,
    v.kon ? (v.kon === "Kvinna" ? "kvinnor" : "män") : null, v.fodd ? `födda ${v.fodd}` : null,
    v.klan ? `i klan ${ochLista(v.klan.map((id) => klanAv(regler, id)?.namn ?? id))}` : null].filter(Boolean);
  return `Bara för ${delar.join(", ")}`;
}

// ------------------------------------------------------------ klaner (Dvärgar i Chronopia s. 4, 18–26)
export const klanAv = (regler, id) => regler.klaner?.lista.find((k) => k.id === id);
// Klaner finns för dvärgar när Dvärgar i Chronopia är vald
export const klanTillganglig = (regler, rp) => Boolean(regler.klaner) && valdaBocker(rp).includes(regler.klaner.kalla.bok) && rp.ras === regler.klaner.ras;
// Klanen för ett slag på 1T100 (s. 4). Durban saknas i tabellen och kan bara väljas.
export const klanForSlag = (regler, slag) => regler.klaner?.tabell.find(([fran, till]) => slag >= fran && slag <= till)?.[2];
// Klanen och klanförmågan (1T10 på klanens tabell). rp.klan = { id, slag, formagaSlag, val }.
export function raknaKlan(regler, rp) {
  const k = rp.klan ?? {};
  const svar = { tillganglig: klanTillganglig(regler, rp), klan: null, formaga: null, fel: [], saknas: [] };
  if (!svar.tillganglig) {
    if (k.id && regler.klaner) svar.fel.push(`Klaner finns bara för dvärgar i ${bokNamn(regler, regler.klaner.kalla.bok)}`);
    return svar;
  }
  if (!k.id) { svar.saknas.push("Klan"); return svar; }
  svar.klan = klanAv(regler, k.id);
  if (!svar.klan) { svar.fel.push(`Okänd klan: ${k.id}`); return svar; }
  if (k.slag != null && klanForSlag(regler, k.slag) !== k.id) svar.fel.push(`Slaget ${k.slag} ger inte klan ${svar.klan.namn} (${kallText(regler, regler.klaner, "")})`);
  if (!svar.klan.formagor.length) return svar;
  if (k.formagaSlag == null) { svar.saknas.push("Slaget för klanförmåga"); return svar; }
  svar.formaga = svar.klan.formagor.find(({ slag: [fran, till] }) => k.formagaSlag >= fran && k.formagaSlag <= till) ?? null;
  if (!svar.formaga) svar.fel.push(`Klanförmågan slås med ${regler.klaner.formagaTarning}`);
  return svar;
}

// Levande tatueringar (Dvärgar i Chronopia s. 27–28). Bärsärken får 1/2/3 efter erfarenhetsnivån (s. 6–7),
// valda med SL (rp.tatueringar); den särskilda förmågan Bärsärk ger en med insikt högst 15 (s. 15).
export const tatueringAv = (regler, id) => regler.fardigheter.tatueringar?.lista.find((t) => t.id === id);
export function raknaTatueringar(regler, rp, franFormagor = []) {
  const T = regler.fardigheter.tatueringar;
  const svar = { lista: [], tak: 0, valda: rp.tatueringar ?? [], fel: [] };
  if (!T) return svar;
  const yrke = yrkeAv(regler, rp.yrke);
  svar.tak = iBocker(yrke, rp) && yrke?.tatueringar ? yrke.tatueringar[Math.min(rp.niva ?? 0, yrke.tatueringar.length - 1)] : 0;
  if (svar.valda.length > svar.tak) svar.fel.push(svar.tak ? `Högst ${svar.tak} levande tatuering${svar.tak === 1 ? "" : "ar"} från yrket på den här nivån (${kallText(regler, yrke, "")})` : "Bara bärsärkar får levande tatueringar från yrket");
  for (const id of svar.valda) {
    const t = tatueringAv(regler, id);
    if (!t) svar.fel.push(`Okänd tatuering: ${id}`);
    else svar.lista.push({ ...t, fran: yrke.namn });
  }
  for (const { id, fran } of franFormagor) {
    const t = tatueringAv(regler, id);
    if (t) svar.lista.push({ ...t, fran });
  }
  if (new Set(svar.lista.map((t) => t.id)).size !== svar.lista.length) svar.fel.push("Samma tatuering kan inte väljas två gånger");
  return svar;
}

// ------------------------------------------------------------ familjarer (Magi i Chronopia s. 40–43)
export const familjarAv = (regler, id) => regler.foljeslagare?.familjarer?.lista.find((f) => f.id === id);
// Familjarer köps för BP (rp.familjarer, en post per familjar). Erfarenhetsnivån ger taket 1/3/5 (RB-010).
// Familjarer från yrket (Fågelbroder, Häxjägare) och från Spiritus familiarius är gratis och räknas inte
// mot taket så länge regelfilen säger gratisRaknas: false.
export function raknaFamiljarer(regler, rp) {
  const F = regler.foljeslagare?.familjarer;
  const svar = { lista: [], bp: 0, tak: 0, antal: 0, fel: [], tillganglig: false };
  if (!F) return svar;
  const magi = valdaBocker(rp).includes(F.kalla.bok);
  const yrke = yrkeAv(regler, rp.yrke);
  svar.tillganglig = magi;
  const gratis = [
    ...(magi && iBocker(yrke, rp) ? (yrke.gratisFamiljar ?? []).map((id) => ({ id, kalla: yrke.namn })) : []),
    ...(rp.gratisFamiljarer ?? []),
  ];
  const kopta = rp.familjarer ?? [];
  if (!magi) {
    if (kopta.length) svar.fel.push(`Familjarer finns i ${bokNamn(regler, F.kalla.bok)}, som inte är vald (steg 0)`);
    return svar;
  }
  for (const g of gratis) {
    const f = familjarAv(regler, g.id);
    if (f) svar.lista.push({ ...f, gratis: true, kallaGratis: g.kalla });
  }
  for (const id of kopta) {
    const f = familjarAv(regler, id);
    if (!f) { svar.fel.push(`Okänd familjar: ${id}`); continue; }
    svar.lista.push({ ...f, gratis: false });
    svar.bp += f.bp;
  }
  for (const f of svar.lista) {
    if (f.villkor?.yrken && !f.villkor.yrken.includes(rp.yrke)) {
      svar.fel.push(`${f.namn}: bara för ${ochLista(f.villkor.yrken.map((y) => yrkeAv(regler, y)?.namn ?? y))} (${kallText(regler, f, "")})`);
    }
  }
  const niva = nivaFor(regler, rp);
  svar.tak = niva.familjarer ?? 0;
  svar.antal = kopta.length + (F.gratisRaknas ? gratis.length : 0);
  if (svar.antal > svar.tak) {
    svar.fel.push(`Högst ${svar.tak} ${svar.tak === 1 ? "familjar" : "familjarer"} som ${(niva.namn ?? "").toLowerCase()} (${bokNamn(regler, F.kalla.bok)} s. ${regler.bocker.lista.find((b) => b.id === F.kalla.bok)?.nivaer?.sida ?? F.kalla.sida}, ${F.beslut})`);
  }
  return svar;
}

// Färdigheter som bara vissa yrken får lära sig (Tidsmagi, Magi i Chronopia s. 35)
export function fardighetVillkor(regler, rp, f) {
  // Svartsystrar kan inte använda magi (Magi i Chronopia s. 8, 15): inga magiskolor alls
  const yrke = yrkeAv(regler, rp.yrke);
  if (f?.typ === "magiskola" && yrke?.utanMagi) return `${yrke.namn} kan inte lära sig magiskolor (${kallText(regler, { kalla: { ...yrke.kalla, sida: 8 } }, "")})`;
  const yrken = f?.villkor?.yrken;
  if (!yrken || yrken.includes(rp.yrke)) return null;
  return `${f.namn} kan bara läras av ${ochLista(yrken.map((id) => yrkeAv(regler, id)?.namn ?? id).map((n) => n.toLowerCase()))}`;
}
export const fardighetValbar = (regler, rp, f) => iBocker(f, rp) && !fardighetVillkor(regler, rp, f);

// Yrkesförmågan med V&R:s initiativbonus (s. 4: alla krigaryrken i boken har +3 på initiativ)
export const yrkesformagaText = (yrke) => (yrke.initiativ ? `${yrke.yrkesformaga} +${yrke.initiativ} på initiativet.` : yrke.yrkesformaga);

// Ett paketval (V&R s. 6–7, RB-016): spelaren väljer först ett av paketen och sedan vad det innehåller.
// Paket: { fardighet, antal } (t.ex. två lärdomsfärdigheter), { fasta: [id, …] } eller { valfria: n } (valfria färdigheter).
// val = { paket: index, val: [...] }. Ger färdighetsnycklarna.
export const paketIndex = (post, val) => val?.paket ?? (post.valPaket?.length === 1 ? 0 : undefined);
export function paketNycklar(regler, post, val) {
  const paket = post.valPaket?.[paketIndex(post, val)];
  if (!paket) return [];
  const valda = [].concat(val.val ?? []);
  if (paket.fasta) return paket.fasta;
  if (paket.valfria) return valda.slice(0, paket.valfria).filter(Boolean);
  return valda.slice(0, paket.antal).filter(Boolean).map((x) => `${paket.fardighet}:${x}`);
}
export const paketNamn = (regler, paket) => paket.namn
  ?? (paket.fasta ? paket.fasta.map((id) => fardighetAv(regler, id)?.namn ?? id).join(" och ")
    : paket.valfria ? `${paket.valfria} valfria färdigheter` : `${fardighetAv(regler, paket.fardighet)?.namn ?? paket.fardighet} (${paket.antal})`);

// Nycklarna som varje yrkesfärdighetspost i yrket blev, efter spelarens val i rp.yrkesval.
// Används för egenskaper som hör till en viss post (startFV, primar, takStart, utanMagiformagaslag).
export function yrkesPoster(regler, rp) {
  tillampaBocker(regler, rp);
  const yrke = yrkeAv(regler, rp.yrke);
  if (!yrke) return [];
  const val = rp.yrkesval ?? {};
  return yrke.fardigheter.map((post, i) => {
    const v = val[i];
    let nycklar = [];
    if (typeof post === "string") nycklar = fardighetAv(regler, post)?.perVal ? (v ? [`${post}:${v}`] : []) : [post];
    else if (post.valPaket) nycklar = paketNycklar(regler, post, v);
    else if (post.valEn) {
      if (v?.id) nycklar = fardighetAv(regler, v.id)?.perVal ? (v.sub ? [`${v.id}:${v.sub}`] : []) : [v.id];
    } else if (!post.antal && !fardighetAv(regler, post.fardighet)?.perVal) {
      nycklar = [post.fardighet]; // en fast färdighet med egenskaper, t.ex. Prästens Atums väg utan magiförmågeslag
    } else {
      const valda = [].concat(v ?? []);
      post.maste?.forEach((m, j) => { valda[j] = m; });
      nycklar = valda.filter(Boolean).map((x) => `${post.fardighet}:${x}`);
    }
    return { post, nycklar: nycklar.filter((k) => !paborjad(k)) };
  });
}
const postFor = (regler, rp, nyckel, falt) => yrkesPoster(regler, rp).find((p) => p.post[falt] && p.nycklar.includes(nyckel))?.post;

// Svärdsskolans färdiga stridskonst för en stil av Vapentekniker (V&R s. 32–33), känd på namnet
export function svardsskolaFor(regler, nyckel) {
  const [id, stil] = (nyckel ?? "").split(":");
  if (id !== "vapentekniker" || !stil) return null;
  return (regler.fardigheter.svardsskolor ?? []).find((s) => s.namn.toLowerCase() === stil.toLowerCase()) ?? null;
}
// Tekniker som går att välja i en stil: obeväpnade (s. 68) och, för Vapentekniker, V&R:s (s. 16)
export const teknikLista = (regler, f) => (f.id === "vapentekniker"
  ? [...(regler.fardigheter.vapenTekniker ?? []), ...regler.fardigheter.stridskonstTekniker]
  : regler.fardigheter.stridskonstTekniker);
export const harTekniker = (f) => f?.id === "stridskonster" || f?.id === "vapentekniker";
// Stilens tekniker: svärdsskolans paket eller spelarens egna
export const stilensTekniker = (regler, rp, nyckel) => svardsskolaFor(regler, nyckel)?.tekniker ?? rp.sarskildaFormagor?.tekniker?.[nyckel] ?? rp.stridskonstTekniker?.[nyckel] ?? [];

export function rasAv(regler, id) {
  return regler.raser.find((r) => r.id === id);
}

export function yrkeAv(regler, id) {
  return regler.yrken.lista.find((y) => y.id === id);
}

export function fardighetAv(regler, nyckel) {
  const [id] = nyckel.split(":");
  return regler.fardigheter.lista.find((f) => f.id === id);
}

// Ålderskategori (s. 16) för en ras och ålder i år.
export function alderskategori(regler, ras, ar) {
  const ordning = ["ung", "vuxen", "medelalders", "gammal", "uraldrig"];
  for (const id of ordning) {
    const [fran, till] = ras.alder[id];
    if (ar >= fran && (till === null || ar <= till)) return id;
  }
  return ar < ras.alder.ung[0] ? "ung" : "uraldrig";
}

// Extra BP, kapitalmultiplikator och start-EP efter ålder i år (s. 17, 34).
export function alderseffekter(regler, ar) {
  return regler.alder.efterAr.find((r) => r.max === null || ar <= r.max);
}

// BP-kostnad för extra yrkesfärdigheter (s. 27).
export function kostnadExtraYrken(regler, extra) {
  const k = regler.yrken.extraYrkesfardigheter;
  let summa = 0;
  let vanliga = 0;
  for (const nyckel of extra) {
    if (fardighetAv(regler, nyckel)?.typ === "magiskola") {
      summa += k.magiskola;
      continue;
    }
    vanliga += 1;
    summa += vanliga === 1 ? k.forsta : vanliga === 2 ? k.andra : k.darefter;
  }
  return summa;
}

// Grundegenskaper efter ras och ålder, STO och BP-kostnad (s. 27–28).
export function raknaGrundegenskaper(regler, rp) {
  const ras = rasAv(regler, rp.ras);
  const kat = alderskategori(regler, ras, rp.alder);
  const aldersmod = regler.alder.effekter[kat];
  const varden = {};
  let bp = 0;
  const fel = [];
  const forLaga = []; // slutvärden under 3 är inget regelbrott förrän grundvärdena köps i steg 6
  // Före steg 6 finns inga grundvärden (grundvarden är null). Då kostar de inga BP; värdena räknas ändå
  // med grundvärdet 10 så att resten av motorn fungerar, men de visas inte.
  const satta = !!rp.grundvarden;
  const grundvarden = rp.grundvarden ?? STANDARDVARDEN();
  for (const g of GRUNDEGENSKAPER) {
    const grund = grundvarden[g];
    const kostnad = regler.grundegenskaper.kostnad[String(grund)];
    if (kostnad === undefined) fel.push(`${g}: grundvärdet måste vara 3–18 (s. 27)`);
    if (satta) bp += kostnad ?? 0;
    varden[g] = grund + ras.mod[g] + aldersmod[g] + (rp.egenskapsbonus?.[g] ?? 0);
    if (satta && varden[g] < regler.grundegenskaper.minstSlutvarde) forLaga.push(`${g} blir ${varden[g]} efter ras och ålder, men måste bli minst 3: höj grundvärdet (s. 27)`);
  }
  const steg = rp.stoSteg ?? 0;
  const s = regler.grundegenskaper.sto;
  if (steg > 0) bp += s.hojning[steg - 1];
  if (steg < 0) bp -= s.sankning[-steg - 1];
  varden.STO = ras.sto.normal + steg;
  if (varden.STO < ras.sto.min || varden.STO > ras.sto.max) fel.push(`STO måste ligga inom ${ras.sto.min}–${ras.sto.max} (s. 14, 28)`);
  return { varden, bp, alderskategori: kat, fel, forLaga, satta };
}

// Härledda värden: KP per kroppsdel, skadebonus, förflyttning, storlek (s. 10, 28–29).
export function raknaHarledda(regler, v, { kpFaktor = 1, forflyttningBonus = 0 } = {}) {
  const ge = regler.grundegenskaper;
  const total = Math.ceil(((v.STO + v.FYS) / 2) * kpFaktor);
  let kolumn = ge.kroppspoang.kolumner.findIndex(([, till]) => total <= till);
  let extra = 0;
  if (kolumn === -1) {
    kolumn = ge.kroppspoang.kolumner.length - 1;
    extra = Math.ceil((total - ge.kroppspoang.kolumner[kolumn][1]) / 5);
  }
  const kroppsdelar = ge.kroppspoang.delar.map((d) => ({ id: d.id, namn: d.namn, kp: d.kp[kolumn] + extra }));
  const skadebonus = slaUpp(ge.skadebonus, v.STY + v.STO) ?? "+5T6";
  const summa = v.STO + v.FYS + v.SMI;
  const f = ge.forflyttning;
  let forflyttning = f.forsta + f.gransvarden.findIndex((g) => summa <= g);
  if (summa > f.gransvarden.at(-1)) {
    forflyttning = f.forsta + f.gransvarden.length + Math.ceil((summa - f.gransvarden.at(-1)) / f.steg) - 1;
  }
  const storlek = ge.storlek.find((r) => r[0] === v.STO);
  return {
    totalKP: total, kroppsdelar, skadebonus, forflyttning: forflyttning + forflyttningBonus,
    vikt: storlek ? `${storlek[1]}–${storlek[2]} kg` : null,
    langd: storlek ? `${storlek[3]}–${storlek[4]} cm` : null,
  };
}

// Svärdshand, socialt stånd och startkapital (s. 32–33).
export function raknaSlag(regler, rp, ras, yrke, alderEff) {
  const t = regler.slag;
  const svardshand = rp.svardshand.overstyrd ?? slaUpp(t.svardshand.tabell, rp.svardshand.slag + rp.svardshand.bp);
  // Med SL:s tillåtelse kan ståndet väljas i stället för att slås; då räknas lägsta värdet för det ståndet
  const ssResultat = rp.socialtStand.valt ? standsvarde(t.socialtStand.tabell, rp.socialtStand.valt)
    : rp.socialtStand.slag + rp.socialtStand.bp + (ras.slagbonus.socialtStand ?? 0) + (rp.klanSlagbonus?.socialtStand ?? 0);
  const [stand, klass] = slaUpp(t.socialtStand.tabell, ssResultat);
  const skBonus = (ras.slagbonus.startkapital ?? 0) + (yrke.slagbonus?.startkapital ?? 0) + (rp.klanSlagbonus?.startkapital ?? 0);
  const tak = ssResultat + (yrke.kapitaltak ?? t.startkapital.tak);
  const skResultat = Math.min(
    rp.startkapital.slag + rp.startkapital.bp + Math.ceil(rp.socialtStand.bp / 2) + skBonus, tak);
  // Ädling (V&R s. 12): minst 100 000 sm (RB-004)
  const silver = Math.max(slaUpp(t.startkapital.tabell, skResultat) * alderEff.kapital + (rp.arv ?? 0), yrke.kapitalMinst ?? 0);
  return { svardshand, socialtStand: stand, standsklass: klass, ssResultat, skResultat, startkapital: silver };
}

// Lägsta slagresultat som ger ett visst socialt stånd.
export function standsvarde(tabell, namn) {
  const i = tabell.findIndex(([, n]) => n === namn);
  if (i === -1) return 0;
  return i === 0 ? tabell[0][0] : tabell[i - 1][0] + 1;
}

// Måste vapnet hållas med två händer av den här rollpersonen? (s. 72, 89–90)
export function tvahandsvapen(regler, namn, varden) {
  const vapen = regler.vapen.narstrid.find((x) => x.namn === namn);
  if (!vapen) return true;
  if (vapen.enHandOmStoOverKrav) return !(varden.STO > vapen.styKrav && !["Trästav", "Långspjut"].includes(namn));
  return Boolean(regler.vapen.styBeroendeGrupper[vapen.grupp]) && vapen.styKrav > varden.STY;
}

// Regler för vad som får väljas som språk, vapenkombination och yrkesfärdighet (s. 66–71).
function kontrolleraVal(regler, rp, varden, fel) {
  const yrkesnycklar = new Set([...rp.yrkesfardigheter, ...rp.extraYrkesfardigheter]);
  for (const nyckel of new Set([...yrkesnycklar, ...Object.keys(rp.fardigheter)])) {
    const [id, val] = nyckel.split(":");
    if (!val || paborjad(nyckel)) continue;
    if (id === "tala" || id === "lasa-skriva") {
      const sprak = regler.fardigheter.sprak.find((x) => x.id === val);
      const namn = sprak?.namn ?? val;
      if (!sprak) fel.push(`Okänt språk: ${val}`);
      else if (id === "lasa-skriva" && (sprak.skriftsprak === false || sprak.endastTala)) fel.push(`${namn} har inget skriftspråk (s. 66)`);
      else if (yrkesnycklar.has(nyckel) && sprak.aldrigYrke) fel.push(`${namn} kan aldrig vara yrkesfärdighet (s. 64)`);
      else if (yrkesnycklar.has(nyckel) && sprak.endastPrimarFor && sprak.endastPrimarFor !== rp.ras) fel.push(`${namn} kan bara vara yrkesfärdighet för ${sprak.endastPrimarFor === "wongos" ? "wongoser" : sprak.endastPrimarFor} (s. 64)`);
      const modersmal = id === "tala" ? rp.modersmal?.tala : rp.modersmal?.lasaSkriva;
      if (yrkesnycklar.has(nyckel) && modersmal?.includes(val)) fel.push(`${namn} är redan modersmål och kan inte väljas som främmande språk (s. 66, 70)`);
    }
    if (id === "vapen" && vapenVillkor(regler, rp, val)) fel.push(vapenVillkor(regler, rp, val));
    if (id === "tva-vapen") {
      const vapen = val.split("+");
      for (const v of vapen) if (vapenVillkor(regler, rp, v)) fel.push(vapenVillkor(regler, rp, v));
      if (vapen.length !== 2 || vapen.some((v) => !regler.vapen.narstrid.some((x) => x.namn === v))) fel.push(`Två vapen gäller två närstridsvapen (s. 71)`);
      else {
        const tvahands = vapen.find((v) => tvahandsvapen(regler, v, varden));
        const krav = regler.vapen.narstrid.find((x) => x.namn === tvahands)?.styKrav;
        if (tvahands) fel.push(`${tvahands} är ett tvåhandsvapen för en rollperson med STY ${varden.STY} (STY-krav ${krav}) och kan inte ingå i Två vapen (s. 71–72)`);
      }
    }
  }
  if (rp.valfri && fardighetAv(regler, rp.valfri)?.typ === "primar") fel.push("Den valfria yrkesfärdigheten kan inte vara en primär färdighet (s. 18)");
  // Valfria färdigheter i ett paketval (Krigarmunk, RB-016) får inte heller vara primära
  for (const { post, nycklar } of yrkesPoster(regler, rp)) {
    const paket = post.valPaket?.[paketIndex(post, rp.yrkesval?.[yrkesPoster(regler, rp).findIndex((p) => p.post === post)])];
    if (paket?.valfria) for (const k of nycklar) if (fardighetAv(regler, k)?.typ === "primar") fel.push(`${fardighetAv(regler, k).namn} är en primär färdighet och kan inte väljas som valfri yrkesfärdighet (s. 18)`);
  }
}

const BC = (regler, varde) => slaUpp(regler.fardigheter.baschans, varde);

// Vilken vapengrupp ett vapen hör till för en viss STY (s. 72, 89).
export function vapengrupp(regler, vapennamn, sty) {
  const v = regler.vapen;
  const alla = [...v.narstrid, ...v.projektil, ...v.kast, ...v.skoldar];
  const vapen = alla.find((x) => x.namn === vapennamn);
  if (!vapen) return null;
  const delad = v.styBeroendeGrupper[vapen.grupp];
  if (delad) return vapen.styKrav > sty ? "tvahandsvapen" : delad;
  return vapen.grupp;
}

// Värdet av en grundegenskap. En färdighet med två grundegenskaper ("SMI/INT", t.ex. Strid i mörker)
// bygger på snittet av dem, alltid avrundat nedåt (RB-020).
export function egenskapsvarde(varden, ge) {
  const delar = String(ge ?? "").split("/");
  if (delar.length === 2) {
    const [a, b] = delar.map((d) => varden?.[d.trim()]);
    return a == null || b == null ? undefined : Math.floor((a + b) / 2);
  }
  return varden?.[ge];
}

// Grundegenskap för en färdighetsnyckel som "vapen:Bredsvärd" eller "hantverk:Smide".
export function grundegenskapFor(regler, nyckel, varden) {
  const f = fardighetAv(regler, nyckel);
  const val = nyckel.split(":")[1];
  if (f.grundegenskap !== "varierar") return f.grundegenskap;
  if (f.id === "vapen") {
    const g = vapengrupp(regler, val, varden.STY);
    return regler.vapen.grupper.find((x) => x.id === g)?.grundegenskap ?? "STY";
  }
  if (f.id === "hantverk") return regler.fardigheter.hantverk.find(([n]) => n === val)?.[1] ?? "SMI";
  return "SMI"; // Två vapen med olika grundegenskaper baseras på SMI (s. 71)
}

// Status för en färdighet: "primar", "yrke" eller "sekundar" (s. 10, 14–16, 18, 40).
export function status(regler, rp, nyckel) {
  const f = fardighetAv(regler, nyckel);
  const ras = rasAv(regler, rp.ras);
  const andrad = rp.sarskildaFormagor?.status?.[nyckel];
  if (andrad === "primar") return "primar";
  if (andrad === "yrke") return "yrke";
  const yrkeX = yrkeAv(regler, rp.yrke);
  if (yrkeX?.primara?.includes(nyckel) || postFor(regler, rp, nyckel, "primar")) return "primar"; // V&R: gratis FV 10 som primär
  if (klanTillganglig(regler, rp) && klanAv(regler, rp.klan?.id)?.primara?.includes(nyckel)) return "primar"; // Mindir: Kunskap om religion (Atum) (Dvärgar s. 24)
  if (rp.yrkesfardigheter.includes(nyckel) || rp.extraYrkesfardigheter.includes(nyckel)) return "yrke";
  const id = f.id;
  const val = nyckel.split(":")[1];
  if (rp.yrkesfardigheter.some((k) => k.startsWith(id + ":")) && f.gruppYrke) return "yrke";
  if (yrkeAv(regler, rp.yrke)?.yrkesgrupper?.includes(id)) return "yrke"; // t.ex. all lärdom för lärd man
  if (id === "kanna-magi" && yrkeAv(regler, rp.yrke)?.magiker) return "primar";
  if (nyckel === "lardom:Kunskap om magi" && yrkeAv(regler, rp.yrke)?.magiker) return "yrke";
  if (yrkeAv(regler, rp.yrke)?.automatiska?.includes(id)) return "yrke"; // Minimagi för Magis magiker (s. 8–9, 19)
  if (rp.rasval?.includes(nyckel)) return "primar";
  if (ras.primara.includes(id) || ras.primara.includes(nyckel)) return "primar";
  if (f.typ === "primar" && !ras.sekundara.includes(id)) return "primar";
  return "sekundar";
}

// Startvärde (BC + bonusar) för en färdighet (s. 34, 51–54, 71).
export function startvarde(regler, rp, nyckel, varden, stand, fvHittills) {
  const f = fardighetAv(regler, nyckel);
  const val = nyckel.split(":")[1];
  const ras = rasAv(regler, rp.ras);
  const yrke = yrkeAv(regler, rp.yrke);
  const st = status(regler, rp, nyckel);
  let start = 0;

  if (f.id === "tala" && rp.modersmal?.tala?.includes(val)) {
    const r = ras.talaModersmal.find((x) => x.sprak === val);
    start = r?.fv === 16 && stand.standsklass === "overklass" ? 20 : r?.fv ?? 16;
  } else if (f.id === "lasa-skriva" && rp.modersmal?.lasaSkriva?.includes(val)) {
    const rad = regler.fardigheter.lasaSkrivaModersmalBC[stand.standsklass];
    start = varden.INT >= 15 ? rad[0] : rad[1];
    const sankt = ras.lasaSkrivaModersmal.find((x) => typeof x === "object" && x.sprak === val);
    if (sankt) start = sankaBNiva(regler, start, sankt.bNivaLagre);
  } else if (st !== "sekundar") {
    start = BC(regler, egenskapsvarde(varden, grundegenskapFor(regler, nyckel, varden)));
  }

  // Magiker: Känna magi och Kunskap om magi följer FV i skolan (s. 62, 64). Magis magiker har också
  // Minimagi med samma FV som den bästa skolan (Magi i Chronopia s. 8–9, 19).
  if (yrke.magiker) {
    const skolor = regler.fardigheter.lista.filter((x) => x.typ === "magiskola").map((x) => x.id);
    const basta = Math.max(0, ...skolor.map((k) => fvHittills[k] ?? 0));
    if (f.id === "kanna-magi" && skolor.includes(val) && fvHittills[val]) start = Math.max(start, fvHittills[val]);
    if (nyckel === "lardom:Kunskap om magi") start = Math.max(start, basta);
    if (f.id === "minimagi" && yrke.automatiska?.includes("minimagi")) start = Math.max(start, basta);
  }

  // Ras- och yrkesbonusar vid start (s. 14–16, 21–22, 40, 60)
  for (const b of [...ras.startbonus, ...(yrke.startbonus ?? [])]) {
    if (b.valEttAv) {
      if (rp.hantverkBonus === nyckel) start += b.bc;
    } else if (b.fardighet === nyckel || b.fardighet === f.id) start += b.bc;
  }
  // Gratis FV i yrket (V&R: Vapenmästare, Smidesmästare, Sabransk ökenriddare)
  for (const b of yrke.startFV ?? []) if (b.fardighet === nyckel) start = Math.max(start, b.fv);
  const startPost = postFor(regler, rp, nyckel, "startFV");
  if (startPost) start = Math.max(start, startPost.startFV);
  start += postFor(regler, rp, nyckel, "bonus")?.bonus ?? 0; // Chronomag: +5 på två lärdomsfärdigheter (Magi s. 11)
  for (const s of rp.sarskildaFormagor?.fvBonus ?? []) if (s.fardighet === nyckel) start += s.fv;
  for (const s of rp.sarskildaFormagor?.fvMinst ?? []) if (s.fardighet === nyckel) start = Math.max(start, s.fv);

  // Vapengrupp: minst halva bästa FV i gruppen (s. 71)
  if (f.id === "vapen") {
    const grupp = vapengrupp(regler, val, varden.STY);
    for (const [annan, fv] of Object.entries(fvHittills)) {
      if (annan !== nyckel && annan.startsWith("vapen:") && vapengrupp(regler, annan.split(":")[1], varden.STY) === grupp) {
        start = Math.max(start, Math.floor(fv / 2));
      }
    }
  }
  return { start, status: st };
}

function sankaBNiva(regler, fv, steg) {
  const nivaer = [0, 1, 5, 11, 16, 20]; // lägsta FV per B-nivå (s. 43)
  const b = nivaer.findLastIndex((n) => fv >= n);
  return nivaer[Math.max(0, b - steg)];
}

// EP-kostnad för att gå från start till mål (s. 35–36).
// EP per FV-steg (s. 34–35). Stridskonster kostar summan av de valda teknikernas grundkostnad,
// avrundad uppåt, och 2 till om stilen inte är yrkesfärdighet (s. 68).
// Vapentekniker (V&R s. 15): summan av teknikernas kostnad, avrundad uppåt; en svärdsskolas stridskonst
// kostar skolans pris, eller som en vanlig yrkesfärdighet när den är yrkesfärdighet (RB-009).
export function epPerFV(regler, st, fardighet, tekniker = [], nyckel = "") {
  const k = regler.fardigheter.kostnad;
  if (fardighet.id === "vapentekniker") {
    const skola = svardsskolaFor(regler, nyckel);
    if (skola) return st === "yrke" ? k.yrke : skola.kostnad;
    const lista = teknikLista(regler, fardighet);
    return Math.max(1, Math.ceil(tekniker.reduce((a, t) => a + (lista.find(([n]) => n === t)?.[1] ?? 0), 0)));
  }
  if (fardighet.id === "stridskonster") {
    const summa = tekniker.reduce((a, t) => a + (regler.fardigheter.stridskonstTekniker.find(([n]) => n === t)?.[1] ?? 0), 0);
    return Math.ceil(summa) + (st === "yrke" ? 0 : 2);
  }
  if (fardighet.typ === "magiskola" && st === "sekundar") return k.magiskolaSekundar;
  return st === "primar" ? k.primar : st === "yrke" ? k.yrke : k.sekundar;
}

export function epKostnad(regler, st, fardighet, start, mal, tekniker, nyckel) {
  if (mal <= start) return 0;
  return (mal - start) * epPerFV(regler, st, fardighet, tekniker, nyckel);
}

// Räknar fram hela rollpersonen och alla regelbrott.
export function raknaRollperson(regler, indata) {
  tillampaBocker(regler, indata);
  const sf = sarskildFormaga(regler, indata);
  const rp = { ...indata, ...sf.tillagg };
  const ras = rasAv(regler, rp.ras);
  const yrke = yrkeAv(regler, rp.yrke);
  const fel = [...sf.fel];
  const alderEff = alderseffekter(regler, rp.alder);

  const niva = nivaFor(regler, rp);
  if ((rp.niva ?? 0) > 0 && !nivaer(regler, rp)?.[rp.niva]) fel.push("Erfarenhetsnivån finns inte med de valda böckerna (steg 0)");
  // Rasen och yrket måste finnas i de valda böckerna
  if (rp.rasVald !== false && !iBocker(ras, rp)) fel.push(`${ras.namn} finns i ${bokNamn(regler, bokFor(ras))}, som inte är vald (steg 0)`);
  if (!iBocker(yrke, rp)) fel.push(`${yrke.namn} finns i ${bokNamn(regler, bokFor(yrke))}, som inte är vald (steg 0)`);
  const villkor = rp.rasVald !== false ? yrkeVillkor(regler, rp, yrke) : null;
  if (villkor) fel.push(`${yrke.namn}: ${villkor.charAt(0).toLowerCase()}${villkor.slice(1)} (${kallText(regler, yrke, `s. ${yrke.sida}`)})`);
  const bpStart = niva.bp + alderEff.bp + (yrke.extraBP?.antal ?? 0);
  const ge = raknaGrundegenskaper(regler, rp);
  fel.push(...ge.fel);
  const sinnen = raknaSinnen(regler, rp);
  const familjarer = raknaFamiljarer(regler, rp);
  fel.push(...familjarer.fel);
  const tatueringar = raknaTatueringar(regler, rp, sf.tatueringar);
  fel.push(...tatueringar.fel);
  if ((rp.valfriaRegler ?? []).some((id) => !valfriaRegler(regler, rp).some((v) => v.id === id))) fel.push("En valfri regel hör till en bok som inte är vald (steg 0)");
  const bpUtgifter = {
    ras: rp.rasVald === false ? 0 : ras.bp, // ingen ras vald än: motorn räknar som för en människa, men inget kostar
    extraYrkesfardigheter: kostnadExtraYrken(regler, rp.extraYrkesfardigheter),
    grundegenskaper: ge.bp,
    sarskildaFormagor: sf.bp,
    svardshand: rp.svardshand.bp,
    socialtStand: rp.socialtStand.bp,
    startkapital: rp.startkapital.bp,
    sinnen: sinnen?.bp ?? 0,
    familjarer: familjarer.bp,
  };
  const bpKvar = bpStart - Object.values(bpUtgifter).reduce((a, b) => a + b, 0);
  // Högst 40 BP per slag på grundreglernas tabell (s. 30), 20 på V&R:s (s. 14)
  sf.perSlag.forEach(({ tabell }, i) => {
    const bp = formageslag(regler, rp)[i].bp ?? 0;
    const max = tabell?.maxBP ?? regler.slag.sarskildaFormagor.maxBP;
    if (bp > max) fel.push(`Högst ${max} BP per slag på ${tabell?.id === "grund" || !tabell ? "grundreglernas tabell (s. 30)" : `tabellen ${tabell.namn} (s. ${tabell.sida})`}`);
  });
  if (bpKvar < 0) fel.push(`${-bpKvar} BP för mycket har spenderats (s. 13)`);

  const harledda = raknaHarledda(regler, ge.varden, rp.harleddaJustering);
  const slag = raknaSlag(regler, rp, ras, yrke, alderEff);

  const epStart = alderEff.ep + Math.max(0, bpKvar) * 5;
  const fardigheter = [];
  const fvHittills = {};
  // Vapen med högst mål först, så att gruppens halva FV räknas rätt (s. 71)
  const forst = (k) => (fardighetAv(regler, k)?.typ === "magiskola" ? 0 : 1);
  const nycklar = Object.keys(rp.fardigheter).sort((a, b) => forst(a) - forst(b) || rp.fardigheter[b] - rp.fardigheter[a]);
  let epSpenderat = 0;
  for (const nyckel of nycklar) {
    const f = fardighetAv(regler, nyckel);
    if (!f) { fel.push(`Okänd färdighet: ${nyckel}`); continue; }
    const mal = rp.fardigheter[nyckel];
    const { start, status: st } = startvarde(regler, rp, nyckel, ge.varden, slag, fvHittills);
    const egenskap = grundegenskapFor(regler, nyckel, ge.varden);
    const tak = Math.max(start, takFor(regler, rp, nyckel, f, ge.varden, fvHittills));
    if (mal > tak) fel.push(`${namnFor(regler, f, nyckel)}: högst FV ${tak} vid start (s. 35)`);
    if (!iBocker(f, rp)) fel.push(`${f.namn} finns i ${bokNamn(regler, bokFor(f))}, som inte är vald (steg 0)`);
    if (fardighetVillkor(regler, rp, f)) fel.push(`${fardighetVillkor(regler, rp, f)} (${kallText(regler, f, `s. ${f.sida}`)})`);
    const tekniker = harTekniker(f) ? stilensTekniker(regler, rp, nyckel) : undefined;
    if (tekniker) {
      const okanda = tekniker.filter((t) => !teknikLista(regler, f).some(([n]) => n === t));
      if (okanda.length) fel.push(`Okänd stridskonstteknik: ${okanda.join(", ")}`);
      if (mal > start && !tekniker.length) fel.push(`${namnFor(regler, f, nyckel)}: välj stilens tekniker innan FV höjs (s. 68)`);
    }
    const ep = epKostnad(regler, st, f, start, mal, tekniker, nyckel);
    epSpenderat += ep;
    fvHittills[nyckel] = Math.max(mal, start);
    fardigheter.push({ nyckel, namn: namnFor(regler, f, nyckel), status: st, grundegenskap: egenskap, start, fv: Math.max(mal, start), ep,
      epPerFV: epPerFV(regler, st, f, tekniker, nyckel), kategoriB: f.kategoriB, ...(bNivaLagre(regler, nyckel) ? { bNivaLagre: bNivaLagre(regler, nyckel) } : {}), ...(tekniker ? { tekniker } : {}),
      ...(svardsskolaFor(regler, nyckel) ? { skola: svardsskolaFor(regler, nyckel) } : {}), ...(f.typ === "magiskola" ? { magiskola: true } : {}) });
  }
  kontrolleraVal(regler, rp, ge.varden, fel);

  // Samma yrkesfärdighet kan inte väljas två gånger (s. 18, 27)
  const sedda = new Set();
  for (const k of [...rp.yrkesfardigheter, ...rp.extraYrkesfardigheter].filter((x) => paborjad(x) === false)) {
    if (sedda.has(k)) fel.push(`${namnFor(regler, fardighetAv(regler, k), k)} är redan yrkesfärdighet (s. 27)`);
    sedda.add(k);
  }

  // Magiskolor utanför magikeryrkena kräver ett lyckat magiförmågeslag (s. 27, 106)
  // Sabransk ökenriddare: yrkets egen magiskola kräver inget slag, men andra skolor gör det (RB-011)
  const friSkola = (k) => Boolean(postFor(regler, rp, k, "utanMagiformagaslag")) || (rp.sarskildaFormagor?.friSkolor ?? []).includes(k);
  const arSkola = (k) => fardighetAv(regler, k)?.typ === "magiskola";
  const skolor = Object.keys(rp.fardigheter).filter((k) => arSkola(k) && !friSkola(k));
  const behoverSlag = !yrke.magiker && (skolor.length > 0 || rp.extraYrkesfardigheter.some((k) => arSkola(k) && !friSkola(k)));
  const harFriSkola = Object.keys(rp.fardigheter).some((k) => arSkola(k) && friSkola(k)) || rp.yrkesfardigheter.some((k) => arSkola(k) && friSkola(k));
  const magiformaga = { chans: Math.ceil((ge.varden.INT + ge.varden.PSY) / 2), behovs: behoverSlag, slag: rp.magiformaga?.slag ?? null, mod: sf.magiformaga };
  magiformaga.lyckat = magiformaga.slag !== null && magiformaga.slag + magiformaga.mod <= magiformaga.chans;
  // Slaget görs först när INT och PSY är bestämda, så ett saknat eller misslyckat slag är inte ett regelbrott
  // i sig utan något som återstår: slaget ska göras, eller magiskolan bytas ut.
  const vantar = [];
  if (behoverSlag && !magiformaga.lyckat) {
    vantar.push(magiformaga.slag === null ? "Magiskolor kräver ett magiförmågeslag (s. 106)" : "Magiförmågeslaget misslyckades, så rollpersonen kan inte lära sig magi (s. 106)");
  }

  // Kan rollpersonen lära sig besvärjelser? Magikeryrken, ett lyckat magiförmågeslag eller en skola utan slag
  const kanMagi = Boolean(yrke.magiker || magiformaga.lyckat || harFriSkola);
  const besvarjelser = raknaBesvarjelser(regler, rp, fardigheter, ge.varden, kanMagi, fel);
  const minimagi = raknaMinimagi(regler, rp, fardigheter, fel, kanMagi);
  epSpenderat += besvarjelser.reduce((a, b) => a + b.ep, 0);
  if (epSpenderat > epStart) fel.push(`${epSpenderat - epStart} EP för mycket har spenderats (s. 34)`);
  const utrustning = raknaUtrustning(regler, rp, ge.varden, slag.startkapital, fel);
  const stridshandlingar = raknaStridshandlingar(regler, rp, ge.varden, utrustning);

  return {
    ras, yrke, alderskategori: ge.alderskategori, grundegenskaper: ge.varden, grundegenskaperSatta: ge.satta, harledda, slag, magiformaga,
    sarskildFormaga: sf.formaga, sarskildaFormagorna: sf.formagor, hjaltepoang: sf.hjaltepoang, niva, saknas: sf.saknas, vantar, forLagaEgenskaper: ge.forLaga,
    klan: sf.klan, tatueringar, kanMagi,
    bp: { start: bpStart, utgifter: bpUtgifter, kvar: bpKvar },
    ep: { start: epStart, spenderat: epSpenderat, kvar: epStart - epSpenderat },
    fardigheter: fardigheter.map((f) => (sinnesMod(regler, sinnen, f.nyckel) ? { ...f, sinne: sinnesMod(regler, sinnen, f.nyckel) } : f))
      .sort((a, b) => a.namn.localeCompare(b.namn, "sv")),
    besvarjelser, minimagi, familjarer, utrustning, startutrustning: startvaror(regler, rp).ovriga, sinnen, stridshandlingar,
    fel,
  };
}

// FV i varje magiskola; allmänna besvärjelser styrs av den högsta (s. 106)
export function skolFV(fardigheter) {
  const fv = { animism: 0, elementarmagi: 0, mentalism: 0 };
  for (const f of fardigheter) if (f.nyckel in fv || f.magiskola) fv[f.nyckel] = f.fv;
  return { ...fv, allman: Math.max(...Object.values(fv)) };
}

// EP per FV-steg i en besvärjelse efter skolvärde: 2 för SV 1–3, sedan +1 per tre SV (s. 36)
export function besvarjelsePris(regler, sv) {
  const tabell = regler.besvarjelser.kostnad;
  const rad = tabell.find(([max]) => sv <= max);
  return rad ? rad[1] : tabell.at(-1)[1] + Math.ceil((sv - tabell.at(-1)[0]) / 3);
}

// Besvärjelser har ingen BC, bygger på PSY och kan bara läras upp till skolans FV i skolvärde (s. 36, 106–107)
function raknaBesvarjelser(regler, rp, fardigheter, varden, kanMagi, fel) {
  const B = regler.besvarjelser;
  const valda = Object.entries(rp.besvarjelser ?? {}).filter(([, fv]) => fv > 0);
  if (!B) return [];
  const skola = skolFV(fardigheter);
  const lista = valda.map(([nyckel, fv]) => {
    const [id, val] = nyckel.split(":");
    const b = B.lista.find((x) => x.id === id);
    if (!b) { fel.push(`Okänd besvärjelse: ${nyckel}`); return null; }
    const namn = val ? `${b.namn} (${val})` : b.namn;
    const tillatna = b.perVal === "varelsegrupp" ? B.varelsegrupper : b.perVal === "elementar" ? B.elementarer : null;
    if (tillatna && !tillatna.includes(val)) fel.push(`${b.namn}: välj vilken ${b.perVal === "elementar" ? "elementar" : "grupp av varelser"} den gäller (s. 120, 123)`);
    if (!iBocker(b, rp)) fel.push(`${namn} finns i ${bokNamn(regler, bokFor(b))}, som inte är vald (steg 0)`);
    if (b.villkor?.yrken && !b.villkor.yrken.includes(rp.yrke)) fel.push(`${namn}: ${B.grupper?.[b.grupp]?.namn ?? namn} kan bara läras av ${b.villkor.yrken.map((y) => yrkeAv(regler, y)?.namn.toLowerCase() ?? y).join(" och ")} (${kallText(regler, b)})`);
    if (!kanMagi) fel.push(`${namn}: rollpersonen kan inte lära sig magi (s. 106)`);
    else if (b.sv > (skola[b.skola] ?? 0)) {
      fel.push(`${namn} har skolvärde ${b.sv} men FV i ${b.skola === "allman" ? "bästa magiskolan" : B.skolor[b.skola].toLowerCase()} är ${skola[b.skola] ?? 0} (s. 106)`);
    }
    if (fv > varden.PSY) fel.push(`${namn}: högst FV ${varden.PSY}, samma som PSY (s. 36)`);
    const epPerFV = besvarjelsePris(regler, b.sv);
    return { nyckel, id, namn, skola: b.skola, ...(b.grupp ? { grupp: b.grupp } : {}), sv: b.sv, fv, epPerFV, ep: fv * epPerFV, rackvidd: b.rackvidd, varaktighet: b.varaktighet };
  }).filter(Boolean).sort((a, b) => a.skola.localeCompare(b.skola) || a.sv - b.sv || a.namn.localeCompare(b.namn, "sv"));
  tidsgrenar(regler, rp, lista, fel);
  return lista;
}

// Tidsmagins grenar (Magi i Chronopia s. 35): en divinator får en besvärjelse ur contortismen för varannan
// besvärjelse i förutskickelsen som den har lärt sig till FV 10, en chronomag en ur förutskickelsen för var tredje i contortismen.
export function tidsgrenTak(regler, rp, lista) {
  const T = regler.besvarjelser.tidsgrenar?.[rp.yrke];
  if (!T) return null;
  const egna = lista.filter((b) => b.grupp === T.egen && b.fv >= regler.besvarjelser.tidsgrenar.fv).length;
  return { ...T, tak: Math.floor(egna / T.per), anvanda: lista.filter((b) => b.grupp === T.annan).length };
}
function tidsgrenar(regler, rp, lista, fel) {
  const t = tidsgrenTak(regler, rp, lista);
  if (!t || t.anvanda <= t.tak) return;
  const G = regler.besvarjelser.grupper;
  fel.push(`${G[t.annan].namn}: högst ${t.tak} besvärjelse${t.tak === 1 ? "" : "r"}, en per ${t.per === 2 ? "varannan" : "var tredje"} besvärjelse i ${G[t.egen].namn.toLowerCase()} med FV ${regler.besvarjelser.tidsgrenar.fv} (Magi i Chronopia s. 35)`);
}

// Minimagiska besvärjelser (Magi i Chronopia s. 19, 28–29): gratis, två per FV i Minimagi
// Minimagi är magi: den som inte kan lära sig magi kan inte heller ha Minimagi (RB-018).
export function raknaMinimagi(regler, rp, fardigheter, fel = [], kanMagi = true) {
  const M = regler.besvarjelser?.minimagi;
  const valda = rp.minimagi ?? [];
  if (!M) return { fv: 0, max: 0, valda: [] };
  const fv = fardigheter.find((f) => f.nyckel === "minimagi")?.fv ?? 0;
  const max = fv * M.perFV;
  if (fv > 0 && !kanMagi) fel.push("Minimagi: rollpersonen kan inte lära sig magi (Magi i Chronopia s. 19, RB-018)");
  if (valda.length > max) fel.push(`Minimagi: högst ${max} minimagiska besvärjelser med FV ${fv} (Magi i Chronopia s. 19)`);
  for (const id of valda) if (!M.lista.some((x) => x.id === id)) fel.push(`Okänd minimagisk besvärjelse: ${id}`);
  return { fv, max, valda: valda.map((id) => M.lista.find((x) => x.id === id)).filter(Boolean) };
}

// Alla vapen och sköldar i en lista
export const allaVapen = (regler) => [...regler.vapen.narstrid, ...regler.vapen.projektil, ...regler.vapen.kast, ...regler.vapen.skoldar];

// Får rollpersonen bära vapnet? Några expansionsvapen bärs bara av vissa raser (Vapen & rustningar s. 64, 67).
// Ger en förklaring om inte, annars null. Vapen från en bok som inte är vald räknas också.
export function vapenVillkor(regler, rp, namn) {
  const vapen = allaVapen(regler).find((x) => x.namn === namn);
  if (!vapen) return null;
  if (vapen.somVapen) return `${namn} är inget eget vapen att lära sig; färdigheten är ${vapen.somVapen}`;
  if (!iBocker(vapen, rp)) return `${namn} finns i ${bokNamn(regler, bokFor(vapen))}, som inte är vald (steg 0)`;
  const raser = vapen.villkor?.ras;
  if (raser && !raser.includes(rp.ras)) {
    const namnen = raser.map((id) => rasAv(regler, id)?.namn ?? id);
    return `${namn} bärs bara av ${namnen.length > 1 ? `${namnen.slice(0, -1).join(", ")} och ${namnen.at(-1)}` : namnen[0]} (${kallText(regler, vapen)})`;
  }
  // Kejserliga vapen (V&R s. 63): bara för kejsarens tjänare, eller när spelledaren tillåter dem (steg 0)
  if (vapen.kejserligt && !kejserligtTillatet(regler, rp)) return `${namn} är ett kejserligt vapen, bara för kejsarens tjänare (${kallText(regler, regler.vapen.kejserligt)}); spelledaren kan tillåta det i steg 0`;
  return null;
}
export const kejserligtTillatet = (regler, rp) => Boolean(yrkeAv(regler, rp.yrke)?.kejsarensTjanare) || regelPa(regler, rp, "kejserliga-varor");
// Varor som är förbjudna enligt kejsarens lag (åtkomlighet X, V&R s. 69) kräver spelledarens tillstånd
export const forbjudenVara = (regler, rp, vara) => /\bX\b/.test(vara?.atkomlighet ?? "") && !regelPa(regler, rp, "kejserliga-varor");

// Kan rollpersonen över huvud taget använda vapnet? (s. 89, 91, 94)
export function kanAnvandaVapen(regler, namn, varden) {
  const v = regler.vapen;
  const narstrid = v.narstrid.find((x) => x.namn === namn);
  if (narstrid) return narstrid.styKrav <= varden.STY * 2; // med två händer räknas STY dubbelt
  const projektil = v.projektil.find((x) => x.namn === namn);
  if (projektil) return projektil.styKrav <= varden.STY * (projektil.tvaHander ? 2 : 1);
  const kast = v.kast.find((x) => x.namn === namn);
  if (kast) return kast.styKrav <= varden.STY; // kastvapen hålls alltid med en hand
  const skold = v.skoldar.find((x) => x.namn === namn);
  if (skold) return skold.styKrav <= varden.STY;
  return false;
}

// Alla saker som går att köpa, med pris och vikt (s. 90–102). Med rp bara saker ur de valda böckerna.
export function varukatalog(regler, rp) {
  const U = regler.utrustning;
  if (!U) return [];
  const v = regler.vapen;
  const alla = [
    ...U.varor,
    ...U.rustningar.map((r) => ({ ...r, kategori: "Rustning" })),
    ...v.narstrid.filter((x) => x.pris).map((x) => ({ ...x, kategori: "Närstridsvapen" })),
    ...v.projektil.map((x) => ({ ...x, kategori: "Avståndsvapen" })),
    ...v.kast.map((x) => ({ ...x, kategori: "Kastvapen" })),
    ...v.skoldar.map((x) => ({ ...x, kategori: "Sköldar" })),
  ];
  // Varor som kräver en valfri regel (axelskydd, halva arm- och benskydd, rustningsvapen: Detaljerad strid, RB-017)
  return rp ? alla.filter((x) => iBocker(x, rp) && (!x.kraverRegel || regelPa(regler, rp, x.kraverRegel))) : alla;
}

// Underkategorier i utrustningens stora kategorier (fler än `grans` varor): efter vapnets grupp, rustningens typ
// eller en lista med varunamn. Ger underkategorins namn, eller null när kategorin inte delas upp.
export function underkategoriOrdning(regler, kategori) {
  const u = regler.utrustning?.underkategorier?.[kategori];
  if (!u) return [];
  return [...new Set([...Object.values(u.namn ?? {}), ...Object.keys(u.varor ?? {}), "Övrigt"])];
}
export function underkategori(regler, vara) {
  const u = regler.utrustning?.underkategorier?.[vara.kategori];
  if (!u) return null;
  if (u.falt) return u.namn[vara[u.falt]] ?? "Övrigt";
  return Object.entries(u.varor).find(([, namn]) => namn.includes(vara.namn))?.[0] ?? "Övrigt";
}

// Yrkets startutrustning: rader som motsvarar en vara i katalogen läggs gratis i packningen (Vapen & rustningar s. 4–12)
// En vara som kräver en valfri regel (t.ex. Hedersvaktens axelplåt: axelskydd i detaljerad strid) byts annars
// mot en liknande vara som fungerar med grundreglerna (`annars`).
export function startvaror(regler, rp) {
  const yrke = yrkeAv(regler, rp.yrke);
  const kopplade = (yrke?.startvaror ?? []).map((v) => (v.kraverRegel && !regelPa(regler, rp, v.kraverRegel)
    ? { ...v, namn: v.annars, ersatter: v.namn } : v));
  return { varor: kopplade, ovriga: (yrke?.startutrustning ?? []).filter((t) => !kopplade.some((v) => v.text === t)) };
}

// Detaljerad strid (V&R s. 18–19, RB-017): handlingar per stridsrunda efter SMI och bördan.
// Extra handlingar för vapen och sköld, två vapen, lätta vapen och högt FV beror på vad som används och står som text.
const DETALJERAD = "detaljerad-strid";
export function raknaStridshandlingar(regler, rp, varden, utrustning) {
  if (!regelPa(regler, rp, DETALJERAD)) return null;
  const regel = valfriaRegler(regler, rp).find((v) => v.id === DETALJERAD);
  const h = regel.handlingar;
  const bas = slaUpp(h.smi, varden.SMI ?? 0);
  const borda = utrustning?.handlingar ?? 0;
  return { regel, bas, borda, antal: Math.max(0, bas + borda), extra: h.extra, spel: h.spel, sida: h.sida };
}

// Inköp betalas med startkapitalet; startpaketet är gratis (s. 38)
function raknaUtrustning(regler, rp, varden, startkapital, fel) {
  const U = regler.utrustning;
  if (!U) return { kostnad: 0, kvar: startkapital, vikt: 0, saker: [], borda: 0, barformaga: varden.STY, belastning: null };
  const katalog = varukatalog(regler);
  const saker = [];
  let kostnad = 0;
  const lagg = (vara, namn, antal, gratis) => {
    saker.push({ namn, antal, pris: gratis ? 0 : vara.pris, kategori: vara.kategori, gratis, vikt: Math.round((vara.vikt ?? 0) * antal * 10) / 10 });
  };
  for (const [namn, antal] of Object.entries(rp.utrustning ?? {})) {
    if (!(antal > 0)) continue;
    const vara = katalog.find((x) => x.namn === namn);
    if (!vara) { fel.push(`Okänd vara: ${namn}`); continue; }
    if (!iBocker(vara, rp)) fel.push(`${namn} finns i ${bokNamn(regler, bokFor(vara))}, som inte är vald (steg 0)`);
    else if (forbjudenVara(regler, rp, vara)) fel.push(`${namn} är förbjuden enligt kejsarens lag; spelledaren kan tillåta förbjudna varor i steg 0`);
    else if (vara.kraverRegel && !regelPa(regler, rp, vara.kraverRegel)) fel.push(`${namn} kräver den valfria regeln ${valfriaRegler(regler, rp).find((v) => v.id === vara.kraverRegel)?.namn ?? vara.kraverRegel} (steg 0)`);
    else if (vapenVillkor(regler, rp, namn)) fel.push(vapenVillkor(regler, rp, namn));
    kostnad += vara.pris * antal;
    lagg(vara, namn, antal, false);
  }
  for (const { namn, antal = 1 } of startvaror(regler, rp).varor) {
    const vara = katalog.find((x) => x.namn === namn) ?? allaVapen(regler).find((x) => x.namn === namn); // t.ex. hederssvärdet, som inte säljs
    if (vara) saker.push({ namn, antal, pris: 0, kategori: vara.kategori ?? "Närstridsvapen", gratis: true, yrke: true, vikt: Math.round((vara.vikt ?? 0) * antal * 10) / 10 });
  }
  const paket = rp.startpaket;
  if (paket?.valt) {
    for (const namn of U.startpaket.varor) {
      const vara = katalog.find((x) => x.namn === namn);
      if (vara) lagg(vara, namn, 1, true);
    }
    // Ger yrket vapen i startutrustningen ingår inget vapen i startpaketet
    if (paket.vapen && yrkeAv(regler, rp.yrke)?.startvapen) fel.push("Yrket har vapen i startutrustningen, så startpaketet har inget vapen");
    else if (paket.vapen) {
      const vapen = katalog.find((x) => x.namn === paket.vapen);
      if (!vapen || !kanAnvandaVapen(regler, paket.vapen, varden)) fel.push(`${paket.vapen} kan inte användas av rollpersonen (s. 89)`);
      else if (vapenVillkor(regler, rp, paket.vapen)) fel.push(vapenVillkor(regler, rp, paket.vapen));
      else if (vapen.pris > U.startpaket.vapenMaxPris) fel.push(`Startpaketets vapen får kosta högst ${U.startpaket.vapenMaxPris} sm`);
      else lagg(vapen, paket.vapen, 1, true);
    }
  }
  if (kostnad > startkapital) fel.push(`Inköpen kostar ${kostnad} sm men startkapitalet är ${startkapital} sm (s. 38)`);
  const borda = bordaFor(regler, saker, varden);
  // Vapen & rustningar s. 69: tung last kostar handlingar i detaljerad strid
  const bh = U.bordaHandlingar;
  const handlingar = bh && iBocker(bh, rp) && regelPa(regler, rp, DETALJERAD) && borda.borda > borda.barformaga
    ? (bh.rader.find((r) => borda.borda <= borda.barformaga * r.gange) ?? bh.rader.at(-1)).mod : null;
  return { kostnad, kvar: startkapital - kostnad, ...borda, handlingar: handlingar || null, saker };
}

// Bärförmåga (s. 100): STY kg utan nackdelar. Kläder räknas inte, en buren rustning väger hälften.
export function bordaFor(regler, saker, varden) {
  const vikt = saker.reduce((a, x) => a + x.vikt, 0);
  const borda = saker.reduce((a, x) => a + (x.kategori === "Kläder" ? 0 : x.kategori === "Rustning" ? x.vikt / 2 : x.vikt), 0);
  const barformaga = varden.STY;
  const belastning = borda <= barformaga ? null
    : regler.utrustning.barformaga.find((r) => borda <= barformaga * r.gange) ?? { gange: null, mod: null, text: "Rollpersonen orkar inte bära så mycket." };
  return { vikt: Math.round(vikt * 10) / 10, borda: Math.round(borda * 10) / 10, barformaga, belastning };
}

function takFor(regler, rp, nyckel, f, varden, fvHittills) {
  let tak = egenskapsvarde(varden, grundegenskapFor(regler, nyckel, varden)) ?? 20;
  if (f.tak === "PSY") tak = Math.min(tak, varden.PSY);
  if (f.tak === "lasa-skriva") {
    const ls = Object.entries(fvHittills).filter(([k]) => k.startsWith("lasa-skriva:")).map(([, v]) => v);
    tak = Math.min(tak, Math.max(0, ...ls));
  }
  if (f.typ === "magiskola" && yrkeAv(regler, rp.yrke).skolTak) tak = Math.min(tak, varden.INT);
  const takPost = postFor(regler, rp, nyckel, "takStart");
  if (takPost) tak = Math.min(tak, takPost.takStart);
  // Drakonitiska kan aldrig bli högre än FV 5 för andra än drakoniter (s. 64)
  const sprak = regler.fardigheter.sprak.find((x) => x.id === nyckel.split(":")[1]);
  if (f.id === "tala" && sprak?.maxFvAndra && rp.ras !== sprak.utanTakFor) tak = Math.min(tak, sprak.maxFvAndra);
  return tak + (rp.sarskildaFormagor?.takBonus?.[nyckel] ?? 0);
}

export function namnFor(regler, f, nyckel) {
  const val = nyckel.split(":")[1];
  if (!val) return f.namn;
  if (f.id === "vapen") return val;
  const sprak = regler.fardigheter.sprak.find((x) => x.id === val)?.namn ?? val;
  if (f.id === "tala") return `Tala ${sprak}`;
  if (f.id === "lasa-skriva") return `Läsa/Skriva ${sprak}`;
  if (f.id === "lardom") return val;
  if (f.id === "kanna-magi") return `Känna ${val}`;
  return `${f.namn} (${val})`;
}

// Färdigheter som räknas som magi och därför inte får väljas för "ej magi" (s. 30–31).
const MAGI = ["kanna-magi", "magisk-kanalisering", "magistudier"];
const arMagi = (f) => f.typ === "magiskola" || MAGI.includes(f.id);

// Kan färdigheten väljas för en särskild förmåga med gruppen "bland"?
export function passarBland(regler, rp, nyckel, bland) {
  const f = fardighetAv(regler, nyckel);
  if (!f) return false;
  if (f.perVal && !nyckel.split(":")[1]) return false;
  if (Array.isArray(bland)) return bland.includes(f.id);
  if (bland === "magiskola") return f.typ === "magiskola" && fardighetValbar(regler, rp, f);
  if (bland === "alla-ej-magi") return !arMagi(f);
  if (bland === "sekundar-ej-magi") return !arMagi(f) && status(regler, rp, nyckel) === "sekundar";
  if (bland === "sprak") return f.id === "tala";
  return f.id === bland;
}

// Tabellerna för särskilda förmågor. sarskilda-formagor.json är antingen grundreglernas tabell (en lista med rader)
// eller { tabeller: [{ id, namn, tarning, sida, kraver?, rader }] } när expansionernas tabeller läggs in.
// kraver: { bok?, raser?, yrken? } – en tabell som rollpersonen inte har tillgång till visas inte alls.
// maxBP: högst så många BP per slag (grundreglerna 40, s. 30; V&R 20, s. 14).
export function formagetabeller(regler) {
  const data = regler["sarskilda-formagor"];
  if (Array.isArray(data)) {
    return [{ id: "grund", namn: "Grundreglerna", tarning: regler.slag?.sarskildaFormagor?.tarning ?? "2T20", sida: "30–32", maxBP: regler.slag?.sarskildaFormagor?.maxBP ?? 40, rader: data }];
  }
  return data.tabeller;
}
const tabellTillganglig = (t, rp) => {
  const k = t.kraver ?? {};
  const bok = k.bok ?? k.expansion;
  if (bok && !valdaBocker(rp).includes(bok)) return false;
  if (k.raser && !k.raser.includes(rp.ras)) return false;
  if (k.yrken && !k.yrken.includes(rp.yrke)) return false;
  return true;
};
export const tillgangligaFormagetabeller = (regler, rp) => formagetabeller(regler).filter((t) => tabellTillganglig(t, rp));
// Tabellen som rollpersonen slår på: den valda, annars den första som rollpersonen har tillgång till.
// s är slaget (rp.sarskildaFormagor eller ett av de fler slagen på högre nivåer).
export function formagetabell(regler, rp, s = rp.sarskildaFormagor) {
  const id = s?.tabell;
  return id ? formagetabeller(regler).find((t) => t.id === id) : tillgangligaFormagetabeller(regler, rp)[0];
}
// Slagen för särskilda förmågor: ett per förmåga som erfarenhetsnivån ger (RB-001). Det första är rp.sarskildaFormagor,
// de övriga ligger i rp.sarskildaFormagor.fler.
export function formageslag(regler, rp) {
  const s = rp.sarskildaFormagor ?? {};
  const antal = nivaFor(regler, rp).formagor;
  return Array.from({ length: antal }, (_, i) => (i === 0 ? s : s.fler?.[i - 1] ?? { bp: 0, slag: null, val: [], avstar: false }));
}
export const tarningAv = (tarning) => { const [, n, sidor] = /^(\d+)T(\d+)$/.exec(tarning); return { n: +n, sidor: +sidor }; };
export const slagIntervall = ({ slag: [fran, till] }) => (till === null ? `${fran}+` : fran === till ? `${fran}` : `${fran}–${till}`);

// Vilka särskilda förmågor rollpersonen har och vad de ger, utifrån spelarens val (s. 30–32).
// Varje slag räknas för sig (enFormaga) och effekterna läggs ihop. formaga är det första slagets förmåga
// (för rollpersoner med en förmåga), formagor alla slagens. Hjältepoäng från förmågorna kan användas redan
// vid skapandet (RB-003): rp.hjaltepoangKop är grundegenskaper som höjs för 5 HP per poäng (s. 76).
export function sarskildFormaga(regler, rp) {
  const s = rp.sarskildaFormagor ?? {};
  const slag = formageslag(regler, rp);
  const flera = slag.length > 1;
  const svar = { formaga: null, formagor: [], perSlag: [], fel: [], saknas: [], magiformaga: 0, bp: 0, hjaltepoang: null, tillagg: {}, klan: null, tatueringar: [] };
  const fvBonus = [];
  const fvMinst = [];
  const takBonus = {};
  const andrad = {};
  const egenskapsbonus = {};
  const harledda = { kpFaktor: 1, forflyttningBonus: 0 };
  const slagbonus = {};
  const friSkolor = [];
  const tekniker = {};
  let arv = 0;
  let svardshand;
  let hp = 0;
  let hpSlagna = true;
  const gratisFamiljarer = [];
  // Effekterna av en förmåga (särskild förmåga eller klanförmåga) läggs ihop med de andras
  const lagTill = (r, namn) => {
    svar.magiformaga += r.magiformaga;
    const d = r.delar;
    fvBonus.push(...d.fvBonus);
    fvMinst.push(...d.fvMinst);
    for (const [k, v] of Object.entries(d.takBonus)) takBonus[k] = (takBonus[k] ?? 0) + v;
    Object.assign(andrad, d.andrad);
    for (const [g, m] of Object.entries(d.egenskapsbonus)) egenskapsbonus[g] = (egenskapsbonus[g] ?? 0) + m;
    for (const [k, v] of Object.entries(d.slagbonus)) slagbonus[k] = (slagbonus[k] ?? 0) + v;
    friSkolor.push(...d.friSkolor);
    Object.assign(tekniker, d.tekniker);
    harledda.kpFaktor = Math.max(harledda.kpFaktor, d.kpFaktor);
    harledda.forflyttningBonus += d.forflyttningBonus;
    arv += d.arv;
    if (d.svardshand !== undefined) svardshand = d.svardshand;
    if (d.hp !== null) { hp += d.hp ?? 0; if (d.hp === undefined) hpSlagna = false; }
    gratisFamiljarer.push(...d.familjarer.map((id) => ({ id, kalla: namn })));
    svar.tatueringar.push(...d.tatueringar.map((id) => ({ id, fran: namn })));
  };
  slag.forEach((sl, nr) => {
    const r = enFormaga(regler, rp, sl);
    const pre = flera ? `Förmåga ${nr + 1}: ` : "";
    // Samma förmåga två gånger: slaget görs om (de lagda BP står kvar) och den andra förmågan gäller inte
    const dubblett = r.formaga ? svar.perSlag.findIndex((x) => x.formaga?.namn === r.formaga.namn) : -1;
    if (dubblett >= 0) r.dubblett = dubblett;
    svar.perSlag.push(r);
    svar.bp += sl.bp ?? 0;
    svar.formagor.push(r.formaga);
    if (dubblett >= 0) { svar.fel.push(`${pre}samma förmåga som förmåga ${dubblett + 1} (${r.formaga.namn}); slå om`); return; }
    svar.fel.push(...r.fel.map((t) => pre + t));
    svar.saknas.push(...r.saknas.map((t) => pre + t));
    lagTill(r, r.formaga?.namn);
  });
  // Klanförmågan (Dvärgar i Chronopia s. 4): en extra förmåga för medlemmar i en namngiven klan, utan BP
  const klan = raknaKlan(regler, rp);
  svar.klan = klan;
  svar.fel.push(...klan.fel);
  if (klan.formaga) {
    const r = formagansRegler(regler, rp, klan.formaga, rp.klan?.val ?? []);
    svar.fel.push(...r.fel.map((t) => `Klanförmåga: ${t}`));
    klan.saknas.push(...r.saknas);
    lagTill(r, `${klan.formaga.namn} (klan ${klan.klan.namn})`);
  }
  // Slag utöver nivåns antal får inte ha BP (t.ex. kvar från en högre nivå)
  (s.fler ?? []).slice(slag.length - 1).forEach((sl) => { if (sl?.bp) svar.fel.push("Rollpersonen har inte fler särskilda förmågor på den här nivån"); });
  svar.formaga = svar.formagor[0];
  const kop = rp.hjaltepoangKop ?? {};
  const spenderat = Object.values(kop).reduce((a, n) => a + n, 0) * (regler.erfarenhet?.hjaltepoang.egenskap.hp ?? 5);
  const harHp = svar.perSlag.some((r) => r.delar.hp !== null);
  if (harHp || spenderat) {
    svar.hjaltepoang = { totalt: hp, spenderat, kvar: hp - spenderat, slagna: hpSlagna };
    if (spenderat > hp) svar.fel.push(`Rollpersonen har bara ${hp} hjältepoäng (RB-003)`);
    for (const [g, n] of Object.entries(kop)) {
      if (!GRUNDEGENSKAPER.includes(g) || !Number.isInteger(n) || n < 0) svar.fel.push("Hjältepoäng kan bara höja STY, FYS, SMI, INT, PSY och KAR (s. 76)");
      else egenskapsbonus[g] = (egenskapsbonus[g] ?? 0) + n;
    }
  }
  svar.tillagg = {
    sarskildaFormagor: { ...s, fvBonus, fvMinst, takBonus, status: andrad, friSkolor, tekniker },
    egenskapsbonus, harleddaJustering: harledda, arv, gratisFamiljarer, klanSlagbonus: slagbonus,
    svardshand: { ...rp.svardshand, overstyrd: svardshand },
  };
  return svar;
}

// Ett slag på en tabell för särskilda förmågor. s = { bp, slag, val, tabell, avstar }.
const tommaDelar = () => ({ fvBonus: [], fvMinst: [], takBonus: {}, andrad: {}, egenskapsbonus: {}, kpFaktor: 1, forflyttningBonus: 0, arv: 0,
  svardshand: undefined, hp: null, familjarer: [], slagbonus: {}, friSkolor: [], tekniker: {}, tatueringar: [] });
export function enFormaga(regler, rp, s) {
  const svar = { formaga: null, tabell: null, fel: [], saknas: [], magiformaga: 0, delar: tommaDelar() };
  const tabell = formagetabell(regler, rp, s);
  svar.tabell = tabell;
  if (s.tabell && (!tabell || !tabellTillganglig(tabell, rp))) svar.fel.push(`Rollpersonen kan inte slå på tabellen ${tabell?.namn ?? s.tabell}`);
  if (s.avstar && s.bp) svar.fel.push("Du har kryssat i att du inte vill lägga BP på särskilda förmågor");
  if (!s.bp || s.slag === null || s.slag === undefined || !tabell) return svar;
  const summa = s.slag + s.bp;
  const formaga = tabell.rader.find(({ slag: [fran, till] }) => summa >= fran && (till === null || summa <= till));
  if (!formaga) return svar;
  const r = formagansRegler(regler, rp, formaga, s.val);
  return { ...r, tabell, fel: [...svar.fel, ...r.fel] };
}

// Vad en förmåga ger: varje del i förmågans regel med spelarens val (val[i] hör till del i).
// Används för särskilda förmågor och klanförmågor.
export function formagansRegler(regler, rp, formaga, valLista = []) {
  const svar = { formaga, tabell: null, fel: [], saknas: [], magiformaga: 0, delar: tommaDelar() };
  const d = svar.delar;
  (formaga.regel ?? []).forEach((del, i) => {
    const val = valLista?.[i];
    if (del.typ === "fv") {
      let nycklar = [...(del.fasta ?? [])];
      if (del.valj) {
        // En nyckel som slutar på ":" är ett påbörjat val (t.ex. "vapen:" innan vapnet är valt)
        const valda = [].concat(val ?? []).filter((k) => paborjad(k) === false);
        if (valda.length < del.valj) svar.saknas.push(`Välj ${del.valj - valda.length} färdighet${del.valj - valda.length > 1 ? "er" : ""} för ${formaga.namn}`);
        if (valda.length > del.valj || new Set(valda).size !== valda.length) svar.fel.push(`${formaga.namn}: välj ${del.valj} olika färdigheter (s. 30–32)`);
        for (const k of valda) {
          if (!passarBland(regler, rp, k, del.bland)) svar.fel.push(`${formaga.namn} gäller inte ${k.split(":")[1] ?? fardighetAv(regler, k)?.namn ?? k} (s. 30–32)`);
        }
        nycklar.push(...valda);
      }
      if (del.bland === "sprak") {
        nycklar = nycklar.flatMap((k) => {
          const sprak = regler.fardigheter.sprak.find((x) => x.id === k.split(":")[1]);
          return sprak?.skriftsprak === false || sprak?.endastTala ? [k] : [k, `lasa-skriva:${k.split(":")[1]}`];
        });
      }
      for (const k of nycklar) {
        // omHar: bonusen gäller bara om rollpersonen har färdigheten ändå (Mindirs +3 i Atums väg)
        if (del.fv) (del.minst ? d.fvMinst : d.fvBonus).push({ fardighet: k, fv: del.fv, ...(del.omHar ? { omHar: true } : {}) });
        if (del.tak) d.takBonus[k] = (d.takBonus[k] ?? 0) + del.fv;
        if (del.status) d.andrad[k] = del.status;
        if (del.friSkola) d.friSkolor.push(k); // skolan kräver inget magiförmågeslag (Durban, RB-021)
        if (del.tekniker) d.tekniker[k] = del.tekniker;
      }
    } else if (del.typ === "egenskap") {
      for (const [g, m] of Object.entries(del.mod)) d.egenskapsbonus[g] = (d.egenskapsbonus[g] ?? 0) + m;
    } else if (del.typ === "egenskapVal") {
      const lage = val?.lage;
      const valda = (val?.egenskaper ?? []).filter(Boolean);
      const antal = lage === "en" ? 1 : 3;
      if (!lage || valda.length < antal) svar.saknas.push(`Välj grundegenskaper för ${formaga.namn}`);
      if (valda.length > antal || new Set(valda).size !== valda.length || valda.some((g) => !GRUNDEGENSKAPER.includes(g))) {
        svar.fel.push(`${formaga.namn}: +1 på tre olika grundegenskaper eller +2 på en (s. 32)`);
      }
      for (const g of valda) d.egenskapsbonus[g] = (d.egenskapsbonus[g] ?? 0) + (lage === "en" ? 2 : 1);
    } else if (del.typ === "forflyttning") d.forflyttningBonus += del.varde;
    else if (del.typ === "kpFaktor") d.kpFaktor = Math.max(d.kpFaktor, del.varde);
    else if (del.typ === "kapital") d.arv += del.varde;
    else if (del.typ === "svardshand") d.svardshand = del.varde;
    else if (del.typ === "magiformaga") svar.magiformaga += del.varde;
    else if (del.typ === "hjaltepoang") {
      // Hjältepoängen slås när förmågan har kommit upp (t.ex. 3T20 för Hjälte, V&R s. 15). val = { slag, tarningar }
      const { n, sidor } = tarningAv(del.tarning);
      if (!Number.isInteger(val?.slag)) { svar.saknas.push(`Slå ${del.tarning} för hjältepoängen (${formaga.namn})`); d.hp = undefined; }
      else if (val.slag < n || val.slag > n * sidor) svar.fel.push(`${formaga.namn}: hjältepoängen är ${del.tarning}, ${n}–${n * sidor}`);
      else d.hp = val.slag;
    } else if (del.typ === "slagbonus") {
      for (const k of ["socialtStand", "startkapital"]) if (del[k]) d.slagbonus[k] = (d.slagbonus[k] ?? 0) + del[k];
    } else if (del.typ === "tatuering") {
      // Bärsärk (Dvärgar i Chronopia s. 15): en levande tatuering med insikt högst maxNr. val = tatueringens id
      const t = val ? tatueringAv(regler, val) : null;
      if (!val) svar.saknas.push(`Välj tatuering för ${formaga.namn}`);
      else if (!t) svar.fel.push(`${formaga.namn}: okänd tatuering ${val}`);
      else if (del.maxNr && t.nr > del.maxNr) svar.fel.push(`${formaga.namn}: insikten får vara högst ${del.maxNr}`);
      else d.tatueringar.push(val);
    } else if (del.typ === "familjar") {
      // Spiritus familiarius: en valfri familjar gratis (Magi i Chronopia s. 17). val = familjarens id
      if (!val) svar.saknas.push(`Välj familjar för ${formaga.namn}`);
      else if (!familjarAv(regler, val)) svar.fel.push(`${formaga.namn}: okänd familjar ${val}`);
      else d.familjarer.push(val);
    }
  });
  return svar;
}
