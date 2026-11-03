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
  {
    // Vapen & rustningar: hjältenivån (175 BP, tre särskilda förmågor) och V&R:s förmågetabell med hjältepoäng
    id: "vr-hjalte",
    etikett: "Sabran, krigare (V&R, hjälte)",
    namn: "Zahra Ökenvind",
    kon: "Kvinna",
    bocker: ["vr"],
    niva: 2,
    ras: "sabran",
    alder: 26,
    yrke: "krigare",
    val: {
      hantverk: ["Läderarbete"],
      tala: ["hoglandska"],
      "tva-vapen": "Kortsvärd+Dolk",
      "undre-varlden": "Chronopia",
      vapen: ["Kortsvärd", "Dolk", "Kortbåge"],
    },
    valfri: "overlevnad",
    sarskildFormaga: [
      { bp: 20, slag: 15, tabell: "vr", val: [{ slag: 33, tarningar: [12, 9, 12] }] }, // 35: Hjälte, 33 hjältepoäng
      { bp: 5, slag: 18, tabell: "vr" }, // 23: Blodshämnd
      { bp: 5, slag: 37, tabell: "grund" }, // 42: Vapenvan
    ],
    hjaltepoangKop: { SMI: 2, PSY: 2 }, // 20 av de 33 hjältepoängen
    slag: { svardshand: 8, socialtStand: 8, startkapital: 9 },
    startpaketVapen: "Dolk",
    kop: ["Harnesk: Läder", "Läderhuva"],
    anteckningar: "Testrollperson från utvecklarläget. Ökenkrigare som har gjort sig ett namn i Chronopia.",
  },
  {
    id: "vr-svartgardist",
    etikett: "Latracier, svartgardist (V&R, veteran)",
    namn: "Kael Nattvakt",
    kon: "Man",
    bocker: ["vr"],
    niva: 1,
    ras: "latracier",
    alder: 28,
    yrke: "svartgardist",
    val: {
      "tva-vapen": "Bredsvärd+Kortsvärd",
      vapen: ["Bredsvärd", "Kortsvärd", "Långbåge"],
    },
    valfri: "taktik",
    sarskildFormaga: [
      { bp: 5, slag: 15, tabell: "vr" }, // 20: Snabbslående
      { bp: 5, slag: 37, tabell: "grund" }, // 42: Vapenvan
    ],
    slag: { svardshand: 8, socialtStand: 8, startkapital: 9 },
    startpaketVapen: "Dolk",
    kop: ["Läderhuva"],
    anteckningar: "Testrollperson från utvecklarläget. Kejsarens svarta gardist med stridskonsten Kejsarens hand.",
  },
  {
    // Vapen & rustningar kap. 8–9: hederssvärdet som gratis startutrustning, V&R-vapen och rustningsdelar per kroppsdel
    id: "vr-ordenskrigare",
    etikett: "Högländare, ordenskrigare (V&R, utrustning, syn och hörsel)",
    namn: "Brann av Hornvakten",
    kon: "Man",
    bocker: ["vr"],
    valfriaRegler: ["syn-och-horsel", "detaljerad-strid", "kejserliga-varor"],
    sinnen: { syn: [3, 4], horsel: [0, 2] }, // syn 7: mycket god (+2), hörsel 2: nedsatt (−1)
    niva: 0,
    ras: "hoglandare",
    rasval: "vapen:Spikyxa",
    alder: 30,
    yrke: "ordenskrigare",
    val: {
      hantverk: ["Smide"],
      vapen: ["Hederssvärd", "Ryttarlans", "Ryttarbåge"],
    },
    valfri: "rida",
    slag: { svardshand: 8, socialtStand: 12, startkapital: 20 },
    startpaketVapen: "Dolk",
    kop: ["Ordenskrigarhjälm", "Axelskydd (par): Högländskt", "Rustningsolja", "Vapenputs"],
    anteckningar: "Testrollperson från utvecklarläget. Högländsk ordensriddare med hederssvärd och ordenskrigarhjälm.",
  },
  {
    // Magi i Chronopia: magus regis (två förmågor, tre familjarer), Tidsmagi med grenarna, minimagi och
    // Spiritus familiarius (en gratis familjar) från Magis förmågetabell
    id: "magi-chronomag",
    etikett: "Människa, chronomag (Magi, magus regis)",
    namn: "Aurelia Timglas",
    kon: "Kvinna",
    bocker: ["magi"],
    niva: 1,
    ras: "manniska",
    alder: 32,
    yrke: "chronomag",
    val: { lardom: ["Astronomi", "Kunskap om demoner"], mentalism: true, vapen: ["Dolk"] },
    valfri: "astrologi",
    sarskildFormaga: [
      { bp: 1, slag: 20, tabell: "magi", val: ["dragonette"] }, // 21: Spiritus familiarius
      { bp: 1, slag: 2, tabell: "magi", val: [["mentalism"]] }, // 3: Magikänsla
    ],
    slag: { svardshand: 6, socialtStand: 10, startkapital: 12 },
    epTillBesvarjelser: 80,
    besvarjelser: ["slohet", "sinnesskarpa"],
    minimagi: ["mini-eld", "mini-laka", "mini-ljusskken"],
    familjarer: ["tefalon", "gargoyl"],
    startpaketVapen: "Dolk",
    anteckningar: "Testrollperson från utvecklarläget. Född i Evighetspalatset under den femte månen.",
  },
  {
    // Magi i Chronopia: fågelbroderns gratis lystat utöver taket, och en köpt familjar på nivån magus
    id: "magi-fagelbroder",
    etikett: "Människa, fågelbroder (Magi, gratis familjar)",
    namn: "Corvin Fjäderhand",
    kon: "Man",
    bocker: ["magi"],
    niva: 0,
    ras: "manniska",
    alder: 25,
    yrke: "fagelbroder",
    val: { ortkunskap: true, lardom: ["Kunskap om fåglar"], vapen: ["Trästav", "Slunga"] },
    valfri: "overlevnad",
    sarskildFormaga: { bp: 5, slag: 10, tabell: "grund" },
    slag: { svardshand: 7, socialtStand: 6, startkapital: 8 },
    besvarjelser: [],
    minimagi: ["mini-ljusskken"],
    familjarer: ["jefta"],
    startpaketVapen: "Trästav",
    anteckningar: "Testrollperson från utvecklarläget. Fågelbroder med sin lystat och en pratsam jefta.",
  },
];
