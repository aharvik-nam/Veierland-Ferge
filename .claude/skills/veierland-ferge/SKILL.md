---
name: veierland-ferge
description: Vedlikehold av Veierland Ferge-appen (repo aharvik-nam/Veierland-Ferge, nettside jutoya.veierland.org og app i App Store/Google Play). Dekker nye rutetider (ofte sendt som bilder av en rutetabell), sesonger og M/F Humla-perioden, fergeposisjon fra BarentsWatch AIS (MMSI), publisering av nettsiden via Vercel, og bygging og opplasting av appen til TestFlight/App Store og Google Play med GitHub Actions, inkludert feilsøking av byggene. Bruk skillet når brukeren nevner rutetider, ferge eller ferja, Humla, Jutøya, Tenvik, Tangen, Engø, Vestgården, ny versjon, TestFlight, App Store, Google Play, «sjekk bygget» eller workflowen «Bygg og last opp app». Bruk det også når brukeren bare sender et bilde av en rutetabell, eller ber om endringer i appen uten å nevne filer.
---

# Veierland Ferge

Uoffisiell app for passasjerferga mellom Tenvik (fastlandet), Veierland (Vestgården og Tangen) og Engø.
Den ene koden blir til tre ting:

- **Nettsiden** (jutoya.veierland.org og veierland-ferge.vercel.app). Vercel publiserer automatisk når `main` endres.
- **iOS-appen** («Veierland Ferge», bundle `no.veierland.ferge`). Bygges i skyen, fordi brukeren ikke har Mac.
- **Android-appen** med samme pakkenavn.

Den installerte appen henter rutetidene fra nettsiden (`/timetable.json`). Nye rutetider trenger derfor bare en push til `main`, ikke ny app-versjon.

## Om brukeren

Andreas (aharvik@gmail.com) eier appen, skriver norsk og er ikke utvikler.

- Svar på norsk, kort og konkret. Si nøyaktig hvilken knapp vedkommende skal trykke på.
- Spør heller enn å gjette når en rutetid i et bilde er uleselig. Én feil avgang i appen betyr at noen står igjen på kaia.
- Be aldri om hemmeligheter, som API-nøkler eller passord, i chatten. Brukeren legger dem inn selv i Vercel eller i GitHub secrets.
- Repoet er **offentlig**. Ikke commit nøkler, keystore-filer eller `.p8`-filer, og ikke legg dem i GitHub-artefakter.

## Kart over koden

| Hva | Hvor |
|---|---|
| Alle rutetider (ordinær, sommer, Humla) | `src/data.ts` |
| Sesongdatoer (`SUMMER`, `MAINTENANCE` = Humla) og reiselogikk (`findTripsForDay`, bestillingsregler) | `src/ferryData.ts` |
| Rutetider fra serveren til appen | `src/timetableJson.ts` (lager `/timetable.json` ved bygg), `src/remoteTimetable.ts` (henter og lagrer) |
| Admin-panel og Firestore (overstyrer kode-rutetidene!) | `public/admin.html`, `src/firestoreData.ts` |
| Klassisk rutetabell (egen kopi av Humla-tidene!) | `public/rutetabell.html` |
| Skjermer | `src/App.tsx` (fanelinje: Søk / Avganger / Rutetabell), `src/screens/*`, `src/components/*` |
| Fergeposisjon (Vercel-funksjon) | `api/ferry.ts`, vises i `src/components/FerryLive.tsx` |
| Fergekartet (trykk på «Ferga nå») | `src/components/FerryMap.tsx`, kartgrunnlag i `src/map/kart.ts` |
| Punktlighet og «forsinket nå» | `api/ferry-history.ts` (`stats=1` og `live=1`), `src/punctuality.ts`, `src/liveDelay.ts` |
| Dashbord for iPad og PC (Passasjer og Ferge, sveip mellom dem) | `src/dashboard/*`, valgt i `src/App.tsx` med `useWideScreen` |
| Vær og sjø, andre båter (Vercel-funksjoner) | `api/conditions.ts`, `api/vessels.ts` |
| Native-apper | `capacitor.config.ts`, `ios/`, `android/`, `src/platform.ts` (`API_BASE`) |
| Bygg og opplasting | `.github/workflows/app-release.yml`, `scripts/ios-signing.py`, `scripts/asc.py`, `scripts/check-appstore-key.py` |
| Butikktekster, bilder og oppskrift | `store/README.md`, `store/app-store/`, `store/google-play/` |

## Arbeidsflyt i repoet

- Andre økter og brukeren selv pusher også til `main`. Kjør derfor `git fetch origin main` før du begynner og igjen før du pusher. Den lokale grenen kan hete noe annet (f.eks. `humla-rutetider`). Push med `git push origin HEAD:main` når historikken er en fast-forward.
- Lag ikke pull request med mindre brukeren ber om det. Brukeren forventer at endringer havner rett på `main`.
- `npm ci` først hvis `node_modules` kan være utdatert. Kontroller deretter med `npm run lint` (`tsc --noEmit`) og `npm run build`. Begge skal gå gjennom uten feil.

## Oppgave: nye rutetider

Les `references/rutetider.md` først. Der står hva hvert felt betyr, hvordan en trykt rutetabell oversettes til `FerryLoop`-rader, og hva røde avganger betyr.

1. Les bildene kolonne for kolonne og skriv tidene inn i riktig tabell i `src/data.ts`. Les så tabellen tilbake mot bildet én gang til. Skriv ned uleselige eller rare tider og spør brukeren om dem.
   Sett `TIMES_FROM` i `src/data.ts` til datoen de nye tidene gjelder fra. Punktligheten i appen regnes bare fra den datoen, så eldre dager med andre tider ikke gir feil tall.
2. Gjelder endringen Humla-tidene, må `HUMLA_SEASON` i `public/rutetabell.html` oppdateres likt. Den klassiske rutetabellen har en egen kopi.
3. Kjør kontrollskriptet:
   ```bash
   npx tsx .claude/skills/veierland-ferge/scripts/sjekk-rutetider.ts
   ```
   Skriptet finner feil klokkeslett, tider i feil rekkefølge, Vestgården i Humla-ruter, ulik Humla-periode i filene, og forskjeller mellom `rutetabell.html` og `data.ts`. Det skal ende med «✓ Ingen feil».
4. Se resultatet: `npm run build`, deretter
   ```bash
   node .claude/skills/veierland-ferge/scripts/skjermbilder.mjs <scratchpad-mappe> 2026-11-07T09:40
   ```
   Velg et tidspunkt i perioden du endret. Se på bildene og send dem gjerne til brukeren.
5. Commit og push til `main`. Etter et par minutter er tidene på nettsiden. Den installerte appen henter dem neste gang den åpnes, eller innen 30 minutter.
6. Hvis noen har lagret rutetider i admin-panelet for samme periode, vinner de over koden. Spør brukeren om det før du konkluderer med at endringen ikke virker. Se `references/rutetider.md`.

## Oppgave: endre sesong eller Humla-perioden

Humla-perioden står med dato i tre filer: `MAINTENANCE` i `src/ferryData.ts`, `HUMLA_FROM`/`HUMLA_TO` i `api/ferry.ts` og `dateFrom`/`dateTo` i `public/rutetabell.html`. Teksten med datoene står for hånd på fire steder til: `seasonLabel` i `src/ferryData.ts`, `src/components/HumlaNotice.tsx`, `src/screens/ResultsScreen.tsx` og `rules` i `src/data.ts`. Kontrollskriptet sjekker at de tre datoene er like, og skriver ut tekstene så du kan se over dem.

Når Humla-perioden er slutt, går appen automatisk tilbake til ordinære ruter og sommerruter, og AIS-funksjonen viser M/F Jutøya igjen. Utenfor Humla-perioden viser `rutetabell.html` bare det som er lagret i admin-panelet, ellers «Ingen rutedata». Gjør brukeren oppmerksom på det.

## Oppgave: fergeposisjon

`api/ferry.ts` henter siste AIS-posisjon fra BarentsWatch og bytter fartøy etter Humla-perioden:

- M/F Humla (GO VAKKER RANDI): MMSI 257281900
- M/F Jutøya: MMSI 257207800

Vercel-miljøvariablene `BARENTSWATCH_CLIENT_ID` og `BARENTSWATCH_CLIENT_SECRET` må være satt. `FERRY_MMSI` overstyrer valget av fartøy. Test med `curl -s https://veierland-ferge.vercel.app/api/ferry`. Svaret skal ha `lat`, `lng` og `time`, eller en forklarende feil.

**AIS-historikk og punktlighet:** `api/ferry-history.ts` henter sporet de siste 14 dagene (BarentsWatch sletter eldre data) og gjør det om til anløp per kai. Kaiposisjonene er målt fra sporet. Fortøyd ligger ferga innenfor 5–10 m, så innenfor 30 m (Engø 60 m) og nesten stille regnes som ved kaia, og utenfor 30 m har den gått. Et anløp krever et faktisk stopp, så forbikjøring telles ikke. Samme punkter står i `stopCoords` i `src/ferryData.ts`. BarentsWatch er ofte stengt fra Claude-økter, så hent fra Vercel med `web_fetch_vercel_url`, for eksempel `https://veierland-ferge.vercel.app/api/ferry-history?from=2026-10-17&to=2026-10-24&compact=1`. Lagre svaret og kjør `npx tsx .claude/skills/veierland-ferge/scripts/punktlighet.ts <fil.json>`. Faste avvik på mange minutter for samme avgang flere dager på rad betyr at rutetiden i appen trolig er feil. Røde Engø-turer og bestillingsavganger går bare når noen har bestilt, så at de mangler i AIS er normalt. `raw=1&day=…` gir alle punktene for én dag.

**I appen:** `stats=1` gir punktlighet per avgang og samlet for dagene siden `TIMES_FROM` (maks 14, cache 1 time). Appen viser tall først når en avgang har minst 3 målinger, og samlet etter 20 avganger. Dette vises på kortet for neste avgang, på detaljsiden og nederst i rutetabellen. `live=1` gir dagens anløp og siste posisjon (cache 10 s). `liveDelay` bruker det til «Ferga har ikke gått fra Tangen ennå, ca. 6 min forsinket». En avgang som skulle gått for under 15 min siden, men ikke har gått, blir stående øverst.

**Fergekartet:** Trykker man på kortet «Ferga nå», åpnes et kart i appens farger. Det viser land, Humla-ruta (fergens faktiske AIS-spor), kaiene, ferga med retning og sporet de siste 20 minuttene (`trail` fra `live=1`). Kystlinjen er bygget inn i `src/map/kart.ts` som én SVG-sti i meter, nord opp, med kilde © OpenStreetMap-bidragsytere (ODbL, må stå på kartet). OpenStreetMap er stengt fra Claude-økter, så for å bygge kartet på nytt: lag grenen `kartdata` fra `main`, gjør en endring i `.github/workflows/kartdata.yml` og push. Jobben legger `kartdata/osm.json` på grenen. Kopier så `scripts/bygg-kart.mjs` fra skillet til en tom mappe, kjør `npm i polygon-clipping@0.15 simplify-js@1` og `node bygg-kart.mjs osm.json kart.json`, og bytt `COAST` (og `MAP_VIEW` hvis utsnittet er endret) i `src/map/kart.ts`. Skriptet bruker OSM-linjene direkte, med full detalj. Kyststykker som går ut av kartet, lukkes langs kanten (land ligger til venstre for kystlinjens retning). Appen runder av hjørnene når kartet tegnes (`smooth` i `kart.ts`), og tegner et svakt grunnvannsbelte langs land. Slett grenen etterpå.

Øverst i kartet står klokkeslettene (`src/mapTimes.ts`). Er ferga underveis, vises «Gikk fra Tenvik 10:07 (rute 10:00)» og «Ankommer Tangen ca. 10:25 (rute 10:20)». Ligger den ved kaia, vises «Kom til Tangen 10:24» og «Neste avgang 10:40». Avgangstiden er den faktiske fra AIS. Ankomsten regnes fra luftlinja til kaia × 1,15 med farten fra AIS, eller 6,5 knop når den er under 5 knop. Det treffer AIS-sporet innen omtrent ett minutt. Rutetiden finnes ved å matche avgangen mot dagens rutetabell. En bestillingsavgang eller rød Engø-tur regnes som droppet 3 min etter rutetiden.

Selve kortet «Ferga nå» viser posisjonen på en rett linje: Tenvik til venstre, Tangen i midten og Engø til høyre. Kartet åpnes først når man trykker på kortet. Selve kartet ligger i `src/components/MapView.tsx` (`MapSvg`, `TimeCells` og knappen «Andre båter») og brukes både i kartarket og på dashbordene.

**Ser brukeren gammel versjon på nettsiden?** Nettsiden er en PWA med service worker. En ny versjon lastes inn og tas i bruk med en automatisk omlasting, og det sjekkes hver gang siden kommer fram igjen (`src/main.tsx`). iPhone-appen fra TestFlight får derimot nye funksjoner først i neste bygg. Spør hvor brukeren testet før du leter etter feil i koden.

## Dashbordene på store skjermer (iPad og PC)

Er skjermen minst 900×600 (eller 700×900 stående), viser appen to dashbord i stedet for telefonvisningen. Det gjelder iPad-appen og nettsiden på PC. Man sveiper mellom dem eller trykker på «Passasjer / Ferge» nederst. Siden man sist var på, huskes.

- **Passasjer** (`PassengerDashboard.tsx`) viser avgangene begge veier for valgt strekning, kartet med tider og «Andre båter», været time for time og «Verdt å vite». Under «Verdt å vite» ligger farevarsler, meldinger fra admin-panelet, Humla-varselet og punktligheten. Trykker man på en avgang, åpnes detaljsiden som et panel.
- **Ferge** (`CrewDashboard.tsx`) er et display for mannskapet i styrhuset:
  - stor klokke med sekunder, og neste faste avgang med hvor den går
  - eventuell bestillingsavgang før den, på egen linje
  - dagens rundturer som tabell
  - vind med retning, vindkast og søyler for de neste 8 timene, rød fra liten kuling
  - sjø og lys: bølger, sjøtemperatur, vannstand mot middelvann, sikt (tåke), luft og soloppgang/solnedgang
  - farevarsler fra MET
  - kartet med andre båter slått på

  Nattmodus (rødt på svart, så nattsynet bevares) er Auto etter solen, Natt eller Dag. Den velges med knappen øverst til høyre. Skjermen holdes på der nettleseren støtter det (Wake Lock). På en iPad som skal stå fremme, bør Autolås likevel settes til «Aldri».
- **Data:**
  - `api/conditions.ts` henter MET locationforecast (complete), oceanforecast, metalerts og Kartverkets vannstand, med cache på 10 minutter. Ingen nøkler trengs.
  - `api/vessels.ts` henter andre fartøy i kartutsnittet fra BarentsWatch (`POST /v1/latest/combined` med `geometry`), med cache på 30 sekunder. Den bruker samme nøkler som `api/ferry.ts`.
  - Begge har `?debug=1`, som viser status for hver kilde. Test med `web_fetch_vercel_url`.
  - BarentsWatch-nøklene finnes bare i Production hos Vercel, ikke i Preview.
- **Testing:** begge dashbordene kan testes med Playwright, med visningen satt til 1180×820 og 820×1180, og med oppdiktede svar fra `/api/*`. Sett `localStorage.vf_dashside` til `'1'` for Ferge-siden og `vf_nattmodus` til `'natt'` for nattmodus.
- **iPad i App Store:** iOS-prosjektet har `TARGETED_DEVICE_FAMILY = "1,2"` og alle retninger på iPad (`UISupportedInterfaceOrientations~ipad`). App Store krever da egne iPad-skjermbilder (13 tommer). Apple tillater ikke å fjerne iPad-støtten etter at appen er publisert.

## Oppgave: ny app-versjon, bygg og publisering

Les `references/publisering.md`. Det viktigste:

- Workflowen «Bygg og last opp app» startes **bare manuelt**. Claude får 403 ved forsøk på å starte den. Be brukeren gå til GitHub → Actions → «Bygg og last opp app» → **Run workflow**, velge `main` og plattform.
- «Re-run jobs» på en gammel kjøring bruker den gamle koden. Sjekk at `head_sha` i kjøringen er nyeste `main` før du leser feilen.
- Versjonen kommer fra `version` i `package.json`. Byggnummeret er kjøringens nummer, så det øker av seg selv.
- Er det bare rutetidene som er endret, trengs det ikke noe nytt bygg.

Når brukeren sier «sjekk bygget», hent siste kjøring og loggene med GitHub-verktøyene. Fiks feilen, push, og be brukeren starte en ny kjøring. Feil vi har sett før, og løsningene på dem, står i `references/publisering.md`.
