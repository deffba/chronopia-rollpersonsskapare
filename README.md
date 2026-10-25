# Chronopia rollpersonsskapare

En rollpersonsskapare för Chronopia (Drakar och Demoner). Den följer kapitlet Rollpersonen (s. 8–38) och färdighetskapitlet (s. 39–72) steg för steg och visar ett levande rollformulär med BP, EP och regelkontroll.

## Rollformulär och sparade filer

Knappen Rollformulär visar rollpersonen på ett formulär i samma layout som bokens (s. 11–12). En tredje sida läggs till bara om något inte får plats, och om man vill även sidor med rollpersonens färdigheter i korthet. Det skrivs ut på A4 med webbläsarens Skriv ut, eller sparas som PDF därifrån. Under spel kan man skriva direkt i formuläret: erf (osparade erfarenhetspoäng per färdighet), hjältepoäng, pengar, egen utrustning samt utseende och bakgrund. Det sparas i rollpersonen.

Rollpersonen sparas som en JSON-fil med formatnamn och versionsnummer (`sparformat.js`, version 2), så att den kan läsas in igen. Filer i äldre versioner läses också in.

## Spelmöten och förbättring

Under menyn Spelmöten och förbättring (eller sista steget) förs det in som händer efter skapandet, enligt kapitel 4 (s. 73–76):

- **Spelmöte:** EP per färdighet från äventyret (inte kategori B), bonuspoäng efter ett avslutat äventyr (högst 10), slaget för höjd PSY efter en vunnen kamp PSY mot PSY, hjältepoäng, pengar, ny och förlorad utrustning och anteckningar.
- **Träning:** ensam, med lärare eller privatlärare, med slagen per vecka, tiden och kostnaden. Nya färdigheter och besvärjelser kan läras.
- **Förbättra:** en guide i fem steg. EP växlas till FV efter minst sju dagars vila, FV 21, 41, 61 … ger 1T4 HP, 5 HP höjer en grundegenskap (inte STO) och HP kan köpa ett nytt slag på tabellen över särskilda förmågor.
- **Logg:** allt som har förts in, och den senaste posten kan ångras.

Varje post kontrolleras mot reglerna innan den förs in. Efter första posten är skapandet låst; rollformuläret visar den utvecklade rollpersonen.

## Kör lokalt

Sidan är helt statisk men läser reglerna med `fetch`, så den behöver en enkel webbserver:

```sh
python3 -m http.server
```

Öppna sedan http://localhost:8000.

## Publicera

Slå på GitHub Pages för grenen `main` (rotkatalogen) under Settings → Pages.

## Struktur

- `index.html`, `app.js`: gränssnittet.
- `formular.js`, `formular.css`: rollformuläret för utskrift.
- `sparformat.js`: filformatet för sparade rollpersoner (version 2).
- `utveckling.js`: regellogiken efter skapandet. Räknar fram den utvecklade rollpersonen ur loggen och kontrollerar varje post.
- `spelmote.js`: gränssnittet för spelmöten, träning, förbättring och logg.
- `regelmotor.js`: all regellogik (BP, EP, grundegenskaper, härledda värden, färdigheter). Har inga beroenden.
- `regler/*.json`: reglerna som data, med sidhänvisningar. `husregler.json` beskriver hur oklara regler har tolkats.
- `verktyg/bygg_regler.py`: genererar `regler/*.json`. Ändra reglerna där och kör `python3 verktyg/bygg_regler.py`.
- `test/brutus.test.mjs`: kontrollerar motorn mot bokens exempel Brutus. `test/sparformat.test.mjs`: filformatet. `test/utveckling.test.mjs`: utvecklingen efter skapandet. Kör alla med `npm test` (Node 20 eller senare).
