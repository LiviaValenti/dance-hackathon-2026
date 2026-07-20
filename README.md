# Dance Scoring Harness

Compares a recorded dance attempt to a baseline video using pose alignment
(MediaPipe Pose → angle-feature DTW → score). No external services needed.

## Setup

```bash
cd /root/projects/dance-scoring

# Create venv (mediapipe 0.10.14 MUST be pinned — 0.10.35 lacks mp.solutions)
python -m venv venv
venv/bin/pip install mediapipe==0.10.14 opencv-python-headless numpy
```

## Usage

```bash
venv/bin/python score.py baseline.mp4 attempt.mp4
```

Output:

```
Loading baseline: baseline.mp4
  -> N pose frames extracted (cached if present)
Loading attempt: attempt.mp4
  -> M pose frames extracted (cached if present)

─────────────────────────────────────────────────────
  Overall  84  │  Form  89  │  Timing   73
─────────────────────────────────────────────────────

  Joint                  Sc     Deg°  Bar
─────────────────────────────────────────────────────
  Right elbow            97     2.1°  [========================================]
  Right shoulder         95     4.3°  [=====================================   ]
  Left elbow             72    18.5°  [========================            ]
  Left shoulder          68    21.2°  [===================               ]
  ...

Focus area: Left elbow
```

JSON pose caches (`*.poses.json`) are written alongside each video and reused on
subsequent runs — extract is skipped when the cache is newer than the video.

## Tuning Constants

| Constant | Default | What it controls |
|---|---|---|
| `TOLERANCE_FULL_DEG` | `10.0` | Error ≤ 10° → 100-form score (cosine falloff) |
| `TOLERANCE_ZERO_DEG` | `55.0` | Error ≥ 55° → 0-form score |
| `DTW_BAND_FRACTION` | `0.25` | Sakoe-Chiba band width as fraction of longer sequence |
| `FORM_WEIGHT` | `0.75` | Weight of form vs timing in `overall = form*0.75 + timing*0.25` |
| `MIN_SHARED_FEATURES` | `4` | Minimum jointly-visible angles needed to compare two frames |
| `SHARED_PENALTY_RAD` | `0.6` | Fallback cost (radians) when fewer than `MIN_SHARED_FEATURES` features are visible |

## Running Tests

```bash
cd /root/projects/dance-scoring
venv/bin/python -m unittest test_scoring -v
```

Tests use synthetic pose frames (no videos) and cover: perfect-match → ~100 overall,
arm offset → left-side focus, and 1.3× time stretch → form high / timing drop.