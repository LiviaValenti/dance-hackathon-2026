"""Dance library manager — save, list, and pre-process baseline dances."""

import json
import os
import shutil
import uuid
from pathlib import Path

from pose_extractor import extract

LIBRARY_DIR = Path(__file__).resolve().parent.parent / "dance-library"
VIDEOS_DIR = LIBRARY_DIR / "videos"
POSES_DIR = LIBRARY_DIR / "poses"
THUMBS_DIR = LIBRARY_DIR / "thumbnails"
META_FILE = LIBRARY_DIR / "library.json"


def _ensure_dirs():
    for d in (VIDEOS_DIR, POSES_DIR, THUMBS_DIR):
        d.mkdir(parents=True, exist_ok=True)


def _load_meta() -> dict:
    _ensure_dirs()
    if META_FILE.exists():
        return json.loads(META_FILE.read_text())
    return {"dances": {}}


def _save_meta(meta: dict):
    _ensure_dirs()
    META_FILE.write_text(json.dumps(meta, indent=2))


def add_dance(name: str, video_path: str, description: str = "") -> dict:
    """
    Add a dance to the library. Copies video, runs pose extraction,
    and caches the result. Returns the dance metadata dict.
    """
    _ensure_dirs()
    meta = _load_meta()

    dance_id = uuid.uuid4().hex[:8]

    # Copy video to library
    ext = Path(video_path).suffix or ".mp4"
    dest_video = VIDEOS_DIR / f"{dance_id}{ext}"
    shutil.copy2(video_path, dest_video)

    # Run pose extraction immediately (pre-process)
    frames = extract(str(dest_video))

    # Cache poses
    pose_file = POSES_DIR / f"{dance_id}.json"
    pose_file.write_text(json.dumps(frames))

    # Generate a thumbnail (first frame with skeleton overlay)
    thumb_path = str(THUMBS_DIR / f"{dance_id}.png")
    _generate_thumbnail(frames, thumb_path)

    entry = {
        "id": dance_id,
        "name": name,
        "description": description,
        "video": str(dest_video),
        "poses": str(pose_file),
        "thumbnail": thumb_path,
        "frame_count": len(frames),
        "added_at": _now_iso(),
    }

    meta["dances"][dance_id] = entry
    _save_meta(meta)

    return entry


def list_dances() -> list[dict]:
    """Return all dances in the library, sorted newest first."""
    meta = _load_meta()
    dances = list(meta["dances"].values())
    dances.sort(key=lambda d: d.get("added_at", ""), reverse=True)
    return dances


def get_dance(dance_id: str) -> dict | None:
    meta = _load_meta()
    return meta["dances"].get(dance_id)


def get_poses(dance_id: str) -> list[dict] | None:
    """Load cached poses for a dance (no re-extraction needed)."""
    entry = get_dance(dance_id)
    if not entry:
        return None
    pose_file = entry["poses"]
    if not Path(pose_file).exists():
        return None
    return json.loads(Path(pose_file).read_text())


def _generate_thumbnail(frames: list[dict], out_path: str):
    """Draw the first frame's skeleton on a blank canvas and save as PNG."""
    try:
        import cv2
        import numpy as np

        if not frames:
            return

        canvas = np.zeros((360, 640, 3), dtype=np.uint8)
        canvas[:] = (15, 15, 26)  # dark bg

        h, w = canvas.shape[:2]
        frame = frames[0]
        joints = frame.get("joints", {})

        connections = [
            ("nose", "neck"), ("neck", "left_shoulder"), ("neck", "right_shoulder"),
            ("left_shoulder", "left_elbow"), ("left_elbow", "left_wrist"),
            ("right_shoulder", "right_elbow"), ("right_elbow", "right_wrist"),
            ("neck", "left_hip"), ("neck", "right_hip"),
            ("left_hip", "left_knee"), ("left_knee", "left_ankle"),
            ("right_hip", "right_knee"), ("right_knee", "right_ankle"),
            ("left_hip", "right_hip"),
        ]

        for j1, j2 in connections:
            if j1 in joints and j2 in joints:
                p1 = (int(joints[j1][0] * w), int(joints[j1][1] * h))
                p2 = (int(joints[j2][0] * w), int(joints[j2][1] * h))
                cv2.line(canvas, p1, p2, (0, 255, 0), 2)

        for _, coords in joints.items():
            pt = (int(coords[0] * w), int(coords[1] * h))
            cv2.circle(canvas, pt, 4, (0, 255, 0), -1)

        cv2.imwrite(out_path, canvas)
    except Exception:
        pass  # thumbnail is optional


def _now_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()
