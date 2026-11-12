"""yolo_pose.py - Multi-dancer pose tracking with Ultralytics YOLO-pose + ByteTrack.

Drop-in alternative to multi_pose.extract_multi(): one model finds every person and
their 17 COCO keypoints in a single pass, and ByteTrack keeps IDs across frames.

Licence note: Ultralytics is AGPL-3.0 (offering it as a network service requires
open-sourcing the app or a commercial licence). MediaPipe is Apache-2.0.

CLI: python yolo_pose.py <video> [--people N] [--model yolo11n-pose.pt]
"""
import argparse
import os
from collections import defaultdict

import cv2

from pose_extractor import JOINT_NAMES, MIN_JOINTS, VISIBILITY_THRESHOLD

DEFAULT_MODEL = "yolo11m-pose.pt"
MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")

# COCO keypoint index per joint. "neck" mirrors pose_extractor (left shoulder) so
# YOLO tracks can be scored against MediaPipe references.
COCO_MAP = {
    "nose": 0, "neck": 5,
    "left_shoulder": 5, "right_shoulder": 6,
    "left_elbow": 7, "right_elbow": 8,
    "left_wrist": 9, "right_wrist": 10,
    "left_hip": 11, "right_hip": 12,
    "left_knee": 13, "right_knee": 14,
    "left_ankle": 15, "right_ankle": 16,
}
MIN_TRACK_SHARE = 0.3  # a track must appear in this share of frames to count as a dancer
STITCH_MAX_DIST = 0.15  # max hip jump (fraction of frame width) to join two ID pieces
STITCH_MAX_GAP = 1.0    # max seconds between the end of one piece and the start of the next


def _hip(frame: dict) -> tuple[float, float]:
    j = frame["joints"]
    return ((j["left_hip"][0] + j["right_hip"][0]) / 2, (j["left_hip"][1] + j["right_hip"][1]) / 2)


def _stitch(tracks: list[list[dict]]) -> list[list[dict]]:
    """Join tracks that never co-occur and where one ends near where the other starts.

    Longest tracks absorb shorter pieces first. Returns tracks sorted longest first.
    """
    import math

    tracks = [sorted(t, key=lambda f: f["time"]) for t in tracks]
    merged = True
    while merged:
        merged = False
        tracks.sort(key=len, reverse=True)
        for a in range(len(tracks)):
            for b in range(a + 1, len(tracks)):
                A, B = tracks[a], tracks[b]
                first, second = (A, B) if A[0]["time"] < B[0]["time"] else (B, A)
                gap = second[0]["time"] - first[-1]["time"]
                if not 0 <= gap <= STITCH_MAX_GAP:
                    continue  # overlapping in time → two different people
                if math.dist(_hip(first[-1]), _hip(second[0])) > STITCH_MAX_DIST:
                    continue
                tracks[a] = first + second
                del tracks[b]
                merged = True
                break
            if merged:
                break
    return sorted(tracks, key=len, reverse=True)


def _load(model_name: str):
    from ultralytics import YOLO
    os.makedirs(MODELS_DIR, exist_ok=True)
    path = os.path.join(MODELS_DIR, model_name)
    if not os.path.exists(path):
        YOLO(model_name)  # downloads into the CWD
        if os.path.exists(model_name):
            os.replace(model_name, path)
    return YOLO(path)


def _device() -> str:
    import torch
    if torch.cuda.is_available():
        return "cuda"
    return "mps" if torch.backends.mps.is_available() else "cpu"


def extract_multi_yolo(video_path: str, num_people: int | None = None,
                       model_name: str = DEFAULT_MODEL) -> list[list[dict]]:
    """Track dancers with YOLO-pose. Same output format/order (left → right) as multi_pose.extract_multi()."""
    model = _load(model_name)
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    cap.release()

    per_id: dict[int, list[dict]] = defaultdict(list)
    n_frames = 0
    for i, res in enumerate(model.track(video_path, stream=True, persist=True,
                                        tracker="bytetrack.yaml", classes=[0], verbose=False,
                                        device=_device())):
        n_frames += 1
        if res.boxes is None or res.boxes.id is None or res.keypoints is None:
            continue
        H, W = res.orig_shape
        ids = res.boxes.id.int().tolist()
        xy = res.keypoints.xy.tolist()
        conf = res.keypoints.conf.tolist() if res.keypoints.conf is not None else [[1.0] * 17] * len(ids)
        for tid, pts, cf in zip(ids, xy, conf):
            joints = {n: [pts[k][0] / W, pts[k][1] / H] for n, k in COCO_MAP.items()}
            vis = {n: float(cf[k]) for n, k in COCO_MAP.items()}
            if sum(v >= VISIBILITY_THRESHOLD for v in vis.values()) < MIN_JOINTS:
                continue
            per_id[tid].append({"time": round(i / fps, 4), "joints": joints, "visibility": vis})

    # ByteTrack can give one dancer a new ID after occlusion: stitch those pieces back together
    ranked = _stitch(sorted(per_id.values(), key=len, reverse=True))
    if num_people is None:
        num_people = max(1, sum(len(t) >= MIN_TRACK_SHARE * n_frames for t in ranked))
    tracks = ranked[:num_people]

    def first_x(tr):
        j = tr[0]["joints"]
        return (j["left_hip"][0] + j["right_hip"][0]) / 2
    return sorted(tracks, key=first_x)


def main():
    from multi_pose import group_report, render_tracks

    ap = argparse.ArgumentParser(description="Track every dancer with YOLO-pose.")
    ap.add_argument("video")
    ap.add_argument("--people", type=int, default=None)
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    tracks = extract_multi_yolo(args.video, args.people, args.model)
    for r in group_report(tracks):
        print(f"Dancer {r['dancer']}: {r['frames']} frames, sync {r.get('sync', '-')}")
    out = render_tracks(args.video, tracks, args.out or f"{os.path.splitext(args.video)[0]}.yolo.mp4")
    print(f"Tracked video: {out}")


if __name__ == "__main__":
    main()
