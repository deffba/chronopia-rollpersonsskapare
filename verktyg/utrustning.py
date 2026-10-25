# Utrustningslistor och rustningar, transkriberade från boken (s. 92–93, 100–102).
# Priser i silvermynt (sm), vikt i kg; None = försumbar vikt ("—" i boken).

UTRUSTNING = [
    ("Diverse verktyg", 100, [
        ("Blåsbälg", 2, 90), ("Bärbar smedja", 26, 625), ("Bärbart städ", 5, 190), ("Flacktång", 0.5, 50),
        ("Grov spik (10 st)", None, 50), ("Hacka", 5, 125), ("Handyxa", 3, 60), ("Järnborrar (5 st)", None, 50),
        ("Järnkilar (3 st)", None, 15), ("Kniv", 0.5, 50), ("Kofot", 2, 25), ("Normalt städ", 35, 625),
        ("Skogsyxa", 5, 125), ("Skära", 1, 40), ("Slägga", 8, 40), ("Småspik (100 st)", 1, 75),
        ("Snickarhammare", 1, 18), ("Spade", 2, 75), ("Trähammare", 1, 2), ("Träsåg", 1, 60)]),
    ("Behållare", 101, [
        ("Glasflaska (10 doser)", 0.5, 160), ("Glasplunta (1 dos)", None, 60), ("Koger (20 pilar)", 0.5, 40),
        ("Lerkruka (4 liter)", 1, 12), ("Penningpung (50 mynt)", None, 5), ("Myntbälte (100 mynt)", None, 40),
        ("Ryggsäck (20 liter)", 1, 20), ("Träskrin", 1, 15), ("Metallskrin", 2, 140), ("Lås till skrin", None, 200),
        ("Stor säck (100 liter)", 1, 4), ("Träkagge (25 liter)", 4, 20), ("Trätunna (100 liter)", 14, 50),
        ("Skinnlägel (2 liter)", 0.5, 10), ("Vattenskinn (20 liter)", 2, 25)]),
    ("Äventyrarutrustning", 101, [
        ("Arbalestlod (10 st)", 1, 60), ("Armborstlod (10 st)", 0.5, 50), ("Pilar (10 st)", 0.5, 20),
        ("Slungkulor (+2 CL, 10 st)", 0.5, 5), ("Bågsträng", None, 3), ("Flinta & stål", None, 15),
        ("Vaxljus (1 timme)", 0.5, 15), ("Fackla (1 timme)", 1, 5), ("Oljelampa (1 timme)", 0.5, 7),
        ("Oljelykta (6 timmar)", 1, 40), ("Lampolja (1 timme)", 0.5, 3), ("Halmmadrass", 2, 60),
        ("Järngryta (2 liter)", 3, 35), ("Fiskenät (5 × 5 m)", 2, 30), ("Sovfäll", 4, 310), ("Tält (2 man)", 5, 190)]),
    ("Kläder", 101, [
        ("Byxor", 0.5, 25), ("Bälte", None, 20), ("Handskar", None, 40), ("Hatt", None, 30), ("Hosor", 0.5, 25),
        ("Jacka", 0.5, 30), ("Kortbyxor", None, 10), ("Kåpa (magiker-, präst-)", 2, 130), ("Kängor", 1, 75),
        ("Läderskor", 0.5, 50), ("Läderstövlar, höga", 1, 200), ("Mantel", 2, 100), ("Sandaler", None, 10),
        ("Skjorta", None, 10), ("Tunika", 0.5, 20)]),
    ("Tjuvverktyg", 101, [
        ("Dyrkar (för små lås, 10 st)", 0.5, 225), ("Dyrkar (för större lås, 10 st)", 1, 320),
        ("Nyckelämnen (10 st)", 0.5, 140), ("Nyckelfilar (6 st)", None, 100), ("Vaxklump", None, 10),
        ("Handborr", 0.5, 85), ("Glasskärare", None, 350), ("Spik med ögla (1 st)", None, 20), ("Änterhake", 0.5, 40),
        ("Låsregelsavhakare", None, 10), ("Gångjärnsknäckare", 0.5, 15), ("Metallsåg", None, 250),
        ("Smörjolja (25 ml)", None, 8)]),
    ("Diverse", 102, [
        ("1-tums rep (10 m, tål 400 kg)", 12, 80), ("½-tums rep (10 m, tål 100 kg)", 3, 40), ("Hänglås + nyckel", 0.5, 180),
        ("Hästskor (4 st)", 1, 35), ("Kedja (1 m, tål 100 kg)", 5, 200), ("Kraftig kedja (1 m, tål 1 000 kg)", 25, 400),
        ("Penna, bläck & pergament", None, 10), ("Repstege (3 m)", 1, 5), ("Solur (± 30 minuter)", 1, 600),
        ("Spegel", 0.5, 550), ("Synål", None, 1), ("Sytråd (10 m)", None, 2), ("Lädernål", None, 3),
        ("Sytråd för läderarbete (10 m)", None, 4), ("Timglas", 1, 875), ("Trästege (2 m)", 4, 9),
        ("Visselpipa", None, 25), ("Signalhorn", 0.5, 30), ("Flöjt", None, 90), ("Harpa", 5, 600), ("Luta", 1, 400),
        ("Lyra", 1.5, 375), ("Trumma", 3, 190)]),
    ("Mat & dryck", 102, [
        ("Svagdricka (1 liter)", None, 2), ("Öl (1 liter)", None, 4), ("Cider (1 liter)", None, 5), ("Mjöd (1 liter)", None, 6),
        ("Bordsvin (1 liter)", None, 3), ("Fint vin (1 liter)", None, 30), ("Brännvin (1 liter)", None, 10),
        ("Enkel grönsaksstuvning", None, 1), ("Köttstuvning", None, 4), ("Köttstycke och rovor", None, 8),
        ("Grönsakspaj", None, 2), ("Köttpaj", None, 8), ("Fågel", None, 6), ("Fisk", None, 4), ("Helt vildsvin", None, 25),
        ("Limpa", None, 1), ("Skeppsskorpor (1 dagsranson)", None, 2), ("Torkat kött (1 dagsranson)", None, 9)]),
]

# Rustningsdelar (s. 92–93): (namn, absorbering, vikt, pris). Bara en rustningsdel per kroppsdel (s. 91).
RUSTNINGAR = [
    ("Hjälm", ["huvud"], [
        ("Tyghuva", 1, 0.5, 25), ("Läderhuva", 2, 0.5, 80), ("Nitläderhuva", 3, 1, 180), ("Ringbrynjehuva", 4, 4, 300),
        ("Öppen metallhjälm", 6, 4, 500), ("Öppen metallhjälm med visir", 6, 6, 1500), ("Tunnhjälm", 8, 6, 1000)]),
    ("Armskydd (par)", ["vanster-arm", "hoger-arm"], [
        ("Tjockt tyg", 1, 2, 50), ("Läder", 2, 3, 250), ("Nitläder", 3, 5, 500), ("Härdat läder", 4, 3, 750),
        ("Lamellerad", 6, 5.5, 950), ("Metall", 7, 6, 1350), ("Laminerad", 8, 8, 1200)]),
    ("Benskydd (par)", ["vanster-ben", "hoger-ben"], [
        ("Tjockt tyg", 1, 3, 80), ("Läder", 2, 4, 400), ("Nitläder", 3, 6, 750), ("Härdat läder", 4, 5, 1150),
        ("Lamellerad", 6, 6, 1550), ("Metall", 7, 7, 1850), ("Laminerad", 8, 9, 1600)]),
    ("Harnesk", ["brostkorg", "mage"], [
        ("Tjockt tyg", 1, 2, 130), ("Läder", 2, 3, 600), ("Nitläder", 3, 4, 1150), ("Härdat läder", 4, 4, 1500),
        ("Ringbrynjeskjorta", 5, 10, 1500), ("Förstärkt ringbrynja", 6, 15, 1150), ("Fjällpansar", 6, 14, 1500),
        ("Lamellerad", 6, 10, 1550), ("Metall", 7, 12, 1900), ("Laminerad", 8, 15, 1800)]),
    ("Brynja", ["brostkorg", "mage", "vanster-arm", "hoger-arm"], [
        ("Ringbrynja", 5, 16, 2000), ("Förstärkt ringbrynja", 6, 24, 2500)]),
    ("Brynjehosor", ["vanster-ben", "hoger-ben"], [
        ("Ringbrynja", 5, 15, 2500), ("Förstärkt ringbrynja", 6, 22.5, 3250)]),
    ("Hauberk", ["brostkorg", "mage", "vanster-arm", "hoger-arm", "vanster-ben", "hoger-ben"], [
        ("Ringbrynja", 5, 32, 3500), ("Förstärkt ringbrynja", 6, 48, 4500)]),
    ("Helrustning", ["brostkorg", "mage", "vanster-arm", "hoger-arm", "vanster-ben", "hoger-ben"], [
        ("Metall", 8, 25, 5100)]),
]


def bygg():
    varor = []
    for kategori, sida, rader in UTRUSTNING:
        for namn, vikt, pris in rader:
            varor.append({"namn": namn, "kategori": kategori, "vikt": vikt, "pris": pris, "sida": sida})
    rustningar = []
    for typ, delar, rader in RUSTNINGAR:
        for namn, abs_, vikt, pris in rader:
            rustningar.append({"namn": f"{typ}: {namn}" if typ != "Hjälm" else namn, "typ": typ, "delar": delar,
                               "absorbering": abs_, "vikt": vikt, "pris": pris})
    return {
        "valuta": "sm",
        "varor": varor,
        "rustningar": rustningar,
        "rustningsnoter": {
            "Ringbrynja": "Sår kan inte bli infekterade.",
            "Tunnhjälm": "−5 på CL för Finna dolda ting och Upptäcka fara.",
            "metall": "Fjällpansar och metallrustning halverar CL i Smyga; metallrustning halverar CL i Klättra och gör Akrobatik och Hoppa omöjliga (s. 93).",
        },
        # Frivilligt startpaket (husregel): ryggsäck, en uppsättning kläder och ett enkelt vapen
        "startpaket": {
            "varor": ["Ryggsäck (20 liter)", "Skjorta", "Byxor", "Bälte", "Läderskor"],
            "vapenMaxPris": 100,
        },
        "sida": [38, 91, 92, 93, 98, 100, 101, 102],
    }
