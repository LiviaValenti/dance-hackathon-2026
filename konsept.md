# Hackathon 2026: Dansecommunity-app

## Visjon
«Dans deg smartere» (anti brain rot). Et trygt og inkluderende community og treningsverktøy for dansere. Essensen er danseglede, deling og læring, ikke konkurranse.

## Beslutninger (fra grill-sesjon)

| Tema | Beslutning |
|---|---|
| Primær målgruppe (MVP) | Hobbydansere som danser i studio |
| Senere segmenter | Eldre (rolig, vondter), barn (samtykke/personvern), folk med skader |
| Forretningsmodell | Freemium for dansere (premium AI coach) + studio-lisens (dashboard) |
| Kvalitetsmåling | Telefonkamera + pose estimation, sammenlignet med referansevideo |
| Plattform | Mobil/PWA |
| Demo-kjerne | Personlig tracking + AI coach |
| Demo-format | End-to-end flyt på 3 min: onboarding → logg økt med kamera → ghost-score → coach foreslår neste steg |
| Gjensidige-vinkel | Skadeforebygging + livsmestring/velvære |

## Brukerhistorie
Som bruker vil jeg være del av en community (vennegruppe/studio) eller lage mitt eget space.

## Personlig tracking (MVP-kjerne)
- Timer per uke
- Kvalitetsscore: hvor presist du danser en koreografi (pose estimation)
- Nye steg lært
- Mål:
  - Danse så ofte
  - Lære så mye av en koreografi
  - Nå en viss kvalitet på en koreografi
- Progresjon: «Nå som jeg kan disse stegene, hvilke koreografier kan jeg lære videre?»
- **Ghost-runner:** sammenlign deg bare med deg selv

## Anti-toxic prinsipper
1. Ingen offentlige leaderboards eller rangering. Kun selv-sammenligning (ghost).
2. Kvalitetsscore er privat som standard. Deling er opt-in.
3. Det som deles er innsats og danseglede (timer, nye steg), ikke prestasjon.
4. Samarbeids-challenges der alle vinner ved å delta.
5. Influencer-profiler: «blest» gis for bidrag og delegleden (egne koreografier, hjelp til andre), ikke ferdighetsnivå.

## Community (SoMe for dansere)
- Dele økter, stats og studiotilhørighet
- Bidra med egne koreografier
- Trend-danser: «Prøv en dance challenge! Kom og dans med oss senere.»
- «Andre som deg»: danser ved samme studio, samme stilart i samme område («hip hop i Oslo»), keen på å øve sammen

## AI coach
Input: alt fra onboarding. Oppgaver:
- Anbefale progresjon (neste steg/koreografi)
- Hjelpe med målsetting
- Teknikk-feedback fra video
- Tilpasse til pains og begrensninger (vondter, alder, skader, lite tid)

## Maskot: Leo, danseløven
- Appens maskot og stemmen til AI-coachen
- Heier på innsats, gir feedback med growth mindset («ikke ennå»), minner om oppvarming og hvile, og dukker opp i felles challenges og feiringer
- Dømmer aldri og sammenligner aldri brukere med hverandre

## Onboarding
Leo stiller spørsmålene. Hvert steg forklarer hvorfor vi spør. Alt utenom navn kan hoppes over. Skisser: [skisser-uc2.html](skisser-uc2.html) (O1–O8).

| Steg | Data | Brukes til |
|---|---|---|
| O1 Velkommen | – | Leo presenterer seg, setter tonen |
| O2 Om deg | Navn, aldersgruppe, sted | Tempo og oppvarming, «Andre som deg». Under 13 krever foresatt |
| O3 Erfaring | År danset, stilarter, studio | Nivå på forslag, studio-space |
| O4 Mål | Danse oftere (frekvens), lære koreografi, presisjon, gøy og avkobling, finne dansevenner, tilbake etter skade | Personlig plan og mål |
| O5 Hverdagen («dine pains») | Tid per økt, har barn, lite tid, lite plass, må danse stille, nervøs, vondter | Øktlengde, type moves, privat som standard |
| O6 Kroppen | Kroppskart med vondter/skader og intensitet | Skånsomme moves og skadeforebygging. Eget samtykke, aldri til studio på individnivå |
| O7 Samtykke | Per formål: Leo, helseinfo, anonym studiostatistikk, studio ser fremgang, synlig i «Andre som deg» | Mest private valg som standard |
| O8 Planen din | – | Oppsummerer hvordan svarene brukes, første forslag og studiogruppe |

## Data til dansestudioer
- Hva elevene synes er vanskelig
- Hva de er gode på
- Hvem som øver mye/lite
- Onboarding-info

**Personvern:** studioet ser aggregert data som standard. Individdata kun med eksplisitt samtykke fra brukeren. Helseinfo (vondter/skader) er særlig sensitivt.

## Gjensidige-vinkel
- Skadeforebygging: 8 av 10 profesjonelle dansere skader seg årlig. Belastningsoppfølging, oppvarming og hvile via tracking og coach.
- Livsmestring/velvære: fellesskap, bevegelsesglede, mental helse.

## Kundesegmenter (på sikt)
- Eldre: mindre motorikk, roligere tempo, vondter
- Barn
- Folk med skader

## Åpne spørsmål
- Hvilken pose estimation-modell (MediaPipe vs MoveNet) og hvilke referansekoreografier har vi?
- Hvordan beregnes score (vinkler, timing)?
- Prising for premium og studio-lisens
- Rettslig grunnlag for helsedata (GDPR, særlige kategorier)
- Aldersgrense og samtykke for barn
- Skal forsikringsdata være en del av visjonen? (ikke valgt, sensitivt)
