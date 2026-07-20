"""web/app.py - Dance Score Demo with Library support."""
import os
import sys
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import HTMLResponse, FileResponse

# Repo root is one level above the web/ directory.
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from pose_extractor import extract
from scoring import score, dtw_align
from overlay import generate_overlay
from dance_lib import add_dance, list_dances, get_dance, get_poses

UPLOAD_DIR = Path("/tmp/dance-web-uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Dance Score Demo")

# --------------------------------------------------------------------------- #
# HTML helpers
# --------------------------------------------------------------------------- #
DARK_STYLE = """
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f0f1a; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-height: 100vh; padding: 1.5rem 1rem; }
  .container { max-width: 600px; margin: 0 auto; }
  h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: 1.5rem; text-align: center; color: #c084fc; }
  h2 { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.75rem; color: #a78bfa; }
  .card { background: #1e1e3a; border: 1px solid #2d2d52; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; }
  .btn { display: inline-block; background: #4f46e5; color: #fff; text-decoration: none; padding: 0.65rem 1.5rem; border-radius: 8px; font-size: 0.95rem; border: none; cursor: pointer; font-weight: 600; text-align: center; }
  .btn:hover { background: #4338ca; }
  .btn-full { width: 100%; }
  .btn-sm { padding: 0.4rem 0.9rem; font-size: 0.82rem; border-radius: 6px; }
  .btn-outline { background: transparent; border: 1px solid #4f46e5; color: #818cf8; }
  .btn-outline:hover { background: #4f46e5; color: #fff; }
  .btn-danger { background: #991b1b; }
  .btn-danger:hover { background: #7f1d1d; }
  label { display: block; font-size: 0.82rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.5rem; }
  input[type="file"] { width: 100%; background: #16162e; border: 1px solid #2d2d52; border-radius: 8px; padding: 0.6rem; color: #cbd5e1; font-size: 0.88rem; margin-bottom: 1rem; cursor: pointer; }
  input[type="text"], select { width: 100%; background: #16162e; border: 1px solid #2d2d52; border-radius: 8px; padding: 0.6rem; color: #cbd5e1; font-size: 0.88rem; margin-bottom: 1rem; }
  .hint { font-size: 0.75rem; color: #64748b; margin-top: -0.5rem; margin-bottom: 1rem; }
  .divider { display: flex; align-items: center; gap: 0.75rem; margin: 1rem 0; color: #475569; font-size: 0.78rem; }
  .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #2d2d52; }
  a { color: #818cf8; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .nav { display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .nav a { padding: 0.4rem 1rem; border-radius: 8px; font-size: 0.85rem; }
  .nav .active { background: #4f46e5; color: #fff; }
  .nav .inactive { background: #1e1e3a; border: 1px solid #2d2d52; }

  /* Library grid */
  .dance-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.75rem; }
  .dance-card { background: #1e1e3a; border: 1px solid #2d2d52; border-radius: 10px; overflow: hidden; cursor: pointer; transition: border-color 0.2s; }
  .dance-card:hover { border-color: #4f46e5; }
  .dance-thumb { width: 100%; aspect-ratio: 16/9; background: #16162e; object-fit: cover; }
  .dance-info { padding: 0.5rem 0.65rem; }
  .dance-name { font-size: 0.88rem; font-weight: 600; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dance-meta { font-size: 0.72rem; color: #64748b; margin-top: 0.15rem; }
  .empty-state { text-align: center; color: #64748b; padding: 3rem 1rem; }
  .empty-state p { margin-top: 0.5rem; font-size: 0.88rem; }

  /* Score report */
  .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; }
  .score-card { background: #1e1e3a; border: 1px solid #2d2d52; border-radius: 12px; padding: 1rem 0.5rem; text-align: center; }
  .score-num { font-size: 2.2rem; font-weight: 800; line-height: 1; }
  .score-label { font-size: 0.75rem; color: #94a3b8; margin-top: 0.3rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .overall .score-num { color: #c084fc; }
  .form .score-num { color: #4ade80; }
  .timing .score-num { color: #60a5fa; }
  .focus-box { background: #1e1e3a; border: 1px solid #f87171; border-left: 4px solid #f87171; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
  .focus-label { font-size: 0.75rem; color: #f87171; text-transform: uppercase; letter-spacing: 0.05em; }
  .focus-value { font-size: 1.1rem; font-weight: 700; color: #fca5a5; }
  .section-title { font-size: 0.85rem; color: #94a3b8; margin-bottom: 0.6rem; text-transform: uppercase; letter-spacing: 0.06em; }
  .table-wrap { background: #1e1e3a; border: 1px solid #2d2d52; border-radius: 10px; overflow: hidden; margin-bottom: 1rem; }
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.65rem 0.75rem; text-align: left; background: #16162e; }
  th:not(:first-child) { text-align: right; }
  td { padding: 0.65rem 0.75rem; border-top: 1px solid #2d2d52; vertical-align: middle; }
  .joint-name { font-size: 0.88rem; }
  .score-num-td, .deg-num { text-align: right; font-size: 0.88rem; font-variant-numeric: tabular-nums; }
  .bar-cell { width: 100px; }
  .bar-bg { background: #2d2d52; border-radius: 4px; height: 8px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; }
  .overlay-section { margin-bottom: 1.5rem; }
  .video-wrap { background: #1e1e3a; border: 1px solid #2d2d52; border-radius: 12px; padding: 1rem; }
  .video-wrap video { width: 100%; border-radius: 8px; background: #000; }
  .legend { display: flex; gap: 1rem; justify-content: center; margin-top: 0.75rem; font-size: 0.82rem; color: #94a3b8; }
  .legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
  .back-link { display: inline-block; margin-top: 1.5rem; color: #818cf8; text-decoration: none; font-size: 0.9rem; }
  .back-link:hover { text-decoration: underline; }
  .processing { text-align: center; padding: 2rem; color: #a78bfa; }
  .processing .spinner { display: inline-block; width: 24px; height: 24px; border: 3px solid #2d2d52; border-top-color: #a78bfa; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
"""


def _page(title: str, body: str, active_nav: str = "library") -> str:
    nav_links = [
        ("library", "Library", "/"),
        ("score", "Score", "/score"),
        ("add", "Add Dance", "/add"),
    ]
    nav_html = ""
    for key, label, href in nav_links:
        cls = "active" if key == active_nav else "inactive"
        nav_html += f'<a class="{cls}" href="{href}">{label}</a>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>{DARK_STYLE}</style>
</head>
<body>
  <div class="container">
    <h1>Dance Score</h1>
    <div class="nav">{nav_html}</div>
    {body}
  </div>
</body>
</html>"""


def _error_page(message: str) -> HTMLResponse:
    body = f"""<div class="card" style="text-align:center;">
      <h2 style="color:#f87171; margin-bottom:0.75rem;">Something went wrong</h2>
      <p style="color:#94a3b8; margin-bottom:1.5rem; line-height:1.6;">{message}</p>
      <a class="btn btn-outline" href="/">Back to Library</a>
    </div>"""
    return HTMLResponse(content=_page("Error", body))


def _render_report(result: dict, overlay_video: str = None) -> str:
    overall = result.get("overall", 0)
    form = result.get("form", 0)
    timing = result.get("timing", 0)
    focus = result.get("focus_area", "")

    rows_html = ""
    for feat, data in sorted(result.get("per_joint", {}).items(), key=lambda kv: kv[1]["score"]):
        bar_width = max(1, int(data["score"]))
        bar_color = "#4ade80" if data["score"] >= 70 else "#fb923c" if data["score"] >= 40 else "#f87171"
        rows_html += f"""
        <tr>
          <td class="joint-name">{feat.replace("_", " ").title()}</td>
          <td class="score-num-td">{data["score"]}</td>
          <td class="deg-num">{data["mean_error_deg"]:.1f}&deg;</td>
          <td class="bar-cell">
            <div class="bar-bg"><div class="bar-fill" style="width:{bar_width}%;background:{bar_color}"></div></div>
          </td>
        </tr>"""

    focus_html = ""
    if focus:
        focus_html = f"""<div class="focus-box">
          <span class="focus-label">Focus Area</span>
          <span class="focus-value">{focus}</span>
        </div>"""

    overlay_html = ""
    if overlay_video:
        fname = Path(overlay_video).name
        overlay_html = f"""
    <div class="overlay-section">
      <div class="section-title">Skeleton Overlay</div>
      <div class="video-wrap">
        <video controls autoplay loop playsinline>
          <source src="/video/{fname}" type="video/mp4">
        </video>
        <div class="legend">
          <span><span class="legend-dot" style="background:#00ff00"></span> Baseline</span>
          <span><span class="legend-dot" style="background:#ff8200"></span> Attempt</span>
        </div>
      </div>
    </div>"""

    return f"""
    <div class="summary">
      <div class="score-card overall"><div class="score-num">{overall}</div><div class="score-label">Overall</div></div>
      <div class="score-card form"><div class="score-num">{form}</div><div class="score-label">Form</div></div>
      <div class="score-card timing"><div class="score-num">{timing}</div><div class="score-label">Timing</div></div>
    </div>
    {focus_html}
    {overlay_html}
    <div class="section-title">Per-Joint Breakdown (worst first)</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Joint</th><th>Score</th><th>Error</th><th></th></tr></thead>
        <tbody>{rows_html}</tbody>
      </table>
    </div>
    <a class="back-link" href="/score">&larr; Score another</a>"""


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #

@app.get("/", response_class=HTMLResponse)
def library_page():
    dances = list_dances()

    if not dances:
        body = """<div class="empty-state">
          <p>No dances in the library yet.</p>
          <a class="btn" href="/add" style="margin-top:1rem;">Add Your First Dance</a>
        </div>"""
    else:
        cards = ""
        for d in dances:
            thumb_src = f"/thumb/{d['id']}" if Path(d.get("thumbnail", "")).exists() else ""
            thumb_html = f'<img class="dance-thumb" src="{thumb_src}" alt="{d["name"]}">' if thumb_src else '<div class="dance-thumb"></div>'
            frames = d.get("frame_count", "?")
            cards += f"""
            <div class="dance-card" onclick="window.location='/score?baseline={d['id']}'">
              {thumb_html}
              <div class="dance-info">
                <div class="dance-name">{d['name']}</div>
                <div class="dance-meta">{frames} frames &middot; Ready</div>
              </div>
            </div>"""

        body = f"""
        <h2>Your Dances</h2>
        <div class="dance-grid">{cards}</div>
        <div style="text-align:center; margin-top:1.25rem;">
          <a class="btn btn-outline btn-sm" href="/add">+ Add Dance</a>
        </div>"""

    return HTMLResponse(content=_page("Dance Library", body, "library"))


@app.get("/add", response_class=HTMLResponse)
def add_page():
    body = """
    <div class="card">
      <h2>Add a Baseline Dance</h2>
      <form action="/add" enctype="multipart/form-data" method="post">
        <label for="name">Dance Name</label>
        <input type="text" id="name" name="name" placeholder="e.g. Phase 2 Windmill" required>
        <label for="video">Dance Video</label>
        <input type="file" id="video" name="video" accept="video/*" required>
        <p class="hint">Upload a clear video of the reference dance. Pose extraction runs automatically.</p>
        <button class="btn btn-full" type="submit">Add to Library</button>
      </form>
    </div>
    <div style="text-align:center; margin-top:1rem;">
      <a href="/">Cancel</a>
    </div>"""
    return HTMLResponse(content=_page("Add Dance", body, "add"))


@app.post("/add", response_class=HTMLResponse)
async def add_dance_route(name: str = Form(...), video: UploadFile = File(...)):
    try:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        tmp_path = UPLOAD_DIR / f"upload-{uuid.uuid4().hex[:8]}{Path(video.filename).suffix}"
        with open(tmp_path, "wb") as f:
            f.write(await video.read())

        entry = add_dance(name, str(tmp_path))
        os.remove(tmp_path)

    except Exception as exc:
        return _error_page(f"Failed to add dance: {exc}")

    body = f"""
    <div class="card" style="text-align:center;">
      <h2 style="color:#4ade80;">Dance Added!</h2>
      <p style="color:#94a3b8; margin:1rem 0;">{entry['name']} — {entry['frame_count']} frames extracted and cached.</p>
      <a class="btn" href="/score?baseline={entry['id']}">Score Against It</a>
      <a class="btn btn-outline" href="/" style="margin-left:0.5rem;">Back to Library</a>
    </div>"""
    return HTMLResponse(content=_page("Dance Added", body, "add"))


@app.get("/score", response_class=HTMLResponse)
def score_page(baseline: str = None):
    dances = list_dances()

    # Build dropdown
    options = ""
    for d in dances:
        sel = " selected" if baseline and d["id"] == baseline else ""
        options += f'<option value="{d["id"]}"{sel}>{d["name"]} ({d["frame_count"]} frames)</option>'

    library_section = ""
    if dances:
        library_section = f"""
        <label for="baseline_id">Choose from Library</label>
        <select id="baseline_id" name="baseline_id" onchange="loadPreview(this.value)">
          <option value="">-- select a baseline --</option>
          {options}
        </select>
        <div id="preview-container" style="display:none; margin-top:1rem;"></div>
        <div class="divider">or upload a new one</div>"""

    body = f"""
    <div class="card">
      <h2>Score a Dance</h2>
      <form action="/score" enctype="multipart/form-data" method="post">
        {library_section}
        <label for="baseline_file">Upload Baseline Video</label>
        <input type="file" id="baseline_file" name="baseline_file" accept="video/*">
        <p class="hint">Required if no library baseline selected.</p>

        <div class="divider"></div>

        <label for="attempt">Attempt Video (dancer to score)</label>
        <input type="file" id="attempt" name="attempt" accept="video/*" required>
        <p class="hint">The performance you want scored against the baseline.</p>

        <button class="btn btn-full" type="submit">Score My Dance</button>
      </form>
    </div>
    <script>
    function loadPreview(id) {{
      var container = document.getElementById('preview-container');
      if (!id) {{ container.style.display = 'none'; return; }}
      container.style.display = 'block';
      container.innerHTML = '<div class="video-wrap"><p style="color:#a78bfa;text-align:center;">Loading reference...</p></div>';
      fetch('/preview/' + id).then(function(r) {{ return r.text(); }}).then(function(html) {{
        container.innerHTML = html;
      }}).catch(function() {{
        container.innerHTML = '<p style="color:#f87171;text-align:center;">Preview unavailable</p>';
      }});
    }}
    </script>"""
    return HTMLResponse(content=_page("Score Dance", body, "score"))


@app.post("/score", response_class=HTMLResponse)
async def score_route(
    baseline_id: str = Form(""),
    baseline_file: UploadFile = File(None),
    attempt: UploadFile = File(...),
):
    try:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

        # Get baseline frames
        if baseline_id:
            base_frames = get_poses(baseline_id)
            dance = get_dance(baseline_id)
            if not base_frames or not dance:
                return _error_page("Selected baseline not found in library.")
            baseline_video_path = dance["video"]
        else:
            if not baseline_file or not baseline_file.filename:
                return _error_page("Please select a library baseline or upload a baseline video.")
            b_path = UPLOAD_DIR / f"{uuid.uuid4().hex}_{baseline_file.filename}"
            with open(b_path, "wb") as f:
                f.write(await baseline_file.read())
            base_frames = extract(str(b_path))
            baseline_video_path = str(b_path)

        # Save attempt
        a_path = UPLOAD_DIR / f"{uuid.uuid4().hex}_{attempt.filename}"
        with open(a_path, "wb") as f:
            f.write(await attempt.read())
        att_frames = extract(str(a_path))

        if len(base_frames) < 2 or len(att_frames) < 2:
            return _error_page("Not enough pose data found. Ensure videos show clear full-body movement.")

        result = score(base_frames, att_frames)

        # Generate stick-figure overlay
        overlay_video = None
        try:
            alignment = dtw_align(base_frames, att_frames)
            overlay_video = generate_overlay(base_frames, att_frames, str(a_path), alignment)
        except Exception:
            pass

    except Exception as exc:
        return _error_page(f"An error occurred: {exc}")

    report_html = _render_report(result, overlay_video)
    return HTMLResponse(content=_page("Dance Score Report", report_html, "score"))


@app.get("/demo", response_class=HTMLResponse)
def demo():
    try:
        demo_base = REPO_ROOT / "demo_base.mp4"
        demo_att = REPO_ROOT / "demo_att.mp4"
        if not demo_base.exists() or not demo_att.exists():
            return _error_page("Demo videos not found.")

        base_frames = extract(str(demo_base))
        att_frames = extract(str(demo_att))
        if len(base_frames) < 2 or len(att_frames) < 2:
            return _error_page("Not enough pose data in demo videos.")

        result = score(base_frames, att_frames)
        report_html = _render_report(result)
    except Exception as exc:
        return _error_page(f"Error: {exc}")

    return HTMLResponse(content=_page("Demo Report", report_html))


@app.get("/preview/{dance_id}", response_class=HTMLResponse)
async def preview(dance_id: str):
    entry = get_dance(dance_id)
    if not entry:
        return HTMLResponse(content="Not found", status_code=404)
    overlay = entry.get("overlay", "")
    if overlay and Path(overlay).exists():
        fname = Path(overlay).name
        return HTMLResponse(content=f"""
        <div class="video-wrap">
          <div class="section-title" style="margin-bottom:0.5rem;">Reference: {entry['name']}</div>
          <video controls autoplay loop playsinline>
            <source src="/library-video/{fname}" type="video/mp4">
          </video>
          <div class="legend">
            <span><span class="legend-dot" style="background:#00ff00"></span> Baseline Reference</span>
          </div>
        </div>
""")
    return HTMLResponse(content='<p style="color:#94a3b8;text-align:center;">Preview not available</p>')


@app.get("/video/{filename}")
async def serve_video(filename: str):
    video_path = UPLOAD_DIR / filename
    if not video_path.exists():
        return HTMLResponse(content="Not found", status_code=404)
    return FileResponse(str(video_path), media_type="video/mp4")


@app.get("/library-video/{filename}")
async def serve_library_video(filename: str):
    from dance_lib import VIDEOS_DIR as LIB_VIDEOS
    video_path = LIB_VIDEOS / filename
    if not video_path.exists():
        return HTMLResponse(content="Not found", status_code=404)
    return FileResponse(str(video_path), media_type="video/mp4")


@app.get("/thumb/{dance_id}")
async def serve_thumb(dance_id: str):
    entry = get_dance(dance_id)
    if not entry:
        return HTMLResponse(content="Not found", status_code=404)
    thumb = entry.get("thumbnail", "")
    if not thumb or not Path(thumb).exists():
        return HTMLResponse(content="Not found", status_code=404)
    return FileResponse(str(thumb), media_type="image/png")
