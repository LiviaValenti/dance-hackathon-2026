"""scoring.py - pose sequence alignment and scoring.

Implements the Swift DanceScoring logic in Python/numpy:
  angles_for_frame, dtw_align, score.
When both sequences carry 3D world landmarks, angles and body features are measured in 3D,
so they don't depend on the camera angle.
No work at import time; venv ready at /root/projects/dance-scoring/venv.
"""
import math

import numpy as np

from pose_extractor import has_3d

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
FREEZE_MOMENTS = 3          # number of worst moments returned for freeze-frame feedback
FREEZE_MIN_DEG = 15.0       # a moment is only worth freezing if a joint is this far off

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
def _interior_angle(a, v, b) -> float:
    """Interior angle at vertex v between rays v→a and v→b (2D or 3D points). Range [0, π]."""
    v1 = [p - q for p, q in zip(a, v)]
    v2 = [p - q for p, q in zip(b, v)]
    dot  = sum(x * y for x, y in zip(v1, v2))
    mag1 = math.sqrt(sum(x * x for x in v1))
    mag2 = math.sqrt(sum(x * x for x in v2))
    if mag1 < 1e-9 or mag2 < 1e-9:
        return float("nan")
    return math.acos(max(-1.0, min(1.0, dot / (mag1 * mag2))))


def _points(frame: dict, use_3d: bool) -> tuple[dict, dict] | None:
    """(joint positions, visibility) in 3D world space or 2D image space; None if 3D is missing."""
    if not use_3d:
        return frame.get("joints", {}), frame.get("visibility", {})
    if "world" not in frame:
        return None
    return frame["world"], frame.get("world_vis", frame.get("visibility", {}))


def _vis_check(frame: dict, names: list[str], vis: dict | None = None) -> bool:
    """True only if ALL joints in `names` meet visibility threshold."""
    vis = frame.get("visibility", {}) if vis is None else vis
    return all(n in vis and vis[n] >= _VIS_THRESH for n in names)


def _swift_vis_check(frame: dict, swift_names: list[str], vis: dict | None = None) -> bool:
    """Swift-style visibility check (maps Swift joint names to pose_extractor names)."""
    mapped = [_SWIFT_TO_EXTRACTOR.get(sn, sn) for sn in swift_names]
    return _vis_check(frame, mapped, vis)


def _mid(a, b) -> list[float]:
    return [(p + q) / 2.0 for p, q in zip(a, b)]


# ------------------------------------------------------------------
# Public API
# ------------------------------------------------------------------
def angles_for_frame(frame: dict, use_3d: bool = False) -> dict[str, float]:
    """Compute the 9 angle features for one pose frame.

    Args:
        frame: dict with keys {time, joints: {name: [x,y]}, visibility: {name: float}, world?: {name: [x,y,z]}}
        use_3d: measure angles between the 3D world landmarks instead of the 2D image points.

    Returns:
        dict mapping feature name → angle in radians (radians or NaN).

    Joints with visibility < 0.3 cause NaN for any angle that depends on them.
    """
    result: dict[str, float] = {}
    pv = _points(frame, use_3d)
    if pv is None:
        return {feat: float("nan") for feat in ANGLE_FEATURES}
    joints, vis = pv

    for feat, triplet in _FEAT_TRIPLETS.items():
        if feat == "torso_lean":
            # Torso lean: angle of the hip_center→neck axis vs vertical.
            # Needs neck + both hips above visibility threshold.
            if not _vis_check(frame, ["neck", "left_hip", "right_hip"], vis):
                result[feat] = float("nan")
                continue
            neck = joints["neck"]
            centre = _mid(joints["left_hip"], joints["right_hip"])
            if use_3d:
                # 3D: unsigned angle from vertical (y is down), independent of which way the camera faces
                up = [n - c for n, c in zip(neck, centre)]
                norm = math.sqrt(sum(x * x for x in up))
                result[feat] = math.acos(max(-1.0, min(1.0, -up[1] / norm))) if norm > 1e-9 else float("nan")
            else:
                result[feat] = math.atan2(neck[0] - centre[0], neck[1] - centre[1])
            continue

        # Standard triplet angles (interior at vertex)
        name_a, vertex, name_b = triplet
        # Use Swift-style visibility check (maps to pose_extractor names)
        if not _swift_vis_check(frame, [name_a, vertex, name_b], vis):
            result[feat] = float("nan")
            continue

        a_pt   = joints[_SWIFT_TO_EXTRACTOR.get(name_a, name_a)]
        v_pt   = joints[_SWIFT_TO_EXTRACTOR.get(vertex, vertex)]
        b_pt   = joints[_SWIFT_TO_EXTRACTOR.get(name_b, name_b)]
        result[feat] = _interior_angle(a_pt, v_pt, b_pt)

    return result


# Body-language features: positions in torso lengths, so they're size/zoom invariant.
# They also cover what 2D angles miss (an arm straight up and straight down are both ~90° at the shoulder).
BODY_FEATURES = ["left_hand_height", "right_hand_height", "stance_width", "hip_height"]
# Mean difference (in torso lengths) before a body-language tip is given
BODY_TIP_MIN = {"left_hand_height": 0.35, "right_hand_height": 0.35, "stance_width": 0.3, "hip_height": 0.2}


def body_features(frame: dict, use_3d: bool = False) -> dict[str, float]:
    """Hand height above the shoulder, stance width and hip height, in torso lengths (NaN if not visible).

    y grows downwards (image and world), so heights are flipped to make "up" positive.
    In 3D, stance width is the real distance between the ankles, whatever the camera angle.
    """
    nan = float("nan")
    result = {f: nan for f in BODY_FEATURES}
    pv = _points(frame, use_3d)
    if pv is None:
        return result
    j, vis = pv
    if not _vis_check(frame, ["left_shoulder", "right_shoulder", "left_hip", "right_hip"], vis):
        return result
    shoulder = _mid(j["left_shoulder"], j["right_shoulder"])
    hip = _mid(j["left_hip"], j["right_hip"])
    torso = math.dist(shoulder, hip)
    if torso < 1e-6:
        return result

    for side in ("left", "right"):
        if _vis_check(frame, [f"{side}_wrist"], vis):
            result[f"{side}_hand_height"] = (j[f"{side}_shoulder"][1] - j[f"{side}_wrist"][1]) / torso
    if _vis_check(frame, ["left_ankle", "right_ankle"], vis):
        la, ra = j["left_ankle"], j["right_ankle"]
        result["stance_width"] = (math.dist(la, ra) if use_3d else abs(la[0] - ra[0])) / torso
        result["hip_height"] = (_mid(la, ra)[1] - hip[1]) / torso
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
    # Measure in 3D only when both sides have it; mixing 2D and 3D angles isn't comparable
    use_3d = has_3d(baseline_seq) and has_3d(attempt_seq)
    base_angles = [angles_for_frame(f, use_3d) for f in baseline_seq]
    att_angles  = [angles_for_frame(f, use_3d) for f in attempt_seq]
    empty = {"overall": 0, "form": 0, "timing": 0, "per_joint": {}, "focus_area": None,
             "mode": "3d" if use_3d else "2d", "path": []}

    if not base_angles or not att_angles:
        return empty

    path = dtw_align(base_angles, att_angles)
    if not path:
        return empty

    # Accumulate per-feature error along the alignment path
    err_sum: dict[str, float] = {}
    err_cnt: dict[str, int]   = {}
    signed_sum: dict[str, float] = {}
    for bi, ai in path:
        bf = base_angles[bi]
        af = att_angles[ai]
        for feat in ANGLE_FEATURES:
            bv = bf.get(feat, float("nan"))
            av = af.get(feat, float("nan"))
            if math.isnan(bv) or math.isnan(av):
                continue
            err_sum[feat] = err_sum.get(feat, 0.0) + abs(bv - av)
            # torso lean is signed left/right; compare how much you lean, not which way
            diff = abs(av) - abs(bv) if feat == "torso_lean" else av - bv
            signed_sum[feat] = signed_sum.get(feat, 0.0) + diff
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
            "mean_signed_deg": round(math.degrees(signed_sum[feat] / err_cnt[feat]), 1),
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

    base_body = [body_features(f, use_3d) for f in baseline_seq]
    att_body = [body_features(f, use_3d) for f in attempt_seq]

    return {
        "overall":    overall,
        "form":       form,
        "timing":     timing,
        "per_joint":  per_joint,
        "focus_area": focus,
        "mode":       "3d" if use_3d else "2d",
        "path":       path,
        "body":       _body_diffs(path, base_body, att_body),
        "timeline":   _timeline(path, base_angles, att_angles, attempt_seq),
        "moments":    _moments(path, base_angles, att_angles, base_body, att_body, baseline_seq, attempt_seq),
    }


def _body_diffs(path, base_body, att_body) -> dict[str, dict]:
    """Mean (attempt - reference) per body-language feature along the alignment path."""
    sums: dict[str, list[float]] = {}
    for bi, ai in path:
        for feat in BODY_FEATURES:
            bv, av = base_body[bi][feat], att_body[ai][feat]
            if not (math.isnan(bv) or math.isnan(av)):
                sums.setdefault(feat, []).append(av - bv)
    return {f: {"mean_diff": round(sum(v) / len(v), 2), "frames": len(v)} for f, v in sums.items()}


# Point on the body an arrow is drawn from, per angle feature (the end of the limb moves most)
_FEAT_POINT = {
    "left_elbow": "left_wrist", "right_elbow": "right_wrist",
    "left_shoulder": "left_wrist", "right_shoulder": "right_wrist",
    "left_hip": "left_ankle", "right_hip": "right_ankle",
    "left_knee": "left_ankle", "right_knee": "right_ankle",
    "torso_lean": "nose",
}


def _moments(path, base_angles, att_angles, base_body, att_body, baseline_seq, attempt_seq,
             bucket_sec: float = TIMELINE_BUCKET_SEC, limit: int = FREEZE_MOMENTS) -> list[dict]:
    """The worst moments (one per time bucket, buckets not adjacent), sorted by time.

    A bucket's worst joint is the one with the largest mean error over the bucket, so one noisy
    frame can't dominate; the frozen frame pair is the one whose error is closest to that mean.
    """
    per_bucket: dict[int, dict[str, list[tuple]]] = {}
    for bi, ai in path:
        b = int(attempt_seq[ai].get("time", 0.0) // bucket_sec)
        for feat in ANGLE_FEATURES:
            bv = base_angles[bi].get(feat, float("nan"))
            av = att_angles[ai].get(feat, float("nan"))
            if not (math.isnan(bv) or math.isnan(av)):
                signed = math.degrees(abs(av) - abs(bv) if feat == "torso_lean" else av - bv)
                per_bucket.setdefault(b, {}).setdefault(feat, []).append((signed, bi, ai))

    worst_per_bucket: dict[int, tuple] = {}
    for b, feats in per_bucket.items():
        feat = max(feats, key=lambda f: sum(abs(e[0]) for e in feats[f]) / len(feats[f]))
        errs = feats[feat]
        mean_abs = sum(abs(e[0]) for e in errs) / len(errs)
        signed, bi, ai = min(errs, key=lambda e: abs(abs(e[0]) - mean_abs))
        worst_per_bucket[b] = (bi, ai, feat, math.copysign(mean_abs, signed))

    chosen: list[int] = []
    for b in sorted(worst_per_bucket, key=lambda k: -abs(worst_per_bucket[k][3])):
        if len(chosen) >= limit or abs(worst_per_bucket[b][3]) < FREEZE_MIN_DEG:
            break
        if all(abs(b - c) > 1 for c in chosen):
            chosen.append(b)

    moments = []
    for b in sorted(chosen):
        bi, ai, feat, signed = worst_per_bucket[b]
        label = f"{_tip(feat, signed)} (~{abs(signed):.0f}°)"
        # In 2D an arm up and an arm down look alike at the shoulder, so prefer the hand-height cue
        side = feat.split("_")[0]
        hand = f"{side}_hand_height"
        if feat in ("left_shoulder", "right_shoulder", "left_elbow", "right_elbow"):
            diff = att_body[ai][hand] - base_body[bi][hand]
            if not math.isnan(diff) and abs(diff) >= BODY_TIP_MIN[hand]:
                label = _body_tip(hand, diff)
        moments.append({
            "time": round(attempt_seq[ai].get("time", 0.0), 2),
            "ref_time": round(baseline_seq[bi].get("time", 0.0), 2),
            "att_idx": ai,
            "ref_idx": bi,
            "joint": feat,
            "point": _FEAT_POINT[feat],
            "error_deg": round(abs(signed), 1),
            "label": label,
        })
    return moments


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
# Coaching feedback
# ------------------------------------------------------------------
FEEDBACK_TIP_BELOW = 75       # joints scoring under this get a tip
FEEDBACK_MAX_TIPS = 2
FEEDBACK_TIMING_BELOW = 70
FEEDBACK_PRACTICE_MIN_DEG = 20  # worst joint error that makes a moment worth practising

# (tip when your angle is LARGER than the reference, tip when SMALLER)
_TIPS = {
    "elbow":    ("bend your {side} elbow more", "straighten your {side} arm more"),
    "knee":     ("bend your {side} knee more - get lower", "straighten your {side} leg more"),
    "shoulder": ("keep your {side} arm closer to your body", "open your {side} arm out wider"),
    "hip":      ("keep your {side} leg closer in", "take your {side} leg out wider"),
    "torso":    ("stay more upright - you lean more than the reference", "lean into the move more"),
}


def _tip(feat: str, signed_deg: float) -> str:
    side, _, part = feat.partition("_") if feat != "torso_lean" else ("", "", "torso")
    larger, smaller = _TIPS[part]
    return (larger if signed_deg > 0 else smaller).format(side=side).capitalize()


# (tip when your value is LARGER than the reference, tip when SMALLER)
_BODY_TIPS = {
    "hand_height":  ("Keep your {side} hand lower - it's higher than the reference",
                     "Raise your {side} hand higher - it's lower than the reference"),
    "stance_width": ("Bring your feet closer together", "Take a wider stance - feet further apart"),
    "hip_height":   ("Go deeper - sink lower into your legs", "Stand a bit taller - you're lower than the reference"),
}


def _body_tip(feat: str, diff: float) -> str:
    side, part = (feat.split("_", 1) if feat.endswith("hand_height") else ("", feat))
    larger, smaller = _BODY_TIPS[part]
    return (larger if diff > 0 else smaller).format(side=side)


def _limb(feat: str) -> str:
    """Body part a tip is about, so the same arm/leg doesn't get two tips."""
    side = feat.split("_")[0]
    if any(k in feat for k in ("elbow", "shoulder", "hand")):
        return f"{side} arm"
    if any(k in feat for k in ("knee", "hip_height", "stance")) or feat in ("left_hip", "right_hip"):
        return f"{side} leg" if side in ("left", "right") else "legs"
    return feat


def feedback(result: dict) -> dict:
    """Turn a score() result into growth-mindset coaching: headline, strength, tips, practice moment."""
    overall = result.get("overall", 0)
    joints = result.get("per_joint", {})
    if not joints:
        return {"headline": "We couldn't see enough of your body - film your whole body and try again.",
                "strength": None, "tips": [], "practice": None}

    if overall >= 85:
        headline = "Excellent - you've got this move. Now add your own style and energy."
    elif overall >= 70:
        headline = "Solid! The shape is there - a couple of details will take it to the next level."
    elif overall >= 50:
        headline = "Good start - you're learning it. Focus on one fix at a time."
    else:
        headline = "Every dancer starts here. Slow it down and nail one part before adding the next."

    ranked = sorted(joints, key=lambda f: joints[f]["score"])
    best = ranked[-1]
    strength = f"{_FEAT_LABELS[best]} matches really well ({joints[best]['score']})"

    # Rank angle and body-language fixes together; one tip per limb, biggest problems first
    candidates = [((100 - joints[f]["score"]) / 100,
                   f"{_tip(f, joints[f].get('mean_signed_deg', 0.0))} (about {joints[f]['mean_error_deg']:.0f}° off)", _limb(f))
                  for f in ranked if joints[f]["score"] < FEEDBACK_TIP_BELOW]
    for f, d in result.get("body", {}).items():
        if abs(d["mean_diff"]) >= BODY_TIP_MIN[f]:
            # body cues are concrete ("raise your hand"), so they rank above an equally-off angle
            candidates.append((min(1.0, 0.4 * abs(d["mean_diff"]) / BODY_TIP_MIN[f]), _body_tip(f, d["mean_diff"]), _limb(f)))
    tips, used = [], set()
    for _, text, limb in sorted(candidates, key=lambda c: -c[0]):
        if limb not in used and len(tips) < FEEDBACK_MAX_TIPS:
            tips.append(text)
            used.add(limb)
    if result.get("timing", 100) < FEEDBACK_TIMING_BELOW:
        tips.append("Work on timing - count the beats and practise with the music slowed down")

    timeline = result.get("timeline", [])
    worst = min(timeline, key=lambda b: b["score"]) if timeline else None
    practice = (f"Around {worst['start']:.1f}s - watch your {worst['worst_joint'].lower()}"
                if worst and worst["worst_error_deg"] >= FEEDBACK_PRACTICE_MIN_DEG else None)

    return {"headline": headline, "strength": strength, "tips": tips, "practice": practice,
            "practice_at": worst["start"] if practice else None}


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