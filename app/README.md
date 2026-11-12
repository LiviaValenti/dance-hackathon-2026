# App

The merged dance-learning app, started as a copy of `insured-gains/` ([ADR 0002](../docs/adr/0002-one-app-folder-originals-frozen.md)). See [docs/plan.md](../docs/plan.md) for the build order and [GLOSSARY.md](../GLOSSARY.md) for terms.

All pose analysis runs in the browser; video never leaves the device ([ADR 0001](../docs/adr/0001-pose-analysis-on-device.md)). Only a compact summary (Scores, faults, timestamps) is sent to the Coach.

## Getting started

Requires Node 24+.

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

## Layout

```
web/src/
  text.ts      all app text, in English: edit wording here, not in the screens
  pose/        MediaPipe pose extraction from video
  analysis/    angles, DTW, Score, Parts, faults, quality (pure functions, tested)
  feedback/    summary for the Coach + built-in fallback text
  progress/    Attempt history per Reference in localStorage
  ui/          screens (steps/), recorder, skeleton, charts
server/src/    feedback endpoint and Coach prompt
```
