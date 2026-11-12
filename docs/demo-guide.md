# Demo guide

How to run the 3-minute pitch demo (see [plan.md](plan.md) for the story). Everything runs on one laptop.

## Before you go on stage (10 min)

1. **Start the app and the Coach** in `app/` (the Coach needs `app/server/.env` with `ANTHROPIC_API_KEY`):
   ```bash
   cd app && npm run dev        # web on http://localhost:5173, Coach on :8787
   ```
2. **Open two browser windows** at http://localhost:5173, with DevTools' device toolbar on (iPhone 14 Pro), or share a narrow window:
   - **Window A, Ingrid (Solo dancer):** the main story. Leave it on the first onboarding screen.
   - **Window B, Sara (Studio dancer):** prepare it beforehand in a **separate browser profile or a private window**, so its data is separate: onboard as *Sara*, *K-pop*, any goal, *Yes, I take classes*, then *Start practising*. Leave it on the Plan screen with the class space.
3. **Warm up once in window A:** go through Ingrid's flow below up to one demo Attempt, then *Start over*. This caches the pose model and the videos, so nothing downloads on stage.
4. Check the Coach: on that warm-up result, the line *“Taktvekteren is writing your feedback…”* should turn into Coach text within a few seconds. If it says *“Built-in text…”*, the Coach server is not running; the demo still works.
5. Turn the sound on: the Reference plays its music and the count-in clicks.

## The demo (about 3 minutes)

| Time | Do | Say |
|---|---|---|
| 0:00 | Window A. Onboarding: **Ingrid**, **K-pop**, **Learn a whole Choreography**, **20 min**, **Knees**, **No, I dance on my own** | “Ingrid is 34 and lives an hour from the nearest studio. Taktvekteren gets to know her: her goal, her time, and that her knee needs a gentle touch.” |
| 0:30 | Level check: **I don’t know yet**, then **See my Plan** | “She doesn’t know her Level, so she starts at Beginner. If she said a Level she would dance one move and we’d confirm or adjust it.” |
| 0:45 | Plan screen: point at the Parts and the knee | “Her Plan: a Choreography that fits her Level and goes easy on her knee, split into Parts.” |
| 0:55 | **Practise Part 1**, wait a second on the recording screen | “She practises Part 1 next to the Reference, mirrored, with the outline and a live match meter. Taktvekteren keeps the beat.” |
| 1:05 | **Use the demo Attempt** | “Here’s an Attempt she recorded earlier.” |
| 1:10 | Result: the Score, then the Plan card | “80. The rules, not the AI, decide the next step: on to Part 2. The Coach only explains it, in Taktvekteren’s voice.” (The Coach text arrives while you talk.) |
| 1:30 | Scroll to **Where to improve**, press **Play**, then tap a weak moment | “Her skeleton on her own video, next to the Reference. Coral joints are where she’s off; tap a weak moment to jump there.” |
| 1:50 | Scroll up to the share card, tap **Share your progress** | “She can share what she learned and how much she practised, never her Score. No leaderboards.” |
| 2:05 | Window B (Sara) | “Sara dances at Studio Nordlys. She gets this week’s Choreography from her teacher, a note, and a class challenge everyone wins by joining.” |
| 2:20 | **Practise Part 1**, **Use the demo Attempt**, point at **“39 of 50”** (38 + her round, if Sara has not practised before) | “Her round counts towards the class. Together, not against each other.” |
| 2:35 | Back to Plan, **What your teacher sees (preview)** | “Next step for studios: the teacher sees the class together, with consent. Never one Dancer’s Scores, never aches.” |
| 2:50 | Close | “All analysis happens on the phone; the video never leaves it.” |

Optional, if you have time: in window A, press **Go to the next step** and use the demo Attempt for Parts 2, 3 and the whole Choreography. Every step moves on, and finishing the whole Choreography shows confetti.

## Good to know

- **The demo Attempt** is `IMG_8824`, trimmed per Part to match the course clip (`IMG_8821`). Its poses are precomputed, so results are instant. Keep **Mirror the Reference** on: the trims were found with mirroring.
- **Live instead:** *Start recording* records with the webcam (dance along with the Reference), and *Upload a video instead* takes any clip and lets you trim it.
- **Start over** (bottom of the Plan screen) clears that window’s Dancer. It does not touch the other window if it is in another profile.
- **If the Coach is slow or down,** the built-in text stays and everything else works.
- **If something hangs,** reload the page: the Dancer’s Plan is kept on the device.

## Changing the clips

Put videos in `app/web/public/content/`, update `app/web/src/content/content.ts`, then precompute their poses (with `npm run dev` running):
```bash
cd app/web && npm run poses
```
The demo Attempt’s trims (`demoAttempt.trims` in the content file) must be found again for a new Reference or Attempt.
