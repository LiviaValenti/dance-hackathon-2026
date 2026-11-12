# App

The merged dance-learning app, started as a copy of `insured-gains/` ([ADR 0002](../docs/adr/0002-one-app-folder-originals-frozen.md)). See [docs/plan.md](../docs/plan.md) for the build order and [GLOSSARY.md](../GLOSSARY.md) for terms.

All pose analysis runs in the browser; video never leaves the device ([ADR 0001](../docs/adr/0001-pose-analysis-on-device.md)). Only a compact summary (Scores, faults, timestamps) is sent to the Coach.

## Getting started

Requires Node 24+. After installing (below), `npm run dev` in `app/` starts the web app and the Coach server together.

```bash
# Web app
cd web
npm install
npm run dev          # http://localhost:5173

# Coach server (optional: without it the app shows built-in text)
cd server
npm install
cp .env.example .env # fill in ANTHROPIC_API_KEY
npm run dev          # http://localhost:8787, Vite proxies /api here
```

The camera needs `localhost` or HTTPS. The app is designed for phone width; use mobile view in DevTools.

## Tests and quality

```bash
cd web && npm test && npm run build && npx oxlint
cd server && npm test && npm run typecheck
```

## Deploy (Vercel)

`app/` is the Vercel project root: the static web app is built from `web/`, and the Coach runs as a serverless function (`api/feedback.ts`, sharing `server/src/handler.ts` with the local server).

```bash
cd app
npx vercel login          # once
npx vercel                # first time: link the project (root directory: app), then preview deploy
npx vercel env add ANTHROPIC_API_KEY   # optional: without it the app uses built-in Coach text
npx vercel --prod
```

The camera needs HTTPS, which Vercel provides. Backup for the pitch: `npm run dev` in `web/` (and `server/`) on a laptop.

## Layout

```
web/src/
  text.ts         all app text, in English: edit wording here, not in the screens
  content/        the content file: styles, Levels, Level-check moves, Choreographies, Parts, Tempo
  mascot/         Taktvekteren: settings (name, tone, look) and the animated SVG
  profile/        onboarding answers
  levelcheck/     the Level check rule (pure, tested)
  plan/           the Plan rule, Choreography choice and Attempt history (pure rules, tested)
  practice/       loading References, analysing Attempts, count-in metronome
  pose/           MediaPipe extraction, person selection and following a chosen dancer
  analysis/       angles, DTW, Score curve, Parts, timeline, faults, quality (pure, tested)
  feedback/       summary for the Coach + built-in fallback text
  store/          on-device storage (IndexedDB, ADR 0003)
  ui/             screens: onboarding, levelcheck, studio, plan, practice, own (upload any video)
server/src/       Coach prompt, request schema and handler
api/              Vercel function for the Coach
```

## Known gaps

- The References are the team's test clips (`my-reference.mov` for the Level check, `course.mov` for every Choreography). Their Tempo (73) is an estimate from the audio. They are HEVC `.mov`, which plays in Safari and Chrome on macOS but not reliably in Android Chrome; final References should be H.264 `.mp4`.
- The Level check and Plan thresholds are first guesses (docs/plan.md).
