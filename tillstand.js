// Rollpersonen och appens delade tillstånd, och kopplingen till regelmotorn.
// Delat tillstånd som flera moduler ändrar ligger i S (till exempel S.rp, rollpersonen).
import { raknaRollperson, rasAv, yrkeAv, fardighetAv, sarskildFormaga as sfFor, paborjad } from "./regelmotor.js";
import { TOMT_SPEL, TOM_UTVECKLING } from "./sparformat.js";
import { utvecklad } from "./utveckling.js";
import { rita, visaNotis } from "./app.js";

export const FILER = ["raser", "alder", "grundegenskaper", "fardigheter", "yrken", "slag", "vapen", "sarskilda-formagor", "husregler", "besvarjelser", "utrustning", "erfarenhet", "bocker"];
export const LAGRING = "chronopia-rollperson-v2";

export const TOM = () => ({
  bocker: ["grund"], // böckerna rollpersonen skapas med (steg 0); grundreglerna är alltid med
  niva: 0, // erfarenhetsnivån (steg 0) när en vald bok har nivåer, t.ex. V&R:s krigare, veteran och hjälte (RB-001)
  hjaltepoangKop: {}, // grundegenskaper som höjs med hjältepoäng från särskilda förmågor (RB-003), 5 HP per poäng
  namn: "", spelare: "", kon: "", ras: "", alder: null, yrke: "", yrkesval: {}, valfri: "",
  extraYrkesfardigheter: [], rasval: [], grundvarden: null, // alder: null tills den väljs i steg 2, grundvarden: null tills steg 6 öppnas
  stoSteg: 0, sarskildaFormagor: { bp: 0, slag: null, val: [], avstar: false, fler: [] }, svardshand: { bp: 0, slag: null },
  socialtStand: { bp: 0, slag: null }, startkapital: { bp: 0, slag: null }, sekundara: [], fardigheter: {},
  magiformaga: { slag: null }, stridskonstTekniker: {}, stridskonstFardig: {}, besvarjelser: {}, utrustning: {}, startpaket: { valt: false, vapen: "" }, anteckningar: "",
  spel: TOMT_SPEL(), utveckling: TOM_UTVECKLING(),
});
// En sparad rollperson kompletteras med fält som har tillkommit sedan den sparades
// En rollperson från före rutan "Jag vill inte lägga BP" som inte har lagt BP räknas som att den avstod.
export const fyllUt = (data) => ({ ...TOM(), ...data,
  ...(data.sarskildaFormagor && !("avstar" in data.sarskildaFormagor) ? { sarskildaFormagor: { ...data.sarskildaFormagor, avstar: !data.sarskildaFormagor.bp } } : {}),
  spel: { ...TOMT_SPEL(), ...(data.spel ?? {}) }, utveckling: { ...TOM_UTVECKLING(), ...(data.utveckling ?? {}) } });

export const S = {
  R: undefined, // regeldata
  rp: undefined, // rollpersonen (spelarens val)
  aktivtSteg: "bocker",
  langst: 0, // längsta steg spelaren har kommit till; senare steg är släckta i sidomenyn
  giltig: undefined, // senaste rollperson som följer alla regler
  nySekundar: "", // påbörjat val av ny sekundär färdighet
  nyExtra: "", // påbörjat val av ny extra yrkesfärdighet i steg 4
  provar: false,
  autoAnvand: { egenskaper: false, fardigheter: false }, // Återställ visas bara efter en automatisk fördelning
  spelSynlig: false, // spelmötesdelen visas tills vidare bara i utvecklarläget
  ritatSteg: null, // steget som visades senast; byts det skrollas sidan upp
  sparadVidStart: null, // rollpersonen från förra besöket; sidan börjar ändå alltid med en ny
  vy: "start", // "start" (startsidan), "regler" (regelresonemang), "steg", "spel" (spelmöten och förbättring) eller "formular" (rollformuläret för utskrift)
  blacksnal: false, // rollformuläret utan färgade ytor
  medRegler: false, // rollformuläret med sidorna Färdigheterna i korthet
  manuellaSlag: false, // spelaren skriver in slagen själv i stället för att slå (valet finns i menyn)
  nyssSlaget: null, // id för slaget vars resultat precis har landat
  omslag: false,
  utrustningsFilter: "", // fritextsökningen i utrustningssteget
};
// Innan en ras är vald räknar motorn som för en människa, men ingen ras visas som vald
export const rasId = () => S.rp.ras || "manniska";
// Innan åldern är vald i steg 2 räknar motorn med 21 år (ingen bonus), som när ingen ras är vald
const alderNu = () => S.rp.alder ?? 21;
// Innan ett yrke är valt räknar motorn som för en krigare (som saknar bonusar), men inget yrke visas som valt och det ger inga yrkesfärdigheter
export const yrkeId = () => S.rp.yrke || "krigare";

export function spara() {
  try { localStorage.setItem(LAGRING, JSON.stringify({ rp: S.rp, aktivtSteg: S.aktivtSteg, langst: S.langst })); } catch { /* lagring är frivillig */ }
}

// Rollpersonen med allt som har förts in under spel (utveckling.js). Utan logg är det rollpersonen vid skapandet.
export const rakna = () => { const indata = motorIndata(); return utvecklad(S.R, indata, raknaRollperson(S.R, indata)); };
// Samma uträkning för en annan rollperson, t.ex. ett utkast i spelmötesdelen
export function raknaFor(annan) {
  const fore = S.rp;
  S.rp = annan;
  try { return rakna(); } finally { S.rp = fore; }
}
export const harLogg = () => (S.rp.utveckling?.logg?.length ?? 0) > 0;

// Varje ändring kontrolleras mot reglerna. Bryter den mot någon regel återställs rollpersonen
// till senaste giltiga läge, så att det aldrig går att skapa en otillåten rollperson.
export function uppdatera() {
  if (S.provar) return;
  const fel = rakna().fel;
  if (fel.length) {
    S.rp = structuredClone(S.giltig);
    visaNotis(`Det går inte: ${fel[0]}.`);
  } else {
    S.giltig = structuredClone(S.rp);
    if (S.rp.ras) S.sparadVidStart = null; // en ny rollperson ersätter den sparade
    spara();
  }
  rita();
}

// ------------------------------------------------------------ från val till motorns indata
function delval(f) {
  return f.perVal || null;
}

export function yrkesNycklar() {
  if (!S.rp.yrke) return [];
  const yrke = yrkeAv(S.R, yrkeId());
  const nycklar = [];
  yrke.fardigheter.forEach((post, i) => {
    const val = S.rp.yrkesval[i];
    if (typeof post === "string") {
      const f = fardighetAv(S.R, post);
      if (!delval(f)) nycklar.push(post);
      else if (val) nycklar.push(`${post}:${val}`);
    } else if (post.valEn) {
      if (!val?.id) return;
      const f = fardighetAv(S.R, val.id);
      if (!delval(f)) nycklar.push(val.id);
      else if (val.sub) nycklar.push(`${val.id}:${val.sub}`);
    } else {
      const valda = [].concat(val ?? []);
      post.maste?.forEach((m, j) => { valda[j] = m; });
      for (const v of valda) if (v) nycklar.push(`${post.fardighet}:${v}`);
    }
  });
  if (S.rp.valfri && yrke.valfri) nycklar.push(S.rp.valfri);
  return nycklar.filter((k) => !paborjad(k));
}

export function modersmal() {
  const ras = rasAv(S.R, rasId());
  return {
    tala: ras.talaModersmal.map((x) => x.sprak),
    lasaSkriva: ras.lasaSkrivaModersmal.map((x) => (typeof x === "string" ? x : x.sprak)),
  };
}

function allaNycklar(yrkesfardigheter) {
  const ras = rasAv(S.R, rasId());
  const yrke = yrkeAv(S.R, yrkeId());
  const m = modersmal();
  const mangd = new Set();
  for (const f of S.R.fardigheter.lista) if (f.typ === "primar" && !ras.sekundara.includes(f.id)) mangd.add(f.id);
  for (const p of ras.primara) if (typeof p === "string") mangd.add(p);
  for (const k of S.rp.rasval) mangd.add(k);
  for (const k of yrke.primara ?? []) mangd.add(k); // V&R: gratis FV 10 som primär (t.ex. Hypnotisera)
  for (const s of m.tala) mangd.add(`tala:${s}`);
  for (const s of m.lasaSkriva) mangd.add(`lasa-skriva:${s}`);
  for (const k of yrkesfardigheter) mangd.add(k);
  for (const k of S.rp.extraYrkesfardigheter) mangd.add(k);
  for (const k of S.rp.sekundara) mangd.add(k);
  const sf = sfFor(S.R, { ...S.rp, ras: rasId(), yrkesfardigheter, extraYrkesfardigheter: S.rp.extraYrkesfardigheter }).tillagg.sarskildaFormagor;
  for (const b of [...(sf?.fvBonus ?? []), ...(sf?.fvMinst ?? [])]) mangd.add(b.fardighet);
  if (yrke.magiker) {
    mangd.add("lardom:Kunskap om magi");
    for (const k of [...mangd]) if (fardighetAv(S.R, k)?.typ === "magiskola") mangd.add(`kanna-magi:${k}`);
  }
  return [...mangd].filter((k) => !paborjad(k) && fardighetAv(S.R, k));
}

export function motorIndata() {
  const yrkesfardigheter = yrkesNycklar();
  const fardigheter = {};
  for (const k of allaNycklar(yrkesfardigheter)) fardigheter[k] = S.rp.fardigheter[k] ?? 0;
  return {
    ...S.rp, ras: rasId(), rasVald: !!S.rp.ras, alder: alderNu(), yrke: yrkeId(), yrkesfardigheter, fardigheter, modersmal: modersmal(),
    svardshand: { ...S.rp.svardshand, slag: S.rp.svardshand.slag ?? 0 },
    socialtStand: { ...S.rp.socialtStand, slag: S.rp.socialtStand.slag ?? 0 },
    startkapital: { ...S.rp.startkapital, slag: S.rp.startkapital.slag ?? 0 },
  };
}

export const sarskildFormaga = () => sfFor(S.R, { ...S.rp, ras: rasId(), alder: alderNu(), yrke: yrkeId(), yrkesfardigheter: yrkesNycklar() }).formaga;
