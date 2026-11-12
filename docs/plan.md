# Plan: one app from four repos

Outcome of the grill-with-docs session on 2026-11-12. Terms are defined in [GLOSSARY.md](../GLOSSARY.md); hard-to-reverse decisions are in [docs/adr/](adr/).

## Goal

A demo for the hackathon pitch that is built to grow into a real product. Everything in the flow below is built for real, not faked.

## Who it's for, and the pains

Two target groups: **Studio dancers** (practise between classes) and **Solo dancers** (no studio nearby). The pains:

1. Few dance services where you live.
2. It's hard to learn alone from videos.
3. It's hard to know your own Level.

So the experience must be tailored: a Level check, and a Plan built from Level, goals, time and aches.

## Demo flow (about 3 minutes)

Main story: **Ingrid**, 34, a Solo dancer in a small town, an hour from the nearest studio.

1. **Onboarding with Taktvekteren:** name, style, goal, time per session, aches, and "Do you dance at a studio?"
2. **Level check:** she states her Level and dances one move at that Level. The rule confirms it or moves her up or down one Level.
3. **Plan:** a Choreography that fits her Level, split into Parts. Aches steer which moves are chosen.
4. **Practise a Part:** mirrored, slowed down, with an outline and a live match meter. Taktvekteren dances to the Tempo.
5. **Feedback:** Score per body area, compared with her Ghost; the skeleton side by side; a timeline of weak moments.
6. **The Coach explains the next step**, which the rules have chosen, in Taktvekteren's voice.

**Studio branch** (about 20 seconds): answering "yes" to studio leads to "this week's choreography from Studio Nordlys", with no Level check, then the same steps 3–6.

## Decisions

| # | Decision |
|---|---|
| Base | All analysis on the device; video never leaves the phone ([ADR 0001](adr/0001-pose-analysis-on-device.md)) |
| Code | `app/` built on insured-gains; the original folders are frozen ([ADR 0002](adr/0002-one-app-folder-originals-frozen.md)) |
| Data | No accounts; everything stored on the phone; studio Choreographies are bundled ([ADR 0003](adr/0003-no-accounts-studio-content-bundled.md)) |
| Coach | Fixed rules change the Plan; the Coach only phrases it; it never diagnoses ([ADR 0004](adr/0004-rules-decide-coach-phrases.md)) |
| Language | English everywhere: app text in one file; code uses the glossary terms |
| Level check rule | Score 85 or more on the stated Level's move → one Level up; 50–84 → confirmed; below 50 → one Level down; "don't know" → start at Beginner. The Dancer can override. Levels for the demo: Beginner, Intermediate, Advanced |
| Plan rule | 80 or more → next Part (or combine); 60–79 → repeat; below 60 → repeat at 75% speed; below 60 three times → an easier Choreography at the same Level |
| Score | insured-gains' engine with new-chapter's curve: full marks within 10°, falling to 0 at 55°. Timing is not scored yet |
| Mascot | **Taktvekteren** ("keeper of the beat"): an original watchman with a staff and a lantern, inspired by (but not) the Gjensidige logo figure. Name, look and tone are settings. The logo file never goes in the repo |
| Rhythm | Each Reference stores its Tempo; Taktvekteren and the metronome follow it, including when slowed down |
| References | Filmed by the team (rights owned). Content is defined in one data file. love119 clips are placeholders until then |
| Look | "Dance floor in daylight": cream `#FFF8EE`, cobalt `#2347D9`, lantern yellow `#FFC93C`, coral `#FF6B5B`, mint `#3DD6A3`; a bold rounded display font; the app pulses to the Tempo during practice; confetti on completion; honours reduce-motion; 4.5:1 text contrast |
| Hosting | Vercel (static web app + coach as a serverless function), laptop on `localhost` as backup |

## Scope

**In:** selecting one person when several are in view (poc-dance, new-chapter), the part-by-part lesson plan, slow motion and mirroring (poc-dance), the timeline of weak moments (new-chapter), the recording quality check (insured-gains).

**Out:** 3D figure as a Reference, 3D pose inspector and 3D scoring, group scoring, YOLO, saved recordings of yourself, pasting video links (the planned route for teacher sharing later), use case 2 community and use case 3 stats (shown as next steps in the pitch).

## Build order

1. `app/` from insured-gains, running; translated to English; text in one file.
2. New theme; Taktvekteren as an SVG with Tempo-synced motion.
3. Content file (References, Levels, Parts, Tempo) with placeholder clips.
4. Scoring curve change; port person selection and the timeline of weak moments.
5. Onboarding, with the studio question.
6. Level check and its rule.
7. Plan with its rules, Parts, slow motion and mirroring.
8. Feedback with the Ghost; Coach prompt in Taktvekteren's voice, wired to the Plan's decision.
9. Studio branch.
10. Deploy to Vercel; test on iOS Safari and Android Chrome.

Each rule (Level check, Plan, Score curve) is a pure function with tests.

## Needed from the team

- **Rough clips as soon as possible** (any team member, 20–40 seconds, full body, from the front, good light), then the five final References: three Level-check moves, Ingrid's Choreography and the studio Choreography, each with its music's Tempo.
- **A Claude API key** for the Coach (the app works without it, using built-in text).
- **A Vercel login**: run `npx vercel login` once.

## Known gaps

- `use-case-2-research/konsept.md` still describes Leo and a studio-first target group. It is frozen history; this plan and the glossary take precedence.
- The Level check and Plan thresholds are first guesses, to be tuned on the team's real Attempts.
