// Filformatet för sparade rollpersoner. Filen är det som läses in igen, både i skaparen och i
// spelmötesdelen, så formatet har ett versionsnummer och äldre filer flyttas upp vid inläsning.
//
// Version 2:
//   { format: "chronopia-rollperson", version: 2, sparad: "<ISO-tid>", rollperson: { ...valen, spel: {...}, utveckling: { logg: [...] } } }
//   utveckling.logg är spelmöten, träning och förbättringar efter skapandet (utveckling.js).
// Version 1: samma utan utveckling och utan spel.borttaget.
// Version 0 är filerna från före versionsnumret: rollpersonens val direkt på översta nivån, utan spel.

export const FORMAT = "chronopia-rollperson";
export const VERSION = 2;

// Det som skrivs in på rollformuläret under spel. Reglerna räknar inte med det, utom det som tagits bort.
// erf: osparade erfarenhetspoäng per färdighet eller besvärjelse (samma nyckel som i fardigheter/besvarjelser).
export const TOMT_SPEL = () => ({
  spelledare: "",
  hjaltepoang: 0,
  erf: {},
  pengar: null, // null = pengarna kvar efter inköpen; annars { bors: {gm, sm, km}, bank: {gm, sm, km}, juveler } som text
  utrustning: [], // egna rader på formuläret: { namn, vikt }
  borttaget: {}, // saker från inköpen vid skapandet som har tagits bort under spel: { namn: antal }
  anteckningar: "",
});

export const TOM_UTVECKLING = () => ({ logg: [] });

export function tillFil(rp, nu = new Date()) {
  return { format: FORMAT, version: VERSION, sparad: nu.toISOString(), rollperson: rp };
}

// Ger rollpersonens val i senaste versionen, eller kastar ett fel som går att visa för spelaren.
export function franFil(data) {
  if (data?.format === FORMAT) {
    if (!Number.isInteger(data.version)) throw new Error("filen saknar versionsnummer");
    if (data.version > VERSION) throw new Error(`filen är sparad med en nyare version av rollpersonsskaparen (version ${data.version})`);
    return uppgradera(data.rollperson, data.version);
  }
  if (data?.ras && data?.grundvarden) return uppgradera(data, 0);
  throw new Error("saknar ras eller grundegenskaper");
}

function uppgradera(rp, version) {
  if (!rp?.ras || !rp?.grundvarden) throw new Error("saknar ras eller grundegenskaper");
  const ut = structuredClone(rp);
  if (version < 1) ut.spel = {};
  ut.spel = { ...TOMT_SPEL(), ...ut.spel, erf: { ...(ut.spel?.erf ?? {}) }, borttaget: { ...(ut.spel?.borttaget ?? {}) } };
  if (version < 2) ut.utveckling = TOM_UTVECKLING();
  const logg = ut.utveckling?.logg ?? [];
  if (!Array.isArray(logg)) throw new Error("utvecklingsloggen är trasig");
  ut.utveckling = { ...TOM_UTVECKLING(), ...ut.utveckling, logg: [...logg] };
  return ut;
}
