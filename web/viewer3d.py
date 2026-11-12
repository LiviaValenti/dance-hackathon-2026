"""viewer3d.py - Interactive 3D skeleton viewer (plain canvas, no JS dependencies).

Shows the reference (green) and the dancer (orange) as 3D skeletons from the MediaPipe world
landmarks, frame-paired by the DTW alignment. Drag to rotate; follows the comparison video if given.
"""
import json
import math

from scoring import ANGLE_FEATURES, TOLERANCE_FULL_DEG, angles_for_frame

_JOINTS = ["nose", "neck", "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
           "left_wrist", "right_wrist", "left_hip", "right_hip", "left_knee", "right_knee",
           "left_ankle", "right_ankle"]
_BONES = [("nose", "neck"), ("left_shoulder", "right_shoulder"),
          ("left_shoulder", "left_elbow"), ("left_elbow", "left_wrist"),
          ("right_shoulder", "right_elbow"), ("right_elbow", "right_wrist"),
          ("left_shoulder", "left_hip"), ("right_shoulder", "right_hip"), ("left_hip", "right_hip"),
          ("left_hip", "left_knee"), ("left_knee", "left_ankle"),
          ("right_hip", "right_knee"), ("right_knee", "right_ankle")]


def _skeleton(frame: dict) -> list | None:
    world = frame.get("world")
    if not world:
        return None
    return [[round(c, 3) for c in world[j]] if j in world else None for j in _JOINTS]


def _joint_errors(ref: dict, att: dict) -> list[int | None]:
    """Per joint, the 3D angle error in degrees at that joint (None where it can't be measured)."""
    if not ref.get("world") or not att.get("world"):
        return [None] * len(_JOINTS)
    a, b = angles_for_frame(ref, use_3d=True), angles_for_frame(att, use_3d=True)
    errs: list[int | None] = [None] * len(_JOINTS)
    for feat in ANGLE_FEATURES:
        diff = abs(a[feat] - b[feat])
        if not math.isnan(diff):
            errs[_JOINTS.index("neck" if feat == "torso_lean" else feat)] = round(math.degrees(diff))
    return errs


def viewer_data(reference: list[dict], attempt: list[dict], path: list[tuple[int, int]],
                name: str, ref_label: str = "Reference", color: str = "#ff8200") -> dict | None:
    """One viewer entry: per attempt frame along the DTW path, the matched reference + attempt 3D skeletons."""
    pairs, seen = [], set()
    for ri, ai in path:
        if ai in seen:
            continue
        seen.add(ai)
        att = _skeleton(attempt[ai])
        if att is None:
            continue
        pairs.append({"t": attempt[ai]["time"], "ref": _skeleton(reference[ri]), "att": att,
                      "err": _joint_errors(reference[ri], attempt[ai])})
    if not pairs:
        return None
    return {"name": name, "ref_label": ref_label, "color": color, "pairs": pairs}


def viewer3d_html(sets: list[dict], video_id: str = "") -> str:
    """HTML/JS for the viewer. `sets` come from viewer_data(); several sets get a selector."""
    sets = [s for s in sets if s]
    if not sets:
        return ""
    data = json.dumps({"sets": sets, "bones": [[_JOINTS.index(a), _JOINTS.index(b)] for a, b in _BONES],
                       "names": [j.replace("left_", "L ").replace("right_", "R ").replace("_", " ") for j in _JOINTS],
                       "tol": TOLERANCE_FULL_DEG, "video": video_id}).replace("</", "<\\/")
    picker = ""
    if len(sets) > 1:
        options = "".join(f'<option value="{i}">{s["name"]}</option>' for i, s in enumerate(sets))
        picker = f'<select id="v3d-set" style="margin:0 0 .5rem">{options}</select>'
    return f"""<div class="section-title">3D Pose Inspector</div>
{picker}
<div class="v3d-wrap">
  <canvas id="v3d" height="420"></canvas>
  <div class="v3d-controls">
    <button type="button" id="v3d-play" class="v3d-btn">&#9654;</button>
    <input type="range" id="v3d-slider" min="0" value="0" style="flex:1">
    <span id="v3d-time" class="v3d-time">0.0s</span>
  </div>
  <div class="v3d-controls">
    <button type="button" id="v3d-mode" class="v3d-btn">Overlay</button>
    <button type="button" class="v3d-btn" data-view="front">Front</button>
    <button type="button" class="v3d-btn" data-view="side">Side</button>
    <button type="button" class="v3d-btn" data-view="top">Top</button>
  </div>
  <p class="hint" style="margin-top:.6rem">Drag to rotate. <span style="color:#22c55e">&#9632;</span> <span id="v3d-ref-label">Reference</span>
    &nbsp;<span id="v3d-att-dot">&#9632;</span> <span id="v3d-att-label">You</span>
    &nbsp;&middot; joints turn <span style="color:#facc15">yellow</span> &rarr; <span style="color:#ef4444">red</span> the further off they are.</p>
</div>
<style>
.v3d-wrap{{background:rgba(255,255,255,.04);border-radius:12px;padding:.5rem;margin-bottom:1rem}}
#v3d{{width:100%;display:block;cursor:grab;touch-action:none;border-radius:10px}}
.v3d-controls{{display:flex;gap:.5rem;align-items:center;margin-top:.4rem}}
.v3d-btn{{background:#1e1e3a;border:1px solid #2d2d52;color:#e2e8f0;border-radius:8px;padding:.35rem .7rem;cursor:pointer;font-size:.85rem}}
.v3d-time{{font-size:.8rem;opacity:.7;min-width:3rem;text-align:right}}
</style>
<script>
(function(){{
  var D = {data};
  var REF = '#22c55e', CAM = 3.2, HEAD_R = 0.1;
  var cv = document.getElementById('v3d'), g = cv.getContext('2d');
  var slider = document.getElementById('v3d-slider'), timeEl = document.getElementById('v3d-time');
  var playBtn = document.getElementById('v3d-play'), modeBtn = document.getElementById('v3d-mode');
  var video = D.video ? document.getElementById(D.video) : null;
  var set = D.sets[0], idx = 0, playing = false, overlay = false;
  var yaw = 0.5, pitch = 0.2, drag = null, last = 0;

  function rgb(hex){{ var n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }}
  function shade(c, k, a){{ return 'rgba(' + c.map(function(v){{ return Math.round(Math.min(255, v * k)); }}).join(',') + ',' + (a == null ? 1 : a) + ')'; }}
  function mix(a, b, t){{ return a.map(function(v, i){{ return v + (b[i] - v) * t; }}); }}
  function errColor(e){{
    if (e == null || e <= D.tol) return null;
    var t = Math.min(1, (e - D.tol) / 35);
    return t < .5 ? mix([250,204,21], [249,115,22], t*2) : mix([249,115,22], [239,68,68], t*2 - 1);
  }}

  function pickSet(i){{
    set = D.sets[i]; idx = 0; slider.max = set.pairs.length - 1;
    document.getElementById('v3d-ref-label').textContent = set.ref_label;
    document.getElementById('v3d-att-label').textContent = set.name;
    document.getElementById('v3d-att-dot').style.color = set.color;
    draw();
  }}
  // rotate around the vertical axis, tilt, then perspective-project; returns [x, y, depth, scale]
  function project(p, ox, s){{
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    var x = p[0]*cy - p[2]*sy, z = p[0]*sy + p[2]*cy;
    var y = p[1]*cp - z*sp, d = p[1]*sp + z*cp;
    var k = CAM / (CAM + d);
    return [cv.width/2 + ox + x*s*k, cv.height*0.47 + y*s*k, d, k];
  }}
  function floorY(sk){{ var m = 0; sk.forEach(function(p){{ if (p && p[1] > m) m = p[1]; }}); return m + 0.02; }}

  function drawFloor(ox, s, y){{
    var pts = [];
    for (var i = 0; i <= 48; i++) {{ var a = i / 48 * 6.283; pts.push(project([Math.cos(a)*0.9, y, Math.sin(a)*0.9], ox, s)); }}
    var c = project([0, y, 0], ox, s), grad = g.createRadialGradient(c[0], c[1], 0, c[0], c[1], 0.9*s);
    grad.addColorStop(0, 'rgba(99,102,241,.22)'); grad.addColorStop(1, 'rgba(99,102,241,0)');
    g.fillStyle = grad; g.beginPath(); pts.forEach(function(q, i){{ i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }}); g.fill();
    g.strokeStyle = 'rgba(148,163,184,.13)'; g.lineWidth = 1;
    for (var k = -3; k <= 3; k++) {{
      var h = Math.sqrt(Math.max(0, 0.81 - (k*0.25)*(k*0.25)));
      var a1 = project([k*0.25, y, -h], ox, s), b1 = project([k*0.25, y, h], ox, s);
      var a2 = project([-h, y, k*0.25], ox, s), b2 = project([h, y, k*0.25], ox, s);
      g.beginPath(); g.moveTo(a1[0], a1[1]); g.lineTo(b1[0], b1[1]); g.moveTo(a2[0], a2[1]); g.lineTo(b2[0], b2[1]); g.stroke();
    }}
  }}
  function drawShadow(sk, ox, s, y){{
    if (!sk) return;
    g.save(); g.filter = 'blur(4px)'; g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineCap = 'round';
    D.bones.forEach(function(b){{
      var p = sk[b[0]], q = sk[b[1]]; if (!p || !q) return;
      var a = project([p[0], y, p[2]], ox, s), c = project([q[0], y, q[2]], ox, s);
      g.lineWidth = 9 * a[3]; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.stroke();
    }});
    g.restore();
  }}
  // depth-sorted primitives: far things first so near limbs cover far ones
  function collect(sk, err, ox, s, color, alpha, out){{
    if (!sk) return;
    var P = sk.map(function(p){{ return p && project(p, ox, s); }});
    if (P[2] && P[3] && P[8] && P[9]) out.push({{d: (P[2][2]+P[3][2]+P[8][2]+P[9][2]) / 4 + 0.05, f: function(){{
      g.fillStyle = shade(color, 1, .22 * alpha); g.beginPath();
      [2, 3, 9, 8].forEach(function(j, i){{ i ? g.lineTo(P[j][0], P[j][1]) : g.moveTo(P[j][0], P[j][1]); }}); g.fill();
    }}}});
    D.bones.forEach(function(b){{
      var a = P[b[0]], c = P[b[1]]; if (!a || !c || b[0] === 0) return;
      var d = (a[2] + c[2]) / 2, k = (a[3] + c[3]) / 2, light = 1.05 - d * 0.35;
      out.push({{d: d, f: function(){{
        g.lineCap = 'round';
        g.strokeStyle = shade(color, light * 0.55, alpha); g.lineWidth = 11 * k;
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.stroke();
        g.strokeStyle = shade(color, light, alpha); g.lineWidth = 7 * k; g.stroke();
        g.strokeStyle = shade(color, light * 1.5, .5 * alpha); g.lineWidth = 2 * k;
        g.beginPath(); g.moveTo(a[0] - 1.5*k, a[1] - 1.5*k); g.lineTo(c[0] - 1.5*k, c[1] - 1.5*k); g.stroke();
      }}}});
    }});
    if (P[0] && P[1]) {{
      var nk = sk[1], no = sk[0], hc = project([no[0]*.6 + nk[0]*.4, no[1]*.6 + nk[1]*.4 - .03, no[2]*.6 + nk[2]*.4], ox, s);
      out.push({{d: hc[2], f: function(){{
        var r = HEAD_R * s * hc[3], gr = g.createRadialGradient(hc[0] - r*.35, hc[1] - r*.35, r*.1, hc[0], hc[1], r);
        gr.addColorStop(0, shade(color, 1.5, alpha)); gr.addColorStop(1, shade(color, .55, alpha));
        g.fillStyle = gr; g.beginPath(); g.arc(hc[0], hc[1], r, 0, 6.283); g.fill();
      }}}});
    }}
    P.forEach(function(p, i){{
      if (!p || i < 2) return;
      var ec = err && errColor(err[i]);
      out.push({{d: p[2] - 0.01, f: function(){{
        var r = (ec ? 6 + Math.min(6, (err[i] - D.tol) / 6) : 4.5) * p[3];
        g.save();
        if (ec) {{ g.shadowColor = shade(ec, 1, .9); g.shadowBlur = 14; }}
        g.fillStyle = ec ? shade(ec, 1, 1) : shade(color, 1.35, alpha);
        g.beginPath(); g.arc(p[0], p[1], r, 0, 6.283); g.fill();
        g.restore();
      }}}});
    }});
  }}
  function label(sk, err, ox, s){{
    if (!err) return;
    var worst = -1; err.forEach(function(e, i){{ if (e != null && e > D.tol + 10 && (worst < 0 || e > err[worst])) worst = i; }});
    if (worst < 0 || !sk[worst]) return;
    var p = project(sk[worst], ox, s), txt = D.names[worst] + ' ' + err[worst] + '\u00b0';
    g.font = '600 12px system-ui, sans-serif';
    var w = g.measureText(txt).width + 12, x = Math.min(cv.width - w - 4, p[0] + 12), y = p[1] - 22;
    g.fillStyle = 'rgba(15,15,35,.85)'; g.strokeStyle = shade(errColor(err[worst]), 1, 1); g.lineWidth = 1;
    g.beginPath(); g.roundRect ? g.roundRect(x, y, w, 20, 6) : g.rect(x, y, w, 20); g.fill(); g.stroke();
    g.fillStyle = '#f1f5f9'; g.fillText(txt, x + 6, y + 14);
  }}
  function draw(){{
    var w = cv.clientWidth; if (cv.width !== w) cv.width = w;
    var bg = g.createLinearGradient(0, 0, 0, cv.height);
    bg.addColorStop(0, '#15152e'); bg.addColorStop(1, '#0b0b18');
    g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height);
    var f = set.pairs[idx]; if (!f) return;
    var s = cv.height / 2.3, off = overlay ? 0 : Math.min(cv.width * 0.24, 1.0 * s);
    var ry = f.ref ? floorY(f.ref) : 0, ay = floorY(f.att);
    if (overlay) ry = ay = Math.max(ry, ay);
    var att = rgb(set.color), ref = rgb(REF), prims = [];
    drawFloor(-off, s, ry); if (off) drawFloor(off, s, ay);
    drawShadow(f.ref, -off, s, ry); drawShadow(f.att, off, s, ay);
    collect(f.ref, null, -off, s, ref, overlay ? .55 : 1, prims);
    collect(f.att, f.err, off, s, att, 1, prims);
    prims.sort(function(a, b){{ return b.d - a.d; }}).forEach(function(p){{ p.f(); }});
    label(f.att, f.err, off, s);
    slider.value = idx; timeEl.textContent = f.t.toFixed(1) + 's';
  }}
  function nearest(t){{
    var best = 0;
    set.pairs.forEach(function(p, i){{ if (Math.abs(p.t - t) < Math.abs(set.pairs[best].t - t)) best = i; }});
    return best;
  }}
  function tick(ts){{
    if (video && !video.paused) {{ idx = nearest(video.currentTime); draw(); }}
    else if (playing && ts - last > 1000/12) {{ last = ts; idx = (idx + 1) % set.pairs.length; draw(); }}
    requestAnimationFrame(tick);
  }}
  cv.addEventListener('pointerdown', function(e){{ drag = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; }});
  cv.addEventListener('pointermove', function(e){{
    if (!drag) return;
    yaw += (e.clientX - drag[0]) * 0.01;
    pitch = Math.max(-0.3, Math.min(1.5, pitch + (e.clientY - drag[1]) * 0.01));
    drag = [e.clientX, e.clientY]; draw();
  }});
  cv.addEventListener('pointerup', function(){{ drag = null; cv.style.cursor = 'grab'; }});
  slider.addEventListener('input', function(){{
    idx = +slider.value; playing = false; playBtn.innerHTML = '&#9654;';
    if (video) {{ video.pause(); video.currentTime = set.pairs[idx].t; }}
    draw();
  }});
  playBtn.addEventListener('click', function(){{
    if (video) {{ if (video.paused) video.play(); else video.pause(); return; }}
    playing = !playing; playBtn.innerHTML = playing ? '&#10074;&#10074;' : '&#9654;';
  }});
  if (video) {{
    video.addEventListener('play', function(){{ playBtn.innerHTML = '&#10074;&#10074;'; }});
    video.addEventListener('pause', function(){{ playBtn.innerHTML = '&#9654;'; idx = nearest(video.currentTime); draw(); }});
  }}
  modeBtn.addEventListener('click', function(){{ overlay = !overlay; modeBtn.textContent = overlay ? 'Side by side' : 'Overlay'; draw(); }});
  document.querySelectorAll('.v3d-btn[data-view]').forEach(function(b){{
    b.addEventListener('click', function(){{
      var v = b.dataset.view;
      yaw = v === 'side' ? Math.PI/2 : 0; pitch = v === 'top' ? 1.5 : 0.08; draw();
    }});
  }});
  var sel = document.getElementById('v3d-set');
  if (sel) sel.addEventListener('change', function(){{ pickSet(+sel.value); }});
  window.addEventListener('resize', draw);
  pickSet(0);
  requestAnimationFrame(tick);
}})();
</script>"""
