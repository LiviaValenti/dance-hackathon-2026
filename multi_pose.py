"""multi_pose.py - Track several dancers in one video and extract a pose sequence per dancer.

MediaPipe's pose model follows a single person, and its built-in multi-pose mode
loses overlapping/backlit dancers. So this is a top-down tracker:

  1. Person detector (EfficientDet) proposes boxes; tiny boxes are ignored.
  2. A fixed number of tracks (one per dancer) is matched to those boxes.
     When the detector misses someone, the track follows that dancer's own
     skeleton from the previous frame instead.
  3. Pose landmarks are estimated inside each dancer's box.

Each track uses the same frame format as pose_extractor.extract(), so it can be
passed straight to scoring.score().

CLI: python multi_pose.py <video> [--people N]
"""
import argparse
import itertools
import math
import os
import urllib.request
from collections import Counter

import cv2
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions, vision

from pose_extractor import JOINT_NAMES, LANDMARK_MAP, MIN_JOINTS, VISIBILITY_THRESHOLD, world_joints

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
_MODEL_URLS = {
    "efficientdet_lite0.tflite":
        "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/latest/efficientdet_lite0.tflite",
    "pose_landmarker_full.task":
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",
}

MIN_PERSON_HEIGHT = 0.20   # ignore person boxes shorter than this fraction of the frame
DETECT_SCORE = 0.3
CROP_PAD = 0.15            # pad each dancer's box by this fraction before pose estimation
MAX_MATCH_DIST = 0.6       # max centre distance (in box widths) to match a detection to a track
MAX_WIDTH_RATIO = 1.6      # reject detections much wider than the track (= several dancers merged)
BOX_SMOOTH = 0.6           # weight of the new box when updating a track
MAX_TRACK_OVERLAP = 0.5    # two dancers' boxes may not overlap more than this (IoU)


def _model(name: str) -> str:
    """Path to a MediaPipe model, downloading it on first use."""
    path = os.path.join(MODELS_DIR, name)
    if not os.path.exists(path):
        os.makedirs(MODELS_DIR, exist_ok=True)
        urllib.request.urlretrieve(_MODEL_URLS[name], path)
    return path


def _iou(a, b) -> float:
    ax2, ay2, bx2, by2 = a[0] + a[2], a[1] + a[3], b[0] + b[2], b[1] + b[3]
    iw = max(0.0, min(ax2, bx2) - max(a[0], b[0]))
    ih = max(0.0, min(ay2, by2) - max(a[1], b[1]))
    inter = iw * ih
    union = a[2] * a[3] + b[2] * b[3] - inter
    return inter / union if union > 0 else 0.0


def _nms(boxes: list, thresh: float = 0.5) -> list:
    """Drop boxes overlapping a higher-scoring one (boxes: (x, y, w, h, score))."""
    kept = []
    for b in sorted(boxes, key=lambda b: -b[4]):
        if all(_iou(b, k) < thresh for k in kept):
            kept.append(b)
    return kept


def _centre(b):
    return (b[0] + b[2] / 2, b[1] + b[3] / 2)


def _match(tracks: list, dets: list) -> dict:
    """Best one-to-one track→detection assignment by centre distance (brute force; N is small)."""
    dets = dets[:len(tracks) + 3]  # keep the permutation search small
    best, best_cost = {}, math.inf
    n = len(tracks)
    padded = list(range(len(dets))) + [None] * n
    for perm in set(itertools.permutations(padded, n)):
        cost, assign = 0.0, {}
        for ti, di in enumerate(perm):
            if di is None:
                cost += MAX_MATCH_DIST
                continue
            t, d = tracks[ti], dets[di]
            (tx, ty), (dx, dy) = _centre(t), _centre(d)
            dist = math.hypot(tx - dx, ty - dy) / max(t[2], 1e-6)
            if dist > MAX_MATCH_DIST or d[2] > t[2] * MAX_WIDTH_RATIO:
                cost += MAX_MATCH_DIST
                continue
            cost += dist
            assign[ti] = di
        if cost < best_cost:
            best, best_cost = assign, cost
    return best


def _blend(old, new, w: float = BOX_SMOOTH):
    return tuple(w * n + (1 - w) * o for o, n in zip(old[:4], new[:4]))


def _box_from_landmarks(lms, crop, W, H):
    """Full-frame (x, y, w, h) around visible landmarks of a crop-relative pose."""
    cx, cy, cw, ch = crop
    pts = [(cx + l.x * cw, cy + l.y * ch) for l in lms if (l.visibility or 0) >= VISIBILITY_THRESHOLD]
    if len(pts) < MIN_JOINTS:
        return None
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    x0, y0 = max(0.0, min(xs) - 0.1 * w), max(0.0, min(ys) - 0.1 * h)
    return (x0, y0, min(W, max(xs) + 0.1 * w) - x0, min(H, max(ys) + 0.1 * h) - y0)


def _pad_crop(box, W, H):
    x, y, w, h = box[:4]
    px, py = w * CROP_PAD, h * CROP_PAD
    x0, y0 = int(max(0, x - px)), int(max(0, y - py))
    x1, y1 = int(min(W, x + w + px)), int(min(H, y + h + py))
    return x0, y0, max(1, x1 - x0), max(1, y1 - y0)


def _detect_people(detector, rgb, ts_ms, W, H) -> list:
    res = detector.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), ts_ms)
    boxes = [(d.bounding_box.origin_x, d.bounding_box.origin_y, d.bounding_box.width,
              d.bounding_box.height, d.categories[0].score) for d in res.detections]
    return _nms([b for b in boxes if b[3] >= MIN_PERSON_HEIGHT * H])


def count_people(video_path: str, sample_fps: float = 8, min_share: float = 0.15) -> int:
    """Number of dancers: the highest person count seen in at least `min_share` of sampled frames.

    Overlapping dancers often merge into one detection (undercount), while overcounting is
    rare after size filtering + NMS, so the plain most-common count is too low for groups.
    """
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    step = max(1, int(round(fps / sample_fps)))
    counts = Counter()
    with _detector() as det:
        i = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if i % step == 0:
                H, W = frame.shape[:2]
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                counts[len(_detect_people(det, rgb, int(i * 1000 / fps), W, H))] += 1
            i += 1
    cap.release()
    total = sum(counts.values())
    frequent = [n for n, c in counts.items() if n > 0 and c >= min_share * total]
    return max(frequent, default=1)


def _detector():
    return vision.ObjectDetector.create_from_options(vision.ObjectDetectorOptions(
        base_options=BaseOptions(model_asset_path=_model("efficientdet_lite0.tflite")),
        running_mode=vision.RunningMode.VIDEO,
        category_allowlist=["person"], score_threshold=DETECT_SCORE, max_results=8))


def _landmarker():
    return vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=_model("pose_landmarker_full.task")),
        running_mode=vision.RunningMode.IMAGE, num_poses=2,
        min_pose_detection_confidence=0.3, min_pose_presence_confidence=0.3))


def extract_multi(video_path: str, num_people: int | None = None,
                  target_fps: float = 15) -> list[list[dict]]:
    """Track `num_people` dancers (auto-detected if None), left-to-right as first seen.

    Returns one pose-frame list per dancer, in the pose_extractor.extract() format:
        {time, joints: {name: [x, y]}, visibility: {name: float}, world: {name: [x, y, z]}}
    (x, y normalised to the full frame; world in metres, origin between the hips)
    """
    if num_people is None:
        num_people = count_people(video_path)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    step = max(1, int(round(fps / target_fps)))

    tracks: list[tuple] = []          # one box (x, y, w, h) per dancer, in pixels
    out: list[list[dict]] = [[] for _ in range(num_people)]

    with _detector() as det, _landmarker() as lmk:
        i = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if i % step:
                i += 1
                continue
            H, W = frame.shape[:2]
            t = i / fps
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            dets = _detect_people(det, rgb, int(t * 1000), W, H)

            if not tracks:
                # Start once every dancer is separately visible; order tracks left → right
                if len(dets) < num_people:
                    i += 1
                    continue
                best = sorted(dets, key=lambda d: -d[4])[:num_people]
                tracks = [d[:4] for d in sorted(best, key=lambda d: d[0])]

            assign = _match(tracks, dets)
            prev = list(tracks)
            for ti in range(num_people):
                if ti in assign:
                    tracks[ti] = _blend(tracks[ti], dets[assign[ti]])

                crop = _pad_crop(tracks[ti], W, H)
                cx, cy, cw, ch = crop
                sub = rgb[cy:cy + ch, cx:cx + cw]
                res = lmk.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=sub.copy()))
                if not res.pose_landmarks:
                    continue

                def hip(lms):
                    return (cx + (lms[23].x + lms[24].x) / 2 * cw, cy + (lms[23].y + lms[24].y) / 2 * ch)

                # The crop can contain a neighbour too: take the pose nearest this dancer,
                # and reject it if it is actually nearer to another dancer.
                own = _centre(tracks[ti])
                k = min(range(len(res.pose_landmarks)), key=lambda n: math.dist(hip(res.pose_landmarks[n]), own))
                lms = res.pose_landmarks[k]
                h = hip(lms)
                if any(math.dist(h, _centre(prev[oj])) < math.dist(h, own)
                       for oj in range(num_people) if oj != ti):
                    continue

                joints, vis = {}, {}
                for name in JOINT_NAMES:
                    lm = lms[LANDMARK_MAP[name]]
                    joints[name] = [(cx + lm.x * cw) / W, (cy + lm.y * ch) / H]
                    vis[name] = float(lm.visibility or 0.0)
                if sum(v >= VISIBILITY_THRESHOLD for v in vis.values()) < MIN_JOINTS:
                    continue
                out[ti].append({"time": round(t, 4), "joints": joints, "visibility": vis,
                                "world": world_joints(res.pose_world_landmarks[k])})

                if ti not in assign:
                    # Detector missed this dancer: follow their skeleton instead,
                    # unless that would make two dancers' boxes collapse into one.
                    lbox = _box_from_landmarks(lms, crop, W, H)
                    if lbox:
                        cand = _blend(tracks[ti], lbox)
                        if all(_iou(cand, tracks[oj]) < MAX_TRACK_OVERLAP
                               for oj in range(num_people) if oj != ti):
                            tracks[ti] = cand
            i += 1

    cap.release()
    return out


# --------------------------------------------------------------------------- #
# Rendering
# --------------------------------------------------------------------------- #
DANCER_COLORS = [(0, 130, 255), (255, 180, 0), (255, 0, 200), (0, 220, 0), (0, 230, 255), (255, 80, 80)]  # BGR
_CONNS = [
    ("left_shoulder", "right_shoulder"), ("left_shoulder", "left_elbow"), ("left_elbow", "left_wrist"),
    ("right_shoulder", "right_elbow"), ("right_elbow", "right_wrist"), ("left_shoulder", "left_hip"),
    ("right_shoulder", "right_hip"), ("left_hip", "right_hip"), ("left_hip", "left_knee"),
    ("left_knee", "left_ankle"), ("right_hip", "right_knee"), ("right_knee", "right_ankle"),
]


def render_tracks(video_path: str, tracks: list[list[dict]], out_path: str,
                  labels: list[str] | None = None, max_gap: float = 0.15) -> str:
    """Draw every dancer's skeleton and label on the original video (H.264 if ffmpeg is available)."""
    import bisect
    import subprocess

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    ok, first = cap.read()
    if not ok:
        raise RuntimeError(f"Cannot read video: {video_path}")
    H, W = first.shape[:2]
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
    labels = labels or [f"Dancer {i + 1}" for i in range(len(tracks))]

    tmp = out_path + ".raw.mp4"
    writer = cv2.VideoWriter(tmp, cv2.VideoWriter_fourcc(*"mp4v"), fps, (W, H))
    times = [[f["time"] for f in tr] for tr in tracks]
    thick = max(2, W // 240)

    i = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        t = i / fps
        for ti, tr in enumerate(tracks):
            if not tr:
                continue
            k = bisect.bisect_left(times[ti], t)
            k = min((c for c in (k - 1, k) if 0 <= c < len(tr)), key=lambda c: abs(times[ti][c] - t))
            if abs(times[ti][k] - t) > max_gap:
                continue
            color = DANCER_COLORS[ti % len(DANCER_COLORS)]
            pts = {n: (int(x * W), int(y * H)) for n, (x, y) in tr[k]["joints"].items()}
            vis = tr[k]["visibility"]
            for a, b in _CONNS:
                if vis[a] >= VISIBILITY_THRESHOLD and vis[b] >= VISIBILITY_THRESHOLD:
                    cv2.line(frame, pts[a], pts[b], color, thick, cv2.LINE_AA)
            for n, p in pts.items():
                if n not in ("nose", "neck") and vis[n] >= VISIBILITY_THRESHOLD:
                    cv2.circle(frame, p, thick + 2, color, -1, cv2.LINE_AA)
            # Label above the head
            hx, hy = pts["nose"]
            text = labels[ti]
            (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)
            x0, y0 = max(0, hx - tw // 2 - 6), max(0, hy - 40 - th)
            cv2.rectangle(frame, (x0, y0), (x0 + tw + 12, y0 + th + 12), color, -1)
            cv2.putText(frame, text, (x0 + 6, y0 + th + 6), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2, cv2.LINE_AA)
        writer.write(frame)
        i += 1
    cap.release()
    writer.release()

    res = subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-c:v", "libx264",
                          "-pix_fmt", "yuv420p", "-movflags", "faststart", out_path], check=False)
    if res.returncode == 0 and os.path.getsize(out_path) > 0:
        os.remove(tmp)
        return out_path
    os.replace(tmp, out_path)
    return out_path


def group_report(tracks: list[list[dict]], reference: list[dict] | None = None) -> list[dict]:
    """Per dancer: score vs the reference (if given), sync with the group, and coaching feedback.

    Each scored dancer also gets the DTW `path` and `compared_index` (None = reference) for 3D/freeze views.

    Without a reference, each dancer gets feedback compared with the dancer most in sync with the group.
    """
    from scoring import feedback, score

    valid = [i for i, t in enumerate(tracks) if len(t) > 1]
    pair = {(i, j): score(tracks[j], tracks[i]) for i in valid for j in valid if i != j}

    report = []
    for i, tr in enumerate(tracks):
        entry = {"dancer": i + 1, "frames": len(tr)}
        others = [pair[(i, j)]["overall"] for j in valid if j != i and (i, j) in pair]
        if others:
            entry["sync"] = int(round(sum(others) / len(others)))
        report.append(entry)

    leader = max((r for r in report if "sync" in r), key=lambda r: r["sync"], default=None)
    for r in report:
        i = r["dancer"] - 1
        if i not in valid:
            continue
        if reference is not None:
            res = score(reference, tracks[i])
            r.update(overall=res["overall"], form=res["form"], timing=res["timing"], focus_area=res["focus_area"])
            r["compared_with"] = "reference"
            r["compared_index"] = None
        elif leader is not None:
            # the leader is compared with whoever is most like them
            j = leader["dancer"] - 1 if i != leader["dancer"] - 1 else \
                max((k for k in valid if k != i), key=lambda k: pair[(i, k)]["overall"])
            res = pair[(i, j)]
            r["compared_with"] = f"Dancer {j + 1}"
            r["compared_index"] = j
        else:
            continue
        r["feedback"] = feedback(res)
        r.update(mode=res["mode"], path=res["path"], moments=res.get("moments", []))
    return report


def main():
    ap = argparse.ArgumentParser(description="Track every dancer in a video and score them.")
    ap.add_argument("video")
    ap.add_argument("--people", type=int, default=None, help="number of dancers (default: auto-detect)")
    ap.add_argument("--reference", default=None, help="reference video to score each dancer against")
    ap.add_argument("--out", default=None, help="output video (default: <video>.tracked.mp4)")
    args = ap.parse_args()

    tracks = extract_multi(args.video, args.people)
    reference = None
    if args.reference:
        from pose_extractor import extract
        reference = extract(args.reference)

    report = group_report(tracks, reference)
    print(f"\n{len(tracks)} dancers tracked")
    print("─" * 72)
    for r in report:
        line = f"  Dancer {r['dancer']}  ({r['frames']:3d} frames)"
        if "overall" in r:
            line += f"  │ vs reference: {r['overall']:3d}  (form {r['form']}, timing {r['timing']}, focus: {r['focus_area']})"
        if "sync" in r:
            line += f"  │ sync with group: {r['sync']:3d}"
        print(line)
        fb = r.get("feedback")
        if fb:
            print(f"      vs {r['compared_with']}: {fb['headline']}")
            print(f"      + {fb['strength']}")
            for t in fb["tips"]:
                print(f"      → {t}")
            if fb["practice"]:
                print(f"      ⏱ {fb['practice']}")
    print("─" * 72)

    labels = [f"Dancer {r['dancer']}" + (f" - {r['overall']}" if "overall" in r else "") for r in report]
    out = render_tracks(args.video, tracks, args.out or f"{os.path.splitext(args.video)[0]}.tracked.mp4", labels)
    print(f"Tracked video: {out}")


if __name__ == "__main__":
    main()
