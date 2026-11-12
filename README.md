# 🩰 Dance Score

**AI-powered dance scoring with real-time stick-figure overlay feedback.**

Upload a reference dance, then upload your attempt — get an instant per-joint score with a skeleton overlay showing exactly where you deviated from the baseline.

## How It Works

1. **Pose Extraction** — MediaPipe Pose detects 14 body joints (shoulders, elbows, wrists, hips, knees, ankles, neck, nose) at 12fps from both videos
2. **DTW Alignment** — Dynamic Time Warping aligns the baseline and attempt frame-by-frame, so being 0.5s late on a move doesn't tank your score
3. **Angle Scoring** — Each frame becomes 9 joint angles (position/scale invariant). Per-joint mean angular error maps to a 0-100 score via cosine falloff (≤10° = 100, ≥55° = 0)
4. **Stick-Figure Overlay** — Baseline skeleton (green) and attempt skeleton (orange) rendered on the attempt video for visual comparison
5. **Focus Area** — The worst-scoring joint is highlighted so the dancer knows exactly what to practice
6. **Coaching Feedback** — `scoring.feedback()` turns the scores into growth-mindset coaching: an encouraging headline, what you do well, up to two fixes with a direction (e.g. "Bend your left knee more - get lower", from whether your angle is larger or smaller than the reference), a timing tip, and the moment to practise

## Score Breakdown

| Component | Weight |
|-----------|--------|
| Form (joint angles) | 75% |
| Timing (rhythm accuracy) | 25% |

## Quick Start

```bash
# Install dependencies (Python 3.10–3.12; mediapipe 0.10.x has no wheels for newer Python)
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# CLI scoring
python score.py baseline.mp4 attempt.mp4

# Web demo (mobile-friendly)
cd web
pip install -r requirements-web.txt
uvicorn app:app --host 0.0.0.0 --port 3081
```

Then open `http://localhost:3081` on your phone or browser.

### Try it with the sample videos

`samples/` has a matching pair of short clips of the same choreography:

```bash
python score.py samples/love119-reference.mov samples/love119-attempt.mov
```

In the web app: **Add** `love119-reference.mov` as a baseline, then **Score** it against `love119-attempt.mov`.

### Group videos (several dancers)

`multi_pose.py` finds and follows every dancer in one video, scores each against an optional reference, and gives a **sync with group** score (how closely each dancer matches the others):

```bash
python multi_pose.py samples/love119-group.mov --reference samples/love119-reference.mov
# --people 3 to set the number of dancers (default: auto-detect)
# → prints a score and coaching feedback per dancer and writes samples/love119-group.tracked.mp4
```

Every dancer gets their own feedback. Without `--reference`, each dancer is compared with the dancer most in sync with the group.

How it works: MediaPipe's pose model follows one person, so a person detector (EfficientDet) first finds a box per dancer. Each dancer keeps a fixed ID by matching boxes frame to frame. When the detector misses someone, their box follows their own skeleton instead. Pose is then estimated inside each dancer's box. Models download into `models/` on first run.

## Web Features

- **Dance Library** — save baseline dances with instant pose pre-processing on upload
- **Score Page** — pick a baseline from the library or upload custom, then upload your attempt
- **Stick-Figure Overlay** — dual skeleton video overlay on the results page
- **Coaching Feedback** — "Your coach" card on the score page, and one card per dancer on the Group page (click the moment to jump in the video)
- **Mobile-First UI** — dark theme, large touch targets, works on iPhone Safari
- **Privacy** — attempt videos are processed in-memory and never persisted on the server

## Architecture

```
dance-scoring/
├── pose_extractor.py    # MediaPipe Pose → 14-joint frames at 12fps
├── multi_pose.py        # Multi-dancer tracking + per-dancer scoring (group videos)
├── scoring.py           # DTW alignment + per-joint angle scoring
├── score.py             # CLI harness
├── dance_lib.py         # Library manager (add/list/get baselines)
├── test_scoring.py      # scoring tests
├── test_multi_pose.py   # multi-dancer identity matching tests
├── samples/             # Sample reference / attempt / group clips
├── web/
│   ├── app.py           # FastAPI app (library, scoring, overlay)
│   ├── overlay.py       # Stick-figure overlay video generator
│   └── requirements-web.txt
└── dance-library/       # Persisted baselines (videos, poses, thumbnails)
```

## Scoring Pipeline

```
Video → MediaPipe Pose → 14 joints (x,y + visibility)
                              ↓
                    DTW Alignment (Sakoe-Chiba band)
                              ↓
                    Per-Joint Angular Error
                              ↓
                    Cosine Falloff → 0-100 Score
                              ↓
                    Overall = 75% Form + 25% Timing
```

## Requirements

- Python 3.10+
- OpenCV (`opencv-python-headless`)
- MediaPipe (`mediapipe`)
- FastAPI + Uvicorn (web demo)
- NumPy

## License

MIT

---

Built with 💜 by [Ai-Rook](https://github.com/Ai-Rook)
