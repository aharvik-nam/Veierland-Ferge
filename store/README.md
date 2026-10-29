# Veierland Ferge i App Store og Google Play

Alt du trenger for å publisere appen: butikktekster, bilder og en steg-for-steg-oppskrift.
Appen bygges i skyen med GitHub Actions, så du trenger ingen Mac.

- Bilder til App Store: `store/app-store/` (iPhone 6,9", 1320 × 2868) og `store/app-store-ipad/` (iPad 13", 2752 × 2064, liggende)
- Bilder til Google Play: `store/google-play/` (telefon 1080 × 1920, ikon 512 × 512, banner 1024 × 500)

---

## Del 1 – Apple App Store

### 1. Bli Apple-utvikler (én gang)
1. Last ned appen **Apple Developer** på iPhonen, logg inn med Apple-ID-en din og velg **Enroll Now** (som privatperson).
   Det koster 99 USD i året. Godkjenning tar vanligvis 1–2 dager.
2. Når du er godkjent: gå til [developer.apple.com/account](https://developer.apple.com/account) → **Membership details** og noter **Team ID** (10 tegn).

### 2. Registrer appen
1. [developer.apple.com/account/resources/identifiers](https://developer.apple.com/account/resources/identifiers/list) → **+** → **App IDs** → **App**.
   Description: `Veierland Ferge`, Bundle ID (Explicit): `no.veierland.ferge`. Ingen ekstra funksjoner trengs.
2. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Apps** → **+** → **New App**:
   - Platform: iOS · Name: `Veierland Ferge` · Primary language: Norwegian Bokmål
   - Bundle ID: `no.veierland.ferge` · SKU: `veierland-ferge` · User access: Full access

### 3. Lag nøkkel for automatisk opplasting
1. App Store Connect → **Users and Access** → **Integrations** → **App Store Connect API** → **Team Keys** → **+**.
   Navn: `GitHub`, Access: **Admin** (trengs for at sertifikater lages automatisk).
2. Last ned `.p8`-filen (**kan bare lastes ned én gang** – ta vare på den). Noter **Key ID** og **Issuer ID** (står over listen).

### 4. Legg nøklene inn i GitHub
[github.com/aharvik-nam/Veierland-Ferge/settings/secrets/actions](https://github.com/aharvik-nam/Veierland-Ferge/settings/secrets/actions) → **New repository secret**:

| Navn | Verdi |
|---|---|
| `APPLE_TEAM_ID` | Team ID fra punkt 1 |
| `APPSTORE_KEY_ID` | Key ID |
| `APPSTORE_ISSUER_ID` | Issuer ID |
| `APPSTORE_KEY_P8` | Hele innholdet i `.p8`-filen, inkludert linjene `-----BEGIN PRIVATE KEY-----` og `-----END PRIVATE KEY-----` |

### 5. Bygg og last opp
1. [GitHub → Actions → «Bygg og last opp app»](https://github.com/aharvik-nam/Veierland-Ferge/actions/workflows/app-release.yml) → **Run workflow** → velg `ios`.
2. Etter ca. 15 minutter er bygget lastet opp. Det dukker opp under **TestFlight** i App Store Connect etter 10–30 minutter behandling.
3. Test gjerne selv: TestFlight → **Internal Testing** → legg til deg selv, og installer via TestFlight-appen på iPhonen.
4. Bygget lager et nytt distribusjonssertifikat og trekker det tilbake når det er ferdig, så du kan få e-post fra Apple om sertifikater. Det er helt normalt, og bygg som er lastet opp påvirkes ikke.

### 6. Fyll ut butikksiden og send inn
I App Store Connect → appen → **iOS App 1.0**:
- **Screenshots** (iPhone 6,9"): de seks bildene i `store/app-store/`. Ber App Store Connect om 1206 × 2622 (6,3"), bruk `store/app-store-6.3/`
- **Screenshots** (iPad 13"): de fire bildene i `store/app-store-ipad/`
- **Tekster**: se «Butikktekster» lenger ned
- **Build**: velg bygget fra TestFlight
- **App Information**: kategori, personvern-URL, aldersgrense (svar «None»/«Nei» på alt → 4+)
- **App Privacy**: velg **Data Not Collected**
- **Pricing and Availability**: gratis, Norge (eller alle land)
- **App Review Information**: navn, telefon, e-post og merknaden lenger ned. Ingen innlogging trengs.

Trykk **Add for Review** → **Submit**. Apple svarer vanligvis innen 1–2 dager.

---

## Del 2 – Google Play

### 1. Bli Google Play-utvikler (én gang)
1. [play.google.com/console/signup](https://play.google.com/console/signup) → **Personlig konto**. Koster 25 USD én gang.
2. Google ber om legitimasjon (pass/førerkort), telefonnummer og at du bekrefter kontoen fra en Android-telefon (Play Console-appen). Det kan ta noen dager.

### 2. Opprett appen
Play Console → **Opprett app**: navn `Veierland Ferge`, standardspråk **Norsk (bokmål)**, **App**, **Gratis**. Godta erklæringene.

### 3. Legg Android-nøkkelen inn i GitHub
Bruk filen `android-nokler-til-github.txt` som du fikk av Claude, og legg inn de fire verdiene som secrets
(`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`).
Ta vare på filen et trygt sted, for eksempel i en passordbehandler.

### 4. Bygg appen
GitHub → Actions → «Bygg og last opp app» → **Run workflow** → `android`.
Når den er ferdig (ca. 5 min): åpne kjøringen og last ned **android-aab-…** nederst. Pakk ut zip-filen, så får du `app-release.aab`.

### 5. Lukket test med 12 testere i 14 dager (krav for personlige kontoer)
1. Play Console → **Test og lansering** → **Testing** → **Lukket testing** → opprett et spor, for eksempel «Veierland-testere».
2. **Opprett utgivelse** → last opp `app-release.aab`. Godta **Play App Signing** (Google tar vare på den endelige signeringsnøkkelen).
3. Legg til minst **12 testere** (e-postadressene til Gmail-kontoene deres). Send dem lenken til testen. De må takke ja og ha appen installert i **14 dager**.
   Naboer på Veierland er perfekte testere.

### 6. Fyll ut butikksiden og appinnhold (mens testen pågår)
- **Hovedoppføring i butikken**: tekstene lenger ned, ikon `play-icon-512.png`, banner `play-feature-graphic.png` og telefonbildene `play-1…5`.
- **Appinnhold**:
  - Personvernregler: `https://jutoya.veierland.org/personvern.html`
  - Annonser: Nei · Apptilgang: alt er tilgjengelig uten innlogging
  - Innholdsvurdering: fyll ut spørreskjemaet (svar nei på alt) → «Alle»
  - Målgruppe: 13 år og eldre
  - **Datasikkerhet**: appen samler ikke inn og deler ikke data
  - Offentlig myndighetsapp: Nei · Finansielle funksjoner: Ingen · Helse: Nei · Nyhetsapp: Nei

### 7. Søk om produksjonstilgang og publiser
Etter 14 dager: **Oversikt** → **Søk om produksjonstilgang** og svar på spørsmålene om testingen. Google svarer vanligvis innen 7 dager.
Deretter: **Produksjon** → **Opprett utgivelse** → velg samme bygg (eller et nytt) → send til gjennomgang.

### Valgfritt: automatisk opplasting til Google Play
Når appen er godkjent kan GitHub laste opp nye versjoner selv. Lag en tjenestekonto i Google Cloud, gi den tilgang under
Play Console → **Brukere og tillatelser**, og legg JSON-nøkkelen inn som secret `PLAY_SERVICE_ACCOUNT_JSON`.
Da havner nye bygg som utkast under **Intern testing**, klare til å rulles ut.

---

## Senere oppdateringer

- **Nye rutetider**: trenger ingen ny app-versjon. Når rutetidene endres i koden og publiseres på nettsiden, henter appen dem automatisk (`/timetable.json`).
- **Endringer i selve appen**: øk versjonen i `package.json` (for eksempel `1.0.1`), kjør workflowen, og send inn den nye versjonen i begge butikkene.

---

## Butikktekster

### App Store

**Navn** (maks 30): `Veierland Ferge`

**Undertittel** (maks 30): `Rutetider og ferga live`

**Kampanjetekst** (maks 170):
> Neste ferge mellom Tenvik og Veierland med nedtelling, hele rutetabellen og ferga live på kartet. På iPad får du alt på én skjerm.

**Nøkkelord** (maks 100):
```
ferge,ferje,veierland,tenvik,tangen,engø,rutetider,båt,tønsberg,færder,nøtterøy,avgang,ais,jutøya
```

**Kategori**: Reise (primær), Navigasjon (sekundær) · **Aldersgrense**: 4+ · **Opphavsrett**: `2026 Andreas Harvik`

**Støtte-URL**: `https://harvik.no/ferry/`
**Personvern-URL**: `https://jutoya.veierland.org/personvern.html`
**Markedsførings-URL** (valgfri): `https://jutoya.veierland.org`

**Merknad til App Review** (engelsk):
> Unofficial timetable app for the passenger ferry between Tenvik and the island of Veierland in Norway. No login is required and all features are available immediately. Timetables are built into the app and can be updated from our server without app updates. The live ferry position comes from the Norwegian Coastal Administration's AIS service (BarentsWatch) via our own server; the "Ferga nå" card only appears while the ferry's AIS signal is available. On iPad the app shows two dashboards (Passasjer and Ferge) that you can swipe between. The app collects no personal data and contains no ads.

### Google Play

**App-navn** (maks 30): `Veierland Ferge`

**Kort beskrivelse** (maks 80):
> Neste ferge, rutetider og fergens posisjon for Veierland – Tenvik, Tangen, Engø.

**Kategori**: Reise og lokalt · **Kontakt-e-post**: `aharvik@gmail.com` · **Nettsted**: `https://jutoya.veierland.org`

### Beskrivelse (begge butikkene)

```
Veierland Ferge viser når neste ferge går mellom Tenvik, Vestgården, Tangen og Engø – med nedtelling, de neste avgangene og hvor ferga er akkurat nå.

• Neste avgang med en gang: klokkeslett, nedtelling og når du er fremme
• Ferga live på kartet: posisjon, fart og når den er ved neste kai
• Se andre båter i området på kartet
• Alle dagens avganger – og planlegg turen for i morgen eller en annen dag
• Hele rutetabellen til og fra Veierland for hverdag, lørdag og søndag
• Punktlighet: hvor ofte avgangene har gått i rute de siste dagene
• Bussforbindelser til og fra Tønsberg
• Tydelig merking av avganger som må bestilles, med ringeknapp til fergen
• Appen husker strekningen din
• Velg fargetema – også mørk modus
• Virker uten nett, og rutetidene oppdateres automatisk når de endres

På iPad får du alt på én skjerm, med to visninger du sveiper mellom:
• Passasjer: velg fra og til, og se avgangene og ferga på kartet ved siden av
• Ferge: fergedisplay med posisjon, neste anløp, vind, bølger, vannstand og farevarsler – og nattmodus med rødt lys

Appen er uoffisiell og ikke tilknyttet Jutøya AS eller Veierland Velforening. Ved tvil gjelder fergens egne oppslag. Fergens posisjon kommer fra BarentsWatch (Kystverket), vær, sjø og farevarsler fra Meteorologisk institutt og vannstand fra Kartverket.

Appen samler ikke inn personopplysninger, har ingen reklame og krever ingen innlogging.
```
