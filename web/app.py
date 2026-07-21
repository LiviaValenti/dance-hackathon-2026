"""web/app.py - Mirror Dancer — AI dance scoring with stick-figure overlay."""
import os
import sys
import uuid
from pathlib import Path

# Must insert repo root BEFORE any local module imports
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import HTMLResponse, FileResponse

from pose_extractor import extract
from scoring import score, dtw_align
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
  <div class="section-title">Skeleton Overlay</div>
  <div class="video-wrap">
    <video controls autoplay loop playsinline><source src="/video/{fn}" type="video/mp4"></video>
    <div class="legend">
      <span><span class="ldot" style="background:#00ff00"></span> Baseline</span>
      <span><span class="ldot" style="background:#ff8200"></span> Attempt</span>
    </div>
  </div>
</div>"""

    return f"""
<div class="summary">
  <div class="sc overall"><div class="sc-num">{overall}</div><div class="sc-label">Overall</div></div>
  <div class="sc form"><div class="sc-num">{form}</div><div class="sc-label">Form</div></div>
  <div class="sc timing"><div class="sc-num">{timing}</div><div class="sc-label">Timing</div></div>
</div>
{focus_html}
{overlay_html}
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
        att_frames = extract(str(a_path))

        # Clean up attempt video immediately
        try:
            os.remove(a_path)
        except Exception:
            pass

        if len(base_frames) < 2 or len(att_frames) < 2:
            return _error_page("Not enough pose data. Ensure videos show clear full-body movement.")

        result = score(base_frames, att_frames)

        overlay_video = None
        try:
            alignment = dtw_align(base_frames, att_frames)
            # Need attempt video for overlay — re-save temporarily
            with open(a_path, "wb") as f:
                f.seek(0)  # can't re-read, already consumed
            # Generate overlay from attempt frames directly
            overlay_video = _generate_overlay_from_frames(_smooth_landmarks(base_frames), _smooth_landmarks(att_frames), dance["video"], alignment)
        except Exception:
            pass

    except Exception as exc:
        return _error_page(f"Error: {exc}")

    report = _report_html(result, overlay_video).replace("{BASELINE_ID}", baseline_id)

    # Inject localStorage save script
    save_script = f"""
<script>
(function(){{'use strict';
  var entry = {{
    date: new Date().toISOString(),
    baseline_name: '{dance["name"]}',
    baseline_id: '{baseline_id}',
    overall: {result["overall"]},
    form: {result["form"]},
    timing: {result["timing"]},
    focus_area: '{result.get("focus_area","")}',
    per_joint: {result.get("per_joint",{{}})}
  }};
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

def _generate_overlay_from_frames(baseline_frames, attempt_frames, baseline_video_path, alignment):
    """Generate overlay using attempt frames + baseline video as canvas."""
    import cv2
    out_dir = "/tmp/dance-web-uploads"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"overlay-{uuid.uuid4().hex[:8]}.mp4")

    cap = cv2.VideoCapture(baseline_video_path)
    if not cap.isOpened():
        return None

    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    tmp = out_path + ".raw.mp4"
    writer = cv2.VideoWriter(tmp, fourcc, fps, (w, h))

    align_map = {}
    for b_idx, a_idx in alignment:
        if a_idx not in align_map:
            align_map[a_idx] = b_idx

    CONNS = [
        ("nose","neck"),("neck","left_shoulder"),("neck","right_shoulder"),
        ("left_shoulder","left_elbow"),("left_elbow","left_wrist"),
        ("right_shoulder","right_elbow"),("right_elbow","right_wrist"),
        ("neck","left_hip"),("neck","right_hip"),
        ("left_hip","left_knee"),("left_knee","left_ankle"),
        ("right_hip","right_knee"),("right_knee","right_ankle"),
        ("left_hip","right_hip"),
    ]

    idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        # Attempt skeleton (orange)
        if idx < len(attempt_frames):
            joints = attempt_frames[idx].get("joints", {})
            for j1, j2 in CONNS:
                if j1 in joints and j2 in joints:
                    p1 = (int(joints[j1][0]*w), int(joints[j1][1]*h))
                    p2 = (int(joints[j2][0]*w), int(joints[j2][1]*h))
                    cv2.line(frame, p1, p2, (255,130,0), 2)
            for _, c in joints.items():
                cv2.circle(frame, (int(c[0]*w), int(c[1]*h)), 3, (255,130,0), -1)
        # Baseline skeleton (green)
        if idx in align_map:
            b_idx = align_map[idx]
            if b_idx < len(baseline_frames):
                joints = baseline_frames[b_idx].get("joints", {})
                for j1, j2 in CONNS:
                    if j1 in joints and j2 in joints:
                        p1 = (int(joints[j1][0]*w), int(joints[j1][1]*h))
                        p2 = (int(joints[j2][0]*w), int(joints[j2][1]*h))
                        cv2.line(frame, p1, p2, (0,255,0), 2)
                for _, c in joints.items():
                    cv2.circle(frame, (int(c[0]*w), int(c[1]*h)), 4, (0,255,0), -1)
        writer.write(frame)
        idx += 1

    cap.release()
    writer.release()

    final = out_path
    os.system(f"ffmpeg -y -loglevel error -i {tmp} -c:v libx264 -pix_fmt yuv420p -movflags faststart {final}")
    if os.path.exists(final) and os.path.getsize(final) > 0:
        os.remove(tmp)
        return final
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
