// Filformatet för sparade rollpersoner. Filen är det som läses in igen, både här och i den
// kommande uppdateraren, så formatet har ett versionsnummer och äldre filer flyttas upp vid inläsning.
//
// Version 1:
//   { format: "chronopia-rollperson", version: 1, sparad: "<ISO-tid>", rollperson: { ...valen, spel: {...} } }
// Version 0 är filerna från före versionsnumret: rollpersonens val direkt på översta nivån, utan spel.

export const FORMAT = "chronopia-rollperson";
export const VERSION = 1;

// Det som skrivs in på rollformuläret under spel. Reglerna räknar inte med det.
// erf: osparade erfarenhetspoäng per färdighet eller besvärjelse (samma nyckel som i fardigheter/besvarjelser).
export const TOMT_SPEL = () => ({
  spelledare: "",
  hjaltepoang: 0,
  erf: {},
  pengar: null, // null = pengarna kvar efter inköpen, i silvermynt i börsen
  utrustning: [], // egna rader på formuläret: { namn, vikt }
  anteckningar: "",
});

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
  if (!rp?.ras || rp?.grundvarden === undefined) throw new Error("saknar ras eller grundegenskaper"); // null = inte valda än
  const ut = structuredClone(rp);
  if (version < 1) ut.spel = {};
  ut.spel = { ...TOMT_SPEL(), ...ut.spel, erf: { ...(ut.spel?.erf ?? {}) } };
  return ut;
}
