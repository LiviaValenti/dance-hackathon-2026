"""test_yolo_pose.py - track stitching after ByteTrack ID switches (no video/model needed)."""
import unittest

from yolo_pose import _stitch


def piece(t0: float, t1: float, x: float, fps: int = 10) -> list[dict]:
    n = int(round((t1 - t0) * fps))
    return [{"time": round(t0 + i / fps, 2),
             "joints": {"left_hip": [x - 0.02, 0.6], "right_hip": [x + 0.02, 0.6]}} for i in range(n)]


class TestStitch(unittest.TestCase):
    def test_id_switch_pieces_are_joined(self):
        left = piece(0, 2, 0.2)
        middle_a, middle_b = piece(0, 1, 0.5), piece(1.1, 2, 0.52)  # same dancer, new ID after 0.1s
        tracks = _stitch([left, middle_a, middle_b])
        self.assertEqual(len(tracks), 2)
        self.assertEqual(sorted(len(t) for t in tracks), [19, 20])

    def test_dancers_visible_at_the_same_time_stay_separate(self):
        self.assertEqual(len(_stitch([piece(0, 2, 0.2), piece(0.5, 2, 0.25)])), 2)

    def test_piece_starting_far_away_is_not_joined(self):
        self.assertEqual(len(_stitch([piece(0, 1, 0.2), piece(1.1, 2, 0.8)])), 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
