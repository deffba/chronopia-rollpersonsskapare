# Chronopia rollpersonsskapare

En rollpersonsskapare för Chronopia (Drakar och Demoner). Den följer kapitlet Rollpersonen (s. 8–38) och färdighetskapitlet (s. 39–72) steg för steg och visar ett levande rollformulär med BP, EP och regelkontroll.

## Rollformulär och sparade filer

Knappen Rollformulär visar rollpersonen på ett formulär i samma layout som bokens (s. 11–12). En tredje sida läggs till bara om något inte får plats, och om man vill även sidor med rollpersonens färdigheter i korthet. Det skrivs ut på A4 med webbläsarens Skriv ut, eller sparas som PDF därifrån. Under spel kan man skriva direkt i formuläret: erf (osparade erfarenhetspoäng per färdighet), hjältepoäng, pengar, egen utrustning samt utseende och bakgrund. Det sparas i rollpersonen.

Rollpersonen sparas som en JSON-fil med formatnamn och versionsnummer (`sparformat.js`), så att den kan läsas in igen här eller i en kommande uppdaterare. Filer från före versionsnumret läses också in.

## Utvecklarläge

Lägg till `?dev` i adressen (till exempel http://localhost:8000/?dev) för att få testrollpersoner i menyn: en människa som krigare, en högländare som gladiator och en dimalv som elementarmagiker. Ett klick ger en färdig, tillåten rollperson, öppnad i valfritt steg eller direkt i rollformuläret, och med osparade erf om man vill prova förbättringen. Valet sparas i webbläsaren; `?dev=av` eller knappen Stäng av slår av det igen. Vanliga spelare ser ingenting av det.

Rollpersonerna byggs med samma regler och automatik som stegen (`utvecklarlage.js`) utifrån önskemålen i `testrollpersoner.js`, så de håller sig giltiga när reglerna ändras. Går ett önskemål inte längre väljs något annat tillåtet och en notis säger till.

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
- `utvecklarlage.js`, `testrollpersoner.js`: utvecklarläget med testrollpersoner.
- `sparformat.js`: filformatet för sparade rollpersoner (version 1).
- `regelmotor.js`: all regellogik (BP, EP, grundegenskaper, härledda värden, färdigheter). Har inga beroenden.
- `regler/*.json`: reglerna som data, med sidhänvisningar. `husregler.json` beskriver hur oklara regler har tolkats.
- `verktyg/bygg_regler.py`: genererar `regler/*.json`. Ändra reglerna där och kör `python3 verktyg/bygg_regler.py`.
- `test/brutus.test.mjs`: kontrollerar motorn mot bokens exempel Brutus. `test/sparformat.test.mjs`: filformatet. Kör båda med `npm test` (Node 20 eller senare).
