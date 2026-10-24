# Chronopia rollpersonsskapare

En rollpersonsskapare för Chronopia (Drakar och Demoner). Den följer kapitlet Rollpersonen (s. 8–38) och färdighetskapitlet (s. 39–72) steg för steg och visar ett levande rollformulär med BP, EP och regelkontroll.

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
- `regelmotor.js`: all regellogik (BP, EP, grundegenskaper, härledda värden, färdigheter). Har inga beroenden.
- `regler/*.json`: reglerna som data, med sidhänvisningar. `husregler.json` beskriver hur oklara regler har tolkats.
- `verktyg/bygg_regler.py`: genererar `regler/*.json`. Ändra reglerna där och kör `python3 verktyg/bygg_regler.py`.
- `test/brutus.test.mjs`: kontrollerar motorn mot bokens exempel Brutus. Kör med `npm test` (Node 20 eller senare).
