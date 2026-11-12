# 🩰 Dance Score

**AI-powered dance scoring with real-time stick-figure overlay feedback.**

Upload a reference dance, then upload your attempt — get an instant per-joint score with a skeleton overlay showing exactly where you deviated from the baseline.

## How It Works

1. **Pose Extraction** — MediaPipe Pose detects 14 body joints (shoulders, elbows, wrists, hips, knees, ankles, neck, nose) at 12fps from both videos, in 2D (image) and **3D** (world landmarks in metres, origin between the hips)
2. **DTW Alignment** — Dynamic Time Warping aligns the baseline and attempt frame-by-frame, so being 0.5s late on a move doesn't tank your score
3. **Angle Scoring** — Each frame becomes 9 joint angles (position/scale invariant). When both videos have 3D landmarks the angles are measured in **3D**, so filming from a different angle doesn't change the score; otherwise 2D. Per-joint mean angular error maps to a 0-100 score via cosine falloff (≤10° = 100, ≥55° = 0)
4. **Stick-Figure Overlay** — Baseline skeleton (green) and attempt skeleton (orange) rendered on the attempt video for visual comparison
5. **Focus Area** — The worst-scoring joint is highlighted so the dancer knows exactly what to practice
6. **Coaching Feedback** — `scoring.feedback()` turns the scores into growth-mindset coaching: an encouraging headline, what you do well, up to two fixes with a direction (e.g. "Bend your left knee more - get lower", from whether your angle is larger or smaller than the reference), a timing tip, and the moment to practise
7. **Body Language** — hand height, stance width and hip height (in torso lengths) give concrete tips like "Raise your left hand higher" or "Go deeper", and catch what angles miss (arm up vs arm down is ~90° at the shoulder either way)
8. **Moments** — `score()["moments"]` lists the worst 0.5 s moments with the aligned frame pair, the joint and a short label

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

#### YOLO tracker (this branch)

The `/group` page uses **YOLO11m-pose** (Ultralytics) + **ByteTrack** instead (`yolo_pose.py`): one network finds every dancer and their keypoints, and track pieces that never overlap in time are stitched back into one dancer. It runs on the Mac GPU (MPS) when available and returns the same format as `multi_pose.py`, so scoring and rendering are shared. ⚠️ Ultralytics is **AGPL-3.0**.

YOLO is 2D only, so MediaPipe BlazePose runs on each tracked dancer's box to add 3D world landmarks (hybrid: YOLO tracks, BlazePose gives 3D).

```bash
# Compare MediaPipe vs YOLO side by side
python compare_trackers.py samples/love119-group.mov --reference samples/love119-reference.mov
```

## Web Features

- **Dance Library** — save baseline dances with instant pose pre-processing on upload
- **Score Page** — pick a baseline from the library or upload custom, then upload your attempt
- **Stick-Figure Overlay** — dual skeleton video overlay on the results page
- **Coaching Feedback** — "Your coach" card on the score page, and one card per dancer on the Group page (click the moment to jump in the video)
- **3D Pose Inspector** — rotatable 3D skeletons (reference green, you orange / dancer colour), paired by DTW and synced with the comparison video; perspective, shaded limbs and ground shadows; joints turn yellow → red by 3D angle error with the worst one labelled; overlay or side by side, front/side/top views
- **Mobile-First UI** — dark theme, large touch targets, works on iPhone Safari
- **Privacy** — attempt videos are processed in-memory and never persisted on the server

## Architecture

```
dance-scoring/
├── pose_extractor.py    # MediaPipe Pose → 14-joint frames at 12fps
├── multi_pose.py        # Multi-dancer tracking + per-dancer scoring (group videos)
├── yolo_pose.py         # YOLO11-pose + ByteTrack multi-dancer tracking (used by /group)
├── compare_trackers.py  # MediaPipe vs YOLO side-by-side comparison
├── scoring.py           # DTW alignment + per-joint angle scoring
├── score.py             # CLI harness
├── dance_lib.py         # Library manager (add/list/get baselines)
├── test_scoring.py      # scoring tests (incl. 3D camera-angle invariance, body language, moments)
├── test_multi_pose.py   # multi-dancer identity matching tests
├── test_yolo_pose.py    # YOLO track stitching tests
├── samples/             # Sample reference / attempt / group clips
├── web/
│   ├── app.py           # FastAPI app (library, scoring, overlay)
│   ├── overlay.py       # Stick-figure overlay video generator
│   ├── viewer3d.py      # 3D pose inspector (canvas, no JS dependencies)
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
