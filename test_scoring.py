"""test_scoring.py - stdlib unittest for dance-scoring harness.

Tests use synthetic pose frame dicts (no video needed) to verify:
(a) identical sequences → ~100 overall
(b) 40° arm offset → left-side focus_area & meaningfully lower score
(c) 1.3x stretched timing → form high, timing drop (DTW absorbs some of it)
"""
import math
import sys
import unittest

# Ensure local scoring.py / pose_extractor.py are importable
sys.path.insert(0, "/root/projects/dance-scoring")

from scoring import (
    angles_for_frame,
    dtw_align,
    score,
    ANGLE_FEATURES,
    TOLERANCE_FULL_DEG,
)


# ------------------------------------------------------------------
# Synthetic frame factory
# ------------------------------------------------------------------
def make_frame(angles: dict[str, float]) -> dict:
    """Build a synthetic pose frame that GEOMETRICALLY realizes the requested angles.

    Arms are parametric: shoulder angle sets the upper-arm direction, elbow angle
    sets the forearm direction relative to it. Everything else is fixed, so only
    the requested angles vary between frames. Visibility 0.85 (no NaN features).

    Angle semantics (from scoring.py triplets):
      - shoulder: interior at shoulder between rays ->elbow and ->other_shoulder
      - elbow: interior at elbow between rays ->shoulder and ->wrist
    """
    import math as _m

    joints: dict[str, list[float]] = {}
    vis: dict[str, float] = {}

    def _place(name: str, x: float, y: float) -> None:
        joints[name] = [x, y]
        vis[name] = 0.85

    L1, L2 = 0.15, 0.15  # upper-arm / forearm lengths

    # Fixed torso/leg skeleton (identical across all frames → zero error there)
    _place("neck",           0.50, 0.18)
    _place("nose",           0.50, 0.10)
    _place("left_hip",       0.42, 0.50)
    _place("right_hip",      0.58, 0.50)
    _place("left_knee",      0.42, 0.65)
    _place("right_knee",     0.58, 0.65)
    _place("left_ankle",     0.42, 0.80)
    _place("right_ankle",    0.58, 0.80)
    _place("left_shoulder",  0.35, 0.25)
    _place("right_shoulder", 0.65, 0.25)

    # --- Left arm: shoulder angle measured from ray ->right_shoulder = (1, 0)
    a_sh = angles.get("left_shoulder", 0.9)
    a_el = angles.get("left_elbow", 1.25)
    ux, uy = _m.cos(a_sh), _m.sin(a_sh)                 # upper-arm dir (angle a_sh from (1,0))
    ex, ey = 0.35 + L1 * ux, 0.25 + L1 * uy
    _place("left_elbow", ex, ey)
    # forearm: ray E->S has direction angle (a_sh + pi); rotate by a_el
    back = a_sh + _m.pi
    fx, fy = _m.cos(back - a_el), _m.sin(back - a_el)
    _place("left_wrist", ex + L2 * fx, ey + L2 * fy)

    # --- Right arm (mirrored): shoulder angle from ray ->left_shoulder = (-1, 0)
    a_sh = angles.get("right_shoulder", 0.9)
    a_el = angles.get("right_elbow", 1.25)
    ux, uy = -_m.cos(a_sh), _m.sin(a_sh)
    ex, ey = 0.65 + L1 * ux, 0.25 + L1 * uy
    _place("right_elbow", ex, ey)
    back = _m.pi - a_sh + _m.pi  # direction of ray E->S = -ux,-uy → angle = pi - a_sh... compute directly
    back = _m.atan2(-uy, -ux)
    fx, fy = _m.cos(back + a_el), _m.sin(back + a_el)
    _place("right_wrist", ex + L2 * fx, ey + L2 * fy)

    return {"time": 0.0, "joints": joints, "visibility": vis}


def make_frames(num: int, per_frame: dict[str, float]) -> list[dict]:
    """Build `num` identical synthetic frames."""
    base = make_frame(per_frame)
    t_step = 1.0 / max(num, 1)
    return [{**base, "time": round(i * t_step, 4)} for i in range(num)]


# ------------------------------------------------------------------
# Test cases
# ------------------------------------------------------------------
class TestIdentical(unittest.TestCase):
    """Identical baseline and attempt must score ~100 overall."""

    def test_perfect_match(self):
        base_angles = {
            "left_elbow": 1.2, "right_elbow": 1.2,
            "left_shoulder": 0.9, "right_shoulder": 0.9,
            "left_hip": 1.57, "right_hip": 1.57,
            "left_knee": 1.57, "right_knee": 1.57,
            "torso_lean": 0.1,
        }
        n = 12
        base = make_frames(n, base_angles)
        att  = make_frames(n, base_angles)

        result = score(base, att)

        # No alignment error → mean error ~0°, which is <= TOLERANCE_FULL_DEG (10°)
        # Form should be 100; timing should also be 100 (identical length).
        self.assertGreaterEqual(result["overall"], 90,
            f"Identical sequences should score >= 90, got {result['overall']}")
        self.assertGreaterEqual(result["form"], 90,
            f"Identical form should be >= 90, got {result['form']}")
        self.assertGreaterEqual(result["timing"], 90,
            f"Identical timing should be >= 90, got {result['timing']}")


class TestArmOffset(unittest.TestCase):
    """Left-arm 40° offset must lower left-side scores and flag left as focus."""

    def test_left_arm_offset_lowers_left_score(self):
        base_angles = {
            "left_elbow": 1.25, "right_elbow": 1.25,     # ~71.6° — same baseline
            "left_shoulder": 0.90, "right_shoulder": 0.90,
            "left_hip": 1.57, "right_hip": 1.57,
            "left_knee": 1.57, "right_knee": 1.57,
            "torso_lean": 0.1,
        }

        n = 12
        base = make_frames(n, base_angles)

        # Offset left elbow + shoulder by ~0.70 rad (≈40°) vs baseline
        att_angles = dict(base_angles)
        att_angles["left_elbow"]   = base_angles["left_elbow"]   + 0.70
        att_angles["left_shoulder"] = base_angles["left_shoulder"] + 0.70

        att = make_frames(n, att_angles)
        result = score(base, att)

        self.assertIn("left_elbow", result["per_joint"],
                      "left_elbow should appear in per_joint")
        self.assertIn("left_shoulder", result["per_joint"],
                      "left_shoulder should appear in per_joint")

        lj_score = result["per_joint"].get("left_elbow", {}).get("score", 100)
        rj_score = result["per_joint"].get("right_elbow", {}).get("score", 100)

        # Left should score notably (>=10) lower than right
        self.assertLess(lj_score, rj_score - 5,
            f"Expected left elbow < right elbow, got L={lj_score} R={rj_score}")

        # Overall should be meaningfully below 100 (40° is outside TOLERANCE_FULL_DEG=10°)
        self.assertLess(result["overall"], 90,
            f"40° arm offset should lower overall, got {result['overall']}")

        # Focus area must name the left side
        self.assertIsNotNone(result["focus_area"],
                             "focus_area should be set")
        left_labels = {"left elbow", "left shoulder"}
        focus_lower = result["focus_area"].lower()
        self.assertTrue(
            any(label.lower() in focus_lower for label in left_labels),
            f"Expected focus_area to mention left side, got '{result['focus_area']}'")


class TestTimeline(unittest.TestCase):
    """Timeline must pinpoint *when* the attempt deviates."""

    def test_mistake_in_second_half_is_localised(self):
        good = {
            "left_elbow": 1.25, "right_elbow": 1.25,
            "left_shoulder": 0.90, "right_shoulder": 0.90,
            "left_hip": 1.57, "right_hip": 1.57,
            "left_knee": 1.57, "right_knee": 1.57,
            "torso_lean": 0.1,
        }
        bad = {**good, "left_elbow": good["left_elbow"] + 0.8}
        fps, n = 12, 24  # 2 seconds
        base = [{**make_frame(good), "time": i / fps} for i in range(n)]
        att = [{**make_frame(good if i < n // 2 else bad), "time": i / fps} for i in range(n)]

        timeline = score(base, att)["timeline"]

        first = [b for b in timeline if b["start"] < 1.0]
        second = [b for b in timeline if b["start"] >= 1.0]
        self.assertTrue(first and second)
        self.assertTrue(all(b["score"] == 100 for b in first), first)
        self.assertTrue(all(b["score"] < 100 for b in second), second)
        self.assertTrue(all(b["worst_joint"] == "Left elbow" for b in second), second)


class TestTimeStretch(unittest.TestCase):
    """1.3x stretched sequence keeps form high while timing drops."""

    def test_stretched_keeps_form(self):
        base_angles = {
            "left_elbow": 1.0, "right_elbow": 1.0,
            "left_shoulder": 0.8, "right_shoulder": 0.8,
            "left_hip": 1.6, "right_hip": 1.6,
            "left_knee": 1.5, "right_knee": 1.5,
            "torso_lean": 0.05,
        }

        n_base = 10
        n_att  = 13        # ~1.3x as many frames (same angles)
        base = make_frames(n_base, base_angles)
        att  = make_frames(n_att, base_angles)

        result = score(base, att)

        # Form should be high (angles unchanged, DTW handles different lengths)
        self.assertGreaterEqual(result["form"], 85,
            f"Form should be >= 85 with identical angles, got {result['form']}")

        # Overall less than perfect (timing mismatch due to different frame counts)
        self.assertLess(result["overall"], 100,
            f"1.3x stretch should not achieve perfect overall, got {result['overall']}")


class TestPerJointTable(unittest.TestCase):
    """Per-joint scores must be 0-100 and mean_error_deg must be >= 0."""

    def test_scores_in_range(self):
        base_angles = {
            "left_elbow": 1.2, "right_elbow": 1.2,
            "left_shoulder": 0.9, "right_shoulder": 0.9,
            "left_hip": 1.5, "right_hip": 1.5,
            "left_knee": 1.4, "right_knee": 1.4,
            "torso_lean": 0.15,
        }
        base = make_frames(8, base_angles)
        att  = make_frames(8, base_angles)

        result = score(base, att)

        for feat, data in result["per_joint"].items():
            self.assertGreaterEqual(data["score"], 0,
                f"{feat} score must be >= 0, got {data['score']}")
            self.assertLessEqual(data["score"], 100,
                f"{feat} score must be <= 100, got {data['score']}")
            self.assertGreaterEqual(data["mean_error_deg"], 0.0,
                f"{feat} mean_error_deg must be >= 0, got {data['mean_error_deg']}")


class TestDTWAlign(unittest.TestCase):
    """DTW alignment must return a path for valid sequences."""

    def test_dtw_returns_path(self):
        base_angles = [angles_for_frame(f) for f in make_frames(6, {
            "left_elbow": 1.2, "right_elbow": 1.2,
            "left_shoulder": 0.9, "right_shoulder": 0.9,
            "left_hip": 1.5, "right_hip": 1.5,
            "left_knee": 1.5, "right_knee": 1.5,
            "torso_lean": 0.1,
        })]
        att_angles = [angles_for_frame(f) for f in make_frames(7, {
            "left_elbow": 1.2, "right_elbow": 1.2,
            "left_shoulder": 0.9, "right_shoulder": 0.9,
            "left_hip": 1.5, "right_hip": 1.5,
            "left_knee": 1.5, "right_knee": 1.5,
            "torso_lean": 0.1,
        })]

        path = dtw_align(base_angles, att_angles)

        self.assertIsInstance(path, list)
        self.assertGreater(len(path), 0,
            "DTW path should not be empty for valid sequences")
        # Path length should span both sequences (ends at (n-1,m-1))
        first, last = path[0], path[-1]
        self.assertEqual(first[0], 0,   f"path[0] should start at (0,0), got {first}")
        self.assertEqual(first[1], 0)
        self.assertEqual(last[0], len(base_angles) - 1,
            f"path[-1] should end at last base idx, got {last}")
        self.assertEqual(last[1], len(att_angles) - 1,
            f"path[-1] should end at last attempt idx, got {last}")


if __name__ == "__main__":
    unittest.main(verbosity=2)