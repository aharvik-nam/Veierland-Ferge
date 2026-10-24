# Rutetider i Veierland Ferge

## Innhold
1. Datamodellen (`FerryLoop`)
2. Fra trykt rutetabell til rader
3. Røde avganger og bestilling
4. Hvor rutetidene kommer fra (og hva som vinner)
5. Sesonger og Humla-perioden
6. Sjekkliste

## 1. Datamodellen

Alle rutetider ligger i `src/data.ts` som lister av `FerryLoop`. Det er én liste per sesong og dagtype:

| Liste | Gjelder | id-prefiks |
|---|---|---|
| `monFriLoops`, `satLoops`, `sunLoops` | ordinære ruter | `mf-`, `sa-`, `su-` |
| `summerMonFriLoops`, `summerSatLoops`, `summerSunLoops` | sommerruter (`SUMMER`, hvert år) | `smf-`, `ssa-`, `ssu-` |
| `humlaMonFriLoops`, `humlaSatLoops`, `humlaSunLoops` | M/F Humla-perioden (`MAINTENANCE`) | `hmf-`, `hsa-`, `hsu-` |

En `FerryLoop` er **én rundtur med båten**: ut fra Tenvik til øya, og tilbake fra Tangen. Feltene står i den rekkefølgen båten kommer til kaiene. Appen leser dem i nettopp denne rekkefølgen (`sequenceKeys` i `src/ferryData.ts`):

| Felt | Betyr |
|---|---|
| `bussTbg` | Bussen fra Tønsberg som passer med avgangen fra Tenvik |
| `tenvikUt` | Avgang fra Tenvik |
| `vestgardenUt` | Vestgården på vei ut (ordinære ruter og sommerruter) |
| `tangenVia` | Tangen *før* Engø. Brukes bare med Humla, som går Tenvik–Tangen–Engø–Tangen |
| `engoUt` | Engø på vei ut |
| `tangenUt` | Ankomst Tangen, endestasjon på vei ut |
| `tangenInn` | Avgang fra Tangen tilbake til fastlandet |
| `engoInn` | Engø på vei tilbake (sjelden) |
| `vestgardenInn` | Vestgården på vei tilbake |
| `tenvikInn` | Ankomst Tenvik |
| `bussTenvik` | Bussen fra Tenvik til Tønsberg som passer med ankomsten |
| `rowType` | `'engo'`: Engø-tidene er røde og må bestilles. `'booking'`: hele avgangen må bestilles. Utelates for vanlige turer. |
| `deadline` | Bestillingsfrist for `rowType: 'booking'`: `'18:00'` (standard, samme dag), `'20:00'` eller `'kvelden før, 20:00'` |
| `note` | Valgfri egen tekst for advarselen |

Kaier som turen ikke går innom, er `null`. Klokkeslett skrives `"TT:MM"` med ledende null, for eksempel `"07:05"`. Alle tider i en rad må være i stigende rekkefølge.

**Hvorfor rundturer?** Appen finner en reise ved å lete etter fra-kai og til-kai *innenfor samme rad*. Reiser som går forbi Tangen, for eksempel Engø → Tenvik med Humla (`engoUt` → `tangenUt` → `tangenInn` → `tenvikInn`), blir bare funnet når utturen og returen båten tar rett etterpå ligger i samme rad.

## 2. Fra trykt rutetabell til rader

Rutetabellene (fra veierland.org eller som bilder fra brukeren) har én tabell «Til Veierland» og én «Fra Veierland». Hver kolonne eller rad er én avgang.

1. Lag én rad per avgang i «Til Veierland»: buss, Tenvik, (Vestgården / Tangen via), (Engø), Tangen.
2. Finn returen fra Tangen som båten tar etterpå, altså den første `tangenInn` som er lik eller senere enn `tangenUt`, og som ikke allerede er brukt. Sett den inn i samme rad: Tangen, (Engø), (Vestgården), Tenvik, buss. Ofte er `tangenInn` lik `tangenUt` fordi båten snur med en gang.
3. Returer uten en uttur før seg, som første tur om morgenen fra øya, får en egen rad med bare returfeltene (se `mf-0`, `hmf-0`). Uttur uten retur, som siste tur om kvelden, får en rad med bare utfeltene (se `mf-13`).
4. Behold eksisterende id-er der turen bare har fått nye tider. Nye turer får neste ledige nummer med samme prefiks. Rekkefølgen i listen skal følge avgangstiden.
5. Les hele tabellen tilbake mot bildet én gang til, kolonne for kolonne. Tell avganger per dag i bildet og i koden. Står det noe uklart i bildet, for eksempel en 6 som kan være en 8, spør brukeren i stedet for å gjette.

Under Humla utgår Vestgården. Alle `vestgarden*`-felt i `humla*`-listene skal være `null`, og all retur til Engø går fra Tangen.

## 3. Røde avganger og bestilling

- **Røde Engø-tider** (Humla lørdag og søndag): sett `rowType: "engo"` på raden. Da blir Engø-tidene røde, og appen viser knappen for å ringe fergen på 918 88 219.
- **Bestillingsavganger** (hele avgangen må bestilles): `rowType: "booking"`, `deadline` og en `note` med fristen og telefonnummeret. På veierland.org står de ofte bare som tekst øverst («Avgang 2020 fra Tangen … MÅ bestilles før 1800»), ikke i tabellen. Legg dem i en egen rad, ikke i samme rad som en vanlig tur, fordi `rowType` gjelder hele raden. Ankomsttiden står sjelden. Bruk vanlig overfartstid (Tangen–Tenvik 20 min med Humla), og si fra til brukeren at den er beregnet.
- **Bestillingsregler på klokkeslett** for ordinære ruter og sommerruter (siste tur om kvelden, tidlig lørdag fra Vestgården) er ikke data. De står som tidsgrenser i `findTripsForDay` i `src/ferryData.ts`. Det gjør også Engø-sesongen (22. mars–27. sept.). Endrer ferjeselskapet reglene, må koden der endres.

## 4. Hvor rutetidene kommer fra (og hva som vinner)

```
src/data.ts ──bygg──> /timetable.json ──appen henter ved oppstart og når den vises igjen (maks hvert 30. min)──> localStorage «vf_remote_timetable»
public/admin.html ──lagrer──> Firestore vf/timetable ──appen synker ved oppstart──> localStorage «vf_timetable»
```

For en gitt dato bruker appen den første av disse som finnes (`loopsFor` i `src/ferryData.ts`):

1. **Admin-panelet** (Firestore): en sesong med `dateFrom`/`dateTo` som dekker datoen. En sesong merket «standard» brukes også, men ikke i Humla-perioden.
2. **Serverens `/timetable.json`**: daterte perioder (Humla), deretter sommer, deretter ordinære ruter.
3. **Rutetidene som er bygget inn i appen**, altså `src/data.ts` slik den var da appen ble bygget.

Sjekk om admin-panelet har lagret noe (tomt svar / `NOT_FOUND` betyr at ingenting overstyrer koden):
```bash
curl -s "https://firestore.googleapis.com/v1/projects/ferge-veierland/databases/(default)/documents/vf/timetable" | head -c 600
```
Varsler fra admin-panelet ligger i `vf/notices` og vises på forsiden og i `rutetabell.html`.

`/timetable.json` lages av Vite-pluginen i `vite.config.ts` fra `src/timetableJson.ts`. Den har CORS og 5 minutters cache på Vercel (`vercel.json`). Legger du til en ny sesong eller et nytt felt, må `src/timetableJson.ts` og typene i `src/remoteTimetable.ts` følge med. Installerte apper med gammel kode forstår bare formatet de ble bygget med. Endres formatet, trengs det ny app-versjon, og gamle apper må fortsatt tåle den nye fila (`isValid` forkaster ugyldige filer, og da brukes de innebygde tidene).

`public/rutetabell.html` (den klassiske visningen) leser ikke `/timetable.json`. Den har sin egen kopi av Humla-tidene i `HUMLA_SEASON` og bruker ellers bare admin-data. Kontrollskriptet sammenligner kopien med `data.ts`.

## 5. Sesonger og Humla-perioden

- `SUMMER = { from: 'mm-dd', to: 'mm-dd' }` i `src/ferryData.ts` gjentas hvert år.
- `MAINTENANCE = { from: 'yyyy-mm-dd', to: 'yyyy-mm-dd' }` er perioden M/F Jutøya er på verksted og M/F Humla seiler. Den gjelder foran sommer og ordinær.
- Den samme Humla-perioden står også i `api/ferry.ts` (bytter MMSI) og i `public/rutetabell.html`. Teksten «17. okt. – ca. 1. mars» står for hånd i `seasonLabel` (`src/ferryData.ts`), `src/components/HumlaNotice.tsx`, `src/screens/ResultsScreen.tsx` og `rules` i `src/data.ts`.
- Navnet skrives `MF "Humla"` i appen, fordi det ikke er båtens offisielle navn (AIS-navnet er GO VAKKER RANDI).
- Varselet om Humla (`HumlaNotice`) kan lukkes. Det huskes i `localStorage` (`humlaNoticeDismissed`).

## 6. Sjekkliste før push

- [ ] `npx tsx .claude/skills/veierland-ferge/scripts/sjekk-rutetider.ts` gir «✓ Ingen feil», og tekstene den skriver ut stemmer med perioden
- [ ] `npm run build` går gjennom, og `dist/timetable.json` har de nye tidene
- [ ] Skjermbilder med `skjermbilder.mjs` på et tidspunkt i perioden ser riktige ut (neste avgang, Avganger og Rutetabell for alle tre dagtyper)
- [ ] Brukeren har fått beskjed om tider du var usikker på
