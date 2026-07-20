"""pose_extractor.py - Extract 2D pose landmarks from video using MediaPipe Pose.

Matches Swift PoseExtractor: extracts normalized (x,y) joints + visibility,
sampled at a target FPS. Frames with fewer than 6 joints above visibility
threshold are discarded. Results cached to JSON alongside the video.

CLI: python pose_extractor.py <video>
"""
import cv2
import json
import math
import os
import sys

import mediapipe as mp
import numpy as np

# --------------------------------------------------------------------------- #
# Joint name mapping (matches Swift PoseExtractor / Vision/VisionKit)
# --------------------------------------------------------------------------- #
JOINT_NAMES = [
    "nose",
    "neck",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
]

# MediaPipe landmark indices for those names
LANDMARK_MAP = {
    "nose": 0,
    "neck": 11,            # left_shoulder → right_shoulder midpoint (≈11)
    "left_shoulder": 11,
    "right_shoulder": 12,
    "left_elbow": 13,
    "right_elbow": 14,
    "left_wrist": 15,
    "right_wrist": 16,
    "left_hip": 23,
    "right_hip": 24,
    "left_knee": 25,
    "right_knee": 26,
    "left_ankle": 27,
    "right_ankle": 28,
}

VISIBILITY_THRESHOLD = 0.3
MIN_JOINTS = 6


def extract(video_path: str, target_fps: float = 12) -> list[dict]:
    """Extract pose frames from video_path sampled at target_fps.

    Returns list of frame dicts:
        {time: float, joints: {name: [x,y]}, visibility: {name: float}}

    If a .poses.json cache exists and is newer than the video, loads and
    returns it instead of extracting.
    """
    cache_path = f"{video_path}.poses.json"
    video_mtime = os.path.getmtime(video_path)

    if os.path.exists(cache_path) and os.path.getmtime(cache_path) >= video_mtime:
        with open(cache_path) as f:
            return json.load(f)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = frame_count / fps if fps > 0 else 0

    if duration <= 0:
        raise RuntimeError(f"Video has zero duration: {video_path}")

    step = 1.0 / target_fps  # seconds between samples

    mp_pose = mp.solutions.pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        enable_segmentation=False,
        smooth_landmarks=True,
    )

    frames: list[dict] = []
    t = 0.0
    while t < duration:
        frame_idx = int(t * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret:
            t += step
            continue

        # Convert BGR → RGB for MediaPipe
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = mp_pose.process(rgb)

        if results.pose_landmarks is not None:
            joints: dict[str, list[float]] = {}
            visibility: dict[str, float] = {}
            for name in JOINT_NAMES:
                lm = results.pose_landmarks.landmark[LANDMARK_MAP[name]]
                joints[name] = [lm.x, lm.y]
                visibility[name] = float(lm.visibility)

            # Keep only frames with >= MIN_JOINTS joints above VISIBILITY_THRESHOLD
            good_joints = sum(1 for v in visibility.values() if v >= VISIBILITY_THRESHOLD)
            if good_joints >= MIN_JOINTS:
                frames.append({
                    "time": round(t, 4),
                    "joints": joints,
                    "visibility": visibility,
                })

        t += step

    cap.release()

    with open(cache_path, "w") as f:
        json.dump(frames, f)

    return frames


def main():
    if len(sys.argv) < 2:
        print("Usage: python pose_extractor.py <video>", file=sys.stderr)
        sys.exit(1)

    video_path = sys.argv[1]
    cache_path = f"{video_path}.poses.json"

    # Determine whether cache exists and is valid before extract()
    cache_hit = (
        os.path.exists(cache_path)
        and os.path.getmtime(cache_path) >= os.path.getmtime(video_path)
    )

    frames = extract(video_path)

    total_frames = 0
    if os.path.exists(cache_path):
        try:
            with open(cache_path) as f:
                cached = json.load(f)
            total_frames = len(cached)
        except Exception:
            pass

    print(f"Frames kept: {len(frames)}")
    print(f"Frames discarded: {total_frames - len(frames)}")
    print(f"JSON path: {cache_path}")
    print(f"Cache used: {cache_hit}")


if __name__ == "__main__":
    main()
