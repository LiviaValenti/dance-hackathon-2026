"""compare_trackers.py - MediaPipe (detector + BlazePose) vs YOLO-pose on the same group video.

CLI: python compare_trackers.py <video> [--reference ref.mov] [--people N] [--yolo-model yolo11m-pose.pt]
Writes <video>.compare.mp4 (MediaPipe left | YOLO right) and prints a comparison table.
"""
import argparse
import os
import subprocess
import time

import cv2

from multi_pose import extract_multi, group_report, render_tracks
from yolo_pose import DEFAULT_MODEL, _load, extract_multi_yolo

MP_FPS = 15  # multi_pose samples at this rate


def _coverage(track: list[dict], duration: float, fps: float) -> int:
    """Percent of the video in which this dancer has a pose."""
    expected = max(1, int(duration * fps))
    return min(100, int(round(100 * len(track) / expected)))


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("video")
    ap.add_argument("--reference", default=None)
    ap.add_argument("--people", type=int, default=None)
    ap.add_argument("--yolo-model", default=DEFAULT_MODEL)
    args = ap.parse_args()

    cap = cv2.VideoCapture(args.video)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    duration = cap.get(cv2.CAP_PROP_FRAME_COUNT) / fps
    cap.release()

    reference = None
    if args.reference:
        from pose_extractor import extract
        reference = extract(args.reference)

    _load(args.yolo_model)  # warm-up so timing excludes downloading weights / importing torch
    runs = {}
    for name, fn, sample_fps in (
        ("MediaPipe", lambda: extract_multi(args.video, args.people), MP_FPS),
        (f"YOLO ({args.yolo_model})", lambda: extract_multi_yolo(args.video, args.people, args.yolo_model), fps),
    ):
        t0 = time.perf_counter()
        tracks = fn()
        secs = time.perf_counter() - t0
        runs[name] = (tracks, secs, sample_fps)

    print(f"\nVideo: {args.video}  ({duration:.1f}s)\n")
    for name, (tracks, secs, sample_fps) in runs.items():
        print(f"── {name}: {len(tracks)} dancers, {secs:.1f}s processing ({secs / duration:.1f}× video length)")
        for r, tr in zip(group_report(tracks, reference), tracks):
            line = f"   Dancer {r['dancer']}: tracked {_coverage(tr, duration, sample_fps):3d}% of the video"
            if "overall" in r:
                line += f" │ vs reference {r['overall']:3d}"
            if "sync" in r:
                line += f" │ sync {r['sync']:3d}"
            print(line)
        print()

    base = os.path.splitext(args.video)[0]
    parts = []
    for k, (name, (tracks, _, _)) in enumerate(runs.items()):
        p = render_tracks(args.video, tracks, f"{base}.cmp{k}.mp4")
        parts.append((name, p))

    out = f"{base}.compare.mp4"
    caps = [cv2.VideoCapture(p) for _, p in parts]
    tmp = out + ".raw.mp4"
    writer = None
    while True:
        frames = [c.read() for c in caps]
        if not all(ok for ok, _ in frames):
            break
        imgs = []
        for (name, _), (_, img) in zip(parts, frames):
            (tw, th), _ = cv2.getTextSize(name, cv2.FONT_HERSHEY_SIMPLEX, 1.1, 3)
            cv2.rectangle(img, (10, 100), (30 + tw, 120 + th), (0, 0, 0), -1)
            cv2.putText(img, name, (20, 110 + th), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (255, 255, 255), 3, cv2.LINE_AA)
            imgs.append(img)
        row = cv2.hconcat(imgs)
        if writer is None:
            writer = cv2.VideoWriter(tmp, cv2.VideoWriter_fourcc(*"mp4v"), fps, (row.shape[1], row.shape[0]))
        writer.write(row)
    for c in caps:
        c.release()
    writer.release()
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-c:v", "libx264",
                    "-pix_fmt", "yuv420p", out], check=True)
    os.remove(tmp)
    for _, p in parts:
        os.remove(p)
    print(f"Side-by-side video: {out}")


if __name__ == "__main__":
    main()
