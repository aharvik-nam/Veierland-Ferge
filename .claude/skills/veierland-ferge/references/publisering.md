# Bygg og publisering

## Innhold
1. Nettsiden (Vercel)
2. Workflowen «Bygg og last opp app»
3. Slik sjekker du et bygg
4. iOS: signering i skyen
5. Android
6. Feil vi har sett før
7. App Store og Google Play

Status per 24.10.2026: iOS-bygget virker. Nyeste er versjon 1.0.0 build 12 i TestFlight (kjøring #12, med fergekart, klokkeslett i kartet og byggnummer under «Om appen»). Kjøring #10 feilet med 401 i nøkkelsjekken etter et svar som tok over ett minutt. Det var midlertidig: #12 gikk gjennom med samme nøkkel, og `scripts/asc.py` prøver nå igjen. Appen er ikke sendt til godkjenning ennå. Android-bygget er ikke prøvd ennå. Oppdater denne linjen når noe endrer seg.

## 1. Nettsiden (Vercel)

En push til `main` publiseres automatisk av Vercel på jutoya.veierland.org og veierland-ferge.vercel.app. Den installerte appen bruker `API_BASE = https://veierland-ferge.vercel.app` (`src/platform.ts`) for `/timetable.json`, `/api/ferry`, `/personvern.html` og `/support.html`.

Sjekk at nye rutetider er ute (`generated` er byggetidspunktet):
```bash
curl -s https://veierland-ferge.vercel.app/timetable.json | head -c 120
```
Miljøvariabler for Vercel, som `BARENTSWATCH_CLIENT_ID` og `BARENTSWATCH_CLIENT_SECRET`, legger brukeren inn selv i Vercel. Claude har fått avslag på å skrive dem.

## 2. Workflowen «Bygg og last opp app»

Fil: `.github/workflows/app-release.yml`. Den startes bare manuelt (`workflow_dispatch`), med valget `begge`, `ios` eller `android`.

- Claude kan **ikke** starte den. Forsøk gir 403 «Resource not accessible by integration». Be brukeren gå til [Actions → «Bygg og last opp app»](https://github.com/aharvik-nam/Veierland-Ferge/actions/workflows/app-release.yml) → **Run workflow** (den grå knappen over listen med kjøringer) → branch `main` → plattform → grønn **Run workflow**.
- «Re-run jobs» inne i en gammel kjøring bygger den **gamle** commiten. Brukeren har gjort det ved en feil. Det ser ut som at fiksen ikke virket.
- Versjonen (`MARKETING_VERSION` på iOS, `versionName` på Android) kommer fra `version` i `package.json`. Byggnummeret (`CURRENT_PROJECT_VERSION` og `versionCode`) er `github.run_number`, så hver ny kjøring får et høyere nummer.

GitHub-secrets (brukeren legger dem inn under Settings → Secrets and variables → Actions):

| Secret | Brukes til |
|---|---|
| `APPSTORE_KEY_P8`, `APPSTORE_KEY_ID`, `APPSTORE_ISSUER_ID` | App Store Connect API-nøkkel (Team Key, rollen Admin) |
| `APPLE_TEAM_ID` | Brukes bare til en advarsel. Den er feil i dag, men bygget henter riktig team fra sertifikatet |
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`upload`), `ANDROID_KEY_PASSWORD` | Opplastingsnøkkelen til Google Play |
| `PLAY_SERVICE_ACCOUNT_JSON` (valgfri) | Automatisk opplasting til Google Play |

## 3. Slik sjekker du et bygg

Når brukeren sier «sjekk bygget» eller «har det gått igjennom»:

1. `mcp__github__actions_list` med `method: list_workflow_runs`, `resource_id: app-release.yml` og `perPage: 3`. Se på `status`, `conclusion`, `run_number` og `head_sha`.
2. Sammenlign `head_sha` med `git rev-parse origin/main` etter `git fetch`. Er de ulike, bygde kjøringen gammel kode («Re-run») eller noe som var pushet før fiksen.
3. `list_workflow_jobs` med kjøringens id viser hvilket steg som feilet.
4. `mcp__github__get_job_logs` med `job_id`, `return_content: true` og `tail_lines` 60–150. Skriptene skriver feilene på norsk med `::error::`.
5. Fiks feilen og test lokalt det som kan testes. For eksempel: `python3 -m py_compile scripts/*.py`, YAML-parsing av workflowen, og signeringsskriptet mot en falsk `call`-funksjon. Push så til `main` og be brukeren starte en **ny** kjøring.

Er bygget grønt, se etter «UPLOAD SUCCEEDED» i iOS-loggen. Fortell brukeren at bygget dukker opp i TestFlight etter 10–30 minutter.

## 4. iOS: signering i skyen

Xcodes automatiske signering med API-nøkkel feilet på GitHub-maskinene med «No Account for Team». Derfor gjør bygget signeringen selv:

1. `scripts/check-appstore-key.py`: sjekker at nøkkelen virker, registrerer app-ID-en hvis den mangler, og varsler hvis appen mangler i App Store Connect.
2. `scripts/ios-signing.py setup` gjør dette:
   - lager et nytt **Apple Distribution**-sertifikat via API-et (ny RSA-nøkkel og CSR hver gang);
   - legger sertifikatet i en midlertidig nøkkelring;
   - lager App Store-profilen «Veierland Ferge CI <nr>» og sletter gamle CI-profiler;
   - setter manuell signering **bare** på app-målets Release-oppsett i `project.pbxproj`, og bare på byggemaskinen;
   - henter teamet fra sertifikatets OU.
3. `xcodebuild archive`, deretter `-exportArchive` (manuell, `app-store-connect`), og så `xcrun altool --upload-app` med API-nøkkelen i `~/private_keys/AuthKey_<KEY_ID>.p8`.
4. `scripts/ios-signing.py cleanup` (`if: always()`): sletter profilen, trekker tilbake sertifikatet og fjerner nøkkelringen. Bygg som er lastet opp påvirkes ikke. Brukeren kan få e-post fra Apple om sertifikatene.

Felles API-kode (JWT og kall) ligger i `scripts/asc.py`. Prosjektet i repoet skal fortsatt stå på automatisk signering. Ikke commit manuell signering, og ikke lagre `project.pbxproj` med BOM-tegn først i fila. Info.plist har `ITSAppUsesNonExemptEncryption = false`, `arm64`, bare stående visning og `nb` som språk.

## 5. Android

- `android/app/build.gradle` leser `versionName` fra `package.json` og `versionCode` fra `-PversionCode`. Signeringen leser `ANDROID_KEYSTORE_FILE`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` og `ANDROID_KEY_PASSWORD` fra miljøet.
- Resultatet er artefakten `android-aab-<nr>` med `app-release.aab`. Den ligger i 14 dager og lastes ned nederst på kjøringssiden.
- Første opplasting gjør brukeren selv i Play Console. Med `PLAY_SERVICE_ACCOUNT_JSON` lastes senere bygg opp automatisk til «Intern testing» som utkast.
- Keystore-fila og passordene har bare brukeren. De skal aldri inn i repoet eller i en artefakt, fordi repoet er offentlig. Er de borte, kan opplastingsnøkkelen tilbakestilles i Play Console, fordi Google har den endelige signeringsnøkkelen (Play App Signing).

## 6. Feil vi har sett før

| I loggen | Årsak | Løsning |
|---|---|---|
| `npm ci` klager på at `package-lock.json` ikke stemmer | `package.json` er endret uten låsefil | `npm install`, og commit `package-lock.json` |
| `No Account for Team` / `No profiles for 'no.veierland.ferge'` | Gammel automatisk signering i Xcode | Kjøringen bruker gammel kode. Sjekk `head_sha`, og at workflowen kjører `ios-signing.py` |
| 401 i «Sjekk Apple-nøkkelen» | Key ID og Issuer ID hører ikke til `.p8`-fila, eller det er en Individual Key | Brukeren legger inn secrets på nytt fra samme Team Key |
| 401 i «Sjekk Apple-nøkkelen» etter at forrige bygg virket | Midlertidig hos Apple (steget brukte da over ett minutt), eller nøkkelen er trukket tilbake | `asc.py` prøver tre ganger. Feiler det likevel, sjekk at nøkkelen er aktiv i App Store Connect → Brukere og tilgang → Integrasjoner |
| 403 ved oppretting av sertifikat | Nøkkelen har ikke rollen Admin | Ny Team Key med Admin |
| 409 ved oppretting av sertifikat | For mange distribusjonssertifikater, fordi en tidligere opprydding feilet | Brukeren trekker tilbake gamle under developer.apple.com/account/resources/certificates (skriptet lister dem) |
| `SecKeychainItemImport: ... already exists` | Apples mellomsertifikat finnes allerede på maskinen | Ufarlig og ignoreres |
| Advarsel om at `APPLE_TEAM_ID` ikke stemmer | Secreten er feil | Ufarlig. Teamet hentes fra sertifikatet |
| altool: byggnummeret er brukt fra før | Samme `run_number` lastet opp igjen («Re-run») | Start en ny kjøring |
| altool: versjonen er stengt for nye bygg | Versjonen er allerede godkjent eller sendt inn | Øk `version` i `package.json` (f.eks. `1.0.1`) |
| `Mangler secret ...` | Secret ikke lagt inn | Brukeren legger den inn under repoets secrets |

## 7. App Store og Google Play

Hele oppskriften, butikktekster, URL-er og skjermbilder står i `store/README.md`. Kort fortalt:

- **App Store**:
  - Bygget kommer i TestFlight.
  - Brukeren fyller ut butikksiden: bilder fra `store/app-store/`, tekster, «Data Not Collected», 4+, personvern-URL `https://harvik.no/ferry/personvern.html` og support-URL `https://harvik.no/ferry/`.
  - Deretter velger brukeren bygget og trykker Add for Review.
- **Google Play** (personlig konto):
  - Først en lukket test med minst 12 testere i 14 dager. Først da kan brukeren søke om produksjonstilgang.
  - Bilder og ikon ligger i `store/google-play/`.
- **Nye skjermbilder til butikkene**: iPhone 1320 × 2868, Play-telefon 1080 × 1920, Play-banner 1024 × 500 og ikon 512 × 512. iPad 13" 2752 × 2064. App Store-bildene (iPhone og iPad, med overskrift) lages med `scripts/butikkbilder/ta-bilder.mjs` og `sett-sammen.mjs` (bruk i toppen av filene). Play-bildene (1080 × 1920) er eldre og viser ikke kartet ennå; de kan lages på samme måte med visning 412 × 760.
- **Ny versjon av selve appen** (ikke bare rutetider): øk `version` i `package.json`, kjør workflowen og send inn den nye versjonen i begge butikkene.
