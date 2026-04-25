# LARK UI Redesign — "Forest Floor"

**Dato:** 2026-04-25  
**Status:** Godkjent

## Sammendrag

Fullstendig visuelt redesign av LARK-applikasjonen. Alle eksisterende komponenter erstattes med nytt design i "Forest Floor"-registeret — dype grønne mørketoner, glassmorphism-paneler, og en distinkt naturinspirert estetikk som skiller seg fra generiske GIS-verktøy. Funksjonalitet og datamodell forblir uendret.

---

## Designsystem

### Farger

| Token | Verdi | Bruk |
|---|---|---|
| `bg-base` | `#030904` | Innlogging, dypeste bakgrunn |
| `bg-app` | `#060e05` | App-bakgrunn, konfig-side |
| `bg-surface` | `rgba(5,12,4,0.90)` | Panel, drawer, kort |
| `bg-topbar` | `rgba(4,10,4,0.92)` | Topplinje |
| `border-subtle` | `rgba(200,240,174,0.07)` | Kortgrenser |
| `border-active` | `rgba(200,240,174,0.14)` | Aktiv tilstand |
| `accent` | `#c8f0ae` | Logo, primærknapper, aktive elementer |
| `accent-dim` | `#8ab870` | Sekundær tekst, ikoner |
| `accent-muted` | `#4a7040` | Tersier tekst |
| `accent-ghost` | `#2e4a26` | Labels, section-titler |
| `accent-deep` | `#1e3418` | Dempede elementer |
| `action-bg` | `#1a4a10` | Primær handlingsknapp (Lagre, etc.) |

### Typografi

- **Font:** Inter (eksisterende)
- **Logo/wordmark:** 900 weight, letter-spacing 0.2–0.42em
- **Section labels:** 0.58–0.62rem, 700 weight, letter-spacing 0.12–0.13em, uppercase
- **Body:** 0.72–0.84rem, 400 weight
- **Knapper:** 0.68–0.88rem, 600–700 weight

### Glassmorphism-register

Alle flytende elementer (panel, zoom-knapper) bruker:
```css
background: rgba(5,12,4,0.90);
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);
border: 1px solid rgba(200,240,174,0.08);
box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 1px 0 rgba(200,240,174,0.04) inset;
```

---

## Seksjon 1 — Innloggingsside

### Godkjent design
- Fullskjerm mørk bakgrunn `#030904`
- Løvblad-SVG-ikon over LARK-logoen
- To langsomme, animerte radiale glød-blobs (12s og 15s ease-in-out infinite alternate)
- 32px subtilt rutenett: `rgba(200,240,174,0.028)`
- Radiell vignett-overlay
- LARK-wordmark: 3.6rem, 900 weight, letter-spacing 0.42em, tekstskygge `0 0 60px rgba(200,240,174,0.15)`
- Tagline: "Landskapsplanlegger", 0.62rem, `#2e5226`, letter-spacing 0.28em
- CTA-knapp: maks 280px bred, `#c8f0ae` bakgrunn, `#060e05` tekst, border-radius 10px, boks-skygge

### Fjernet fra eksisterende
- Beskrivelsestekst ("Tegn, klassifiser og lagre...")
- Footer-note ("Kartlag lagres automatisk...")

---

## Seksjon 2 — Kartvisning

### Topplinje
- Høyde: **48px** (ned fra 54px)
- Bakgrunn: `rgba(4,10,4,0.92)` med `backdrop-filter: blur(12px)`
- Venstre: løvblad-SVG + "LARK" + vertikal skillelinje + prosjektnavn
- Høyre: brukernavn + "⚙ Innstillinger"-knapp + "Logg ut"-knapp
- Border-bottom: `1px solid rgba(200,240,174,0.06)`

### Flytende panel (høyre)
- Bredde: **264px** (opp fra 256px)
- Posisjon: `top: 62px; right: 14px`
- Glass-stil (se glassmorphism-register over)
- Border-radius: 13px
- Seksjoner: **Kartlag** → **Tegning** → **Bakgrunnskart**
- Section-labels: 0.58rem, 700 weight, letter-spacing 0.13em, `#2e4a26`
- Lagknapper: mørke glassknapper med fargeswatch

### Minimering av panel
- Panelet kan kollapse til en **ikonstripe** (38px bred)
- Kollapset viser: chevron-pil, skillelinje, fargepunkter per lag, tegnverktøy-symboler
- Toggle: chevron-knapp øverst i stripa (`›` / `‹`)
- Animasjon: CSS transition på `width`

### Zoom-knapper
- 32×32px, glass-stil, border-radius 7px
- Posisjon: `top: 64px; left: 14px`

### Innlastingsindikator
- Liten flytende pill nede til venstre (ikke senter-overlay)
- Glass-stil, spinner + statustekst
- Blokkerer ikke kartet

### Esri-attribusjon
- Glass-pill, `rgba(5,12,4,0.7)`, diskret plassering nede til høyre

---

## Seksjon 3 — Konfigurasjonsside

### Layout
- Fullskjerm (ikke drawer — gir rom for fremtidig vekst)
- **Topplinje:** identisk med kartvisning, men subtitle viser "Innstillinger" og høyre-knapp er "← Tilbake til kart"
- **Layout:** venstre navigasjonsmeny (200px) + høyre innholdsområde (flex: 1)

### Venstre navigasjonsmeny
- Bakgrunn: `rgba(3,8,3,0.6)`, border-right: `1px solid rgba(200,240,174,0.05)`
- Aktiv item: `background: rgba(200,240,174,0.06)`, `border-left: 2px solid #4a9030`
- Nav-seksjoner (eksisterende + planlagte):
  - **Generelt** (aktiv)
  - **Datamodell**
  - Symbolikk *(fremtidig)*
  - Eksport *(fremtidig)*
  - Deling *(fremtidig)*
  - Integrasjoner *(fremtidig, dempet)*
  - Rapporter *(fremtidig, dempet)*

### Innholdsområde
- Padding: `2rem 2.5rem`
- Seksjonsoverskrift (h1) + beskrivelse
- Innhold i mørke kort: `background: rgba(200,240,174,0.03)`, `border: 1px solid rgba(200,240,174,0.07)`, `border-radius: 11px`
- To-kolonne grid innad i kort der det passer
- Lagreknapp + bekreftelsesmelding i bunnen

### Innhold per nav-seksjon
- **Generelt:** Applikasjonsnavn, Prosjektnavn, Koordinatsystem — kortbasert, to-kolonne der det passer
- **Datamodell:** Beholder eksisterende DataModelGraph (SVG orbital graf) + laglistevisning (LayerRow med drag-reorder, toggle, ikon, domene-editor) + AddCustomLayerForm. Alt restylet til mørkt register.
- Øvrige seksjoner er ikke-klikkbare placeholders i denne omgangen

---

## Filer som skal omskrives

| Fil | Endringer |
|---|---|
| `src/App.css` | Fullstendig omskriving til nytt designsystem |
| `src/components/LoginPage.jsx` | Løvblad-ikon, animerte blobs, rutenett, vignett, fjerne tekster |
| `src/components/MapView.jsx` | Ny topplinje (48px, løvblad, skillelinje), innlastingspill, glass-attribusjon |
| `src/components/EditPanel.jsx` | Glass-panel, ny section-label-stil, ikonstripe-kollaps |
| `src/components/ConfigPage.jsx` | Venstre nav-meny, mørk fullskjerm, kortbasert innhold |

---

## Utenfor scope

- Funksjonalitet, datamodell og ArcGIS-integrasjoner endres ikke
- Ingen nye features implementeres i denne omgangen
- Fremtidige konfig-seksjoner (Symbolikk, Eksport osv.) er ikke-klikkbare placeholders
