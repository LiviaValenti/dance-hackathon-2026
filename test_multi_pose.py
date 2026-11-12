"""test_multi_pose.py - identity matching for multi-dancer tracking (no video needed)."""
import unittest

from multi_pose import _match, _nms


class TestMatch(unittest.TestCase):
    TRACKS = [(0, 0, 100, 300), (150, 0, 100, 300), (300, 0, 100, 300)]

    def test_dancers_keep_identity_when_detections_arrive_shuffled(self):
        dets = [(305, 5, 100, 300, 0.9), (2, 0, 100, 300, 0.8), (148, 3, 100, 300, 0.7)]
        self.assertEqual(_match(self.TRACKS, dets), {0: 1, 1: 2, 2: 0})

    def test_merged_box_over_two_dancers_is_not_assigned(self):
        # One wide box covering dancers 1+2, dancer 3 detected normally
        dets = [(0, 0, 250, 300, 0.9), (300, 0, 100, 300, 0.8)]
        self.assertEqual(_match(self.TRACKS, dets), {2: 1})

    def test_far_away_detection_is_not_assigned(self):
        dets = [(900, 0, 100, 300, 0.9)]
        self.assertEqual(_match(self.TRACKS, dets), {})


class TestNms(unittest.TestCase):
    def test_duplicate_box_dropped_keeps_highest_score(self):
        boxes = [(0, 0, 100, 300, 0.5), (5, 5, 100, 300, 0.9), (300, 0, 100, 300, 0.7)]
        self.assertEqual(_nms(boxes), [(5, 5, 100, 300, 0.9), (300, 0, 100, 300, 0.7)])


if __name__ == "__main__":
    unittest.main(verbosity=2)
