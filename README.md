# MOVE / Dance studio lab

Mobile-first browser demonstration in Norwegian. Vite, TypeScript, Three.js, Lucide and MediaPipe Pose Landmarker. Camera images and uploaded clips are processed on the device; there are no accounts, telemetry or video uploads.

## Run

```sh
npm install
npm run dev
npm test
npm run build
```

The pose model and MediaPipe WASM runtime must exist under `public/models` and `public/vision`. They are served locally with the application. Apart from video links the user pastes, Google Fonts is the only optional external runtime request; system sans-serif fallbacks work offline. Dependencies and the model initially require network access to install/download.

Camera access requires localhost or HTTPS. For a physical mobile device, expose the development server through a trusted HTTPS connection. A plain LAN HTTP address will not grant camera access in most mobile browsers. Test both iOS Safari and Android Chrome before release.

## Implemented

- Stylized procedural 3D practice sequence inspired by the Bart Simpson step. This is not an instructor-validated dance demonstration.
- Demonstration, segment practice and full run-through, speed, mirroring and optional synthesized metronome.
- Real MediaPipe camera tracking, skeleton overlay, confidence-gated movement similarity and coarse timing estimates.
- Local analysis of a user-selected 1–40 second video (up to 100 MB). With several people in view (up to 6 detected per frame), the person nearest the middle is chosen and followed from frame to frame; the live camera does the same (up to 4). Small or partly hidden people in a crowd may not be detected, so the person in the middle should be clearly visible. Samples eight joint angles at 10 Hz and suggests continuous practice segments around lower-motion frames. Each segment is labelled and given a tip from which joint groups (arms, legs) move most in that part. No semantic recognition of dance steps.
- Part-whole lesson plan for uploaded choreographies: learn part 1, part 2, combine, and so on, ending with the full run-through.
- Video links: a pasted https link to a video file (.mp4/.webm, up to 100 MB) is downloaded by the browser and analysed like an uploaded file. The host must allow cross-origin reads (CORS). YouTube, TikTok, Instagram and similar services do not, and the app deliberately has no server-side downloader, so those links are rejected with an explanation.
- Level/goal preferences, local session history, comparison with the previous session and repetition of measured difficult segments.
- Optional local camera-only recordings using MediaRecorder and IndexedDB, playback/download and deletion of saved data.
- Camera stops when leaving the studio or backgrounding the app. Explicit age confirmation (12+) and separate recording opt-in.

## Limits and release gates

This prototype does **not** deliver reliable automatic dance instruction from arbitrary videos. It extracts motion and proposes segments with generic tips based on measured movement, not technique explanations. A real instructional system needs validated reference content, semantic action recognition, beat alignment and expert evaluation. Similarity is based on 2D joint angles; perspective, occlusion, anatomical variation and phase ambiguity can affect scores. Timing is a local best-match phase estimate, not musical rhythm scoring. Static reference intervals have no timing score. Personal expression is not independently assessed.

The application cannot guarantee injury prevention or assess individual physical safety. It provides general safety advice only. Clinical/instructor validation is required before adding safety alerts.

Age self-confirmation is not age verification or a complete child-privacy compliance solution. Before public release, conduct a child-safety/privacy assessment, accessibility audit and real-device validation, and define guardian/consent rules for the intended jurisdictions. No demo scores or artificial historical results are seeded.

Uploads are held only for the current page session. Session results and opted-in recordings persist in the current browser, subject to storage quotas and browser eviction. There is no cloud backup or service-worker/offline installation support. Do not load untrusted scripts into this origin; local storage is accessible to same-origin code.
