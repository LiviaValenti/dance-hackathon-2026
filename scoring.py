"""scoring.py - pose sequence alignment and scoring.

Implements the Swift DanceScoring logic in Python/numpy:
  angles_for_frame, dtw_align, score.
No work at import time; venv ready at /root/projects/dance-scoring/venv.
"""
import math

import numpy as np

# ------------------------------------------------------------------
# CONFIG - tuning knobs
# ------------------------------------------------------------------
TOLERANCE_FULL_DEG = 10.0   # <= this degrees → 100 points
TOLERANCE_ZERO_DEG = 55.0   # >= this degrees → 0 points
DTW_BAND_FRACTION = 0.25    # Sakoe-Chiba band as fraction of longer axis
FORM_WEIGHT = 0.75           # weight for form vs timing in overall
MIN_SHARED_FEATURES = 4      # min jointly-visible angles to compare frames
SHARED_PENALTY_RAD = 0.6    # penalty (radians) when too few shared angles
TIMELINE_BUCKET_SEC = 0.5   # granularity of the per-moment score timeline

# ------------------------------------------------------------------
# Angle feature names (matches pose_extractor.py joint keys)
# ------------------------------------------------------------------
ANGLE_FEATURES = [
    "left_elbow", "right_elbow",
    "left_shoulder", "right_shoulder",
    "left_hip", "right_hip",
    "left_knee", "right_knee",
    "torso_lean",
]

# Triplet per feature: (name_a, vertex, name_b)
# Each defines the interior angle at `vertex` between the rays from vertex→a and vertex→b.
_FEAT_TRIPLETS = {
    "left_elbow":      ("left_shoulder",  "left_elbow",   "left_wrist"),
    "right_elbow":     ("right_shoulder", "right_elbow",  "right_wrist"),
    "left_shoulder":   ("left_elbow",     "left_shoulder","right_shoulder"),
    "right_shoulder":  ("right_elbow",    "right_shoulder","left_shoulder"),
    "left_hip":        ("left_knee",      "left_hip",     "right_hip"),
    "right_hip":       ("right_knee",     "right_hip",    "left_hip"),
    "left_knee":       ("left_ankle",     "left_knee",    "left_hip"),
    "right_knee":      ("right_ankle",    "right_knee",   "right_hip"),
    "torso_lean":      None,   # special-cased below
}

# Mapping from Swift (Vision) joint names to pose_extractor names.
# Used to check visibility for Swift-style triplet members.
_SWIFT_TO_EXTRACTOR = {
    "left_wrist_joint":     "left_wrist",
    "left_forearm_joint":   "left_elbow",
    "left_upperarm_joint":  "left_shoulder",
    "right_forearm_joint":  "right_shoulder",
    "right_upperarm_joint": "right_elbow",
    "left_leg_joint":       "left_hip",
    "right_leg_joint":      "right_hip",
    "left_foot_joint":      "left_knee",
    "right_foot_joint":     "right_knee",
    "neck_1_joint":         "neck",
    "root":                 "hip_center",
}

# Human-readable labels (matches Swift label property)
_FEAT_LABELS = {
    "left_elbow":      "Left elbow",
    "right_elbow":     "Right elbow",
    "left_shoulder":   "Left shoulder",
    "right_shoulder":  "Right shoulder",
    "left_hip":        "Left hip",
    "right_hip":       "Right hip",
    "left_knee":       "Left knee",
    "right_knee":      "Right knee",
    "torso_lean":      "Torso",
}

# Visibility threshold (matches Swift minConfidence default)
_VIS_THRESH = 0.3


# ------------------------------------------------------------------
# helpers
# ------------------------------------------------------------------
def _interior_angle(a: tuple[float, float],
                    v: tuple[float, float],
                    b: tuple[float, float]) -> float:
    """Interior angle at vertex v between rays v→a and v→b. Range [0, π]."""
    v1x, v1y = a[0] - v[0], a[1] - v[1]
    v2x, v2y = b[0] - v[0], b[1] - v[1]
    dot   = v1x * v2x + v1y * v2y
    mag1  = math.hypot(v1x, v1y)
    mag2  = math.hypot(v2x, v2y)
    if mag1 < 1e-9 or mag2 < 1e-9:
        return float("nan")
    return math.acos(max(-1.0, min(1.0, dot / (mag1 * mag2))))


def _vis_check(frame: dict, names: list[str]) -> bool:
    """True only if ALL joints in `names` meet visibility threshold."""
    for n in names:
        if n not in frame.get("visibility", {}):
            return False
        if frame["visibility"][n] < _VIS_THRESH:
            return False
    return True


def _swift_vis_check(frame: dict, swift_names: list[str]) -> bool:
    """Swift-style visibility check (maps Swift joint names to pose_extractor names)."""
    mapped = [_SWIFT_TO_EXTRACTOR.get(sn, sn) for sn in swift_names]
    return _vis_check(frame, mapped)


# ------------------------------------------------------------------
# Public API
# ------------------------------------------------------------------
def angles_for_frame(frame: dict) -> dict[str, float]:
    """Compute the 9 angle features for one pose frame.

    Args:
        frame: dict with keys {time, joints: {name: [x,y]}, visibility: {name: float}}

    Returns:
        dict mapping feature name → angle in radians (radians or NaN).

    Joints with visibility < 0.3 cause NaN for any angle that depends on them.
    """
    result: dict[str, float] = {}

    for feat, triplet in _FEAT_TRIPLETS.items():
        if feat == "torso_lean":
            # Torso lean: angle of neck→hip_center axis vs vertical (atan2).
            # Needs neck + both hips above visibility threshold.
            if not _vis_check(frame, ["neck", "left_hip", "right_hip"]):
                result[feat] = float("nan")
                continue
            joints  = frame["joints"]
            neck    = joints["neck"]
            lh      = joints["left_hip"]
            rh      = joints["right_hip"]
            cx = (lh[0] + rh[0]) / 2.0
            cy = (lh[1] + rh[1]) / 2.0
            result[feat] = math.atan2(neck[0] - cx, neck[1] - cy)
            continue

        # Standard triplet angles (interior at vertex)
        name_a, vertex, name_b = triplet
        # Use Swift-style visibility check (maps to pose_extractor names)
        if not _swift_vis_check(frame, [name_a, vertex, name_b]):
            result[feat] = float("nan")
            continue

        joints = frame["joints"]
        a_pt   = joints[_SWIFT_TO_EXTRACTOR.get(name_a, name_a)]
        v_pt   = joints[_SWIFT_TO_EXTRACTOR.get(vertex, vertex)]
        b_pt   = joints[_SWIFT_TO_EXTRACTOR.get(name_b, name_b)]
        result[feat] = _interior_angle(a_pt, v_pt, b_pt)

    return result


def _frame_distance(f1: dict[str, float], f2: dict[str, float]) -> float | None:
    """Mean absolute angular error (radians) over jointly-visible features.

    Returns None if fewer than MIN_SHARED_FEATURES features are visible in both.
    """
    total, count = 0.0, 0
    for feat in ANGLE_FEATURES:
        v1 = f1.get(feat, float("nan"))
        v2 = f2.get(feat, float("nan"))
        if math.isnan(v1) or math.isnan(v2):
            continue
        total += abs(v1 - v2)
        count += 1
    if count < MIN_SHARED_FEATURES:
        return None
    return total / count


def dtw_align(seq_a: list[dict], seq_b: list[dict]) -> list[tuple[int, int]]:
    """Align two angle sequences using DTW with Sakoe-Chiba band.

    Args:
        seq_a, seq_b: lists of frame dicts (same format as angles_for_frame output).

    Returns:
        path: list of (idx_a, idx_b) index pairs along the alignment.
        Uses SHARED_PENALTY_RAD when too few features are shared.

    Sakoe-Chiba band width = DTW_BAND_FRACTION * max(len_a, len_b).
    """
    n = len(seq_a)
    m = len(seq_b)
    if n < 2 or m < 2:
        return []

    band = max(3, int(max(n, m) * DTW_BAND_FRACTION))

    # Build cost matrix initialised to +inf
    cost = np.full((n, m), np.inf, dtype=np.float64)

    # Precompute frame distances once (n × m, each entry = radians or penalty)
    dists = np.full((n, m), SHARED_PENALTY_RAD, dtype=np.float64)
    for i in range(n):
        for j in range(m):
            d = _frame_distance(seq_a[i], seq_b[j])
            if d is not None:
                dists[i, j] = d

    # Fill cost[0][0]
    cost[0, 0] = dists[0, 0]

    # Fill first row / column with Sakoe-Chiba band constraint
    for i in range(n):
        j_lo = max(0,   i * m // n - band)
        j_hi = min(m-1, i * m // n + band)
        for j in range(j_lo, j_hi + 1):
            if i == 0 and j == 0:
                continue
            candidates = []
            if i > 0 and j > 0:
                candidates.append(cost[i-1, j-1])
            if i > 0:
                candidates.append(cost[i-1, j])
            if j > 0:
                candidates.append(cost[i, j-1])
            best = min(candidates)
            if np.isfinite(best):
                cost[i, j] = dists[i, j] + best

    if not np.isfinite(cost[n-1, m-1]):
        return []

    # Backtrack
    path = []
    i, j = n - 1, m - 1
    while i > 0 or j > 0:
        path.append((i, j))
        best_i, best_j, best_val = i - 1, j - 1, np.inf
        for ci, cj in [(i-1, j-1), (i-1, j), (i, j-1)]:
            if ci < 0 or cj < 0:
                continue
            if cost[ci, cj] < best_val:
                best_val = cost[ci, cj]
                best_i, best_j = ci, cj
        i, j = best_i, best_j
    path.append((i, j))
    path.reverse()
    return path


def score(baseline_seq: list[dict], attempt_seq: list[dict]) -> dict:
    """Score an attempt against a baseline, returning a full report dict.

    Args:
        baseline_seq, attempt_seq: lists of frame dicts (from pose_extractor.py).

    Returns:
        {
          overall:  int  (0-100),
          form:     int  (0-100),
          timing:   int  (0-100),
          per_joint: {name: {score: int, mean_error_deg: float}},
          focus_area: str or None (worst joint label),
        }
    """
    # Convert to angle feature dicts
    base_angles = [angles_for_frame(f) for f in baseline_seq]
    att_angles  = [angles_for_frame(f) for f in attempt_seq]

    if not base_angles or not att_angles:
        return {"overall": 0, "form": 0, "timing": 0,
                "per_joint": {}, "focus_area": None}

    path = dtw_align(base_angles, att_angles)
    if not path:
        return {"overall": 0, "form": 0, "timing": 0,
                "per_joint": {}, "focus_area": None}

    # Accumulate per-feature error along the alignment path
    err_sum: dict[str, float] = {}
    err_cnt: dict[str, int]   = {}
    for bi, ai in path:
        bf = base_angles[bi]
        af = att_angles[ai]
        for feat in ANGLE_FEATURES:
            bv = bf.get(feat, float("nan"))
            av = af.get(feat, float("nan"))
            if math.isnan(bv) or math.isnan(av):
                continue
            err_sum[feat] = err_sum.get(feat, 0.0) + abs(bv - av)
            err_cnt[feat] = err_cnt.get(feat, 0) + 1

    per_joint: dict[str, dict] = {}
    for feat in ANGLE_FEATURES:
        if feat not in err_cnt or err_cnt[feat] == 0:
            continue
        mean_err_rad = err_sum[feat] / err_cnt[feat]
        mean_err_deg = mean_err_rad * 180.0 / math.pi
        sc = _tolerance_score(mean_err_deg)
        per_joint[feat] = {
            "score": sc,
            "mean_error_deg": round(mean_err_deg, 1),
        }

    # Sort ascending by score (worst first)
    sorted_feats = sorted(per_joint.keys(), key=lambda f: per_joint[f]["score"])

    if not sorted_feats:
        form = 0
    else:
        form = int(round(sum(per_joint[f]["score"] for f in sorted_feats) / len(sorted_feats)))

    # Timing: deviation of the alignment path from the diagonal (0 = perfect)
    n = float(len(base_angles))
    m = float(len(att_angles))
    if n > 0 and m > 0:
        deviations = [abs(idx_a / n - idx_b / m) for idx_a, idx_b in path]
        deviation  = sum(deviations) / len(deviations)
        timing = int(max(0.0, (1.0 - deviation / 0.25) * 100.0))
    else:
        timing = 0

    overall = int(round(FORM_WEIGHT * form + (1.0 - FORM_WEIGHT) * timing))

    focus = None
    if sorted_feats:
        focus = _FEAT_LABELS.get(sorted_feats[0], sorted_feats[0])

    return {
        "overall":    overall,
        "form":       form,
        "timing":     timing,
        "per_joint":  per_joint,
        "focus_area": focus,
        "timeline":   _timeline(path, base_angles, att_angles, attempt_seq),
    }


def _timeline(path, base_angles, att_angles, attempt_seq,
              bucket_sec: float = TIMELINE_BUCKET_SEC) -> list[dict]:
    """Form score per time bucket of the attempt video, with the worst joint in each bucket."""
    buckets: dict[int, dict[str, list[float]]] = {}
    for bi, ai in path:
        b = int(attempt_seq[ai].get("time", 0.0) // bucket_sec)
        errs = buckets.setdefault(b, {})
        for feat in ANGLE_FEATURES:
            bv = base_angles[bi].get(feat, float("nan"))
            av = att_angles[ai].get(feat, float("nan"))
            if not (math.isnan(bv) or math.isnan(av)):
                errs.setdefault(feat, []).append(abs(bv - av) * 180.0 / math.pi)

    timeline = []
    for b in sorted(buckets):
        mean_err = {f: sum(v) / len(v) for f, v in buckets[b].items() if v}
        if not mean_err:
            continue
        worst = max(mean_err, key=mean_err.get)
        timeline.append({
            "start": round(b * bucket_sec, 2),
            "score": int(round(sum(_tolerance_score(e) for e in mean_err.values()) / len(mean_err))),
            "worst_joint": _FEAT_LABELS.get(worst, worst),
            "worst_error_deg": round(mean_err[worst], 1),
        })
    return timeline


# ------------------------------------------------------------------
# Private helpers (no work at import time)
# ------------------------------------------------------------------
def _tolerance_score(err_deg: float) -> int:
    """Cosine falloff score: 100 at TOLERANCE_FULL_DEG, 0 at TOLERANCE_ZERO_DEG."""
    if err_deg <= TOLERANCE_FULL_DEG:
        return 100
    if err_deg >= TOLERANCE_ZERO_DEG:
        return 0
    t = (err_deg - TOLERANCE_FULL_DEG) / (TOLERANCE_ZERO_DEG - TOLERANCE_FULL_DEG)
    return int(round((math.cos(t * math.pi) + 1.0) / 2.0 * 100.0))