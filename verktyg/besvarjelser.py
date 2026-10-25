# Besvärjelser (s. 116–129) och reglerna för att lära sig dem (s. 36, 106–111).
# Beskrivningarna är egna korta sammanfattningar, inte bokens text.
# Fält: (skolvärde, namn, typ [F = fysisk, R = ritual, K = kvick], räckvidd, varaktighet, sida, sammanfattning)

ALLMANNA = [
    (6, "Antimagi", "", "FV×10 rutor", "FV/4 minuter", 116,
     "En magisk sköld runt en varelse eller ett föremål. Magi mot målet måste först övervinna sköldens effektgrad, annars studsar den tillbaka."),
    (6, "Skingra", "", "FV×10 rutor", "Omedelbar", 116,
     "Tar bort verkan av en annan besvärjelse, eller stoppar en som håller på att läggas, om den övervinner dess effektgrad."),
    (6, "Varseblivning", "", "FV×10 rutor", "Omedelbar", 117,
     "Ger riktning och avstånd till närmaste sak av en vald sort, till exempel en fälla eller guld. En sak per grad."),
    (9, "Beskyddare", "", "Beröring", "Permanent", 117,
     "Nio stenar bildar en skyddande kub på 3 × 3 × 3 meter som stoppar magi och föremål. Varje grad över den första lägger till 3 meter."),
    (14, "Föryngra", "R", "Beröring", "FV/4 veckor", 117,
     "Gör en kropp tillfälligt E × 5 år yngre. Bara kroppen föryngras, inte kunskaper eller sinne."),
    (14, "Laddning", "R", "Beröring", "Permanent", 117,
     "Lagrar PSY-poäng i ett föremål som ett engångsbatteri, 5 PSY per effektgrad. Ett föremål kan bara laddas en gång."),
]

ANIMISM = [
    (1, "Finna vatten", "", "FV/4 rutor", "Omedelbar", 117, "Visar avstånd och riktning till drickbart vatten. Fungerar inte när det regnar."),
    (2, "Träeld", "F, K", "Beröring", "Omedelbar", 117, "Antänder ett stycke torrt, dött trä. Ett trästycke till per extra grad."),
    (4, "Spårlös", "", "Beröring", "FV/4 minuter", 117, "Varelsen lämnar inga spår, inte ens lukt. En varelse till per extra grad."),
    (5, "Växtkunskap", "", "Beröring", "Omedelbar", 118, "Ger all kunskap om en växt man rör vid: vad den är och vad den kan användas till."),
    (6, "Minska", "", "Beröring", "FV/4 minuter", 118, "Sänker STY, FYS, STO, KAR eller SMI med 1 per grad, aldrig under 1. Färdigheterna påverkas också."),
    (6, "Nedkalla åskvigg", "F", "FV×10 rutor", "Omedelbar", 118, "Kallar ned en blixt från ett regnmoln mot ett mål. Skadar som Blixt. Det måste regna på både animisten och målet."),
    (6, "Vindpil", "F", "FV×2 rutor", "FV×1 SR", 118, "En träpil svävar framför magikern och träffar automatiskt, 1T10+E i skada. Rustning skyddar som vanligt."),
    (6, "Öka", "", "Beröring", "FV/4 minuter", 118, "Höjer STY, FYS, STO, KAR eller SMI med 1 per grad. Färdigheterna påverkas också."),
    (6, "Örtrankor", "F", "Särskild", "FV×1 SR", 118, "Ett knippe frön som kastas och snärjer offret. En grad krävs per 10 STO hos offret."),
    (7, "Kamouflage", "", "Personlig", "FV/4 minuter", 119, "Magikern smälter in i omgivningen och kan inte upptäckas så länge den står stilla."),
    (11, "Vindkontroll", "", "FV×1 km", "FV×1 timmar", 119, "Ändrar vinden: upp till E meter per sekund och ett åttondels varv i riktning per grad."),
    (12, "Förändra", "", "FV×2 rutor", "FV×1 min", 119, "Förvandlar ett föremål eller en varelse till en annan form av samma huvudtyp (djur, växt, mineral). 3 STO per grad."),
    (12, "Hela", "", "Beröring", "Omedelbar", 119, "Läker 1T6 KP per grad från sår, slag, eld, kyla och liknande. Inte sjukdomar."),
    (12, "Känna fiendskap", "", "FV×2 rutor", "Omedelbar", 119, "Avslöjar om en intelligent varelse är fientligt inställd, men inte vad den har för avsikter."),
    (13, "Regnkontroll", "", "FV/4 km", "FV×1 minuter", 120, "Får molnen att börja regna, eller stoppar regn som redan faller."),
    (15, "Dimma", "", "FV×10 rutor", "FV/4 timmar", 120, "En dimbank med högst 15 meters sikt. Kräver vatten i terrängen."),
    (15, "Neutralisera gift", "F", "Beröring", "Omedelbar", 120, "Neutraliserar 1T6+1 poäng giftstyrka per grad. Läker inte skada som redan skett."),
    (2, "Tillkalla varelse", "", "FV/4 km", "Omedelbar", 120, "Kallar till sig 20 STO varelser per grad ur rätt grupp. De är inte fientliga."),
    (5, "Tala med varelse", "", "Personlig", "FV×1 minuter", 120, "Samtal med en varelse ur rätt grupp, FV 1 i språket per grad. De flesta varelser är ointelligenta."),
    (10, "Kontrollera varelse", "", "FV×10 rutor", "FV×1 SR", 120, "Full kontroll över 20 STO varelser ur rätt grupp per grad, genom telepati."),
]
# Varelsebesvärjelserna lärs separat för varje grupp (s. 120)
VARELSEGRUPPER = ["Däggdjur", "Fåglar", "Kräldjur", "Groddjur", "Fiskar", "Insekter och spindlar",
                  "Skaldjur", "Maskar", "Blötdjur", "Växter"]
VARELSEBESVARJELSER = ["Tillkalla varelse", "Tala med varelse", "Kontrollera varelse"]

ELEMENTARMAGI = [
    (2, "Ljus", "F", "FV×10 rutor", "FV×4 minuter", 121, "Gör en del av ett föremål självlysande, lyser upp 3 meter. Mer ljus eller längre tid per extra grad."),
    (2, "Låga", "F, K", "Personlig", "1T3 SR", 121, "En liten låga ur tummen, som kan tända brännbara saker."),
    (3, "Mörker", "F", "FV×10 rutor", "FV/4 minuter", 121, "Släcker allt ljus i en sfär med 6 meters diameter."),
    (3, "Sköld", "F, K", "Personlig", "Omedelbar", 121, "Luften blir en sköld som parerar en fysisk attack automatiskt. BV 4, +2 per extra grad."),
    (3, "Försegla", "F", "Beröring", "FV×1 minuter", 121, "Binder ihop två föremål som passar ihop, till exempel dörr och karm, och ger dem 20 KP extra."),
    (4, "Flammande hand", "F", "Beröring", "1T3 minuter", 121, "Handen flammar och ger 1T3 extra skada per grad på slag. Antänder det den rör."),
    (4, "Kalla handen", "F, K", "FV/2 rutor", "Omedelbar", 121, "En köldstråle. Offret måste klara ett svårt FYS-slag eller förlora sin handling, annars −4 på CL."),
    (6, "Blixt", "F, K", "FV×10 rutor", "Omedelbar", 122, "En blixt mot närmaste mål, 1T6 per grad. Rustning skyddar inte."),
    (6, "Energistråle", "F, K", "FV×10 rutor", "Omedelbar", 122, "En ljusstråle mot ett mål, 1T6 per grad. Rustning och Skydd drar bort skada."),
    (6, "Eld", "F", "FV×10 rutor", "Omedelbar", 122, "Hetta i en sfär med 1 meters diameter, 1T6 per grad, eller fler sfärer med mindre skada."),
    (6, "Frost", "F", "FV×10 rutor", "Omedelbar", 122, "Kyla i en sfär med 1 meters diameter, 1T6 per grad, eller fler sfärer. Kan släcka eldar."),
    (6, "Förbanna vapen", "", "FV×10 rutor", "FV×1 minuter", 123, "Sänker ett vapens CL och skada med 1 per grad."),
    (6, "Förtrolla vapen", "", "FV×10 rutor", "FV×1 minuter", 123, "Höjer ett vapens CL och skada med 1 per grad. Vapnet räknas som magiskt."),
    (6, "Öppna", "F", "Beröring", "Omedelbar", 123, "Öppnar låsta dörrar, lådor och kistor. Kan bryta en Försegla."),
    (6, "Knäcka", "F, K", "FV×2 rutor", "Omedelbar", 123, "Skadar ett icke-levande föremål: −10 BV, +2 per extra grad."),
    (7, "Viggfångare", "F", "Personlig", "Omedelbar", 123, "I åskväder kan magikern dra till sig en blixt och omvandla en del av skadan till PSY-poäng."),
    (8, "Virvelsköld", "F", "Personlig", "FV×1 SR", 123, "En luftvirvel runt magikern som stöter undan projektiler."),
    (9, "Frammana elementar", "F", "FV×10 rutor", "FV×1 SR", 123, "Frammanar, eller skickar bort, en elementar av en viss sort. Kräver lite av elementet."),
    (10, "Astralvapen", "F", "FV/2 rutor", "FV×1 SR", 126, "Ett vapen med egg av blåskimrande energi. En grad per kg som det riktiga vapnet väger."),
    (11, "Explosion", "F, K", "FV×10 rutor", "Omedelbar", 126, "En eld- och ljusexplosion, 5 skada per grad inom E meter. Bländar alla som ser den."),
]
# Elementarerna lärs som separata besvärjelser (s. 123–126)
ELEMENTARER = ["Luft (sylf)", "Eld (salamander)", "Jord (gnom)", "Vatten (undin)", "Mörker (umbra)",
               "Ljus (luminal)", "Köld (glacial)", "Värme (therm)"]

MENTALISM = [
    (1, "Språng", "K", "Beröring", "FV/4 SR", 126, "Ett jättesprång utan ansats, 4 meter långt och 2 meter högt per grad."),
    (3, "Motståndskraft", "", "Beröring", "FV×1 minuter", 127, "Skyddar mot hetta och kyla. Minskar sådan skada med 1 per grad och anfall."),
    (4, "Levitation", "", "Personlig", "FV×1 minuter", 127, "Stiga rakt upp i luften, 5 meter per grad, med upp till 50 kg packning."),
    (5, "Känsloläsning", "", "FV×2 rutor", "FV/4 SR", 127, "Läser av en annan varelses känslor, till exempel om den är vänlig eller fientlig."),
    (6, "Lyft", "", "FV×4 rutor", "FV×1 minuter", 127, "Lyfter och flyttar 3 STO per grad genom luften. Kan bromsa fall."),
    (6, "Skydd", "", "FV×2 rutor", "FV/4 minuter", 127, "Som rustning: 1 poängs skydd per grad."),
    (6, "Tankeöverföring", "", "FV×10 rutor", "FV×1 SR", 128, "Ljudlös kommunikation av ytliga tankar och känslor med en varelse per grad."),
    (7, "Vattenandning", "", "Beröring", "FV×1 timmar", 128, "Den förhäxade kan andas under vatten och dyka hur djupt som helst."),
    (8, "Flyga", "", "Beröring", "FV/4 timmar", 128, "Flyga fritt med E × 5 rutor per SR. Tunga varelser kräver fler grader."),
    (8, "Läderhud", "", "Personlig", "FV×1 timmar", 128, "Huden blir läderartad och ger 2 poängs skydd, men KAR sjunker med 2."),
    (8, "Mörkersyn", "", "Beröring", "FV×1 timmar", 128, "Ser värmestrålning, till exempel varmblodiga varelser i mörker."),
    (9, "Osynlighet", "", "Beröring", "FV×1 minuter", 128, "Gör 6 STO osynliga per grad. Bryts om den osynlige slåss, springer, använder magi eller skadas."),
    (9, "Syn", "", "Personlig", "FV×1 SR", 128, "Ser och hör vad som händer på en bekant plats inom 120 meter, eller ett föremåls historia."),
    (10, "Elchock", "F, K", "Beröring", "Omedelbar", 128, "En elektrisk urladdning mot den magikern rör vid, 1T4 per grad. Metallrustning skyddar bara till hälften."),
    (11, "Tankeläsning", "", "FV×2 rutor", "FV×1 minuter", 129, "Läser en intelligent varelses tankar utan att den märker något."),
    (12, "Kontrollera person", "", "FV×4 rutor", "FV×1 SR", 129, "Styr en humanoid varelses kropp per grad. Kräver att offrets PSY övervinns och full koncentration."),
    (12, "Telepati", "", "Special", "FV×1 minuter", 129, "Tankekontakt med en namngiven varelse oavsett avstånd. En person till per extra grad."),
    (12, "Teleportera", "", "Beröring", "Omedelbar", 129, "Flyttar 3 STO per grad till en välkänd plats högst 100 meter bort."),
    (13, "Magisk syn", "", "Beröring", "FV×1 minuter", 129, "Ser naturligt eller magiskt osynliga saker och skyddar mot synförsämrande magi."),
    (14, "Orädd", "", "Beröring", "FV×1 minuter", 129, "Den förhäxade behöver aldrig slå på Skräcktabellen."),
]


def _id(namn):
    return (namn.lower().replace("å", "a").replace("ä", "a").replace("ö", "o").replace(" ", "-").replace("/", "-"))


def bygg():
    lista = []
    for skola, rader in (("allman", ALLMANNA), ("animism", ANIMISM), ("elementarmagi", ELEMENTARMAGI), ("mentalism", MENTALISM)):
        for sv, namn, typ, rackvidd, varaktighet, sida, text in rader:
            b = {"id": _id(namn), "namn": namn, "skola": skola, "sv": sv, "typ": typ,
                 "rackvidd": rackvidd, "varaktighet": varaktighet, "sida": sida, "beskrivning": text}
            if namn in VARELSEBESVARJELSER:
                b["perVal"] = "varelsegrupp"
            if namn == "Frammana elementar":
                b["perVal"] = "elementar"
            lista.append(b)
    return {
        "skolor": {"allman": "Allmänna", "animism": "Animism", "elementarmagi": "Elementarmagi", "mentalism": "Mentalism"},
        "lista": lista,
        "varelsegrupper": VARELSEGRUPPER,
        "elementarer": ELEMENTARER,
        # EP per FV-steg efter skolvärde (s. 36): SV 1–3 kostar 2, 4–6 kostar 3 … +1 per tre SV
        "kostnad": [[3, 2], [6, 3], [9, 4], [12, 5], [15, 6], [18, 7], [21, 8]],
        "regler": [
            "Besvärjelser har ingen baschans och bygger på PSY. FV kan aldrig vara högre än PSY (s. 36).",
            "En besvärjelse med högre skolvärde än FV i dess skola kan inte läras. Allmänna besvärjelser styrs av den högsta skol-FV (s. 106).",
            "FV i en besvärjelse får vara högre än FV i skolan, men effektgraden kan aldrig bli högre än skolans FV (s. 107).",
        ],
        "sida": [36, 106, 107, 111, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129],
    }
