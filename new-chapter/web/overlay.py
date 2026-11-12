"""Stick-figure overlay: draw baseline (green) + attempt (blue) skeletons on the attempt video."""

import cv2
import uuid
import os

SKELETON_CONNECTIONS = [
    ("nose", "neck"),
    ("neck", "left_shoulder"), ("neck", "right_shoulder"),
    ("left_shoulder", "left_elbow"), ("left_elbow", "left_wrist"),
    ("right_shoulder", "right_elbow"), ("right_elbow", "right_wrist"),
    ("neck", "left_hip"), ("neck", "right_hip"),
    ("left_hip", "left_knee"), ("left_knee", "left_ankle"),
    ("right_hip", "right_knee"), ("right_knee", "right_ankle"),
    ("left_hip", "right_hip"),
]


def generate_overlay(baseline_frames, attempt_frames, attempt_video_path, alignment):
    """
    Generate an overlay video with baseline skeleton (green) and
    attempt skeleton (blue) drawn on the attempt video frames.

    Returns: path to the generated overlay MP4
    """
    out_dir = "/tmp/dance-web-uploads"
    os.makedirs(out_dir, exist_ok=True)
    tmp_path = os.path.join(out_dir, f"overlay-{uuid.uuid4().hex[:8]}-raw.mp4")

    cap = cv2.VideoCapture(attempt_video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {attempt_video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(tmp_path, fourcc, fps, (w, h))

    # Build lookup: attempt_frame_idx -> baseline_frame_idx from alignment
    align_map = {}
    for b_idx, a_idx in alignment:
        if a_idx not in align_map:
            align_map[a_idx] = b_idx

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Draw attempt skeleton (BLUE) - use pose frame at this index
        if frame_idx < len(attempt_frames):
            _draw_skeleton(frame, attempt_frames[frame_idx], w, h,
                           color=(255, 130, 0), thickness=2, radius=3)

        # Draw baseline skeleton (GREEN) aligned to this attempt frame
        if frame_idx in align_map:
            b_idx = align_map[frame_idx]
            if b_idx < len(baseline_frames):
                _draw_skeleton(frame, baseline_frames[b_idx], w, h,
                               color=(0, 255, 0), thickness=2, radius=4)

        writer.write(frame)
        frame_idx += 1

    cap.release()
    writer.release()

    # Re-encode for browser compatibility (H.264 + faststart)
    out_path = tmp_path.replace("-raw.mp4", ".mp4")
    os.system(
        f"ffmpeg -y -loglevel error -i {tmp_path} "
        f"-c:v libx264 -pix_fmt yuv420p -movflags faststart {out_path}"
    )
    if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
        os.remove(tmp_path)
        return out_path
    return tmp_path


def _draw_skeleton(frame, pose_frame, w, h, color, thickness=2, radius=4):
    """Draw skeleton joints and connections on a frame."""
    joints = pose_frame.get("joints", {})

    # Draw connections
    for j1_name, j2_name in SKELETON_CONNECTIONS:
        if j1_name in joints and j2_name in joints:
            p1 = (int(joints[j1_name][0] * w), int(joints[j1_name][1] * h))
            p2 = (int(joints[j2_name][0] * w), int(joints[j2_name][1] * h))
            cv2.line(frame, p1, p2, color, thickness)

    # Draw joint circles
    for name, coords in joints.items():
        pt = (int(coords[0] * w), int(coords[1] * h))
        cv2.circle(frame, pt, radius, color, -1)
