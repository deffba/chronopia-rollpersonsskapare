// Testrollpersonerna i utvecklarläget. Det här är bara önskemål: utvecklarlage.js bygger rollpersonen
// genom samma regler som stegen och fyller i det som saknas eller inte längre är tillåtet.
// Grundegenskaper och EP läggs alltid med samma automatik som knapparna Föreslå värden och Fördela EP.
//
// val: yrkets färdigheter, efter färdighetens id. Listor för färdigheter med flera val (vapen (3) osv.),
//   text för ett delval (stad, stil, två vapen), och för "välj en av" anges den valda färdigheten med sitt id.
// slag: tärningsslagen, så att rollpersonen blir likadan varje gång.
export const TESTROLLPERSONER = [
  {
    id: "krigare",
    etikett: "Människa, krigare",
    namn: "Brand Järnhand",
    kon: "Man",
    ras: "manniska",
    alder: 24,
    yrke: "krigare",
    val: {
      hantverk: ["Smide"],
      tala: ["hoglandska"],
      "tva-vapen": "Kortsvärd+Dolk",
      "undre-varlden": "Chronopia",
      vapen: ["Bredsvärd", "Kortsvärd", "Dolk"],
    },
    valfri: "rida-flygande-djur",
    sarskildFormaga: { bp: 5, slag: 37 }, // 42: Vapenvan
    slag: { svardshand: 6, socialtStand: 7, startkapital: 9 },
    startpaketVapen: "Dolk",
    kop: ["Harnesk: Läder", "Läderhuva", "Fackla (1 timme)", "Flinta & stål"],
    anteckningar: "Testrollperson från utvecklarläget. Legoknekt från hamnkvarteren.",
  },
  {
    id: "gladiator",
    etikett: "Högländare, gladiator",
    namn: "Hrefna Stålsång",
    kon: "Kvinna",
    ras: "hoglandare",
    alder: 22,
    yrke: "gladiator",
    rasval: "vapen:Stridsyxa",
    val: {
      stridskonster: "Arenans dans",
      "tva-vapen": "Kortsvärd+Parerdolk",
      vapen: ["Kortsvärd", "Parerdolk", "Treudd", "Kortspjut", "Targ (bucklare)"],
    },
    valfri: "akrobatik",
    tekniker: ["Fint", "Initiativbonus", "Avväpning"],
    sarskildFormaga: { bp: 10, slag: 36 }, // 46: Dubbelhänt
    slag: { svardshand: 7, socialtStand: 6, startkapital: 8 },
    startpaketVapen: "Kortspjut",
    kop: ["Harnesk: Nitläder", "Öppen metallhjälm"],
    anteckningar: "Testrollperson från utvecklarläget. Arenans publikfavorit.",
  },
  {
    id: "magiker",
    etikett: "Dimalv, elementarmagiker",
    namn: "Ilvandril Dimvandrare",
    kon: "Kvinna",
    ras: "dimalv",
    alder: 140,
    yrke: "elementarmagiker",
    val: {
      alkemi: true,
      ortkunskap: true,
      lardom: ["Kunskap om demoner"],
      "lasa-skriva": ["hoglandska"],
      tala: ["dvargiska"],
      vapen: ["Trästav"],
    },
    valfri: "astrologi",
    sarskildFormaga: { bp: 5, slag: 4 }, // 9: Kanalisator
    slag: { svardshand: 5, socialtStand: 7, startkapital: 7 },
    // EP som sparas från färdigheterna till besvärjelser, och de besvärjelser som köps först
    epTillBesvarjelser: 60,
    besvarjelser: ["ljus", "skold", "eld", "blixt", "varseblivning", "flammande-hand"],
    startpaketVapen: "Trästav",
    kop: ["Kåpa (magiker-, präst-)", "Oljelykta (6 timmar)", "Lampolja (1 timme)"],
    anteckningar: "Testrollperson från utvecklarläget. Har lämnat dimskogarna för stadens bibliotek.",
  },
];
