# Chronopia rollpersonsskapare

En rollpersonsskapare för Chronopia (Drakar och Demoner). Den följer kapitlet Rollpersonen (s. 8–38) och färdighetskapitlet (s. 39–72) steg för steg och visar ett levande rollformulär med BP, EP och regelkontroll.

## Startsidan

Appen öppnar på en startsida med stora val: **Skapa rollperson** (stegen nedan), **Ladda ned rollformulär** (ett tomt formulär som ifyllbar PDF) och **Regelresonemang** (husreglerna i `regler/husregler.json` och regelbesluten i `regler/regelbeslut.md`). Redigera rollperson, Förbättra rollperson och Kampanj är markerade som *kommer snart*. Titeln och menyvalet Startsidan leder tillbaka.

Skapandet börjar med **steg 0, Böcker**: vilka böcker rollpersonen skapas med. Böckerna står i `regler/bocker.json` (grupp, status `inlagd` eller `kommerSnart`, och `kraver` för obligatoriska beroenden). Grundreglerna är alltid med; expansionerna visas med *(Kommer snart!)* tills de är inlagda. Valet sparas i rollpersonen (`rp.bocker`) och låses när en ras är vald. Övriga steg har kvar sina nummer 1–13.

Längst ner står appens version och när sidan senast publicerades (`version.json`).

## Rollformulär och sparade filer

Knappen Rollformulär visar rollpersonen på ett formulär i samma layout som bokens (s. 11–12). En tredje sida läggs till bara om något inte får plats, och om man vill även sidor med rollpersonens färdigheter i korthet. Knappen Ladda ner som PDF ger en PDF-fil i A4 som ser likadan ut i alla webbläsare, även i mobilen. Fälten man fyller i under spel går att fylla i direkt i PDF:en också. Under spel kan man skriva direkt i formuläret: erf (osparade erfarenhetspoäng per färdighet), hjältepoäng, pengar, egen utrustning samt utseende och bakgrund. Det sparas i rollpersonen.

Rollpersonen sparas som en JSON-fil med formatnamn och versionsnummer (`sparformat.js`, version 2), så att den kan läsas in igen. Filer i äldre versioner läses också in.

## Spelmöten och förbättring

Tills vidare syns delen bara i utvecklarläget. Under menyn Spelmöten och förbättring (eller sista steget) förs det in som händer efter skapandet, enligt kapitel 4 (s. 73–76):

- **Spelmöte:** EP per färdighet från äventyret (inte kategori B), bonuspoäng efter ett avslutat äventyr (högst 10), slaget för höjd PSY efter en vunnen kamp PSY mot PSY, hjältepoäng, pengar, ny och förlorad utrustning och anteckningar.
- **Träning:** ensam, med lärare eller privatlärare, med slagen per vecka, tiden och kostnaden. Nya färdigheter och besvärjelser kan läras.
- **Förbättra:** en guide i fem steg. EP växlas till FV efter minst sju dagars vila, FV 21, 41, 61 … ger 1T4 HP, 5 HP höjer en grundegenskap (inte STO) och HP kan köpa ett nytt slag på tabellen över särskilda förmågor.
- **Logg:** allt som har förts in, och den senaste posten kan ångras.

Varje post kontrolleras mot reglerna innan den förs in. Efter första posten är skapandet låst; rollformuläret visar den utvecklade rollpersonen.

## Utvecklarläge

Lägg till `?dev` i adressen (till exempel http://localhost:8000/?dev) för att få testrollpersoner i menyn: en människa som krigare, en högländare som gladiator och en dimalv som elementarmagiker. Ett klick ger en färdig, tillåten rollperson, öppnad i valfritt steg eller direkt i rollformuläret, och med osparade erf om man vill prova förbättringen. Bredvid gjorda tärningsslag finns knappen Lås upp, som tar bort slaget så att det kan slås om. Valet sparas i webbläsaren; `?dev=av` eller knappen Stäng av slår av det igen. Vanliga spelare ser ingenting av det.

Rollpersonerna byggs med samma regler och automatik som stegen (`utvecklarlage.js`) utifrån önskemålen i `testrollpersoner.js`, så de håller sig giltiga när reglerna ändras. Går ett önskemål inte längre väljs något annat tillåtet och en notis säger till.

**Autofyll** (i menyn eller knappen Auto i poängloggen) fyller i stegets obligatoriska val så fort steget visas: tomma listor och textfält, den särskilda förmågans val, startpaketets vapen och alla tärningsslag. Ras och yrke väljer man själv, och knapparna Föreslå värden och Fördela EP används aldrig. Bara tomma val fylls i. Efter Lås upp slås slaget inte om automatiskt förrän man lämnar steget, så att BP kan ändras först (`autofyll.js`).

**Poängloggen** nere till vänster visar varje post som ger eller tar BP, EP eller pengar: steg, vad som hände, ändringen och vad som är kvar efter raden. Den kan också visa grundegenskapernas delar (ras, ålder, grundvärde, förmåga) med slutvärdet, tärningsslagen, den burna vikten mot bärförmågan och ändringar som regelkontrollen stoppade (i rött). Slag och vikt är avkryssade från början. Den räknas fram på nytt ur rollpersonen vid varje ändring, så ett val som byts ut försvinner ur loggen. BP, EP och Guld kan filtreras med kryssrutor, loggen kan dras högre i överkanten (aldrig lägre än standardstorleken), fällas ihop och visas i helskärm, och raderna kan kopieras som text. Stämmer loggens summa inte med det som visas på sidan säger den till (`poanglogg.js`).

## Kör lokalt

Sidan är helt statisk men läser reglerna med `fetch`, så den behöver en enkel webbserver:

```sh
python3 -m http.server
```

Öppna sedan http://localhost:8000.

## Publicera

Sidan publiceras på GitHub Pages med arbetsflödet `.github/workflows/pages.yml` vid varje push till `main`. Det skriver in publiceringstiden och commit i `version.json` innan sidan laddas upp. Under Settings → Pages ska källan (Build and deployment → Source) vara **GitHub Actions**.

Versionsnumret i `version.json` (`version`) höjs för hand enligt semver: tredje siffran för rättningar, andra för nya funktioner, första för stora förändringar (till exempel ändrat filformat).

## Struktur

- `index.html`, `app.js`: gränssnittet. `app.js` startar appen, ritar vyerna (stegen, spelmötena och rollformuläret) och kopplar ihop modulerna.
- `tillstand.js`: rollpersonen och appens delade tillstånd (`S.rp`, `S.aktivtSteg` …), kontrollen mot reglerna efter varje ändring och kopplingen till regelmotorn.
- `steg/`: ett steg per fil (`ras.js`, `yrke.js`, `formagor.js` …). `steg/saknas.js` avgör vad som saknas i varje steg och vilka steg som syns.
- `ui/`: delar som flera steg använder: element och kontroller (`dom.js`, `kontroller.js`), tärningsslagen (`tarningar.js`), magiförmågeslagets modal (`magimodal.js`) och rollformuläret bredvid stegen (`sammanfattning.js`).
- `texter.js`: stegens namn och förklarande texter.
- `formular.js`, `formular.css`: rollformuläret för utskrift.
- `formularpdf.js`: gör rollformuläret till en PDF-fil med pdf-lib (`vendor/`) och typsnitten i `typsnitt/`. Formuläret ritas i en dold kopia och mäts upp, så layouten finns bara i `formular.js` och `formular.css`.
- `utvecklarlage.js`, `testrollpersoner.js`, `autofyll.js`, `poanglogg.js`: utvecklarläget med testrollpersoner, autofyll och poänglogg.
- `sparformat.js`: filformatet för sparade rollpersoner (version 2).
- `utveckling.js`: regellogiken efter skapandet. Räknar fram den utvecklade rollpersonen ur loggen och kontrollerar varje post.
- `spelmote.js`: gränssnittet för spelmöten, träning, förbättring och logg.
- `regelmotor.js`: all regellogik (BP, EP, grundegenskaper, härledda värden, färdigheter). Har inga beroenden.
- `regler/*.json`: reglerna som data, med sidhänvisningar. `husregler.json` beskriver hur oklara regler i grundreglerna har tolkats, `regelbeslut.md` regelbesluten för expansionerna (visas under Regelresonemang), `bocker.json` böckerna i steg 0.
- `ui/startsida.js`: startsidan och sidan Regelresonemang.
- Reglerna ändras direkt i `regler/*.json` (tidigare genererades de av Python-skript i `verktyg/`, som är borttagna). Det som går att välja (`valbaraRaser`, `valbaraYrken`, `magiskolor`, `kulturer` i `regelmotor.js`) hämtas på ett ställe, där bokvalet för expansionerna ska kopplas in. `test/regler.test.mjs` kontrollerar att filerna går att läsa och att id:n är unika.
- `test/brutus.test.mjs`: kontrollerar motorn mot bokens exempel Brutus. `test/sparformat.test.mjs`: filformatet. `test/utveckling.test.mjs`: utvecklingen efter skapandet. Kör alla med `npm test` (Node 20 eller senare).
- `test/e2e/`: webbläsartester med Playwright som klickar igenom appen. Kör `npm install` en gång och sedan `npm run e2e` (tar några minuter). `npm run e2e -- --alla` kör även alla 192 kombinationer av ras och yrke (ca 15 min), och `npm run e2e -- kontroll pdf` kör bara de testerna som nämns. Testet `pdf` kräver `pdfinfo` (poppler). Skripten i `test/e2e/verktyg/` är hjälpmedel, inte tester: `skapa.cjs` skapar rollpersonsfiler för alla kombinationer och `visa.cjs` tar skärmbilder av rollformuläret.
