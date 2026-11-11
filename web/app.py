"""web/app.py - Mirror Dancer — AI dance scoring with stick-figure overlay."""
import bisect
import json
import math
import os
import subprocess
import sys
import uuid
from pathlib import Path

import numpy as np

# Must insert repo root BEFORE any local module imports
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import HTMLResponse, FileResponse

from pose_extractor import extract
from scoring import score, dtw_align, angles_for_frame
from overlay import generate_overlay
from dance_lib import add_dance, list_dances, get_dance, get_poses

UPLOAD_DIR = Path("/tmp/dance-web-uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Mirror Dancer")

# Allow up to 50MB uploads for 15s video clips




# ============================================================================ #
# CSS
# ============================================================================ #
CSS = """
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#0f0f1a;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;padding:1.5rem 1rem}
  .container{max-width:600px;margin:0 auto}
  h1{font-size:1.8rem;font-weight:800;text-align:center;color:#c084fc;margin-bottom:0.25rem}
  .tagline{text-align:center;color:#94a3b8;font-size:0.95rem;margin-bottom:2.5rem;line-height:1.5}

  /* Splash options */
  .options{display:flex;flex-direction:column;gap:1rem;max-width:360px;margin:0 auto}
  .opt-btn{display:block;background:#1e1e3a;border:1px solid #2d2d52;border-radius:14px;padding:1.5rem;text-decoration:none;color:#e2e8f0;text-align:center;transition:border-color .2s,transform .1s;min-height:88px;display:flex;flex-direction:column;justify-content:center;align-items:center}
  .opt-btn:hover{border-color:#4f46e5;transform:translateY(-1px)}
  .opt-btn:active{transform:translateY(0)}
  .opt-icon{font-size:1.8rem;display:block;margin-bottom:0.4rem}
  .opt-title{font-size:1.05rem;font-weight:700;display:block}
  .opt-desc{font-size:0.78rem;color:#94a3b8;margin-top:0.2rem;display:block}

  /* Back link */
  .back{display:inline-flex;align-items:center;gap:0.4rem;color:#818cf8;text-decoration:none;font-size:0.88rem;margin-bottom:1.25rem}
  .back:hover{text-decoration:underline}

  /* Cards */
  .card{background:#1e1e3a;border:1px solid #2d2d52;border-radius:12px;padding:1.25rem;margin-bottom:1rem}
  h2{font-size:1.15rem;font-weight:700;color:#a78bfa;margin-bottom:1rem}

  /* Form elements */
  label{display:block;font-size:0.82rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem}
  select,input[type="text"],input[type="file"]{width:100%;background:#16162e;border:1px solid #2d2d52;border-radius:8px;padding:.65rem;color:#cbd5e1;font-size:.88rem;margin-bottom:1rem}
  input[type="file"]{cursor:pointer;min-height:48px;display:flex;align-items:center}
  input[type="file"]::file-selector-button{background:#4f46e5;color:#fff;border:none;border-radius:6px;padding:.5rem 1rem;font-size:.88rem;font-weight:600;cursor:pointer;margin-right:.75rem;min-height:36px}
  .hint{font-size:.75rem;color:#64748b;margin-top:-.5rem;margin-bottom:1rem}
  textarea{width:100%;background:#16162e;border:1px solid #2d2d52;border-radius:8px;padding:.65rem;color:#cbd5e1;font-size:.88rem;margin-bottom:1rem;resize:vertical;min-height:60px}

  /* Buttons */
  .btn{display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:.7rem 1.5rem;border-radius:10px;font-size:.95rem;border:none;cursor:pointer;font-weight:600;text-align:center;min-height:44px}
  .btn:hover{background:#4338ca}
  .btn-full{width:100%}
  .btn-outline{background:transparent;border:1px solid #4f46e5;color:#818cf8}
  .btn-outline:hover{background:#4f46e5;color:#fff}
  .btn:disabled{background:#2d2d52;color:#64748b;cursor:not-allowed}

  /* Step indicator */
  .step{font-size:.78rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem}
  .step-num{color:#c084fc;font-weight:700}
  .step-hidden{opacity:.35;pointer-events:none}

  /* Preview */
  #preview-container{margin-top:1rem}

  /* Score report */
  .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-bottom:1.5rem}
  .sc{background:#1e1e3a;border:1px solid #2d2d52;border-radius:12px;padding:1rem .5rem;text-align:center}
  .sc-num{font-size:2.2rem;font-weight:800;line-height:1}
  .sc-label{font-size:.75rem;color:#94a3b8;margin-top:.3rem;text-transform:uppercase;letter-spacing:.05em}
  .overall .sc-num{color:#c084fc} .form .sc-num{color:#4ade80} .timing .sc-num{color:#60a5fa}
  .focus-box{background:#1e1e3a;border:1px solid #f87171;border-left:4px solid #f87171;border-radius:8px;padding:.75rem 1rem;margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center}
  .focus-label{font-size:.75rem;color:#f87171;text-transform:uppercase;letter-spacing:.05em}
  .focus-value{font-size:1.1rem;font-weight:700;color:#fca5a5}
  .section-title{font-size:.85rem;color:#94a3b8;margin-bottom:.6rem;text-transform:uppercase;letter-spacing:.06em}
  .table-wrap{background:#1e1e3a;border:1px solid #2d2d52;border-radius:10px;overflow:hidden;margin-bottom:1rem}
  table{width:100%;border-collapse:collapse}
  th{font-size:.72rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;padding:.65rem .75rem;text-align:left;background:#16162e}
  th:not(:first-child){text-align:right}
  td{padding:.65rem .75rem;border-top:1px solid #2d2d52;vertical-align:middle}
  .jname{font-size:.88rem} .snum,.dnum{text-align:right;font-size:.88rem;font-variant-numeric:tabular-nums}
  .bcell{width:100px} .bbg{background:#2d2d52;border-radius:4px;height:8px;overflow:hidden} .bfill{height:100%;border-radius:4px}

  /* Overlay video */
  .overlay-section{margin-bottom:1.5rem}
  .video-wrap{background:#1e1e3a;border:1px solid #2d2d52;border-radius:12px;padding:1rem}
  .video-wrap video{width:100%;border-radius:8px;background:#000}
  .legend{display:flex;gap:1rem;justify-content:center;margin-top:.75rem;font-size:.82rem;color:#94a3b8}
  .ldot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;vertical-align:middle}

  /* Progress list */
  .progress-item{background:#1e1e3a;border:1px solid #2d2d52;border-radius:10px;padding:1rem;margin-bottom:.75rem;cursor:pointer;transition:border-color .2s}
  .progress-item:hover{border-color:#4f46e5}
  .pi-date{font-size:.78rem;color:#64748b}
  .pi-name{font-size:1rem;font-weight:600;color:#e2e8f0;margin-top:.15rem}
  .pi-score{font-size:1.6rem;font-weight:800;color:#c084fc;margin-top:.15rem}
  .pi-focus{font-size:.82rem;color:#f87171;margin-top:.15rem}
  .pi-detail{display:none;margin-top:.75rem;padding-top:.75rem;border-top:1px solid #2d2d52}
  .progress-item.expanded .pi-detail{display:block}
  .empty-state{text-align:center;color:#64748b;padding:3rem 1rem}
  .empty-state p{margin-top:.5rem;font-size:.88rem}
  .practice-again{display:inline-block;margin-top:.75rem}
"""

# ============================================================================ #
# Page wrapper
# ============================================================================ #
def _page(title: str, body: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover">
<meta name="theme-color" content="#c084fc">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Mirror Dancer">
<link rel="manifest" href="/manifest.json">
<link rel="apple-touch-icon" href="/icon-192.png">
<title>{title}</title>
<style>{CSS}</style>
</head>
<body>
<div class="container">
{body}
</div>
</body>
</html>"""


def _error_page(msg: str) -> HTMLResponse:
    body = f"""<a class="back" href="/">&#8592; Mirror Dancer</a>
<div class="card" style="text-align:center">
  <h2 style="color:#f87171;margin-bottom:.75rem">Something went wrong</h2>
  <p style="color:#94a3b8;margin-bottom:1.5rem;line-height:1.6">{msg}</p>
  <a class="btn btn-outline" href="/">Back to Home</a>
</div>"""
    return HTMLResponse(content=_page("Error", body))


def _score_color(s: int) -> str:
    return "#4ade80" if s >= 70 else "#fb923c" if s >= 40 else "#f87171"


def _timeline_html(timeline: list[dict]) -> str:
    """Bar per time bucket; click a bar to jump the comparison video to that moment."""
    if not timeline:
        return ""
    bars = "".join(
        f'<div class="tl-bar" data-t="{b["start"]}" '
        f'title="{b["start"]:.1f}s · {b["score"]} · worst: {b["worst_joint"]} ({b["worst_error_deg"]}&deg; off)" '
        f'style="height:{max(4, b["score"])}%;background:{_score_color(b["score"])}"></div>'
        for b in timeline
    )
    weakest = sorted(timeline, key=lambda b: b["score"])[:3]
    moments = "".join(
        f'<li><a href="#" class="tl-jump" data-t="{b["start"]}">{b["start"]:.1f}s</a> '
        f'&mdash; {b["worst_joint"]} is {b["worst_error_deg"]}&deg; off (score {b["score"]})</li>'
        for b in weakest if b["score"] < 100
    )
    moments_html = f'<div class="section-title">Moments to practice</div><ul class="tl-moments">{moments}</ul>' if moments else ""
    return f"""<div class="section-title">Score Over Time</div>
<div class="tl-chart">{bars}</div>
<div class="tl-axis"><span>0s</span><span>{timeline[-1]["start"]:.1f}s</span></div>
{moments_html}
<style>
.tl-chart{{display:flex;align-items:flex-end;gap:2px;height:110px;padding:6px;background:rgba(255,255,255,.04);border-radius:10px}}
.tl-bar{{flex:1;min-width:3px;border-radius:3px 3px 0 0;cursor:pointer;opacity:.85}}
.tl-bar:hover{{opacity:1;outline:1px solid #fff}}
.tl-axis{{display:flex;justify-content:space-between;font-size:.75rem;opacity:.6;margin:4px 2px 14px}}
.tl-moments{{margin:0 0 16px 1.1rem;line-height:1.7}}
.tl-moments a{{color:#a78bfa}}
</style>
<script>
document.querySelectorAll('.tl-bar,.tl-jump').forEach(function(el){{
  el.addEventListener('click',function(e){{
    e.preventDefault();
    var v=document.getElementById('cmp-video');
    if(v){{v.currentTime=parseFloat(el.dataset.t);v.play();v.scrollIntoView({{behavior:'smooth',block:'center'}});}}
  }});
}});
</script>"""


def _report_html(result: dict, overlay_video: str = None) -> str:
    overall = result.get("overall", 0)
    form = result.get("form", 0)
    timing = result.get("timing", 0)
    focus = result.get("focus_area", "")

    rows = ""
    for feat, data in sorted(result.get("per_joint", {}).items(), key=lambda kv: kv[1]["score"]):
        bw = max(1, int(data["score"]))
        bc = "#4ade80" if data["score"] >= 70 else "#fb923c" if data["score"] >= 40 else "#f87171"
        rows += f'<tr><td class="jname">{feat.replace("_"," ").title()}</td><td class="snum">{data["score"]}</td><td class="dnum">{data["mean_error_deg"]:.1f}&deg;</td><td class="bcell"><div class="bbg"><div class="bfill" style="width:{bw}%;background:{bc}"></div></div></td></tr>'

    focus_html = f'<div class="focus-box"><span class="focus-label">Focus Area</span><span class="focus-value">{focus}</span></div>' if focus else ""

    overlay_html = ""
    if overlay_video:
        fn = Path(overlay_video).name
        overlay_html = f"""<div class="overlay-section">
  <div class="section-title">Side-by-Side Comparison</div>
  <div class="video-wrap">
    <video id="cmp-video" controls autoplay loop muted playsinline><source src="/video/{fn}" type="video/mp4"></video>
    <div class="legend">
      <span><span class="ldot" style="background:#00ff00"></span> Reference (green ghost on you = where you should be)</span>
      <span><span class="ldot" style="background:#ff8200"></span> You</span>
    </div>
  </div>
</div>"""

    timeline_html = _timeline_html(result.get("timeline", []))

    return f"""
<div class="summary">
  <div class="sc overall"><div class="sc-num">{overall}</div><div class="sc-label">Overall</div></div>
  <div class="sc form"><div class="sc-num">{form}</div><div class="sc-label">Form</div></div>
  <div class="sc timing"><div class="sc-num">{timing}</div><div class="sc-label">Timing</div></div>
</div>
{focus_html}
{overlay_html}
{timeline_html}
<div class="section-title">Per-Joint Breakdown (worst first)</div>
<div class="table-wrap">
  <table><thead><tr><th>Joint</th><th>Score</th><th>Error</th><th></th></tr></thead><tbody>{rows}</tbody></table>
</div>
<a class="btn btn-outline practice-again" href="/score?baseline={{BASELINE_ID}}">&#8592; Score Another</a>"""


# ============================================================================ #
# SCREEN 1: Splash
# ============================================================================ #
@app.get("/", response_class=HTMLResponse)
def splash():
    body = """
<h1>Mirror Dancer</h1>
<p class="tagline">See your movement. Master your form.</p>
<div class="options">
  <a class="opt-btn" href="/score">
    <span class="opt-icon">&#127916;</span>
    <span class="opt-title">Score a Dance</span>
    <span class="opt-desc">Compare your attempt to a baseline</span>
  </a>
  <a class="opt-btn" href="/add">
    <span class="opt-icon">&#10133;</span>
    <span class="opt-title">Add Baseline</span>
    <span class="opt-desc">Upload a new reference dance</span>
  </a>
  <a class="opt-btn" href="/progress">
    <span class="opt-icon">&#128202;</span>
    <span class="opt-title">My Progress</span>
    <span class="opt-desc">Review scores and focus areas</span>
  </a>
</div>"""
    return HTMLResponse(content=_page("Mirror Dancer", body))


# ============================================================================ #
# SCREEN 2: Score a Dance
# ============================================================================ #
@app.get("/score", response_class=HTMLResponse)
def score_page(baseline: str = None):
    dances = list_dances()
    if not dances:
        return _error_page("No baselines in the library yet. <a href='/add' class='btn btn-outline'>Add one first</a>")

    options = ""
    for d in dances:
        sel = " selected" if baseline and d["id"] == baseline else ""
        options += f'<option value="{d["id"]}"{sel}>{d["name"]} ({d["frame_count"]} frames)</option>'

    # If baseline pre-selected, Step 2 is visible
    step2_cls = "" if baseline else "step-hidden"

    body = f"""
<a class="back" href="/">&#8592; Mirror Dancer</a>
<h2>Score a Dance</h2>
<div class="card">
  <form action="/score" enctype="multipart/form-data" method="post" id="scoreForm">
    <div class="step"><span class="step-num">Step 1</span> — Choose Baseline</div>
    <select id="baseline_id" name="baseline_id" onchange="onBaselineChange(this.value)">
      <option value="">-- select a baseline --</option>
      {options}
    </select>
    <div id="preview-container"></div>

    <div id="step2" class="{step2_cls}">
      <div class="step" style="margin-top:1.5rem"><span class="step-num">Step 2</span> — Upload Your Attempt</div>
      <label for="attempt">Attempt Video</label>
      <input type="file" id="attempt" name="attempt" accept="video/*" capture="environment" required>
      <p class="hint">The performance you want scored against the baseline.</p>
      <button class="btn btn-full" type="submit" id="scoreBtn">Score My Dance</button>
    </div>
  </form>
</div>
<script>
(function(){{'use strict';
  var sel = document.getElementById('baseline_id');
  var step2 = document.getElementById('step2');
  var preview = document.getElementById('preview-container');
  var btn = document.getElementById('scoreBtn');
  var att = document.getElementById('attempt');

  function onBaselineChange(id) {{
    if (!id) {{ step2.className='step-hidden'; preview.innerHTML=''; return; }}
    step2.className='';
    preview.innerHTML='<div class="video-wrap"><p style="color:#a78bfa;text-align:center">Loading reference...</p></div>';
    fetch('/preview/'+id).then(function(r){{return r.text()}}).then(function(html){{preview.innerHTML=html}}).catch(function(){{preview.innerHTML='<p style="color:#f87171;text-align:center">Preview unavailable</p>'}});
    checkReady();
  }}
  function checkReady() {{ btn.disabled = !(sel.value && att.files.length); }}
  att.addEventListener('change', checkReady);
  sel.addEventListener('change', function(){{ onBaselineChange(sel.value); }});
  // Auto-load if pre-selected
  if (sel.value) onBaselineChange(sel.value);
  checkReady();
}})();
</script>"""
    return HTMLResponse(content=_page("Score a Dance", body))


@app.post("/score", response_class=HTMLResponse)
async def score_route(baseline_id: str = Form(...), attempt: UploadFile = File(...)):
    try:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

        base_frames = get_poses(baseline_id)
        dance = get_dance(baseline_id)
        if not base_frames or not dance:
            return _error_page("Baseline not found in library.")

        a_path = UPLOAD_DIR / f"{uuid.uuid4().hex}_{attempt.filename}"
        with open(a_path, "wb") as f:
            f.write(await attempt.read())
        try:
            att_frames = extract(str(a_path))

            if len(base_frames) < 2 or len(att_frames) < 2:
                return _error_page("Not enough pose data. Ensure videos show clear full-body movement.")

            result = score(base_frames, att_frames)

            overlay_video = None
            try:
                alignment = dtw_align(
                    [angles_for_frame(f) for f in base_frames],
                    [angles_for_frame(f) for f in att_frames],
                )
                overlay_video = _generate_overlay_from_frames(
                    _smooth_landmarks(base_frames), _smooth_landmarks(att_frames),
                    dance["video"], str(a_path), alignment,
                )
            except Exception as exc:
                print(f"Overlay generation failed: {exc!r}", file=sys.stderr)
        finally:
            # Attempt video (and its pose cache) is never persisted
            for p in (a_path, Path(f"{a_path}.poses.json")):
                try:
                    os.remove(p)
                except OSError:
                    pass

    except Exception as exc:
        return _error_page(f"Error: {exc}")

    report = _report_html(result, overlay_video).replace("{BASELINE_ID}", baseline_id)

    # Inject localStorage save script
    entry_json = json.dumps({
        "baseline_name": dance["name"],
        "baseline_id": baseline_id,
        "overall": result["overall"],
        "form": result["form"],
        "timing": result["timing"],
        "focus_area": result.get("focus_area") or "",
        "per_joint": result.get("per_joint", {}),
    }).replace("</", "<\\/")
    save_script = f"""
<script>
(function(){{'use strict';
  var entry = Object.assign({{date: new Date().toISOString()}}, {entry_json});
  var hist = JSON.parse(localStorage.getItem('mirror-dancer-history')||'[]');
  hist.unshift(entry);
  if (hist.length > 50) hist = hist.slice(0,50);
  localStorage.setItem('mirror-dancer-history', JSON.stringify(hist));
}})();
</script>"""

    body = f"""<a class="back" href="/">&#8592; Mirror Dancer</a>
<h2>Dance Score</h2>
{report}"""
    return HTMLResponse(content=_page("Score Report", body) + save_script)



def _smooth_landmarks(frames: list[dict], alpha: float = 0.3) -> list[dict]:
    """Apply exponential moving average to joint positions across frames.
    alpha=0.3 means 30% new data, 70% history — smooths jitter on fast movement.
    """
    smoothed = []
    prev_joints = None
    for frame in frames:
        joints = frame.get("joints", {})
        if prev_joints is None:
            smoothed_joints = {k: list(v) for k, v in joints.items()}
        else:
            smoothed_joints = {}
            for k, v in joints.items():
                if k in prev_joints:
                    smoothed_joints[k] = [
                        alpha * v[0] + (1 - alpha) * prev_joints[k][0],
                        alpha * v[1] + (1 - alpha) * prev_joints[k][1],
                    ]
                else:
                    smoothed_joints[k] = list(v)
        prev_joints = smoothed_joints
        new_frame = dict(frame)
        new_frame["joints"] = smoothed_joints
        smoothed.append(new_frame)
    return smoothed

_SKELETON_CONNS = [
    ("left_shoulder", "right_shoulder"),
    ("left_shoulder", "left_elbow"), ("left_elbow", "left_wrist"),
    ("right_shoulder", "right_elbow"), ("right_elbow", "right_wrist"),
    ("left_shoulder", "left_hip"), ("right_shoulder", "right_hip"),
    ("left_hip", "right_hip"),
    ("left_hip", "left_knee"), ("left_knee", "left_ankle"),
    ("right_hip", "right_knee"), ("right_knee", "right_ankle"),
]
_GREEN = (0, 255, 0)
_ORANGE = (0, 130, 255)  # BGR
_OVERLAY_HEIGHT = 640


def _nearest_pose_idx(times: list[float], t: float, max_gap: float = 0.25):
    """Index of the pose frame closest to time t, or None if none within max_gap seconds."""
    i = bisect.bisect_left(times, t)
    best = None
    for c in (i - 1, i):
        if 0 <= c < len(times) and (best is None or abs(times[c] - t) < abs(times[best] - t)):
            best = c
    if best is None or abs(times[best] - t) > max_gap:
        return None
    return best


def _to_pixels(joints: dict, w: int, h: int) -> dict:
    return {k: (v[0] * w, v[1] * h) for k, v in joints.items()}


def _fit_to_body(src: dict, dst: dict) -> dict | None:
    """Translate/scale the src skeleton (pixels) onto dst's hip centre and torso length."""
    need = ("left_shoulder", "right_shoulder", "left_hip", "right_hip")
    if not all(k in src and k in dst for k in need):
        return None

    def anchor(p):
        hip = ((p["left_hip"][0] + p["right_hip"][0]) / 2, (p["left_hip"][1] + p["right_hip"][1]) / 2)
        sh = ((p["left_shoulder"][0] + p["right_shoulder"][0]) / 2, (p["left_shoulder"][1] + p["right_shoulder"][1]) / 2)
        return hip, math.hypot(sh[0] - hip[0], sh[1] - hip[1])

    (shx, shy), s_len = anchor(src)
    (dhx, dhy), d_len = anchor(dst)
    if s_len < 1e-6:
        return None
    k = d_len / s_len
    return {n: (dhx + (x - shx) * k, dhy + (y - shy) * k) for n, (x, y) in src.items()}


def _draw_skeleton(img, pts: dict, color, thickness: int):
    import cv2
    for a, b in _SKELETON_CONNS:
        if a in pts and b in pts:
            cv2.line(img, tuple(map(int, pts[a])), tuple(map(int, pts[b])), color, thickness, cv2.LINE_AA)
    for n, p in pts.items():
        if n not in ("nose", "neck"):
            cv2.circle(img, tuple(map(int, p)), thickness + 2, color, -1, cv2.LINE_AA)


def _label(img, text: str, color):
    import cv2
    (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)
    cv2.rectangle(img, (6, 6), (18 + tw, 18 + th), (0, 0, 0), -1)
    cv2.putText(img, text, (12, 12 + th), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2, cv2.LINE_AA)


def _generate_overlay_from_frames(baseline_frames, attempt_frames, baseline_video_path, attempt_video_path, alignment):
    """Side-by-side video: reference (left, green) | attempt (right, orange + green ghost of reference).

    Driven by the attempt video's timeline; the reference side jumps to the DTW-aligned moment.
    """
    import cv2
    out_dir = "/tmp/dance-web-uploads"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"overlay-{uuid.uuid4().hex[:8]}.mp4")

    a_cap = cv2.VideoCapture(attempt_video_path)
    b_cap = cv2.VideoCapture(baseline_video_path)
    if not a_cap.isOpened() or not b_cap.isOpened():
        return None

    fps = a_cap.get(cv2.CAP_PROP_FPS) or 30.0
    b_fps = b_cap.get(cv2.CAP_PROP_FPS) or 30.0
    H = _OVERLAY_HEIGHT

    def scaled_size(cap):
        # Use a decoded frame (not CAP_PROP_FRAME_*) so phone rotation metadata is respected
        ok, img = cap.read()
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        if not ok:
            return (H, H)
        h, w = img.shape[:2]
        return (int(round(w * H / h)) // 2 * 2, H)

    bw, _ = scaled_size(b_cap)
    aw, _ = scaled_size(a_cap)

    tmp = out_path + ".raw.mp4"
    writer = cv2.VideoWriter(tmp, cv2.VideoWriter_fourcc(*"mp4v"), fps, (bw + aw, H))

    # attempt pose idx -> baseline pose idx (first match along the DTW path)
    align_map: dict[int, int] = {}
    for b_idx, a_idx in alignment:
        align_map.setdefault(a_idx, b_idx)

    a_times = [f["time"] for f in attempt_frames]
    b_frame_img = None
    b_frame_no = -1
    last_b_idx = 0
    a_frame_no = 0

    while True:
        ok, a_img = a_cap.read()
        if not ok:
            break
        a_img = cv2.resize(a_img, (aw, H))
        t = a_frame_no / fps
        a_idx = _nearest_pose_idx(a_times, t)
        b_idx = align_map.get(a_idx, last_b_idx) if a_idx is not None else last_b_idx
        last_b_idx = b_idx

        # Advance reference video to the aligned timestamp (DTW path is monotonic, so mostly forward reads)
        target = int(baseline_frames[b_idx]["time"] * b_fps)
        if target < b_frame_no or target - b_frame_no > 30:
            b_cap.set(cv2.CAP_PROP_POS_FRAMES, target)
            b_frame_no = target - 1
        while b_frame_no < target:
            ok_b, img = b_cap.read()
            if not ok_b:
                break
            b_frame_img, b_frame_no = img, b_frame_no + 1
        b_img = cv2.resize(b_frame_img, (bw, H)) if b_frame_img is not None else np.zeros((H, bw, 3), np.uint8)

        b_pts = _to_pixels(baseline_frames[b_idx]["joints"], bw, H)
        _draw_skeleton(b_img, b_pts, _GREEN, 3)

        if a_idx is not None:
            a_pts = _to_pixels(attempt_frames[a_idx]["joints"], aw, H)
            ghost = _fit_to_body(b_pts, a_pts)
            if ghost:
                _draw_skeleton(a_img, ghost, _GREEN, 2)
            _draw_skeleton(a_img, a_pts, _ORANGE, 3)

        _label(b_img, "Reference", _GREEN)
        _label(a_img, "You", _ORANGE)
        writer.write(np.hstack([b_img, a_img]))
        a_frame_no += 1

    a_cap.release()
    b_cap.release()
    writer.release()

    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-c:v", "libx264",
         "-pix_fmt", "yuv420p", "-movflags", "faststart", out_path],
        check=False,
    )
    if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
        os.remove(tmp)
        return out_path
    return tmp


# ============================================================================ #
# SCREEN 3: Add Baseline
# ============================================================================ #
@app.get("/add", response_class=HTMLResponse)
def add_page():
    body = """
<a class="back" href="/">&#8592; Mirror Dancer</a>
<h2>Add Baseline</h2>
<div class="card">
  <form action="/add" enctype="multipart/form-data" method="post">
    <label for="name">Dance Name</label>
    <input type="text" id="name" name="name" placeholder="e.g. Phase 2 Windmill" required>
    <label for="video">Dance Video</label>
    <input type="file" id="video" name="video" accept="video/*" capture="environment" required>
    <p class="hint">Upload a clear video of the reference dance.</p>
    <label for="desc">Description (optional)</label>
    <textarea id="desc" name="desc" placeholder="Notes about this dance..."></textarea>
    <button class="btn btn-full" type="submit">Add to Library</button>
  </form>
</div>"""
    return HTMLResponse(content=_page("Add Baseline", body))


@app.post("/add", response_class=HTMLResponse)
async def add_dance_route(name: str = Form(...), video: UploadFile = File(...), desc: str = Form("")):
    try:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        tmp_path = UPLOAD_DIR / f"upload-{uuid.uuid4().hex[:8]}{Path(video.filename).suffix}"
        with open(tmp_path, "wb") as f:
            f.write(await video.read())

        entry = add_dance(name, str(tmp_path), desc)
        os.remove(tmp_path)
    except Exception as exc:
        return _error_page(f"Failed to add dance: {exc}")

    body = f"""
<a class="back" href="/">&#8592; Mirror Dancer</a>
<div class="card" style="text-align:center">
  <h2 style="color:#4ade80;margin-bottom:.75rem">Baseline Added!</h2>
  <p style="color:#94a3b8;margin-bottom:1rem">{entry['name']} &mdash; {entry['frame_count']} frames extracted and cached.</p>
  <a class="btn" href="/score?baseline={entry['id']}">Score Against It</a>
  <a class="btn btn-outline" href="/" style="margin-left:.5rem">Back to Home</a>
</div>"""
    return HTMLResponse(content=_page("Baseline Added", body))


# ============================================================================ #
# SCREEN 4: My Progress
# ============================================================================ #
@app.get("/progress", response_class=HTMLResponse)
def progress_page():
    body = """
<a class="back" href="/">&#8592; Mirror Dancer</a>
<h2>My Progress</h2>
<div id="history-list"></div>
<div id="empty-state" class="empty-state" style="display:none">
  <p>No scores yet.</p>
  <a class="btn btn-outline" href="/score" style="margin-top:1rem">Score a Dance</a>
</div>
<script>
(function(){'use strict';
  var hist = JSON.parse(localStorage.getItem('mirror-dancer-history')||'[]');
  var list = document.getElementById('history-list');
  var empty = document.getElementById('empty-state');

  if (!hist.length) { empty.style.display='block'; return; }

  var html = '';
  hist.forEach(function(h, i) {
    var d = new Date(h.date);
    var dateStr = d.toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'});
    var rows = '';
    if (h.per_joint) {
      Object.keys(h.per_joint).sort(function(a,b){return h.per_joint[a].score - h.per_joint[b].score}).forEach(function(k) {
        var j = h.per_joint[k];
        var bw = Math.max(1, j.score);
        var bc = j.score >= 70 ? '#4ade80' : j.score >= 40 ? '#fb923c' : '#f87171';
        rows += '<tr><td class=\"jname\">' + k.replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase()}) + '</td><td class=\"snum\">' + j.score + '</td><td class=\"dnum\">' + j.mean_error_deg.toFixed(1) + '&deg;</td><td class=\"bcell\"><div class=\"bbg\"><div class=\"bfill\" style=\"width:'+bw+'%;background:'+bc+'\"></div></div></td></tr>';
      });
    }
    html += '<div class=\"progress-item\" onclick=\"this.classList.toggle(\\'expanded\\')\" id=\"item-'+i+'\">';
    html += '<div class=\"pi-date\">' + dateStr + '</div>';
    html += '<div class=\"pi-name\">' + (h.baseline_name||'Unknown') + '</div>';
    html += '<div class=\"pi-score\">' + h.overall + ' <span style=\"font-size:.9rem;color:#94a3b8\">Overall</span></div>';
    if (h.focus_area) html += '<div class=\"pi-focus\">Focus: ' + h.focus_area + '</div>';
    html += '<div class=\"pi-detail\">';
    html += '<div class=\"summary\" style=\"margin-bottom:1rem\"><div class=\"sc overall\"><div class=\"sc-num\">' + h.overall + '</div><div class=\"sc-label\">Overall</div></div><div class=\"sc form\"><div class=\"sc-num\">' + h.form + '</div><div class=\"sc-label\">Form</div></div><div class=\"sc timing\"><div class=\"sc-num\">' + h.timing + '</div><div class=\"sc-label\">Timing</div></div></div>';
    if (rows) html += '<div class=\"table-wrap\"><table><thead><tr><th>Joint</th><th>Score</th><th>Error</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    html += '<a class=\"btn btn-outline practice-again\" href=\"/score?baseline=' + h.baseline_id + '\">Practice Again</a>';
    html += '</div></div>';
  });

  list.innerHTML = html;
}})();
</script>"""
    return HTMLResponse(content=_page("My Progress", body))


# ============================================================================ #
# API endpoints
# ============================================================================ #
@app.get("/preview/{dance_id}", response_class=HTMLResponse)
async def preview(dance_id: str):
    entry = get_dance(dance_id)
    if not entry:
        return HTMLResponse(content="Not found", status_code=404)
    video_path = entry.get("video", "")
    if video_path and Path(video_path).exists():
        fn = Path(video_path).name
        return HTMLResponse(content=f"""
<div class="video-wrap">
  <div class="section-title" style="margin-bottom:.5rem">Reference: {entry['name']}</div>
  <video controls autoplay loop playsinline><source src="/library-video/{fn}" type="video/mp4"></video>
</div>""")
    return HTMLResponse(content='<p style="color:#94a3b8;text-align:center">Preview not available</p>')


@app.get("/video/{filename}")
async def serve_video(filename: str):
    p = UPLOAD_DIR / filename
    if not p.exists():
        return HTMLResponse(content="Not found", status_code=404)
    return FileResponse(str(p), media_type="video/mp4")


@app.get("/library-video/{filename}")
async def serve_library_video(filename: str):
    from dance_lib import VIDEOS_DIR
    p = VIDEOS_DIR / filename
    if not p.exists():
        return HTMLResponse(content="Not found", status_code=404)
    return FileResponse(str(p), media_type="video/mp4")


@app.get("/manifest.json")
async def serve_manifest():
    from fastapi.responses import FileResponse as FR
    p = REPO_ROOT / "web" / "manifest.json"
    return FR(str(p), media_type="application/manifest+json")


@app.get("/icon-192.png")
async def serve_icon192():
    from fastapi.responses import FileResponse as FR
    p = REPO_ROOT / "web" / "icon-192.png"
    return FR(str(p), media_type="image/png")


@app.get("/icon-512.png")
async def serve_icon512():
    from fastapi.responses import FileResponse as FR
    p = REPO_ROOT / "web" / "icon-512.png"
    return FR(str(p), media_type="image/png")


@app.get("/thumb/{dance_id}")
async def serve_thumb(dance_id: str):
    entry = get_dance(dance_id)
    if not entry:
        return HTMLResponse(content="Not found", status_code=404)
    thumb = entry.get("thumbnail", "")
    if not thumb or not Path(thumb).exists():
        return HTMLResponse(content="Not found", status_code=404)
    return FileResponse(str(thumb), media_type="image/png")
