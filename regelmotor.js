// Regelmotor för Chronopia-rollpersonsskaparen.
// Tar regeldata (regler-json) och en rollperson (spelarens val) och räknar fram allt som följer av reglerna.
// Sidhänvisningar avser tryckta sidor i regelboken.

export const GRUNDEGENSKAPER = ["STY", "FYS", "SMI", "INT", "PSY", "KAR"];

// Slår upp i en tabell av [övre gräns, värde]; null som gräns betyder "och uppåt".
export function slaUpp(tabell, varde) {
  for (const [grans, ...resten] of tabell) {
    if (grans === null || varde <= grans) return resten.length === 1 ? resten[0] : resten;
  }
  return undefined;
}

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
  for (const g of GRUNDEGENSKAPER) {
    const grund = rp.grundvarden[g];
    const kostnad = regler.grundegenskaper.kostnad[String(grund)];
    if (kostnad === undefined) fel.push(`${g}: grundvärdet måste vara 3–18 (s. 27)`);
    bp += kostnad ?? 0;
    varden[g] = grund + ras.mod[g] + aldersmod[g] + (rp.egenskapsbonus?.[g] ?? 0);
    if (varden[g] < regler.grundegenskaper.minstSlutvarde) fel.push(`${g} blir ${varden[g]}, men måste bli minst 3 (s. 27)`);
  }
  const steg = rp.stoSteg ?? 0;
  const s = regler.grundegenskaper.sto;
  if (steg > 0) bp += s.hojning[steg - 1];
  if (steg < 0) bp -= s.sankning[-steg - 1];
  varden.STO = ras.sto.normal + steg;
  if (varden.STO < ras.sto.min || varden.STO > ras.sto.max) fel.push(`STO måste ligga inom ${ras.sto.min}–${ras.sto.max} (s. 14, 28)`);
  return { varden, bp, alderskategori: kat, fel };
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
  const ssResultat = rp.socialtStand.slag + rp.socialtStand.bp + (ras.slagbonus.socialtStand ?? 0);
  const [stand, klass] = slaUpp(t.socialtStand.tabell, ssResultat);
  const skBonus = (ras.slagbonus.startkapital ?? 0) + (yrke.slagbonus?.startkapital ?? 0);
  const tak = ssResultat + (yrke.kapitaltak ?? t.startkapital.tak);
  const skResultat = Math.min(
    rp.startkapital.slag + rp.startkapital.bp + Math.ceil(rp.socialtStand.bp / 2) + skBonus, tak);
  const silver = slaUpp(t.startkapital.tabell, skResultat) * alderEff.kapital + (rp.arv ?? 0);
  return { svardshand, socialtStand: stand, standsklass: klass, ssResultat, skResultat, startkapital: silver };
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
  if (rp.yrkesfardigheter.includes(nyckel) || rp.extraYrkesfardigheter.includes(nyckel)) return "yrke";
  const id = f.id;
  const val = nyckel.split(":")[1];
  if (rp.yrkesfardigheter.some((k) => k.startsWith(id + ":")) && f.gruppYrke) return "yrke";
  if (id === "lardom" && rp.yrke === "lard-man") return "yrke";
  if (id === "kanna-magi" && yrkeAv(regler, rp.yrke)?.magiker) return "primar";
  if (nyckel === "lardom:Kunskap om magi" && yrkeAv(regler, rp.yrke)?.magiker) return "yrke";
  if (rp.rasval?.includes(nyckel)) return "primar";
  if (ras.primara.includes(id) || ras.primara.includes(nyckel)) return "primar";
  if (id === "vapen" && ras.id === "ljusalv" && val === "Långbåge") return "primar";
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
    start = BC(regler, varden[grundegenskapFor(regler, nyckel, varden)]);
  }

  // Magiker: Känna magi och Kunskap om magi följer FV i skolan (s. 62, 64)
  if (yrke.magiker) {
    const skolor = ["animism", "elementarmagi", "mentalism"];
    if (f.id === "kanna-magi" && skolor.includes(val) && fvHittills[val]) start = Math.max(start, fvHittills[val]);
    if (nyckel === "lardom:Kunskap om magi") start = Math.max(start, ...skolor.map((k) => fvHittills[k] ?? 0));
  }

  // Ras- och yrkesbonusar vid start (s. 14–16, 21–22, 40, 60)
  for (const b of [...ras.startbonus, ...(yrke.startbonus ?? [])]) {
    if (b.valEttAv) {
      if (rp.hantverkBonus === nyckel) start += b.bc;
    } else if (b.fardighet === nyckel || b.fardighet === f.id) start += b.bc;
  }
  for (const s of rp.sarskildaFormagor?.fvBonus ?? []) if (s.fardighet === nyckel) start += s.fv;

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
export function epKostnad(regler, st, fardighet, start, mal) {
  if (mal <= start) return 0;
  const k = regler.fardigheter.kostnad;
  let per = st === "primar" ? k.primar : st === "yrke" ? k.yrke : k.sekundar;
  if (fardighet.typ === "magiskola" && st === "sekundar") per = k.magiskolaSekundar;
  return (mal - start) * per;
}

// Räknar fram hela rollpersonen och alla regelbrott.
export function raknaRollperson(regler, rp) {
  const ras = rasAv(regler, rp.ras);
  const yrke = yrkeAv(regler, rp.yrke);
  const fel = [];
  const alderEff = alderseffekter(regler, rp.alder);

  const bpStart = regler.grundegenskaper.startBP + alderEff.bp + (yrke.extraBP?.antal ?? 0);
  const ge = raknaGrundegenskaper(regler, rp);
  fel.push(...ge.fel);
  const bpUtgifter = {
    ras: ras.bp,
    extraYrkesfardigheter: kostnadExtraYrken(regler, rp.extraYrkesfardigheter),
    grundegenskaper: ge.bp,
    sarskildaFormagor: rp.sarskildaFormagor?.bp ?? 0,
    svardshand: rp.svardshand.bp,
    socialtStand: rp.socialtStand.bp,
    startkapital: rp.startkapital.bp,
  };
  const bpKvar = bpStart - Object.values(bpUtgifter).reduce((a, b) => a + b, 0);
  if (bpKvar < 0) fel.push(`${-bpKvar} BP för mycket har spenderats (s. 13)`);
  if ((rp.sarskildaFormagor?.bp ?? 0) > regler.slag.sarskildaFormagor.maxBP) fel.push("Högst 40 BP på särskilda förmågor (s. 30)");

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
    const ep = epKostnad(regler, st, f, start, mal);
    epSpenderat += ep;
    fvHittills[nyckel] = Math.max(mal, start);
    fardigheter.push({ nyckel, namn: namnFor(regler, f, nyckel), status: st, grundegenskap: egenskap, start, fv: Math.max(mal, start), ep, kategoriB: f.kategoriB });
  }
  if (epSpenderat > epStart) fel.push(`${epSpenderat - epStart} EP för mycket har spenderats (s. 34)`);

  return {
    ras, yrke, alderskategori: ge.alderskategori, grundegenskaper: ge.varden, harledda, slag,
    bp: { start: bpStart, utgifter: bpUtgifter, kvar: bpKvar },
    ep: { start: epStart, spenderat: epSpenderat, kvar: epStart - epSpenderat },
    fardigheter: fardigheter.sort((a, b) => a.namn.localeCompare(b.namn, "sv")),
    fel,
  };
}

function takFor(regler, rp, nyckel, f, varden, fvHittills) {
  let tak = varden[grundegenskapFor(regler, nyckel, varden)] ?? 20;
  if (f.tak === "PSY") tak = Math.min(tak, varden.PSY);
  if (f.tak === "lasa-skriva") {
    const ls = Object.entries(fvHittills).filter(([k]) => k.startsWith("lasa-skriva:")).map(([, v]) => v);
    tak = Math.min(tak, Math.max(0, ...ls));
  }
  if (f.typ === "magiskola" && yrkeAv(regler, rp.yrke).skolTak) tak = Math.min(tak, varden.INT);
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
