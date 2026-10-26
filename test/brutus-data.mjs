// Bokens exempel Brutus (s. 14–38) och regeldata, gemensamt för testerna.
import { readFileSync } from "node:fs";

const katalog = new URL("../regler/", import.meta.url);
export const las = (n) => JSON.parse(readFileSync(new URL(n + ".json", katalog), "utf8"));
export const regler = {
  raser: las("raser"), alder: las("alder"), grundegenskaper: las("grundegenskaper"),
  fardigheter: las("fardigheter"), yrken: las("yrken"), slag: las("slag"), vapen: las("vapen"),
  besvarjelser: las("besvarjelser"), utrustning: las("utrustning"),
};

export const brutus = {
  ras: "hoglandare", alder: 50, yrke: "krigare",
  yrkesfardigheter: [
    "dra-vapen", "hantverk:Smide", "muta", "tala:chronos", "tva-vapen:Bredsvärd+Dolk",
    "undre-varlden:Chronopia", "vapen:Tvåhandssvärd", "vapen:Bredsvärd",
    "vapen:Vanlig sköld (trekantig)", "vapen:Långbåge"],
  extraYrkesfardigheter: ["bluffa", "stjala-foremal"],
  rasval: ["vapen:Tvåhandsyxa"],
  modersmal: { tala: ["hoglandska"], lasaSkriva: ["hoglandska"] },
  grundvarden: { STY: 14, FYS: 14, SMI: 16, INT: 7, PSY: 6, KAR: 10 },
  stoSteg: 1,
  sarskildaFormagor: { bp: 1, slag: 23, val: [["lasdyrkning"]] },
  svardshand: { bp: 0, slag: 9 },
  socialtStand: { bp: 3, slag: 9 },
  startkapital: { bp: 0, slag: 11 },
  fardigheter: {
    "vapen:Tvåhandsyxa": 16, bluffa: 5, "dra-vapen": 7, muta: 2, "hantverk:Smide": 6,
    "stjala-foremal": 6, "tala:chronos": 5, "tva-vapen:Bredsvärd+Dolk": 3, "undre-varlden:Chronopia": 6,
    "vapen:Tvåhandssvärd": 10, "vapen:Vanlig sköld (trekantig)": 7, "vapen:Bredsvärd": 7, "vapen:Långbåge": 6,
    "finna-dolda-ting": 6, "forsta-hjalpen": 1, "gomma-sig": 5, hoppa: 4, klattra: 4, kopsla: 4,
    "lasa-skriva:hoglandska": 11, rida: 8, sjunga: 2, slagsmal: 6, smyga: 6, spara: 1,
    "upptacka-fara": 7, vardera: 2, overtala: 3, lasdyrkning: 6, "tala:hoglandska": 16, lyssna: 1,
  },
};
