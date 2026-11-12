# Insured Gains – AI-dansecoach

Lær en ny dans ved å sammenligne deg selv med en referansevideo. Appen finner kroppspositurene dine, synkroniserer dem med referansen, gir en score per kroppsdel og del av dansen, og en AI-coach skriver personlig tilbakemelding med growth mindset.

Hackathon-prototype. Dans er første sport; tanken er at samme motor skal fungere for andre idretter (for eksempel boksing) via sportsprofiler.

## Usecase 1: lær en dans

> Som bruker skal jeg kunne bruke tjenesten til å lære en ny dans eller bevegelse, og få personlig tilbakemelding for økten.

- Referansevideo mot din egen video
- Et enkelt move eller en hel koreografi
- Scoring og tilbakemelding
- Forbedring med growth mindset: sammenlign med deg selv, vis hva som sitter, gi ett tydelig neste steg

## Slik fungerer appen

1. **Ny referanse** – velg en dansevideo og klipp bort intro og avslutning.
2. **Klar til å øve** – appen analyserer referansen, sjekker bildekvaliteten (er hele kroppen synlig?) og deler dansen i biter à 4 sekunder. Velg «Hele» eller én del.
3. **Opptak** – kameraet åpnes speilvendt med en kontur av referansens startpositur og en måler for hvor godt du matcher. Nedtelling, så opptak. Du kan også laste opp en video i stedet.
4. **Analyse** – positurene dine hentes ut, synkroniseres med referansen og sammenlignes ledd for ledd. Et kort sammendrag sendes til AI-coachen.
5. **Resultat** – total score, endring fra forrige forsøk, score for armer, hofter og bein, «Dette sitter», score per del og fremgangsgraf.
6. **Tilbakemelding** – skjelett side om side med avvikende ledd i oransje, tidslinje med markører, og feilkort med tips, øvelse og «Øv på dette».

**Personvern:** video forlater aldri nettleseren. Pose-analysen kjører lokalt (MediaPipe). Bare et kompakt sammendrag (score, feil, tidspunkter) sendes til serveren for AI-teksten. Fremgang lagres i nettleserens `localStorage`.

## Kom i gang

Krever Node 24+.

```bash
# Nettappen
cd web
npm install
npm run dev          # http://localhost:5173

# AI-coachen (valgfri – uten den viser appen en ferdigskrevet standardtekst)
cd server
npm install
cp .env.example .env # fyll inn ANTHROPIC_API_KEY
npm run dev          # http://localhost:8787, Vite proxyer /api hit
```

Kamera krever `localhost` eller HTTPS. Bruk gjerne mobilvisning i DevTools; appen er laget for telefonbredde.

### Tester og kvalitet

```bash
cd web && npm test && npm run build && npx oxlint
cd server && npm test && npm run typecheck
```

## Arkitektur

```
Nettleser (web/)                                         Server (server/)
┌────────────────────────────────────────────────┐      ┌───────────────────────────┐
│ video → MediaPipe PoseLandmarker (33 punkter)  │      │ POST /api/feedback        │
│      → 8 leddvinkler per bilde                 │      │ zod-validering            │
│      → DTW-synkronisering mot referansen       │─────▶│ Claude (strukturert JSON) │
│      → score per ledd / kroppsdel / del        │ JSON │ headline, summary, tips   │
│      → feil (vedvarende avvik) + styrker       │◀─────│                           │
│ UI: React, skjelett på canvas                  │      └───────────────────────────┘
└────────────────────────────────────────────────┘
```

- **Positurer:** `@mediapipe/tasks-vision` i VIDEO-modus, 15 bilder/s, kjører på GPU i nettleseren.
- **Vinkler:** albuer, skuldre, hofter og knær (venstre/høyre). Vinkler i stedet for koordinater gjør sammenligningen uavhengig av kroppsstørrelse og avstand til kamera. Referansen kan speilvendes.
- **Synkronisering:** Dynamic Time Warping med Sakoe-Chiba-bånd, så det gjør ikke noe om du danser litt saktere eller raskere.
- **Score:** 0–100 per ledd fra gjennomsnittlig vinkelavvik langs DTW-stien (60° avvik = 0). Slås sammen til armer/hofter/bein og deler à 4 s.
- **Feil:** sammenhengende avvik over 25° i minst 0,3 s, rangert etter alvorlighet. Blir til norske tips som «Løft høyre arm høyere».
- **AI-coach:** Claude Opus 5.5 med strukturert output (zod), lav effort og server-side refusal-fallback. Faller tilbake til en lokal standardtekst hvis serveren ikke svarer.

### Mappestruktur

```
web/src/
  pose/        MediaPipe-uttrekk av positurer fra video
  analysis/    vinkler, DTW, score, deler, feil, kvalitet (rene funksjoner, testet)
  feedback/    sammendrag til AI-coachen + lokal standardtekst
  progress/    historikk per referanse i localStorage
  ui/          skjermene (steps/), opptak, skjelett, grafer
server/src/    feedback-endepunkt og prompt
```

## Bakgrunn og produktidé

### Er teknologien moden?

Ja. Kjeden pose-estimering → normalisering → tidssynkronisering → scoring → LLM-formulert tilbakemelding er moden og kjører på en telefon:

1. **Pose-estimering** på begge videoer (MediaPipe i nettleser/på enhet; RTMPose/ViTPose for høyere presisjon; 3D-løfting som MotionBERT for vinkeluavhengighet).
2. **Normalisering** – sammenlign leddvinkler, ikke rå koordinater.
3. **Tidssynkronisering** med DTW (for dans kan man også synke på beaten i musikken).
4. **Scoring** per ledd og del, pluss timing.
5. **Tilbakemelding** – strukturerte feil inn i en LLM, som formulerer coachingen.
6. **Visualisering** – skjelett side om side med fargede ledd. Det er dette som selger demoen.

### Dans vs. boksing

Dans er det enkle tilfellet: hele kroppen synlig, moderat tempo, tydelig referanse. Boksing er vanskeligere:

- **Fart:** et jab tar 100–200 ms; trenger 60+ fps, og håndledd blir uskarpe.
- **Dybde:** slag går mot kamera, som 2D-pose håndterer dårlig. Film fra siden eller bruk 3D.
- **Okklusjon:** hansker, garde foran ansiktet, armer som krysser.
- **«Riktig» er ikke imitasjon:** god teknikk handler om hofterotasjon, vektoverføring, hake ned, hånden tilbake. Krever sportsspesifikke regler i tillegg til den generelle sammenligningen.

Generelt mønster: **én sammenligningsmotor + en sportsprofil** (hvilke ledd teller, filmvinkel, regler, ordforråd for coachen). I prototypen er dette starten på: coachen kan velge hva som vektes.

### Konkurranse

Referanse-mot-deg-sammenligning finnes allerede i flere apper (f.eks. Dance Helper, DanceDrill, Move Mirror AI; for boksing Hands by KAYYO og Punch AI). «AI sammenligner deg med en trener» skiller seg derfor ikke ut alene. Vinklene vi har valgt:

- **Studio/gym først (B2B):** treneren laster opp en rutine én gang, hele klassen sender inn forsøk, og treneren får oversikt over hvem som sliter med hva.
- **Coaching, ikke bare score:** forklare *hvorfor* og gi en øvelse, med growth mindset.
- **Plattform for flere idretter:** trenere kan definere egne sportsprofiler.

### Tre lag i produktet

| Lag | Hva | Status i prototypen |
|---|---|---|
| **Analyze** | Score, feil per ledd, tips og øvelser | Bygget |
| **Protect** | Teknikkvarsler (f.eks. knær som faller innover i landing, låste albuer), formfall utover økten | Grunnlag finnes (feil per ledd, kvalitetssjekk); egne risikoregler gjenstår |
| **Connect** | Matching av treningspartnere i studioet ut fra komplementære styrker og svakheter | Kun i mockups |

**Studio først:** matching fungerer når medlemmene deler sted, tidspunkt og nivå; studioet betaler (SaaS per lokasjon eller aktivt medlem); trenerne står for trygghet og lager referanseinnholdet.

### Regulatorisk og personvern

- **Ikke si «forebygger skader».** Påstander om å forebygge, forutsi eller diagnostisere skader kan gjøre produktet til medisinsk utstyr under EUs MDR (gjelder i Norge via EØS). Bruk «teknikkvarsel» og «tren tryggere», og ha en ansvarsfraskrivelse. Sjekk også EUs AI Act hvis det berører helse.
- **GDPR:** video av kropper og helsenære data kan være særlige kategorier. Analyse på enheten og at kun sammendrag sendes er et sterkt salgsargument.

## Mockups

Mockups for studio-flyten, egen referanse (uten studio) og coach-dashboard ble laget med inspirasjon fra Mobbin (Bevel, Runna, pliability, Equinox+, YouTube timed comments):
https://claude.ai/artifact/TsyoYCauALtzGTJiJCnQ8v (privat – be eieren dele den).

## Status og veien videre

Ferdig: hele den individuelle flyten (referanse → del → opptak/opplasting → analyse → resultat → tilbakemelding), fremgang over forsøk, kvalitetssjekk og AI-coach.

Gjenstår:
- Velge danser når flere personer er i videoen (følge én person over tid)
- Oppdeling etter takten i musikken i stedet for faste 4 s
- Timing som eget mål (hvor mye før/etter takten)
- Risikoregler for «Protect»-laget og sportsprofil for boksing
- Studio-delen: coach-dashboard, klasser og partnermatching
