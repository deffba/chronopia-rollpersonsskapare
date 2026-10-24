// Regelmotor för Chronopia-rollpersonsskaparen.
// Tar regeldata (regler-json) och en rollperson (spelarens val) och räknar fram allt som följer av reglerna.
// Sidhänvisningar avser tryckta sidor i regelboken.

export const GRUNDEGENSKAPER = ["STY", "FYS", "SMI", "INT", "PSY", "KAR"];

// Ett påbörjat val, t.ex. "vapen:" innan vapnet är valt eller "tva-vapen:Dolk+" innan det andra vapnet är valt.
export const paborjad = (nyckel) => !nyckel || nyckel.endsWith(":") || nyckel.endsWith("+");

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
  // Med SL:s tillåtelse kan ståndet väljas i stället för att slås; då räknas lägsta värdet för det ståndet
  const ssResultat = rp.socialtStand.valt ? standsvarde(t.socialtStand.tabell, rp.socialtStand.valt)
    : rp.socialtStand.slag + rp.socialtStand.bp + (ras.slagbonus.socialtStand ?? 0);
  const [stand, klass] = slaUpp(t.socialtStand.tabell, ssResultat);
  const skBonus = (ras.slagbonus.startkapital ?? 0) + (yrke.slagbonus?.startkapital ?? 0);
  const tak = ssResultat + (yrke.kapitaltak ?? t.startkapital.tak);
  const skResultat = Math.min(
    rp.startkapital.slag + rp.startkapital.bp + Math.ceil(rp.socialtStand.bp / 2) + skBonus, tak);
  const silver = slaUpp(t.startkapital.tabell, skResultat) * alderEff.kapital + (rp.arv ?? 0);
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
      else if (yrkesnycklar.has(nyckel) && sprak.aldrigYrke) fel.push(`${namn} kan aldrig vara yrkesfärdighet (s. 70)`);
      const modersmal = id === "tala" ? rp.modersmal?.tala : rp.modersmal?.lasaSkriva;
      if (yrkesnycklar.has(nyckel) && modersmal?.includes(val)) fel.push(`${namn} är redan modersmål och kan inte väljas som främmande språk (s. 66, 70)`);
    }
    if (id === "tva-vapen") {
      const vapen = val.split("+");
      if (vapen.length !== 2 || vapen.some((v) => !regler.vapen.narstrid.some((x) => x.namn === v))) fel.push(`Två vapen gäller två närstridsvapen (s. 71)`);
      else if (vapen.some((v) => tvahandsvapen(regler, v, varden))) fel.push(`Två vapen kan inte kombineras med tvåhandsvapen (s. 71)`);
    }
  }
  if (rp.valfri && fardighetAv(regler, rp.valfri)?.typ === "primar") fel.push("Den valfria yrkesfärdigheten kan inte vara en primär färdighet (s. 18)");
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
  const andrad = rp.sarskildaFormagor?.status?.[nyckel];
  if (andrad === "primar") return "primar";
  if (andrad === "yrke") return "yrke";
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
export function epKostnad(regler, st, fardighet, start, mal) {
  if (mal <= start) return 0;
  const k = regler.fardigheter.kostnad;
  let per = st === "primar" ? k.primar : st === "yrke" ? k.yrke : k.sekundar;
  if (fardighet.typ === "magiskola" && st === "sekundar") per = k.magiskolaSekundar;
  return (mal - start) * per;
}

// Räknar fram hela rollpersonen och alla regelbrott.
export function raknaRollperson(regler, indata) {
  const sf = sarskildFormaga(regler, indata);
  const rp = { ...indata, ...sf.tillagg };
  const ras = rasAv(regler, rp.ras);
  const yrke = yrkeAv(regler, rp.yrke);
  const fel = [...sf.fel];
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

  kontrolleraVal(regler, rp, ge.varden, fel);

  // Samma yrkesfärdighet kan inte väljas två gånger (s. 18, 27)
  const sedda = new Set();
  for (const k of [...rp.yrkesfardigheter, ...rp.extraYrkesfardigheter].filter((x) => paborjad(x) === false)) {
    if (sedda.has(k)) fel.push(`${namnFor(regler, fardighetAv(regler, k), k)} är redan yrkesfärdighet (s. 27)`);
    sedda.add(k);
  }

  // Magiskolor utanför magikeryrkena kräver ett lyckat magiförmågeslag (s. 27, 106)
  const skolor = Object.keys(rp.fardigheter).filter((k) => fardighetAv(regler, k)?.typ === "magiskola");
  const behoverSlag = !yrke.magiker && (skolor.length > 0 || rp.extraYrkesfardigheter.some((k) => fardighetAv(regler, k)?.typ === "magiskola"));
  const magiformaga = { chans: Math.ceil((ge.varden.INT + ge.varden.PSY) / 2), behovs: behoverSlag, slag: rp.magiformaga?.slag ?? null, mod: sf.magiformaga };
  magiformaga.lyckat = magiformaga.slag !== null && magiformaga.slag + magiformaga.mod <= magiformaga.chans;
  if (behoverSlag && !magiformaga.lyckat) {
    fel.push(magiformaga.slag === null ? "Magiskolor kräver ett magiförmågeslag (s. 106)" : "Magiförmågeslaget misslyckades, så rollpersonen kan inte lära sig magi (s. 106)");
  }

  return {
    ras, yrke, alderskategori: ge.alderskategori, grundegenskaper: ge.varden, harledda, slag, magiformaga,
    sarskildFormaga: sf.formaga, saknas: sf.saknas,
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

// Färdigheter som räknas som magi och därför inte får väljas för "ej magi" (s. 30–31).
const MAGI = ["kanna-magi", "magisk-kanalisering", "magistudier"];
const arMagi = (f) => f.typ === "magiskola" || MAGI.includes(f.id);

// Kan färdigheten väljas för en särskild förmåga med gruppen "bland"?
export function passarBland(regler, rp, nyckel, bland) {
  const f = fardighetAv(regler, nyckel);
  if (!f) return false;
  if (f.perVal && !nyckel.split(":")[1]) return false;
  if (Array.isArray(bland)) return bland.includes(f.id);
  if (bland === "alla-ej-magi") return !arMagi(f);
  if (bland === "sekundar-ej-magi") return !arMagi(f) && status(regler, rp, nyckel) === "sekundar";
  if (bland === "sprak") return f.id === "tala";
  return f.id === bland;
}

// Vilken särskild förmåga rollpersonen har och vad den ger, utifrån spelarens val (s. 30–32).
// rp.sarskildaFormagor.val[i] är valen för förmågans i:te effekt.
export function sarskildFormaga(regler, rp) {
  const s = rp.sarskildaFormagor ?? {};
  const svar = { formaga: null, fel: [], saknas: [], magiformaga: 0, tillagg: {} };
  if (!s.bp || s.slag === null || s.slag === undefined) return svar;
  const summa = s.slag + s.bp;
  const formaga = regler["sarskilda-formagor"].find(({ slag: [fran, till] }) => summa >= fran && (till === null || summa <= till));
  svar.formaga = formaga;
  const fvBonus = [];
  const fvMinst = [];
  const takBonus = {};
  const andrad = {};
  const egenskapsbonus = {};
  let harledda = { kpFaktor: 1, forflyttningBonus: 0 };
  let arv = 0;
  let svardshand;
  (formaga.regel ?? []).forEach((del, i) => {
    const val = s.val?.[i];
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
        if (del.fv) (del.minst ? fvMinst : fvBonus).push({ fardighet: k, fv: del.fv });
        if (del.tak) takBonus[k] = (takBonus[k] ?? 0) + del.fv;
        if (del.status) andrad[k] = del.status;
      }
    } else if (del.typ === "egenskap") {
      for (const [g, m] of Object.entries(del.mod)) egenskapsbonus[g] = (egenskapsbonus[g] ?? 0) + m;
    } else if (del.typ === "egenskapVal") {
      const lage = val?.lage;
      const valda = (val?.egenskaper ?? []).filter(Boolean);
      const antal = lage === "en" ? 1 : 3;
      if (!lage || valda.length < antal) svar.saknas.push(`Välj grundegenskaper för ${formaga.namn}`);
      if (valda.length > antal || new Set(valda).size !== valda.length || valda.some((g) => !GRUNDEGENSKAPER.includes(g))) {
        svar.fel.push(`${formaga.namn}: +1 på tre olika grundegenskaper eller +2 på en (s. 32)`);
      }
      for (const g of valda) egenskapsbonus[g] = (egenskapsbonus[g] ?? 0) + (lage === "en" ? 2 : 1);
    } else if (del.typ === "forflyttning") harledda = { ...harledda, forflyttningBonus: del.varde };
    else if (del.typ === "kpFaktor") harledda = { ...harledda, kpFaktor: del.varde };
    else if (del.typ === "kapital") arv = del.varde;
    else if (del.typ === "svardshand") svardshand = del.varde;
    else if (del.typ === "magiformaga") svar.magiformaga = del.varde;
  });
  svar.tillagg = {
    sarskildaFormagor: { ...s, fvBonus, fvMinst, takBonus, status: andrad },
    egenskapsbonus, harleddaJustering: harledda, arv,
    svardshand: { ...rp.svardshand, overstyrd: svardshand },
  };
  return svar;
}
