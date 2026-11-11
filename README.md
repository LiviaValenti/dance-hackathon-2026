# 🩰 Dance Score

**AI-powered dance scoring with real-time stick-figure overlay feedback.**

Upload a reference dance, then upload your attempt — get an instant per-joint score with a skeleton overlay showing exactly where you deviated from the baseline.

## How It Works

1. **Pose Extraction** — MediaPipe Pose detects 14 body joints (shoulders, elbows, wrists, hips, knees, ankles, neck, nose) at 12fps from both videos
2. **DTW Alignment** — Dynamic Time Warping aligns the baseline and attempt frame-by-frame, so being 0.5s late on a move doesn't tank your score
3. **Angle Scoring** — Each frame becomes 9 joint angles (position/scale invariant). Per-joint mean angular error maps to a 0-100 score via cosine falloff (≤10° = 100, ≥55° = 0)
4. **Stick-Figure Overlay** — Baseline skeleton (green) and attempt skeleton (orange) rendered on the attempt video for visual comparison
5. **Focus Area** — The worst-scoring joint is highlighted so the dancer knows exactly what to practice

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

## Web Features

- **Dance Library** — save baseline dances with instant pose pre-processing on upload
- **Score Page** — pick a baseline from the library or upload custom, then upload your attempt
- **Stick-Figure Overlay** — dual skeleton video overlay on the results page
- **Mobile-First UI** — dark theme, large touch targets, works on iPhone Safari
- **Privacy** — attempt videos are processed in-memory and never persisted on the server

## Architecture

```
dance-scoring/
├── pose_extractor.py    # MediaPipe Pose → 14-joint frames at 12fps
├── scoring.py           # DTW alignment + per-joint angle scoring
├── score.py             # CLI harness
├── dance_lib.py         # Library manager (add/list/get baselines)
├── test_scoring.py      # 5/5 test suite
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
