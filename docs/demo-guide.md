# Demo guide

How to run the 3-minute pitch demo (see [plan.md](plan.md) for the story). Everything runs on one laptop.

## Before you go on stage (10 min)

1. **Start the app and the Coach** in `app/` (the Coach needs `app/server/.env` with `ANTHROPIC_API_KEY`):
   ```bash
   cd app && npm run dev        # web on http://localhost:5173, Coach on :8787
   ```
2. **Open the app** at http://localhost:5173 in Chrome, with DevTools' device toolbar on (iPhone 14 Pro) or a narrow window, so it looks like a phone.
3. **Warm up once:** go through the flow below up to the result, then *Start over* (bottom of the Plan screen). This caches the pose model and the videos, so nothing downloads on stage.
4. Check the Coach: on that warm-up result, the line *“Taktvekteren is writing your feedback…”* should turn into Coach text within a few seconds. If it says *“Built-in text…”*, the Coach server is not running; the demo still works.
5. Turn the sound on: the Reference plays its music and the count-in clicks.

## The demo (about 3 minutes): Ingrid, a Solo dancer

| Time | Do | Say |
|---|---|---|
| 0:00 | Onboarding: **Ingrid**, **K-pop**, **Learn a whole Choreography**, **20 min**, **Knees**, **No, I dance on my own** | “Ingrid is 34 and lives an hour from the nearest studio. Taktvekteren gets to know her: her goal, her time, and that her knee needs a gentle touch.” |
| 0:30 | Level check: **I don’t know yet**, then **See my Plan** | “She doesn’t know her Level, so she starts at Beginner. If she named a Level, she’d dance one move and we’d confirm or adjust it.” |
| 0:45 | Plan screen: point at the Choreography, its Parts and the knee | “Her Plan: a Choreography that fits her Level and goes easy on her knee, split into Parts she can learn one by one, or all at once.” |
| 0:55 | Tap **Whole Choreography**, wait a second on the recording screen | “She dances next to the Reference, mirrored, with an outline and a live match meter. Taktvekteren keeps the beat.” |
| 1:05 | **Use the demo Attempt** | “Here’s an Attempt she recorded earlier.” |
| 1:10 | Result: the Score, confetti, the Plan card | “88, and she’s finished the whole Choreography. The rules, not the AI, decide the next step. The Coach only explains it, in Taktvekteren’s voice.” (The Coach text arrives while you talk.) |
| 1:30 | Scroll to **Score per Part** and the body areas | “The full overview: every Part above 85, legs and hips spot on, arms are where to grow.” |
| 1:45 | Scroll to **Where to improve**, press **Play**, then tap a weak moment | “Her skeleton on her own video, next to the Reference. Coral joints are where she’s off; tap a weak moment to jump straight there, with a tip and a drill.” |
| 2:15 | Scroll up to the share card, tap **Share your progress** | “She can share what she learned and how much she practised, never her Score. No leaderboards, only her own Ghost.” |
| 2:35 | Close | “Everything runs on the phone; the video never leaves it. Next: studios and community.” |

**Optional extras if there is time:** tap **Part 1** instead of the whole Choreography to show the Part-by-Part Plan (every Part scores 80 or more and moves on). For the studio story, *Start over* and answer *Yes, I take classes*: Studio Nordlys’ class space, the class challenge and the teacher preview.

## Good to know

- **The demo Attempt** is `IMG_8824`, trimmed per Part to match the course clip (`IMG_8821`). Its poses are precomputed, so results are instant. Keep **Mirror the Reference** on: the trims were found with mirroring.
- **Live instead:** *Start recording* records with the webcam (dance along with the Reference), and *Upload a video instead* takes any clip and lets you trim it.
- **Start over** (bottom of the Plan screen) clears the Dancer, so you can run the demo again.
- **Any item can be practised directly** from the Plan screen; the Plan rules continue from there.
- **If the Coach is slow or down,** the built-in text stays and everything else works.
- **If something hangs,** reload the page: the Dancer’s Plan is kept on the device.

## Changing the clips

Put videos in `app/web/public/content/`, update `app/web/src/content/content.ts`, then precompute their poses (with `npm run dev` running):
```bash
cd app/web && npm run poses
```
The demo Attempt’s trims (`demoAttempt.trims` in the content file) must be found again for a new Reference or Attempt.
