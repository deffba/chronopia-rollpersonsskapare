// Stegen och förklarande texter som visas i appen.

// Steg 0 (böckerna) räknas som steg 0, så att de vanliga stegen behåller numren 1–13 som i boken.
export const STEG = [
  { id: "bocker", namn: "Böcker", sida: "–" },
  { id: "ras", namn: "Ras", sida: "14–16", bp: true },
  { id: "klan", namn: "Klan", sida: "Dvärgar i Chronopia 4, 18–26" }, // bara för dvärgar med Dvärgar i Chronopia
  { id: "alder", namn: "Ålder", sida: "16–17" },
  { id: "yrke", namn: "Yrke", sida: "18–26" },
  { id: "extra", namn: "Yrkesfärdigheter", sida: "18–27", bp: true },
  { id: "kon", namn: "Kön och namn", sida: "27" },
  { id: "egenskaper", namn: "Grundegenskaper", sida: "27–29", bp: true },
  { id: "formagor", namn: "Särskilda förmågor", sida: "30–32", bp: true },
  { id: "familjarer", namn: "Familjarer", sida: "Magi i Chronopia 40–43", bp: true }, // bara när Magi är vald
  { id: "masker", namn: "Masker och dockor", sida: "Alver i Chronopia 25–27, 41–42" }, // bara för pierroter och dockmästare
  { id: "svardshand", namn: "Svärdshand", sida: "32", bp: true },
  { id: "stand", namn: "Socialt stånd", sida: "33", bp: true },
  { id: "kapital", namn: "Startkapital", sida: "33", bp: true },
  { id: "fardigheter", namn: "Färdigheter", sida: "34–38" },
  { id: "besvarjelser", namn: "Besvärjelser", sida: "36, 106–129" },
  { id: "utrustning", namn: "Utrustning", sida: "38, 89–102" },
  { id: "export", namn: "Spara och exportera", sida: "–" },
];

// Förklaringar till förkortningar, visas i små info-cirklar.
export const FORKLARINGAR = {
  BP: "BP (bakgrundspoäng) är poängen du bygger rollpersonen med i steg 1–10: 125 från start (fler på en högre erfarenhetsnivå, steg 0) plus åldersbonus. Det som blir över växlas till 5 EP per BP när du kommer till steg 11 (s. 34); BP kan inte sparas.",
  EP: "EP (erfarenhetspoäng) köper FV i färdigheter: 2 EP per FV för primära, 3 för yrkesfärdigheter och 5 för sekundära (20 för en magiskola som sekundär).",
  FV: "FV (färdighetsvärde) visar hur bra rollpersonen är på något. Man slår 1T20, och ett resultat lika med eller under värdet lyckas. Vid start får FV inte vara högre än grundegenskapen.",
  BC: "BC (baschans) är gratis FV vid start i alla primära färdigheter och yrkesfärdigheter. Den beror på grundegenskapen. Sekundära färdigheter har ingen BC.",
  CL: "CL är FV med modifikationer för en viss situation. Det är CL man slår mot.",
  KP: "KP (kroppspoäng) visar hur mycket skada rollpersonen tål, totalt och per kroppsdel. Totalen är (STO+FYS)/2, avrundat uppåt.",
  SB: "SB (skadebonus) läggs till skadan i närstrid. Den beror på STY+STO.",
  STY: "STY (styrka) är muskelkraft. Den ger skadebonus tillsammans med STO och avgör vilka vapen rollpersonen orkar hantera (vapnens STY-krav).",
  FYS: "FYS (fysik) är uthållighet och motståndskraft. Den ger kroppspoäng tillsammans med STO.",
  SMI: "SMI (smidighet) är snabbhet och fingerfärdighet. Den är grund för många rörelsefärdigheter och vapen och påverkar förflyttningen.",
  INT: "INT (intelligens) är förstånd och minne. Den är grund för kunskapsfärdigheter och språk.",
  PSY: "PSY (psyke) är viljestyrka och intuition. Den är grund för bland annat Upptäcka fara och är viktig för magi, eftersom magiförmågeslaget beror på (INT+PSY)/2.",
  KAR: "KAR (karisma) är utstrålning och övertalningsförmåga. Den är grund för sociala färdigheter som Bluffa, Köpslå och Övertala.",
  STO: "STO (storlek) avgör längd och vikt. Den påverkar kroppspoäng, skadebonus och förflyttning. Rasen ger ett normalvärde, och det kostar BP att ändra det.",
  "B-nivå": "Kategori B-färdigheter (till exempel språk, Geografi och Lärdom) anges som nivå B0–B5 i stället för som ett vanligt FV: B0 = 0, B1 = 1–4, B2 = 5–10, B3 = 11–15, B4 = 16–19 och B5 = 20+ (s. 43).",
  Förflyttning: "Förflyttning är hur många rutor rollpersonen kan flytta per stridsrunda. En ruta är 1,5 m. Den beror på STO+FYS+SMI.",
  T: "T betyder tärning. 1T20 är en tjugosidig tärning, 2T6 är två sexsidiga tärningar som läggs ihop och 1T100 är ett procentslag.",
};

// Hjälptexter för färdigheter där spelaren själv skriver vad färdigheten gäller (s. 56–71).
export const DELVAL_HJALP = {
  administration: "Skriv namnet på en stad, till exempel Chronopia. Färdigheten är kunskap om hur stadens förvaltning fungerar: ämbetsmän, tillstånd, skatter och vägen genom byråkratin. Den lärs separat för varje stad. Är den en yrkesfärdighet räknas alla städer som yrkesfärdigheter, men varje stad köps för sig (s. 56).",
  "undre-varlden": "Skriv namnet på en stad, till exempel Chronopia. Färdigheten är kontakter och kunskap om stadens undre värld: tjuvar, gäng, hälare och var man får tag i olagliga varor och tjänster. Den lärs separat för varje stad (s. 71).",
  geografi: "Skriv namnet på en kontinent eller ett större landområde. Färdigheten är kunskap om länder, vägar, städer och folk där, till exempel för att hitta rätt eller veta vad som väntar på en resa. Den lärs separat för varje kontinent (s. 59).",
  kulturkannedom: "Välj vilken ras eller vilket folks kultur det gäller. Staden Chronopia räknas som en egen kultur. Färdigheten är kunskap om seder, lagar, tro och etikett, så att rollpersonen kan bete sig rätt och förstå andra (s. 62).",
  lardom: "Skriv ett kunskapsområde, till exempel Kunskap om religion eller Kunskap om magi. Varje lärdomsfärdighet är en egen färdighet och används för att veta saker inom området. FV kan aldrig bli högre än rollpersonens FV i Läsa/Skriva (s. 63–64).",
  djurhelning: "Skriv vilken sorts djur det gäller, till exempel hästar eller hundar. Färdigheten används för att vårda och hela sjuka eller skadade djur av den sorten (s. 58).",
  djurtraning: "Skriv vilken sorts djur det gäller, till exempel hästar eller hundar. Färdigheten används för att dressera och lära djur av den sorten att lyda (s. 58).",
  "spela-instrument": "Skriv vilket instrument det gäller, till exempel luta eller flöjt. Färdigheten lärs separat för varje instrument. Är den en yrkesfärdighet räknas alla instrument som yrkesfärdigheter (s. 68).",
  vapentekniker: "Välj en svärdsskolas stridskonst i listan, eller skriv ett eget namn och sätt ihop stilen av tekniker i steg 11. En skolas stridskonst har färdiga tekniker och kostar skolans pris per FV, eller 3 EP som yrkesfärdighet (Vapen & rustningar s. 15, 32–33).",
  heraldik: "Välj Allmän eller skriv en grupp, till exempel Högländare, Gatugäng, ett handelshus, Alver eller Dvärgar. Allmän heraldik gäller alla grupper, men B-nivån räknas fyra steg lägre. Specifik heraldik gäller bara den gruppen och räknas som vanligt (Vapen & rustningar s. 15).",
  stridskonster: "Skriv namnet på stridsstilen. Färdigheten används för obeväpnad strid med särskilda tekniker, som sparkar och dubbelslag. FV gäller alla tekniker i stilen. Teknikerna väljs i steg 11 och bestämmer vad varje FV kostar (s. 68–69).",
};

export const SPRAK_HJALP = {
  tala: "Tala är förmågan att prata och förstå ett språk. Den visas som en B-nivå: på låga nivåer klarar rollpersonen enkla ord och fraser, på B4 talar den flytande som de flesta infödda. Välj ett språk som inte redan är ditt modersmål (s. 70).",
  "lasa-skriva": "Läsa/Skriva är förmågan att läsa och skriva ett språk. Den är skild från Tala: man kan tala ett språk utan att kunna läsa det. FV i Läsa/Skriva är också taket för lärdomsfärdigheter, Historia och Alkemi. Vissa språk, som orchiska, saknar skriftspråk (s. 66).",
};

// Rasförmågor med regeleffekter (s. 30). Förmågor som förklarar sig själva har ingen text.
export const RASFORMAGOR = {
  Mörkersyn: "Ser ungefär som en katt: ganska bra även när det är mycket mörkt, men det krävs någon ljuskälla. En molnig natt är som skymning, en stjärnklar natt med fullmåne som mitt på dagen. Dimma och rök skymmer sikten helt. Bländande besvärjelser bländar dubbelt så länge (s. 30).",
  Infrasyn: "Ser värme och ser därför bra även i kolsvart mörker, helt utan ljuskälla, och rakt genom dimma och rök. Bländas av extremt starka värmekällor. Till skillnad från mörkersyn behövs inget ljus (s. 30).",
};
export const RAS_SEKUNDAR_INFO = "Färdigheter som är primära för de flesta men sekundära för den här rasen. Rollpersonen får ingen baschans i dem och de kostar som sekundära färdigheter, om de inte väljs som yrkesfärdigheter (s. 14–16).";


export const LARDOMSFORSLAG = ["Kunskap om magi", "Kunskap om religion", "Kunskap om religion (Atum)", "Kunskap om demoner", "Kunskap om odöda", "Kunskap om språk"];
