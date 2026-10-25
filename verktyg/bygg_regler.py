"""Genererar regelfilerna (JSON) för Chronopia-rollpersonsskaparen.

Alla värden är avlästa ur regelboken; "sida" är tryckt sidnummer.
Kör: python3 bygg_regler.py <utkatalog>
"""
import json
import os
import sys
from beskrivningar import BESKRIVNINGAR
import besvarjelser
import utrustning

UT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "regler")
os.makedirs(UT, exist_ok=True)

EGENSKAPER = ["STY", "FYS", "SMI", "INT", "PSY", "KAR", "STO"]


def skriv(namn, data):
    with open(os.path.join(UT, namn + ".json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


# ---------------------------------------------------------------- raser (s. 14–16, 51–54)
def ras(id_, namn, bp, mod, sto, alder, tala, ls, formagor, primara=(), sekundara=(), startbonus=(), slagbonus=None):
    return {
        "id": id_, "namn": namn, "bp": bp,
        "mod": dict(zip(["STY", "FYS", "SMI", "INT", "PSY", "KAR"], mod)),
        "sto": dict(zip(["min", "max", "normal"], sto)),
        "alder": dict(zip(["ung", "vuxen", "medelalders", "gammal", "uraldrig"], alder)),
        "talaModersmal": tala, "lasaSkrivaModersmal": ls,
        "formagor": formagor, "primara": list(primara), "sekundara": list(sekundara),
        "startbonus": list(startbonus), "slagbonus": slagbonus or {},
        "sida": [14, 15, 16],
    }


OO = None  # öppen övre gräns
ALV_ALDER = [[16, 200], [201, 800], [801, 3000], [3001, 7000], [7001, OO]]
RASER = [
    ras("dimalv", "Dimalv", 65, [1, 1, 2, 3, 5, 1], [10, 20, 15], ALV_ALDER,
        [{"sprak": "alviska", "fv": 16}, {"sprak": "chronos", "fv": 16}], ["chronos", "alviska"],
        ["Mörkersyn", "Dör aldrig av ålder, blir aldrig sjuk"],
        slagbonus={"socialtStand": 10, "startkapital": 10}),
    ras("drakonit", "Drakonit", 20, [2, 0, 0, 0, 1, 0], [10, 18, 14],
        [[30, 50], [51, 70], [71, 90], [91, 110], [111, 150]],
        [{"sprak": "drakonitiska", "fv": 16}, {"sprak": "chronos", "fv": 5}],
        ["drakonitiska", {"sprak": "chronos", "bNivaLagre": 2}],
        [], primara=["simma"], sekundara=["rida"]),
    ras("dvarg", "Dvärg", 20, [3, 2, 0, 0, 2, 0], [7, 11, 9],
        [[25, 40], [41, 150], [151, 250], [251, 400], [401, 600]],
        [{"sprak": "dvargiska", "fv": 16}], ["dvargiska"],
        ["Infrasyn"], primara=["geologi", {"valfri": "hantverk"}], slagbonus={"startkapital": 4}),
    ras("goblin", "Goblin", 0, [-2, 2, 2, -2, -2, -2], [6, 10, 8],
        [[8, 15], [16, 25], [26, 35], [36, 45], [46, 65]],
        [{"sprak": "chronos", "fv": 16}], [], ["Mörkersyn"]),
    ras("halvalv", "Halvalv", 20, [-1, -1, 2, 0, 3, 1], [8, 18, 13],
        [[30, 40], [41, 70], [71, 100], [101, 130], [131, 300]],
        [{"sprak": "alviska", "fv": 16}, {"sprak": "chronos", "fv": 16}], ["chronos", "alviska"], []),
    ras("hoglandare", "Högländare", 30, [2, 2, 0, 0, 0, 0], [11, 21, 16],
        [[15, 20], [21, 45], [46, 60], [61, 70], [71, 125]],
        [{"sprak": "hoglandska", "fv": 16}], ["hoglandska"], [],
        primara=[{"valfri": "vapen"}], sekundara=["bluffa", "stjala-foremal"],
        startbonus=[{"fardighet": "rida", "bc": 5}]),
    ras("ljusalv", "Ljusalv", 30, [-1, 0, 3, 1, 0, 2], [10, 20, 15], ALV_ALDER,
        [{"sprak": "alviska", "fv": 16}, {"sprak": "chronos", "fv": 16}], ["alviska", "chronos"],
        ["Mörkersyn", "Dör aldrig av ålder, blir aldrig sjuk"],
        primara=["vapen:Långbåge"], sekundara=["rida"], startbonus=[{"fardighet": "klattra", "bc": 5}]),
    ras("manniska", "Människa", 15, [0, 0, 0, 0, 0, 0], [8, 18, 13],
        [[16, 20], [21, 45], [46, 60], [61, 70], [71, 100]],
        [{"sprak": "chronos", "fv": 16}], ["chronos"], []),
    ras("orch", "Orch", 10, [3, 3, -1, -1, -2, -1], [6, 16, 11],
        [[12, 18], [19, 30], [31, 40], [41, 50], [51, 75]],
        [{"sprak": "orchiska", "fv": 16}, {"sprak": "chronos", "fv": 5}], [], ["Infrasyn"]),
    ras("stadsalv", "Stadsalv", 25, [0, -1, 1, 0, 1, 2], [12, 18, 15],
        [[16, 150], [151, 750], [751, 2500], [2501, 5000], [5001, OO]],
        [{"sprak": "alviska", "fv": 16}, {"sprak": "chronos", "fv": 16}], ["alviska", "chronos"],
        ["Mörkersyn", "Dör aldrig av ålder eller sjukdom, men kan bli sjuk"],
        slagbonus={"socialtStand": 15, "startkapital": 15}),
    ras("troll", "Troll", 30, [6, 5, -3, -3, -2, -2], [16, 24, 20],
        [[15, 18], [19, 30], [31, 40], [41, 50], [51, 75]],
        [{"sprak": "chronos", "fv": 16}], [], [],
        primara=["barsarkagang"], startbonus=[{"fardighet": "barsarkagang", "bc": 5}]),
    ras("wongos", "Wongos", 0, [-2, 2, 0, 0, 0, 0], [6, 10, 8],
        [[20, 30], [31, 60], [61, 75], [76, 100], [101, 150]],
        [{"sprak": "wongosiska", "fv": 16}, {"sprak": "chronos", "fv": 5}], ["chronos", "wongosiska"], [],
        startbonus=[{"fardighet": "kopsla", "bc": 5}]),
]
# Egna korta sammanfattningar av rasbeskrivningarna (s. 14–16)
RASBESKRIVNING = {
    "dimalv": "Ur-alverna som stadsalver och ljusalver härstammar från. Starkare och kraftigare än andra alver, ofta med stor magisk kraft och visdom. I människornas stad Chronopia passar de illa in; de är illa omtyckta och ser själva ner på stadens dekadenta invånare.",
    "drakonit": "Liknar stora ödlor eller krokodiler som går på två ben, med vaggande gång och svängande svans. Större och starkare än människor och ofta duktiga krigare. I Chronopia lever de för sig själva i en egen stadsdel och tål inte att någon kommenterar deras utseende.",
    "dvarg": "Korta, kraftigt byggda och ofta långskäggiga. Deras städer ligger under jorden, där de bryter guld, ädelstenar och svart gas. Duktiga krigare, hantverkare, ingenjörer och advokater, men sällan magiker. Dvärgiskan skiljer sig så mycket från människospråken att de flesta dvärgar har svårt med språk.",
    "goblin": "Komiska, småvuxna och klent byggda, med grönaktig och vårtig hy. Ses som korkade och lättlurade och lever ofta som rövare, tjuvar, tiggare eller gycklare. De håller sig borta från gatorna, vilket fått folk att tro att de är rädda för solen.",
    "halvalv": "Halvt människa, halvt alv: kortare än alver och klenare än människor, men ofta med sällsynta magiska gåvor. Många ser dem med misstänksamhet. De som inte blir magiker blir ofta tjuvar eller lönnmördare.",
    "hoglandare": "Ett storvuxet, stolt och hästburet människofolk från de otillgängliga högländerna i norr, härdat av årtusenden av krig för sitt land. De handlar mycket med dvärgarna, och de som syns i Chronopia är oftast äventyrare eller köpmän man inte lurar i första taget.",
    "ljusalv": "Långa, spensliga alver från skogarna kring staden, där de bor i väldiga städer uppe i trädkronorna. Uppsluppna och lekfulla, men ogillar inkräktare och främlingar, och kan verka grymma och egoistiska. I staden är de oftast pälsjägare, gycklare eller äventyrare.",
    "manniska": "I Chronopia samlas människor från hela världen och alla kulturer: köpmän, legoknektar, äventyrare, magiker, lärda, sjöfarare och upptäcktsresande, i alla storlekar och sorter.",
    "orch": "Kraftiga och krumryggade, med ovanligt långa armar. Stora och starka men sällan särskilt kloka; de som inte slavar i dvärgarnas gruvor blir ofta krigare. Stadsborna ser dem som bråkiga och våldsamma, och alla orcher är mycket snåla.",
    "stadsalv": "Antingen födda i staden eller inflyttade för tusentals år sedan. Ofantligt förmögna, med pengar som de gärna slösar på vin och nöjen och vinner tillbaka genom bankverksamhet och handel. De är stadens överklass och ser människor som tjänstefolk.",
    "troll": "Syns på håll, en meter högre än resten av folkmassan. Trots muskler och längd är de oftast vänliga och godtrogna, ja lite för vänliga och lättlurade. Men den som till slut lyckas reta upp ett troll gör det sällan igen. Arbetar ofta som dörrvakter, gladiatorer, legosoldater och vagnsdragare.",
    "wongos": "Kortvuxna, med gulaktig hy, breda munnar, platta ansikten och stora trubbiga hörntänder som ger ett barnsligt och komiskt intryck. Trots det är de respekterade köpmän och mästerliga förhandlare, och de långa livet och alla handelsresor gör dem ofta visa.",
}
for r in RASER:
    r["beskrivning"] = RASBESKRIVNING[r["id"]]
skriv("raser", RASER)

# ---------------------------------------------------------------- ålder (s. 16–17, 34)
skriv("alder", {
    "kategorier": [
        {"id": "ung", "namn": "Ung"}, {"id": "vuxen", "namn": "Vuxen"},
        {"id": "medelalders", "namn": "Medelålders"}, {"id": "gammal", "namn": "Gammal"},
        {"id": "uraldrig", "namn": "Uråldrig"}],
    "effekter": {  # s. 17
        "ung": {"STY": -1, "FYS": 2, "SMI": 2, "INT": 0, "PSY": -3, "KAR": 0},
        "vuxen": {"STY": 0, "FYS": 0, "SMI": 0, "INT": 0, "PSY": 0, "KAR": 0},
        "medelalders": {"STY": 0, "FYS": -1, "SMI": -1, "INT": 1, "PSY": 2, "KAR": 0},
        "gammal": {"STY": -2, "FYS": -4, "SMI": -2, "INT": 2, "PSY": 5, "KAR": 2},
        "uraldrig": {"STY": -4, "FYS": -8, "SMI": -4, "INT": 4, "PSY": 7, "KAR": 2},
    },
    # Extra BP, startkapitalmultiplikator (s. 17) och start-EP (s. 34), efter ålder i år
    "efterAr": [
        {"max": 20, "bp": 0, "kapital": 0.5, "ep": 150},
        {"max": 45, "bp": 0, "kapital": 1, "ep": 175},
        {"max": 60, "bp": 5, "kapital": 2, "ep": 200},
        {"max": 80, "bp": 10, "kapital": 3, "ep": 225},
        {"max": 200, "bp": 15, "kapital": 4, "ep": 250},
        {"max": 1000, "bp": 20, "kapital": 5, "ep": 300},
        {"max": 5000, "bp": 30, "kapital": 6, "ep": 400},
        {"max": None, "bp": 50, "kapital": 7, "ep": 500},
    ],
    "sida": [16, 17, 34],
})

# ---------------------------------------------------------------- grundegenskaper (s. 10, 27–29)
skriv("grundegenskaper", {
    "startBP": 125,
    "kostnad": {str(v): k for v, k in zip(range(3, 19),
                [0, 1, 2, 3, 5, 7, 9, 10, 11, 12, 14, 17, 20, 25, 30, 40])},  # s. 27
    "minstSlutvarde": 3,
    "sto": {"hojning": [2, 4, 6, 8, 10], "sankning": [1, 2, 3, 5, 7]},  # BP per steg 1–5, s. 28
    "kroppspoang": {  # s. 28: kolumner för total KP 5–7, 8–11, 12–15, 16–20, 21–25, 26–30, 31–35, 36–40, därefter +5 per kolumn
        "kolumner": [[5, 7], [8, 11], [12, 15], [16, 20], [21, 25], [26, 30], [31, 35], [36, 40]],
        "delar": [
            {"id": "huvud", "namn": "Huvud", "kp": [3, 4, 5, 6, 7, 8, 9, 10]},
            {"id": "brostkorg", "namn": "Bröstkorg", "kp": [4, 5, 6, 7, 8, 9, 10, 11]},
            {"id": "mage", "namn": "Mage", "kp": [3, 4, 5, 6, 7, 8, 9, 10]},
            {"id": "hoger-arm", "namn": "Höger arm", "kp": [2, 3, 4, 5, 6, 7, 8, 9]},
            {"id": "vanster-arm", "namn": "Vänster arm", "kp": [2, 3, 4, 5, 6, 7, 8, 9]},
            {"id": "hoger-ben", "namn": "Höger ben", "kp": [3, 4, 5, 6, 7, 8, 9, 10]},
            {"id": "vanster-ben", "namn": "Vänster ben", "kp": [3, 4, 5, 6, 7, 8, 9, 10]},
        ]},
    "skadebonus": [  # STY+STO, s. 29
        [26, "—"], [29, "+1"], [32, "+1T2"], [40, "+1T4"], [50, "+1T6"], [60, "+1T10"],
        [80, "+2T6"], [100, "+3T6"], [140, "+4T6"], [180, "+5T6"]],
    "forflyttning": {"gransvarden": [11, 20, 29, 38, 47, 56, 65, 74, 83, 92], "forsta": 7, "steg": 8},  # STO+FYS+SMI, s. 29
    "storlek": [  # STO -> vikt kg, längd cm (s. 10)
        [1, 1, 9, 10, 60], [2, 10, 18, 40, 110], [3, 19, 27, 60, 120], [4, 28, 36, 75, 130],
        [5, 37, 45, 90, 140], [6, 46, 50, 110, 150], [7, 51, 55, 130, 160], [8, 56, 60, 140, 170],
        [9, 61, 65, 150, 175], [10, 66, 70, 155, 180], [11, 71, 75, 160, 180], [12, 76, 80, 160, 180],
        [13, 81, 85, 165, 185], [14, 86, 90, 170, 185], [15, 91, 95, 175, 190], [16, 96, 100, 180, 195],
        [17, 101, 110, 185, 200], [18, 111, 120, 190, 205], [19, 121, 130, 200, 210],
        [20, 131, 140, 205, 220], [21, 141, 150, 210, 230]],
    "sida": [10, 27, 28, 29],
})

# ---------------------------------------------------------------- färdigheter (s. 40–72)
def f(id_, namn, egenskap, typ="sekundar", b=False, sida=None, **extra):
    d = {"id": id_, "namn": namn, "grundegenskap": egenskap, "typ": typ, "kategoriB": b, "sida": sida}
    d.update(extra)
    return d


FARDIGHETER = [
    # Primära (s. 40, 48–55)
    f("bluffa", "Bluffa", "KAR", "primar", sida=48),
    f("finna-dolda-ting", "Finna dolda ting", "PSY", "primar", sida=48),
    f("forsta-hjalpen", "Första hjälpen", "INT", "primar", sida=49),
    f("gomma-sig", "Gömma sig", "INT", "primar", sida=49),
    f("hoppa", "Hoppa", "SMI", "primar", sida=49),
    f("klattra", "Klättra", "SMI", "primar", sida=50),
    f("kopsla", "Köpslå", "KAR", "primar", sida=50),
    f("lyssna", "Lyssna", "INT", "primar", sida=51),
    f("rida", "Rida", "SMI", "primar", sida=52),
    f("sjunga", "Sjunga", "KAR", "primar", sida=52),
    f("slagsmal", "Slagsmål", "STY", "primar", sida=52),
    f("smyga", "Smyga", "SMI", "primar", sida=52),
    f("spara", "Spåra", "INT", "primar", sida=53),
    f("stjala-foremal", "Stjäla föremål", "SMI", "primar", sida=54),
    f("upptacka-fara", "Upptäcka fara", "PSY", "primar", sida=54),
    f("vardera", "Värdera", "INT", "primar", sida=55),
    f("overtala", "Övertala", "KAR", "primar", sida=55),
    # Språk (special BC, s. 51–54, 64, 70)
    f("tala", "Tala", "INT", "sprak", True, sida=70, perVal="sprak"),
    f("lasa-skriva", "Läsa/Skriva", "INT", "sprak", True, sida=64, perVal="sprak"),
    # Sekundära (s. 41–42, 56–72)
    f("animism", "Animism", "INT", "magiskola", sida=107),
    f("elementarmagi", "Elementarmagi", "INT", "magiskola", sida=107),
    f("mentalism", "Mentalism", "INT", "magiskola", sida=107),
    f("administration", "Administration", "INT", b=True, sida=56, perVal="stad", gruppYrke=True),
    f("akrobatik", "Akrobatik", "SMI", b=True, sida=56),
    f("alkemi", "Alkemi", "INT", sida=56, tak="lasa-skriva"),
    f("astrologi", "Astrologi", "INT", sida=57),
    f("avvapna", "Avväpna", "SMI", sida=57),
    f("buktala", "Buktala", "PSY", sida=57),
    f("barsarkagang", "Bärsärkagång", "PSY", sida=57),
    f("dans", "Dans", "SMI", b=True, sida=57),
    f("djurhelning", "Djurhelning", "INT", sida=58, perVal="djur", gruppYrke=True),
    f("djurtraning", "Djurträning", "PSY", sida=58, perVal="djur", gruppYrke=True),
    f("dra-vapen", "Dra vapen", "SMI", sida=58, tak="vapen"),
    f("drogkunskap", "Drogkunskap", "INT", sida=58),
    f("forfalskning", "Förfalskning", "INT", sida=58),
    f("geografi", "Geografi", "INT", b=True, sida=59, perVal="kontinent", gruppYrke=True),
    f("geologi", "Geologi", "INT", b=True, sida=59),
    f("giftkunskap", "Giftkunskap", "INT", sida=59),
    f("gyckelkonster", "Gyckelkonster", "SMI", b=True, sida=59),
    f("hantera-fallor", "Hantera fällor", "SMI", sida=59),
    f("hantverk", "Hantverk", "varierar", b=True, sida=59, perVal="hantverk", gruppYrke=True),
    f("hasardspel", "Hasardspel", "PSY", sida=60),
    f("heraldik", "Heraldik", "INT", b=True, sida=61),
    f("historia", "Historia", "INT", b=True, sida=61, tak="lasa-skriva"),
    f("hypnotisera", "Hypnotisera", "PSY", sida=61, tak="PSY"),
    f("knopar", "Knopar", "SMI", sida=62),
    f("kulturkannedom", "Kulturkännedom", "INT", b=True, sida=62, perVal="kultur", gruppYrke=True),
    f("kanna-magi", "Känna magi", "PSY", sida=62, perVal="skola"),
    f("lasdyrkning", "Låsdyrkning", "SMI", sida=62),
    f("lakekonst", "Läkekonst", "INT", sida=63),
    f("lappläsning", "Läppläsning", "INT", sida=63),
    f("lardom", "Lärdomsfärdighet", "INT", b=True, sida=63, perVal="amne", tak="lasa-skriva"),
    f("magisk-kanalisering", "Magisk kanalisering", "INT", sida=65),
    f("magistudier", "Magistudier", "INT", sida=65, tak="lasa-skriva"),
    f("massage", "Massage", "SMI", sida=65),
    f("muta", "Muta", "KAR", sida=65),
    f("malning", "Målning", "SMI", sida=66),
    f("navigera", "Navigera", "INT", sida=66),
    f("orientering", "Orientering", "INT", sida=66),
    f("rida-flygande-djur", "Rida flygande djur", "SMI", sida=66),
    f("rakning", "Räkning", "INT", b=True, sida=66),
    f("schack", "Schack & brädspel", "INT", sida=67),
    f("simma", "Simma", "SMI", b=True, sida=67),
    f("sjokunnighet", "Sjökunnighet", "INT", sida=67),
    f("skadespeleri", "Skådespeleri", "KAR", sida=67),
    f("spela-instrument", "Spela instrument", "KAR", sida=68, perVal="instrument", gruppYrke=True),
    f("spa-vader", "Spå väder", "INT", sida=68),
    f("stridskonster", "Stridskonster", "SMI", sida=68, perVal="stil"),
    f("tva-vapen", "Två vapen", "varierar", sida=70, perVal="kombination", tak="tva-vapen"),
    f("undre-varlden", "Undre världen", "INT", b=True, sida=71, perVal="stad", gruppYrke=True),
    f("vapen", "Vapenfärdighet", "varierar", sida=71, perVal="vapen"),
    f("zoologi", "Zoologi", "INT", b=True, sida=71),
    f("ortkunskap", "Örtkunskap", "INT", sida=72),
    f("overlevnad", "Överlevnad", "INT", sida=72),
]
for d in FARDIGHETER:
    if d["id"] == "lappläsning":
        d["id"] = "lapplasning"
    d["beskrivning"] = BESKRIVNINGAR[d["id"]]
skriv("fardigheter", {
    "hantverkBeskrivning": {  # egna korta beskrivningar; boken listar bara namnen (s. 59)
        "Smide": "Att smida verktyg, vapen och rustningar av järn och stål.",
        "Sömnad": "Att sy kläder, tält, segel och annat av tyg.",
        "Snickeri": "Att bygga möbler, dörrar, kistor och hus av trä.",
        "Stenhuggning": "Att hugga och foga sten till byggnader, statyer och gravstenar.",
        "Garvning": "Att bereda djurhudar till läder och päls.",
        "Guldsmide": "Att forma smycken och prydnader av guld, silver och andra ädla metaller.",
        "Juvelsnideri": "Att slipa ädelstenar och fatta dem i smycken.",
        "Hovslageri": "Att sko hästar och andra riddjur och sköta deras hovar.",
        "Gjutning": "Att gjuta föremål av metall, till exempel klockor, kittlar och statyer.",
        "Träsnideri": "Att snida i trä, till exempel pilar, bågar, skålar och utsmyckningar.",
        "Tygfärgning": "Att färga tyg och garn med växtfärger och andra färgämnen.",
        "Läderarbete": "Att tillverka skor, sadlar, bälten och läderrustningar.",
    },
    "lista": FARDIGHETER,
    "kostnad": {"primar": 2, "yrke": 3, "sekundar": 5, "magiskolaSekundar": 20},  # EP per FV, s. 35
    "baschans": [[3, 0], [8, 1], [12, 2], [16, 3], [20, 4], [None, 5]],  # s. 34
    "bNivaer": [[0, "B0"], [4, "B1"], [10, "B2"], [15, "B3"], [19, "B4"], [None, "B5"]],  # s. 43
    "besvarjelseKostnad": {"sv": [[3, 2], [6, 3], [9, 4], [12, 5], [15, 6], [18, 7], [21, 8]], "darefterPer3": 1},  # s. 36
    "lasaSkrivaModersmalBC": {  # s. 52: [INT 15+, INT 1–14]
        "overklass": [20, 16], "hogreMedelklass": [16, 11], "lagreMedelklass": [11, 5],
        "hogreUnderklass": [5, 1], "ovriga": [1, 0]},
    "talaModersmalFV": {"overklass": 20, "ovriga": 16},  # s. 54
    "sprak": [
        {"id": "chronos", "namn": "Chronos"}, {"id": "alviska", "namn": "Alviska"},
        {"id": "dvargiska", "namn": "Dvärgspråket", "not": "Hålls hemligt"},
        {"id": "orchiska", "namn": "Orchiska", "skriftsprak": False},
        {"id": "wongosiska", "namn": "Wongosiska", "endastPrimarFor": "wongos"},
        {"id": "hoglandska", "namn": "Högländska"},
        {"id": "drakonitiska", "namn": "Drakonitiska", "maxFvAndra": 5},
        {"id": "uraldriga", "namn": "Uråldriga språk", "aldrigYrke": True},
        {"id": "draksprak", "namn": "Drakspråk", "aldrigYrke": True},
        {"id": "lonnmordartecken", "namn": "Lönnmördargillets hemliga teckenspråk", "endastTala": True}],
    "hantverk": [["Smide", "STY"], ["Sömnad", "SMI"], ["Snickeri", "SMI"], ["Stenhuggning", "SMI"],
                 ["Garvning", "INT"], ["Guldsmide", "SMI"], ["Juvelsnideri", "SMI"], ["Hovslageri", "SMI"],
                 ["Gjutning", "INT"], ["Träsnideri", "SMI"], ["Tygfärgning", "INT"], ["Läderarbete", "SMI"]],
    "stridskonstTekniker": [  # s. 68, grundkostnad; † = endast mot människoliknande
        ["Avväpning", 1.0], ["Bakåtspark", 0.5], ["Bedövningsslag†", 1.0], ["Blind strid", 2.0],
        ["Dubbelslag", 1.0], ["Dubbelspark", 1.5], ["Fallteknik/rullningar", 0.5], ["Fint", 0.5],
        ["Hoppspark", 1.0], ["Högt kast†", 1.0], ["Initiativbonus", 0.5], ["Krosslag", 1.0],
        ["Liggande/knästående strid", 1.0], ["Lågt kast†", 0.5], ["Låsning/nerdragning†", 1.0],
        ["Normalt slag", 0.5], ["Normal spark", 0.5], ["Obeväpnad parering av vapen", 0.5],
        ["Rundspark", 1.0], ["Stålsättning", 1.0], ["Uppresning", 0.5], ["Vidvinkelsyn", 1.0]],
    # Egna korta sammanfattningar av teknikbeskrivningarna (s. 69–70)
    "stridskonstBeskrivning": {
        "Avväpning": "Obeväpnad parering mot ett vapenanfall. Misslyckas anfallet flyger vapnet 1T3 rutor, om inte anfallaren lyckas parera avväpningen. Vid perfekt slag tar försvararen vapnet själv, om inte anfallaren också slog perfekt.",
        "Bakåtspark": "Spark mot en motståndare i rutan bakom kämpen. 1T6 i skada.",
        "Bedövningsslag†": "Slag med knytnäve eller fingrar mot nervknutar, 1T3 i skada. Den som skadas måste klara ett Svårt FYS-slag, annars är den bedövad och förlorar nästa attack eller parering. Mot icke-människoliknande gör det bara 1T3 i skada.",
        "Blind strid": "Kämpen känner av var motståndarna finns utan att se dem och kan slåss i totalt mörker. Alltid påkopplad, kräver inget slag. Terrängen kan fortfarande ställa till det.",
        "Dubbelslag": "Två knytnävsattacker i samma SR mot två olika motståndare, 1T3 i skada vardera och ett slag per attack. Offren får stå högst 180° isär.",
        "Dubbelspark": "Flygande hoppspark som träffar två olika motståndare, en med varje fot, 1T6 i skada vardera och ett slag per spark. Offren får stå högst 1 meter isär. I övrigt som hoppspark.",
        "Fallteknik/rullningar": "Ett lyckat slag halverar skadan från ett fall. En rullning flyttar kämpen upp till 5 rutor på en SR, och en rullande person kan inte huggas med närstridsvapen. Misslyckas rullningen kommer man bara halvvägs och blir liggande.",
        "Fint": "Görs samtidigt som ett anfall. Lyckas finten halveras motståndarens chans att parera (avrundat nedåt). Fungerar med alla anfall utom avståndsvapen.",
        "Hoppspark": "Sats och hopp med spark mot huvud eller bröstkorg, 1T8 i skada. Missar sparken landar kämpen i målets ruta och måste klara ett SMI-slag för att inte ramla omkull. Ger −2 på initiativslaget.",
        "Högt kast†": "Görs alltid sist i SR. Lyckas kastet hamnar offret liggande 1T3 rutor bort och tar 1T3 i skada om det missar ett Svårt SMI-slag.",
        "Initiativbonus": "Alltid påkopplad, kräver inget slag. Kämpen lägger 5 till sin SMI när turordningen i striden räknas fram.",
        "Krosslag": "Knytnävsslag mot ömtåliga punkter som tinning, struphuvud eller solar plexus. 1T6 i skada.",
        "Liggande/knästående strid": "Kämpen kan slå, sparka, parera och göra låga kast när den ligger ned, och anfallare får ingen bonus mot den. Alltid påkopplad, kräver inget slag.",
        "Lågt kast†": "Lyckas kastet hamnar försvararen omkull i sin egen ruta utan att skadas och kan resa sig efter 1T2 SR. Kastet kan pareras.",
        "Låsning/nerdragning†": "Ett anfall som drar ned motståndaren på marken och låser den där. Kan pareras. För att ta sig loss måste offret övervinna anfallarens FV med sin halverade SMI.",
        "Normalt slag": "Vanligt knytnävsslag mot huvud eller bröstkorg. 1T3 i skada.",
        "Normal spark": "Vanlig spark mot ben, bröstkorg eller huvud. 1T6 i skada.",
        "Obeväpnad parering av vapen": "Kämpen kan parera alla närstridsanfall, även med vapen, som om den hade ett vapen. Utan tekniken kan en obeväpnad kämpe bara parera obeväpnade anfall.",
        "Rundspark": "Spark med ett helt varv för extra kraft, 1T8 i skada. Missar den kan kämpen inte anfalla eller parera nästa runda. Ger −2 på initiativslaget.",
        "Stålsättning": "Med ett lyckat slag när kämpen skadas tar den bara halv skada. Fungerar inte mot slag mot huvudet.",
        "Uppresning": "Med ett lyckat slag reser sig kämpen direkt efter att ha kastats omkull, oavsett när i rundan det hände.",
        "Vidvinkelsyn": "Kämpen uppfattar allt inom 270° omkring sig. Alltid påkopplad, kräver inget slag.",
    },
    "sida": [34, 35, 36, 40, 43, 52, 54, 68, 69, 70],
})

# ---------------------------------------------------------------- yrken (s. 18–26, 41–42)
def y(id_, namn, sida, formaga, fardigheter, valfri=True, auto=(), **extra):
    d = {"id": id_, "namn": namn, "sida": sida, "yrkesformaga": formaga,
         "fardigheter": fardigheter, "valfri": valfri, "automatiska": list(auto)}
    d.update(extra)
    return d


def val(*alt):
    return {"valEn": list(alt)}


def antal(fardighet, n):
    return {"fardighet": fardighet, "antal": n}


MAGI_AUTO = ["kanna-magi", "kunskap-om-magi"]
TRE_KUNSKAPER = val("drogkunskap", "giftkunskap", "ortkunskap")
YRKEN = [
    y("animist", "Animist", 19, "Behöver inget magiförmågeslag för att lära sig magiskolor.",
      ["animism", val("djurhelning", "djurtraning", "zoologi"), TRE_KUNSKAPER, "lakekonst",
       antal("lardom", 1), antal("lasa-skriva", 1), "magistudier", antal("tala", 1), antal("vapen", 1)],
      auto=MAGI_AUTO, magiker=True),
    y("bard", "Bard", 19, "Känner alltid till det senaste skvallret (SL avgör).",
      [val("akrobatik", "administration"), val("geografi", {"fardighet": "hantverk", "antal": 1}),
       antal("lardom", 1), antal("lasa-skriva", 1), "spela-instrument", antal("tala", 1),
       "undre-varlden", antal("vapen", 2)]),
    y("elementarmagiker", "Elementarmagiker", 20, "Behöver inget magiförmågeslag för att lära sig magiskolor.",
      [val("alkemi", "astrologi"), TRE_KUNSKAPER, "elementarmagi", antal("lardom", 1), antal("lasa-skriva", 1),
       "magisk-kanalisering", "magistudier", antal("tala", 1), antal("vapen", 1)],
      auto=MAGI_AUTO, magiker=True),
    y("gladiator", "Gladiator", 20, "+5 på initiativet i dueller man mot man. Börjar med 0 dödspoäng.",
      ["avvapna", "dra-vapen", "stridskonster", "tva-vapen", antal("vapen", 5)]),
    y("gycklare", "Gycklare", 21, "Svälter aldrig; tjänar 1T10 kopparstycken i timmen på att uppträda.",
      ["akrobatik", "buktala", "dans", "gyckelkonster", "lasdyrkning", "skadespeleri", "spela-instrument",
       antal("vapen", 2)]),
    y("hantverkare", "Hantverkare", 21, "+3 i Köpslå och Värdera vid start; +10 på FV i ett av sina tre hantverk.",
      ["administration", antal("hantverk", 3), antal("lardom", 1), antal("lasa-skriva", 1), "rakning",
       antal("tala", 1), antal("vapen", 1)],
      startbonus=[{"fardighet": "kopsla", "bc": 3}, {"fardighet": "vardera", "bc": 3},
                  {"fardighet": "hantverk", "bc": 10, "valEttAv": "yrkesHantverk"}]),
    y("krigare", "Krigare", 22, "+3 på alla initiativslag i strid.",
      ["dra-vapen", antal("hantverk", 1), "muta", antal("tala", 1), "tva-vapen", "undre-varlden",
       antal("vapen", 3)]),
    y("kopman", "Köpman", 22, "+5 i Köpslå och Värdera vid start; +5 på slaget för startkapital.",
      ["administration", "geografi", antal("hantverk", 1), "kulturkannedom", antal("lasa-skriva", 1), "muta",
       "rakning", antal("tala", 1), antal("vapen", 1)],
      startbonus=[{"fardighet": "kopsla", "bc": 5}, {"fardighet": "vardera", "bc": 5}],
      slagbonus={"startkapital": 5}, kapitaltak=15),
    y("lard-man", "Lärd man", 23, "Alla lärdomsfärdigheter är yrkesfärdigheter.",
      ["administration", "geografi", "historia", "kulturkannedom", antal("lardom", None),
       antal("lasa-skriva", 2), antal("tala", 2)]),
    y("lonnmordare", "Lönnmördare", 23,
      "Lönnmord: lyckat Smyga mot misslyckat Upptäcka fara ger dubbel (perfekt: fyrdubbel) vapenskada utan SB.",
      ["akrobatik", val("forfalskning", "undre-varlden"), "giftkunskap", "hantera-fallor", "lasdyrkning",
       "muta", "skadespeleri", antal("vapen", 2)]),
    y("mentalist", "Mentalist", 24, "Behöver inget magiförmågeslag för att lära sig magiskolor.",
      [TRE_KUNSKAPER, "hypnotisera", antal("lardom", 1), antal("lasa-skriva", 1), "magistudier", "mentalism",
       antal("tala", 1), antal("vapen", 2)],
      auto=MAGI_AUTO, magiker=True),
    y("munk", "Munk", 24, "Meditation: varje SR ger +1 FV i en färdighet (högst dubbla FV) för ett slag inom en minut.",
      ["administration", TRE_KUNSKAPER, antal("hantverk", 1), "lakekonst",
       {"fardighet": "lardom", "antal": 2, "maste": ["Kunskap om religion"]},
       antal("lasa-skriva", 1), antal("tala", 1), antal("vapen", 1)]),
    y("paladin", "Paladin", 25, "50 extra BP som kulten bestämmer över; måste lyda order.",
      ["giftkunskap", "hantera-fallor", "lasdyrkning", {"fardighet": "lardom", "antal": 1, "maste": ["Kunskap om religion"]},
       antal("lasa-skriva", 1), antal("tala", 1), antal("vapen", 3)],
      extraBP={"antal": 50, "styrsAv": "kulten (SL)"}),
    y("resenar", "Resenär", 25, "+5 på FYS, STO eller STY vid motståndsslag mot elementarbesvärjelser och naturens element.",
      ["geografi", antal("hantverk", 1), val("hasardspel", "knopar"), antal("lasa-skriva", 1),
       val("navigera", "orientering"), val("rida-flygande-djur", "simma"), val("sjokunnighet", "overlevnad"),
       antal("tala", 1), antal("vapen", 1)]),
    y("tjuv", "Tjuv", 26, "Kan lägga PSY-poäng för +1 CL vardera (högst +3) på ett färdighetsslag, två gånger mellan sömn.",
      ["akrobatik", "forfalskning", "hantera-fallor", "lasdyrkning", "muta", "skadespeleri", "undre-varlden",
       antal("vapen", 2)]),
    y("arkemagiker", "Ärkemagiker", 26, "Behöver inget magiförmågeslag; FV i en magiskola aldrig över INT.",
      ["animism", TRE_KUNSKAPER, "elementarmagi", antal("lardom", 1), antal("lasa-skriva", 2), "magistudier",
       "mentalism", antal("tala", 2)],
      valfri=False, auto=MAGI_AUTO, magiker=True, skolTak="INT"),
]
skriv("yrken", {
    "lista": YRKEN,
    "extraYrkesfardigheter": {"forsta": 5, "andra": 7, "darefter": 10, "magiskola": 20},  # BP, s. 27
    "sida": [18, 19, 20, 21, 22, 23, 24, 25, 26, 27],
})

# ---------------------------------------------------------------- slagtabeller (s. 32–33)
skriv("slag", {
    "svardshand": {"tarning": "2T6", "tabell": [[11, "Höger"], [14, "Vänster"], [18, "Dubbelhänt"], [None, "Ambidextriös"]], "sida": 32},
    "socialtStand": {"tarning": "2T6", "sida": 33, "tabell": [
        [2, "Egendomslös", "ovriga"], [4, "Lägre underklass", "ovriga"], [7, "Högre underklass", "hogreUnderklass"],
        [11, "Lägre medelklass", "lagreMedelklass"], [16, "Högre medelklass", "hogreMedelklass"],
        [22, "Lägre överklass", "overklass"], [29, "Högre överklass", "overklass"],
        [37, "Lågadel", "overklass"], [None, "Högadel", "overklass"]]},
    "startkapital": {"tarning": "2T6", "sida": 33, "tak": 10, "tabell": [
        [2, 250], [4, 500], [7, 750], [11, 1500], [16, 3000], [22, 5000], [29, 10000],
        [37, 20000], [46, 35000], [56, 50000], [None, 100000]]},
    "sarskildaFormagor": {"tarning": "2T20", "maxBP": 40, "sida": [30, 31, 32]},
    "magiformaga": {"tarning": "1T100", "regel": "högst (INT+PSY)/2, avrundat uppåt", "sida": 106},
})

# ---------------------------------------------------------------- särskilda förmågor (s. 30–32)
SF = [
    ("3-4", "Talang", "+1 FV i valfri sekundär färdighet (ej magi)."),
    ("5", "Berest", "+2 FV i två Geografi-färdigheter."),
    ("6", "Musikalisk", "FV 15 i Spela ett valfritt instrument."),
    ("7", "Sjöfarare", "+2 FV i Sjökunnighet och Navigera."),
    ("8", "Akrobat", "+3 FV i Akrobatik."),
    ("9", "Kanalisator", "+5 CL i Magisk kanalisering."),
    ("10", "Örtkunnig", "+3 FV i Örtkunskap, Giftkunskap och Drogkunskap."),
    ("11", "Räknehuvud", "+5 FV i Räkning."),
    ("12", "Konstnärlig", "+3 FV i Förfalskning och Målning."),
    ("13", "Hypnotisk blick", "+5 CL i Hypnotisera."),
    ("14", "Spänstig", "+3 FV i Hoppa."),
    ("15", "Byråkrat", "+3 FV i Administration."),
    ("16", "Spelare", "+3 FV i Schack & brädspel eller i Hasardspel."),
    ("17", "Stora öron", "−2 KAR, +5 FV i Lyssna."),
    ("18", "Slagskämpe", "+3 FV i Slagsmål."),
    ("19", "Gourmand", "Kännare av mat och dryck."),
    ("20", "Händig", "+3 FV i ett valfritt hantverk."),
    ("21", "Skarpt öga", "+3 FV i Värdera."),
    ("22", "Snabbfotad", "Förflyttning +1."),
    ("23", "Tvåhandskämpe", "+3 FV i Två vapen."),
    ("24", "Hobbyist", "FV 3 i en valfri sekundär färdighet (ej magi), som får läras redan från start."),
    ("25", "Klättrare", "+3 CL i Klättra."),
    ("26", "Begåvad", "+2 FV i valfri färdighet (ej magi); taket höjs också med 2."),
    ("27", "Ljudlös", "+2 FV i Smyga."),
    ("28", "Charmig", "+5 KAR mot motsatt kön av samma ras."),
    ("29", "Absolut gehör", "Grundkostnaden för Spela instrument och Sjunga är 1."),
    ("30", "Övertalare", "+3 CL i Övertala och Muta."),
    ("31", "Ögonmått", "Kan bedöma avstånd och storlekar exakt."),
    ("32", "Vacker röst", "+3 KAR när man talar, +3 FV i Sjunga."),
    ("33", "Vaksam", "+1 FV i Upptäcka fara och Finna dolda ting."),
    ("34", "Beläst", "FV 10 i en valfri lärdomsfärdighet."),
    ("35", "Tidskänsla", "Vet alltid ungefär vad klockan är."),
    ("36", "Magikänsla", "+5 CL i Känna magi; −5 på magiförmågeslaget."),
    ("37", "Språkbegåvad", "FV 20 i Tala och Läsa/Skriva ett valfritt språk."),
    ("38", "Mångsidig", "Två valfria sekundära färdigheter (ej magi) blir yrkesfärdigheter."),
    ("39", "Skarpskytt", "+25 % räckvidd med projektilvapen."),
    ("40", "Uppmärksam", "+2 FV i Finna dolda ting och Upptäcka fara."),
    ("41", "Gott rykte", "Gott rykte (25 %)."),
    ("42", "Vapenvan", "+1 CL i alla vapenfärdigheter."),
    ("43", "Arv", "Ärver 10 000 sm till startkapitalet."),
    ("44", "Vapentalang", "+5 FV i en valfri vapenfärdighet."),
    ("45", "Olikfärgade ögon", "KAR ±10 gentemot 1T3 raser."),
    ("46", "Dubbelhänt", "Se Svärdshand."),
    ("47", "Nekrologi", "Äger ett nekrologiskt föremål."),
    ("48", "Snabb", "+3 på alla initiativslag."),
    ("49", "Arvsklenod", "Magiskt vapen: +1 CL på attack, +1 skada."),
    ("50", "Bärsärk", "+5 FV i Bärsärkagång, som blir primär färdighet."),
    ("51", "Balans", "+5 SMI vid balansslag."),
    ("52", "Skarpsinnig", "+5 FV i Upptäcka fara och Finna dolda ting."),
    ("53", "Ryttare", "+10 FV i Rida; kastas aldrig av."),
    ("54", "Ambidextriös", "Se Svärdshand."),
    ("55", "Vapenmästare", "En vapenfärdighet blir primär och får FV 10 gratis."),
    ("56", "Djurvän", "Djur är vänligt inställda."),
    ("57", "Skarpa sinnen", "+5 FV i Upptäcka fara och Lyssna."),
    ("58", "Turgubbe", "+1 CL per PSY-poäng, högst +1."),
    ("59", "Magisk empati", "Magisk empati."),
    ("60", "Mörkersyn", "Mörkersyn."),
    ("61", "Infrasyn", "Infrasyn."),
    ("62", "Tålig", "Total KP ×1,5 (även kroppsdelarna)."),
    ("63", "Snabbslående", "Snabbslående."),
    ("64", "Baneman", "+5 CL mot en ras eller ett folk."),
    ("65", "God kroppskontroll", "God kroppskontroll."),
    ("66", "Järnnäve", "Maximal skada obeväpnad."),
    ("67", "Orädd", "−5 på Skräcktabellen."),
    ("68", "Viljestark", "+5 PSY vid PSY mot PSY på Motståndstabellen."),
    ("69", "Härdad", "+5 FYS vid motståndsslag mot elementen."),
    ("70", "Gudarnas gunstling", "25 % chans att få tillbaka KP."),
    ("71", "Gott läkekött", "Läker dubbelt så fort."),
    ("72", "God mental kontroll", "PSY återhämtas på halva tiden (icke-magiker: räkna som 73)."),
    ("73", "Hjälte", "Se Hjältarnas Handbok; annars hitta på en bedrift, lägg upp till 10 BP till och slå om med +30."),
    ("74", "Kluven personlighet", "En extra yrkesförmåga från valfritt yrke."),
    ("75", "God känsla för yrket", "Halverad inlärningskostnad för besvärjelser och yrkesfärdigheter (avrunda uppåt)."),
    ("76", "Familiaris", "Se Magikerns Handbok; annars ett djur med Tillkalla/Tala med/Kontrollera varelse."),
    ("77", "Hamnbytare", "Kan byta hamn till ett av 1T6 djur."),
    ("78", "Snabb uppfattningsförmåga", "+5 CL på parering i närstrid; kan parera projektiler."),
    ("79", "God PSY-potential", "−5 på slaget för att höja PSY."),
    ("80", "Vild magi", "Se Magikerns Handbok s. 52; annars en besvärjelse med FV = PSY."),
    ("81+", "Höjd grundegenskap", "+1 på tre olika grundegenskaper eller +2 på en."),
]


# Maskinläsbara effekter, så att gränssnittet kan erbjuda just de val förmågan ger.
# fv: lägg till FV; minst: startvärdet blir minst FV; status: färdigheten byter status;
# valj/bland: spelaren väljer så många färdigheter ur en grupp; fasta: färdigheterna är givna.
def fv(n, *fasta, valj=0, bland=None, minst=False, tak=False, status=None):
    d = {"typ": "fv", "fv": n}
    if fasta:
        d["fasta"] = list(fasta)
    if valj:
        d["valj"] = valj
        d["bland"] = bland
    if minst:
        d["minst"] = True
    if tak:
        d["tak"] = True
    if status:
        d["status"] = status
    return d


SF_REGLER = {
    "Talang": [fv(1, valj=1, bland="sekundar-ej-magi")],
    "Berest": [fv(2, valj=2, bland="geografi")],
    "Musikalisk": [fv(15, valj=1, bland="spela-instrument", minst=True)],
    "Sjöfarare": [fv(2, "sjokunnighet", "navigera")],
    "Akrobat": [fv(3, "akrobatik")],
    "Örtkunnig": [fv(3, "ortkunskap", "giftkunskap", "drogkunskap")],
    "Konstnärlig": [fv(3, "forfalskning", "malning")],
    "Spänstig": [fv(3, "hoppa")],
    "Byråkrat": [fv(3, valj=1, bland="administration")],
    "Spelare": [fv(3, valj=1, bland=["schack", "hasardspel"])],
    "Stora öron": [{"typ": "egenskap", "mod": {"KAR": -2}}, fv(5, "lyssna")],
    "Slagskämpe": [fv(3, "slagsmal")],
    "Händig": [fv(3, valj=1, bland="hantverk")],
    "Skarpt öga": [fv(3, "vardera")],
    "Snabbfotad": [{"typ": "forflyttning", "varde": 1}],
    "Tvåhandskämpe": [fv(3, valj=1, bland="tva-vapen")],
    "Hobbyist": [fv(3, valj=1, bland="sekundar-ej-magi", minst=True)],
    "Begåvad": [fv(2, valj=1, bland="alla-ej-magi", tak=True)],
    "Ljudlös": [fv(2, "smyga")],
    "Vacker röst": [fv(3, "sjunga")],
    "Vaksam": [fv(1, "upptacka-fara", "finna-dolda-ting")],
    "Beläst": [fv(10, valj=1, bland="lardom", minst=True)],
    "Språkbegåvad": [fv(20, valj=1, bland="sprak", minst=True)],
    "Mångsidig": [fv(0, valj=2, bland="sekundar-ej-magi", status="yrke")],
    "Uppmärksam": [fv(2, "finna-dolda-ting", "upptacka-fara")],
    "Arv": [{"typ": "kapital", "varde": 10000}],
    "Vapentalang": [fv(5, valj=1, bland="vapen")],
    "Dubbelhänt": [{"typ": "svardshand", "varde": "Dubbelhänt"}],
    "Bärsärk": [fv(5, "barsarkagang", status="primar")],
    "Skarpsinnig": [fv(5, "upptacka-fara", "finna-dolda-ting")],
    "Ryttare": [fv(10, "rida")],
    "Ambidextriös": [{"typ": "svardshand", "varde": "Ambidextriös"}],
    "Vapenmästare": [fv(10, valj=1, bland="vapen", minst=True, status="primar")],
    "Skarpa sinnen": [fv(5, "upptacka-fara", "lyssna")],
    "Magikänsla": [{"typ": "magiformaga", "varde": -5}],
    "Tålig": [{"typ": "kpFaktor", "varde": 1.5}],
    "Höjd grundegenskap": [{"typ": "egenskapVal"}],
}


def intervall(s):
    if s.endswith("+"):
        return [int(s[:-1]), None]
    a, _, b = s.partition("-")
    return [int(a), int(b or a)]


skriv("sarskilda-formagor", [
    {"slag": intervall(s), "namn": n, "effekt": e, "sida": 30 if intervall(s)[0] <= 28 else (31 if intervall(s)[0] <= 68 else 32),
     **({"regel": SF_REGLER[n]} if n in SF_REGLER else {})}
    for s, n, e in SF])
assert not set(SF_REGLER) - {n for _, n, _ in SF}, set(SF_REGLER) - {n for _, n, _ in SF}

# ---------------------------------------------------------------- vapen (s. 72, 90–91, 94)
def v(namn, skada, sty, langd, vikt, bv, pris, grupp, stjarna=False, **extra):
    d = {"namn": namn, "skada": skada, "styKrav": sty, "langd": langd, "vikt": vikt, "bv": bv, "pris": pris,
         "grupp": grupp, "enHandOmStoOverKrav": stjarna}
    d.update(extra)
    return d


NARSTRID = [
    v("Knogjärn el. stålhätta", "+1", 1, 0, 0.5, None, 20, "slagsmal"),
    v("Parerdolk", "1T4+1", 1, 0, 0.5, 13, 80, "dolkar"),
    v("Dolk", "1T4+1", 1, 0, 0.5, 9, 70, "dolkar"),
    v("Klubba", "1T6", 5, 0, 1, 7, 20, "kross"),
    v("Spikklubba", "1T6+1", 5, 0, 1, 7, 30, "kross"),
    v("Kortsvärd", "1T6+1", 7, 0, 2, 15, 400, "svard"),
    v("Kortspjut", "1T6", 7, 1, 2, 11, 90, "stickvapen", somTrastav=True),
    v("Trästav", "1T6", 7, 0, 2, 7, 100, "stangvapen", stjarna=True, aldrigEnHand=True),
    v("Korpnäbb", "1T8", 7, 0, 2, 15, 600, "kross"),
    v("Kroksabel", "1T8+2", 9, 0, 3, 15, 650, "svard"),
    v("Piska", "1T2", 9, 1, 3, 3, 120, "piska"),
    v("Handyxa", "1T6+1", 9, 0, 3, 11, 60, "yxor"),
    v("Hjälmkrossare", "1T8+1", 11, 0, 4, 15, 700, "kross"),
    v("Stridshammare", "1T6+2", 11, 0, 4, 15, 850, "kross"),
    v("Stridsyxa", "1T8+2", 11, 0, 4, 11, 450, "yxor"),
    v("Långspjut", "1T10", 11, 2, 4, 11, 300, "stickvapen", stjarna=True, aldrigEnHand=True, somTrastav=True),
    v("Bredsvärd", "1T8+1", 13, 0, 4.5, 15, 1000, "svard"),
    v("Stridsgissel", "1T10", 13, 0, 4.5, 11, 1250, "kattingvapen"),
    v("Morgonstjärna", "1T8+2", 13, 0, 4.5, 11, 1500, "kross"),
    v("Treudd", "3T6-2", 15, 1, 5, 11, 1000, "stickvapen"),
    v("Bastardsvärd", "1T10+1", 17, 0, 5.5, 15, 2500, "svard"),
    v("Stor träklubba", "2T4", 21, 0, 6, 11, 50, "kross"),
    v("Stor spikklubba", "2T4+1", 21, 0, 6, 11, 70, "kross"),
    v("Stridsslaga", "1T10+1", 25, 0, 6.5, 11, 1500, "kattingvapen"),
    v("Skäggyxa", "2T8+1", 25, 0, 6.5, 11, 1100, "yxor"),
    v("Pik", "2T8-1", 25, 3, 6.5, 11, 1900, "stickvapen", stjarna=True),
    v("Lans", "2T8", 25, 2, 6.5, 15, 650, "stickvapen", stjarna=True, anmarkning="Tornerlans kan användas med en hand till häst."),
    v("Partisan", "2T8+2", 27, 1, 7, 11, 1400, "stangvapen", stjarna=True, somTrastav=True),
    v("Spetum", "2T8+1", 27, 1, 7, 11, 1250, "stickvapen", stjarna=True, somTrastav=True),
    v("Glav", "2T10", 27, 1, 7, 11, 1600, "stangvapen", stjarna=True, somTrastav=True),
    v("Pålyxa", "3T6", 29, 1, 7.5, 11, 1150, "stangvapen", stjarna=True, somTrastav=True),
    v("Hillebard", "3T6+1", 29, 1, 7.5, 11, 1900, "stangvapen", stjarna=True, somTrastav=True),
    v("Tvåhandsyxa", "2T10+1", 31, 1, 8, 11, 1900, "yxor", stjarna=True),
    v("Tvåhandssvärd", "2T10+2", 31, 1, 8, 15, 3500, "svard", stjarna=True),
]
PROJEKTIL = [  # s. 91; alla utom slunga kräver två händer
    ["Liten båge", "1T4+1", 10, "135 m", 1.5, 150, "bagar"], ["Kortbåge", "1T6+1", 18, "135 m", 2, 400, "bagar"],
    ["Långbåge", "1T8+1", 30, "180 m", 3, 700, "bagar"], ["Sammansatt båge", "1T10+1", 30, "180 m", 3.5, 1000, "bagar"],
    ["Slunga", "1T6", 10, "90 m", 0.5, 40, "slunga"], ["Stavslunga", "1T8", 22, "120 m", 2, 80, "slunga"],
    ["Blåsrör", "spec.", 2, "20 m", 0.5, 80, "blasror"], ["Lätt armborst", "2T4+2", 26, "150 m", 5, 1300, "armborst"],
    ["Tungt armborst", "2T6+2", 28, "225 m", 6, 2250, "armborst"], ["Arbalest", "3T6+3", 32, "250 m", 8, 4000, "armborst"],
]
KAST = [["Kastspjut", "1T6+1", 11, 1, 120], ["Kastkniv", "1T4+1", 9, 0.5, 100], ["Kastyxa", "1T6+2", 9, 3, 90]]
SKOLDAR = [  # s. 94
    ["Targ (bucklare)", 1, 9, 1, 500], ["Rundsköld, liten", 3, 9, 2, 650], ["Rundsköld, stor", 11, 11, 7, 1000],
    ["Långsköld (normandisk)", 7, 11, 6, 900], ["Vanlig sköld (trekantig)", 7, 11, 6, 850],
    ["Scutata (romersk sköld)", 7, 13, 8, 1100], ["Pavise (bågskyttesköld)", 18, 11, 16, 900],
]
skriv("vapen", {
    "grupper": [  # s. 72
        {"id": "dolkar", "namn": "Dolkar", "grundegenskap": "SMI"},
        {"id": "enhandssvard", "namn": "Enhandssvärd", "grundegenskap": "STY"},
        {"id": "enhandskross", "namn": "Enhandskrossvapen", "grundegenskap": "STY"},
        {"id": "enhandsyxor", "namn": "Enhandsyxor", "grundegenskap": "STY"},
        {"id": "tvahandsvapen", "namn": "Tvåhandsvapen", "grundegenskap": "STY"},
        {"id": "stickvapen", "namn": "Stickvapen", "grundegenskap": "STY"},
        {"id": "kattingvapen", "namn": "Kättingvapen", "grundegenskap": "SMI"},
        {"id": "stangvapen", "namn": "Stångvapen", "grundegenskap": "STY"},
        {"id": "bagar", "namn": "Bågar", "grundegenskap": "SMI"},
        {"id": "armborst", "namn": "Armborst", "grundegenskap": "SMI"},
        {"id": "slunga", "namn": "Slunga", "grundegenskap": "SMI"},
        {"id": "kastvapen", "namn": "Kastvapen", "grundegenskap": "SMI"},
        {"id": "piska", "namn": "Piska", "grundegenskap": "SMI"},
        {"id": "skoldar", "namn": "Sköldar", "grundegenskap": "SMI"},
        {"id": "blasror", "namn": "Blåsrör", "grundegenskap": "SMI"},
    ],
    # svärd, kross och yxor delas på enhands/tvåhands efter STY-krav mot rollpersonens STY (s. 72, 89)
    "styBeroendeGrupper": {"svard": "enhandssvard", "kross": "enhandskross", "yxor": "enhandsyxor"},
    "narstrid": NARSTRID,
    "projektil": [dict(zip(["namn", "skada", "styKrav", "rackvidd", "vikt", "pris", "grupp"], p),
                       tvaHander=p[0] != "Slunga") for p in PROJEKTIL],
    "kast": [dict(zip(["namn", "skada", "styKrav", "vikt", "pris"], k), rackvidd="STY rutor", grupp="kastvapen")
             for k in KAST],
    "skoldar": [dict(zip(["namn", "styKrav", "bv", "vikt", "pris"], s), grupp="skoldar") for s in SKOLDAR],
    "sida": [72, 89, 90, 91, 94],
})

# ---------------------------------------------------------------- besvärjelser och utrustning
skriv("besvarjelser", besvarjelser.bygg())
skriv("utrustning", utrustning.bygg())

# ---------------------------------------------------------------- husregler (dokumenterade tolkningar)
skriv("husregler", [
    {"id": "primara-fran-s40", "sida": [40, 57, 62], "beslut": "Primära färdigheter enligt s. 40, plus Bärsärkagång för troll och Känna magi för magiker."},
    {"id": "kopsla-vardera-bc", "sida": [21, 22, 40, 51, 55], "beslut": "Köpman/Wongos/Hantverkare får bonusen som +BC vid start, inte som CL (Niclas 2026-10-24)."},
    {"id": "magisk-kanalisering-int", "sida": [41, 65], "beslut": "Grundegenskap INT enligt beskrivningen (Niclas 2026-10-24)."},
    {"id": "dimalv-alder", "sida": [16], "beslut": "Dimalver använder ljusalvernas ålderskategorier (Niclas 2026-10-24)."},
    {"id": "dimalv-sprak", "sida": [51, 54], "beslut": "Dimalver talar alviska och Chronos (Niclas 2026-10-24)."},
    {"id": "troll-sty", "sida": [14, 27], "beslut": "Troll får +6 STY enligt rastabellen."},
    {"id": "krigare-s22", "sida": [18, 22], "beslut": "Krigare: +3 initiativ och Muta enligt s. 22."},
    {"id": "hantverkare-plus10", "sida": [21, 60], "beslut": "+10 på BC i ett av hantverkarens tre hantverk."},
    {"id": "aldersgranser", "sida": [16, 17, 34], "beslut": "Nedre kategorin slutar året före nästa börjar; Dvärg vuxen 41–150."},
    {"id": "kapitaltak-efter-bonus", "sida": [33], "beslut": "Taket (socialt stånd +10/+15) gäller summan efter bonusar."},
    {"id": "over-bp-till-ep", "sida": [34], "beslut": "Varje överblivet BP ger 5 EP."},
    {"id": "startpaket", "sida": [38], "beslut": "Frivilligt startpaket utan kostnad: ryggsäck, skjorta, byxor, bälte, läderskor och ett vapen för högst 100 sm som rollpersonen kan använda (Niclas 2026-10-25)."},
    {"id": "lasa-skriva-tak", "sida": [56, 61, 64, 65], "beslut": "Tak mot Läsa/Skriva använder högsta L/S-FV."},
    {"id": "chronos-lagre", "sida": [52, 54], "beslut": "Tala Chronos FV 5 för drakonit/orch/wongos; drakoniters L/S Chronos två B-nivåer under modersmålets BC."},
    {"id": "sf-fore-harledda", "sida": [30, 31, 32], "beslut": "Särskilda förmågor räknas in innan KP, SB och färdigheter räknas ut."},
    {"id": "paladin-bp", "sida": [25], "beslut": "Paladinens 50 BP visas som separat pott som SL styr."},
    {"id": "pavise-skold", "sida": [72, 94], "beslut": "Pavise räknas till vapengruppen Sköldar."},
    {"id": "vapen-utan-grupp", "sida": [72, 90], "beslut": "Vapen som s. 72 inte nämner: Korpnäbb och Hjälmkrossare = krossvapen, Kroksabel = svärd, Skäggyxa = yxa, Partisan och Glav = stångvapen."},
])
print("Skrev regelfiler till", os.path.abspath(UT))
