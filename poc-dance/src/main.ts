import "./style.css";
import {
  createIcons,
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Play,
  Pause,
  Upload,
  X,
  Check,
  CheckCheck,
  ChevronRight,
  Camera,
  CameraOff,
  ScanLine,
  PersonStanding,
  Repeat2,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  ShieldCheck,
  Sparkles,
  Footprints,
  Target,
  Activity,
  Clock3,
  Download,
  Trash2,
  Library,
  CircleHelp,
  MoveUpRight,
  LoaderCircle,
} from "lucide";
import { DanceScene, builtInReference } from "./scene";
import { compareAt, features, nextStage } from "./motion";
import type { Reference } from "./motion";
import { assessFraming, createFramingFilter } from "./framing";
import { createPersonSelector } from "./person";
import {
  fetchVideo,
  maxVideoBytes,
  maxVideoSeconds,
  parseVideoUrl,
} from "./remote";
import type { Framing } from "./framing";
import { analyzeVideo, drawPose, getTracker, waitForVideo } from "./tracking";
import {
  clearRecordings,
  getRecording,
  readLocal,
  saveRecording,
  writeLocal,
} from "./storage";
import type { Session, Settings } from "./storage";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";

const iconSet = {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Play,
  Pause,
  Upload,
  X,
  Check,
  CheckCheck,
  ChevronRight,
  Camera,
  CameraOff,
  ScanLine,
  PersonStanding,
  Repeat2,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  ShieldCheck,
  Sparkles,
  Footprints,
  Target,
  Activity,
  Clock3,
  Download,
  Trash2,
  Library,
  CircleHelp,
  MoveUpRight,
  LoaderCircle,
};
const icon = (name: string, className = "") =>
  `<i data-lucide="${name}" class="${className}" aria-hidden="true"></i>`;
const $ = <T extends HTMLElement = HTMLElement>(selector: string): T =>
  document.querySelector<T>(selector)!;
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
const icons = () =>
  createIcons({ icons: iconSet, attrs: { "stroke-width": 1.7 } });
const formatTime = (value: number) =>
  `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
const settings = readLocal<Settings>("move-settings", {
  level: "Nybegynner",
  goal: "Finne rytmen",
  mirror: true,
});
let sessions = readLocal<Session[]>("move-sessions", []);
let reference: Reference = builtInReference();
let danceName = "Bart Simpson";
let customUrl: string | null = null;
let customFile: File | null = null;
let phase: "demo" | "learn" | "dance" | "review" = "demo";
let selectedSegment = 0;
let learnFrom = 0;
let playhead = 0;
let playing = true;
let speed = 0.75;
let sound = false;
let audio: AudioContext | null = null;
let lastBeat = -1;
let tracker: PoseLandmarker | null = null;
let stream: MediaStream | null = null;
let cameraStarting = false;
let cameraGeneration = 0;
let lastVideoTime = -1;
let lastDetection = 0;
let lastUi = 0;
let analysis: AbortController | null = null;
let recorder: MediaRecorder | null = null;
let recordChunks: Blob[] = [];
let recordingDone: Promise<Blob> | null = null;
let sessionStart = 0;
let measuring = false;
let samples: { segment: number; movement: number; timing: number | null }[] =
  [];
let lastResult: Session | null = null;
let cameraMessage = "Kamera av";
let statusMessage = "Klar når du er";
let latestMovement: number | null = null;
let latestTiming: number | null = null;
let liveMovement: number | null = null;
let liveTiming: number | null = null;
let liveJoint: number | null = null;
let lastMeasuredTime = -1;
let countdownUntil = 0;
let reviewUrl: string | null = null;
let framing: Framing | null = null;
const personSelector = createPersonSelector();
let framingFilter = createFramingFilter();

$("#app").innerHTML = `
  <header class="topbar">
    <a href="#" class="brand" aria-label="MOVE studio">move<span class="brand-dot">.</span><span class="brand-mark">${icon("move-up-right")}</span></a>
    <nav class="desktop-nav" aria-label="Hovedmeny">
      <button class="nav-link active" data-view="studio">Studio</button>
      <button class="nav-link" data-view="library">Mitt bibliotek</button>
      <button class="nav-link" data-view="progress">Utvikling</button>
    </nav>
    <div class="topbar-right"><span class="demo-label">LAB / 01</span><button class="profile-button" id="settings-button" aria-label="Nivå og mål" title="Nivå og mål">${icon("sliders-horizontal")}</button></div>
  </header>
  <main>
    <div class="page-heading"><div><p class="eyebrow">DITT EGET DANSESTUDIO</p><h1>Finn din groove<span class="coral-dot">.</span></h1></div><div class="heading-note">${icon("sparkles")}<span id="personal-note"></span></div></div>
    <section id="studio-view" class="studio-grid">
      <aside class="library-pane">
        <div class="section-label"><h2>Din neste bevegelse</h2><span>01</span></div>
        <button class="dance-card selected" id="builtin-card" aria-label="Velg Bart Simpson">
          <div class="dance-art"><img id="guide-thumbnail" alt="Stilisert dansefigur med grønn caps og korallfarget genser" /><span class="genre-stamp">HIP HOP</span><span class="art-arrow">${icon("arrow-up-right")}</span></div>
          <div class="dance-card-content"><span class="small-label">GRUNNSTEG</span><h3>Bart Simpson</h3><p>Stilisert øvelse <span>·</span> 16 sek</p><div class="card-bottom"><span class="level-tag">Alle nivåer</span><span>${icon("play")} Øv</span></div></div>
        </button>
        <button class="upload-card" id="upload-button"><span class="upload-icon">${icon("upload")}</span><span><strong>Din video. Din dans.</strong><small>Velg et klipp</small></span>${icon("arrow-up-right")}</button>
        <button class="custom-card hidden" id="custom-card"><span class="custom-thumb">${icon("footprints")}</span><span><strong id="custom-name"></strong><small id="custom-meta"></small></span>${icon("check")}</button>
        <div class="sidebar-note">${icon("shield-check")}<p>Bare din bevegelse.<br><strong>Ingen video sendes fra enheten.</strong></p></div>
        <div class="sidebar-bottom"><span class="tiny-dot"></span> Egenøving, på dine premisser.</div>
      </aside>
      <div class="practice-pane">
        <div class="lesson-heading"><div><p class="small-label" id="lesson-genre">HIP HOP / GRUNNSTEG</p><h2 id="lesson-title">Bart Simpson</h2></div><button class="icon-button light" id="lesson-info" aria-label="Om øvelsen og vurderingen" title="Om øvelsen">${icon("circle-help")}</button></div>
        <div class="phase-tabs" aria-label="Øvingsfaser"><button data-phase="demo" class="active"><span>01</span> Se</button><button data-phase="learn"><span>02</span> Lær</button><button data-phase="dance"><span>03</span> Dans</button></div>
        <div class="stage" id="stage">
          <div id="scene"></div><video id="reference-video" class="hidden" playsinline muted preload="auto"></video>
          <div class="stage-top"><span class="stage-label" id="stage-label"><span class="tiny-dot"></span> DEMONSTRASJON</span><span class="stage-tag" id="stage-tag">STILISERT FIGUR</span></div>
          <span class="stage-side-label">FIND YOUR OWN FLOW</span>
          <div class="stage-bottom"><div><span class="small-label" id="step-number">BEVEGELSE 01 / 04</span><strong id="step-title">Finn sidebevegelsen</strong></div><span class="beat-count" id="beat-count">1<span>/ 8</span></span></div>
          <div class="stage-guide hidden" id="stage-guide" role="status"></div>
          <div class="countdown hidden" id="countdown" aria-live="assertive"></div>
        </div>
        <div class="transport"><button class="icon-button play-button" id="play-button" aria-label="Pause" title="Pause">${icon("pause")}</button><span class="timecode" id="timecode">0:00</span><input id="timeline" type="range" min="0" max="16" step="0.05" value="0" aria-label="Posisjon i dansen" /><span class="duration" id="duration">0:16</span><button class="icon-button" id="sound-button" aria-label="Slå på metronom" title="Metronom">${icon("volume-x")}</button></div>
        <div class="practice-options"><label class="tempo-control">Tempo<select id="speed" aria-label="Avspillingshastighet"><option value="0.5">0,5×</option><option value="0.75" selected>0,75×</option><option value="1">1×</option></select></label><label class="mirror-control">${icon("repeat-2")} Speilvendt<input type="checkbox" id="mirror" ${settings.mirror ? "checked" : ""} /><span class="switch"></span></label></div>
        <div class="lesson-cue"><span class="cue-icon">${icon("footprints")}</span><div><span class="small-label" id="cue-label">ET STEG OM GANGEN</span><p id="cue-text">Myke knær. Flytt vekten fra side til side.</p></div></div>
        <div class="segment-list" id="segment-list"></div>
        <div class="lesson-footer"><span id="lesson-footer-note">Se bevegelsen i ditt tempo.</span><button class="primary-button" id="next-button">La oss øve ${icon("arrow-right")}</button></div>
      </div>
      <aside class="feedback-pane">
        <div class="section-label"><h2>Din økt</h2><span class="session-badge">${icon("activity")}</span></div>
        <div class="camera-heading"><span class="status-dot" id="camera-dot"></span><span id="camera-status">Kamera av</span><span class="local-tag">LOKALT</span></div>
        <div class="camera-frame" id="camera-frame"><video id="camera-video" playsinline muted></video><canvas id="pose-overlay"></canvas><div class="camera-empty" id="camera-empty">${icon("person-standing")}<span>Ditt rom. Ditt studio.</span></div><div class="framing-banner hidden" id="framing-banner" role="status"></div><span class="record-badge hidden" id="record-badge"><span class="tiny-dot"></span> OPPTAK</span></div>
        <div class="framing-checks hidden" id="framing-checks" aria-label="Hva kameraet ser"><span data-part="head">Hode</span><span data-part="hands">Hender</span><span data-part="feet">Føtter</span></div>
        <button class="camera-button" id="camera-button">${icon("camera")} Aktiver kamera</button>
        <p class="tracking-note" id="tracking-note">Sett mobilen stående, 2–3 meter unna. Hode, hender og føtter må være med for å bli vurdert.</p>
        <div class="feedback-title"><span class="small-label">AKKURAT NÅ</span>${icon("sparkles")}</div><h3 class="live-feedback" id="live-feedback">Klar når du er<span>.</span></h3>
        <div class="metric-row"><span>Bevegelseslikhet</span><strong id="movement-score">–<small>/100</small></strong></div><div class="metric-track"><span id="movement-bar"></span></div>
        <div class="metric-row"><span>Timing</span><strong id="timing-score">–<small>/100</small></strong></div><div class="metric-track timing"><span id="timing-bar"></span></div>
        <p class="score-caveat">Øvingsestimater, ikke en vurdering av stil eller sikkerhet.</p>
        <div class="session-goal"><span class="goal-icon">${icon("target")}</span><div><span class="small-label">DITT FOKUS</span><strong id="goal-display"></strong><span id="level-display"></span></div><button class="icon-button" id="edit-goal" aria-label="Endre mål" title="Endre mål">${icon("sliders-horizontal")}</button></div>
        <button class="safety-link" id="safety-button">${icon("shield-check")} God plass. Ingen smerte. ${icon("chevron-right")}</button>
      </aside>
    </section>
    <section id="library-view" class="alternate-view hidden"><div class="view-heading"><h2>Mitt bibliotek</h2><button class="secondary-button" id="library-upload">${icon("upload")} Last opp video</button></div><div class="library-grid" id="library-content"></div><div class="editorial-strip"><span>01</span><h3>Din dans trenger ikke<br>ligne på alle andres.</h3>${icon("move-up-right")}</div></section>
    <section id="progress-view" class="alternate-view hidden"><div class="view-heading"><h2>Din utvikling</h2><button class="secondary-button" id="clear-data">${icon("trash-2")} Slett lokale data</button></div><div id="history-content"></div></section>
    <footer class="page-footer"><span>BEVEGELSE, IKKE PERFEKSJON.</span><button id="privacy-button">${icon("shield-check")} Privat som standard</button><span>MOVE / TEKNISK DEMONSTRASJON</span></footer>
  </main>
  <nav class="mobile-nav" aria-label="Hovedmeny mobil"><button class="active" data-view="studio">${icon("activity")}<span>Studio</span></button><button data-view="library">${icon("library")}<span>Bibliotek</span></button><button data-view="progress">${icon("target")}<span>Utvikling</span></button></nav>
  <input type="file" id="video-input" accept="video/*" hidden />
  <dialog id="modal"><div class="modal-top"><span class="small-label">MOVE / STUDIO</span><button class="icon-button" id="close-modal" aria-label="Lukk" title="Lukk">${icon("x")}</button></div><div id="modal-body"></div></dialog>
  <div class="toast hidden" id="toast" role="status"></div>
`;

const referenceVideo = $<HTMLVideoElement>("#reference-video");
const cameraVideo = $<HTMLVideoElement>("#camera-video");
const overlay = $<HTMLCanvasElement>("#pose-overlay");
const modal = $<HTMLDialogElement>("#modal");
let scene: DanceScene | null = null;
try {
  scene = new DanceScene($("#scene"));
  scene.setMirror(settings.mirror);
  scene.render(0.5);
  $<HTMLImageElement>("#guide-thumbnail").src =
    $("#scene canvas") instanceof HTMLCanvasElement
      ? $<HTMLCanvasElement>("#scene canvas").toDataURL("image/png")
      : "";
} catch {
  $("#scene").innerHTML =
    '<div class="scene-fallback">3D krever WebGL i nettleseren. Du kan fortsatt velge en egen video.</div>';
}

function notify(message: string) {
  $("#toast").textContent = message;
  $("#toast").classList.remove("hidden");
  setTimeout(() => $("#toast").classList.add("hidden"), 5000);
}

function openModal(content: string) {
  if (reviewUrl) {
    URL.revokeObjectURL(reviewUrl);
    reviewUrl = null;
  }
  $("#modal-body").innerHTML = content;
  icons();
  if (!modal.open) modal.showModal();
}

function closeModal() {
  modal.close();
  if (reviewUrl) {
    URL.revokeObjectURL(reviewUrl);
    reviewUrl = null;
  }
}
$("#close-modal").onclick = closeModal;
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

function updateSettings() {
  $("#personal-note").textContent =
    settings.level === "Nybegynner"
      ? "Små steg teller også."
      : "Plass til ditt eget uttrykk.";
  $("#goal-display").textContent = settings.goal;
  $("#level-display").textContent = settings.level;
  $<HTMLInputElement>("#mirror").checked = settings.mirror;
  scene?.setMirror(settings.mirror);
  cameraVideo.style.transform = settings.mirror ? "scaleX(-1)" : "";
  referenceVideo.style.transform = settings.mirror ? "scaleX(-1)" : "";
}

function settingsModal() {
  openModal(
    `<h2>Øv på dine premisser.</h2><p>Hva vil du gi litt ekstra plass i dag?</p><form id="settings-form"><label class="form-label">Ditt nivå<select name="level">${["Nybegynner", "Litt erfaring", "Erfaren"].map((level) => `<option ${settings.level === level ? "selected" : ""}>${level}</option>`).join("")}</select></label><fieldset><legend>Ditt fokus</legend>${["Finne rytmen", "Lære bevegelsen", "Mer flyt"].map((goal) => `<label class="radio-option"><input type="radio" name="goal" value="${goal}" ${settings.goal === goal ? "checked" : ""}/>${goal}${icon(goal === "Finne rytmen" ? "activity" : goal === "Mer flyt" ? "sparkles" : "footprints")}</label>`).join("")}</fieldset><button class="primary-button wide">Lagre fokus ${icon("check")}</button></form>`,
  );
  $("#settings-form").onsubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.target as HTMLFormElement);
    settings.level = String(data.get("level"));
    settings.goal = String(data.get("goal"));
    if (!writeLocal("move-settings", settings))
      notify("Innstillingene kunne ikke lagres i denne nettleseren.");
    updateSettings();
    closeModal();
  };
}
$("#settings-button").onclick = settingsModal;
$("#edit-goal").onclick = settingsModal;

function safetyModal() {
  openModal(
    `<span class="modal-symbol">${icon("shield-check")}</span><h2>Ta vare på kroppen.</h2><p>Rydd plass rundt deg, varm opp og bruk et underlag med godt feste. Hold bevegelsene små i starten.</p><div class="notice">Stopp ved smerte, svimmelhet eller ubehag. Ikke press gjennom smerte.</div><p>Kameraet måler synlig bevegelse. Det kan ikke avgjøre om en bevegelse er trygg for deg, oppdage alle belastninger eller erstatte en kvalifisert instruktør eller helsepersonell.</p><button class="primary-button wide" id="safety-close">Forstått ${icon("check")}</button>`,
  );
  $("#safety-close").onclick = closeModal;
}
$("#safety-button").onclick = safetyModal;
function privacyModal() {
  openModal(
    `<span class="modal-symbol">${icon("shield-check")}</span><h2>Dette blir på enheten.</h2><p>Kamerabilder og opplastede videoer analyseres lokalt. Ingen konto, ingen analyseverktøy og ingen opplasting til en server.</p><ul class="plain-list"><li>Nivå, mål og øktresultater lagres i denne nettleseren.</li><li>Opptak lagres bare når du velger det. De kan lastes ned og slettes.</li><li>En opplastet øvingsvideo er midlertidig og forsvinner når siden lukkes eller lastes på nytt.</li><li>Med videolenke henter enheten videoen direkte fra nettstedet lenken peker til. Det nettstedet kan se IP-adressen din, og videoen sendes ikke videre.</li><li>Nettleserdata kan bli slettet av enheten. Lokal lagring er ikke en sikkerhetskopi.</li></ul><p>Demonstrasjonen er for 12 år og oppover. Den er ikke ferdig vurdert for offentlig lansering til barn.</p><button class="primary-button wide" id="privacy-close">Forstått ${icon("check")}</button>`,
  );
  $("#privacy-close").onclick = closeModal;
}
$("#privacy-button").onclick = privacyModal;
$("#lesson-info").onclick = () => {
  openModal(
    `<h2>${customUrl ? "Fra klipp til øvingsdeler." : "Bart Simpson, stilisert."}</h2><p>${customUrl ? "Appen følger ledd i videoen og deler klippet ved roligere partier. Er det flere personer i bildet, følges den som står nærmest midten. Delene er automatiske øvingsforslag, ikke gjenkjente dansesteg. Den forstår ikke koreografi, musikk, teknikk eller skader." : "Figuren viser en forenklet, Bart Simpson-inspirert sidebevegelse. Den er laget for å teste øvingsflyten og er ikke en instruktørvalidert demonstrasjon."}</p><p>Bevegelseslikhet sammenligner åtte leddvinkler i kamerabildet. Timing er et grovt faseestimat mot referansen, ikke musikalsk rytmeanalyse. Kameravinkel og tildekking påvirker resultatet.</p><p>Lav sporingssikkerhet gir ingen score. Personlig stil og sikkerhet vurderes ikke.</p><button class="primary-button wide" id="info-close">Tilbake til øving ${icon("arrow-right")}</button>`,
  );
  $("#info-close").onclick = closeModal;
};

function learnStart() {
  return reference.segments[learnFrom]?.start ?? 0;
}
function learnEnd() {
  return reference.segments[selectedSegment]?.end ?? reference.duration;
}
function stageRange() {
  return learnFrom === selectedSegment
    ? `Del ${selectedSegment + 1}`
    : `Del ${learnFrom + 1}–${selectedSegment + 1}`;
}
function stageName() {
  return learnFrom === selectedSegment
    ? (reference.segments[selectedSegment]?.label ?? stageRange())
    : `${stageRange()} sammen`;
}
function selectStage(from: number, to: number) {
  learnFrom = from;
  selectedSegment = to;
  playhead = learnStart();
  syncVideo();
  renderSegments();
  updatePhase();
}

function renderSegments() {
  const combined = learnFrom < selectedSegment;
  $("#segment-list").innerHTML =
    reference.segments
      .map(
        (segment, index) =>
          `<button class="segment ${index >= learnFrom && index <= selectedSegment ? "active" : ""}" data-segment="${index}"><span class="segment-number">${String(index + 1).padStart(2, "0")}</span><span><strong>${escape(segment.label)}</strong><small>${formatTime(segment.start)} – ${formatTime(segment.end)}</small></span>${icon("play")}</button>`,
      )
      .join("") +
    (selectedSegment > 0
      ? `<button class="combine-toggle" id="combine-toggle" aria-pressed="${combined}">${icon("repeat-2")} ${combined ? `Del ${selectedSegment + 1} alene` : `Sett sammen del 1–${selectedSegment + 1}`}</button>`
      : "");
  icons();
  document
    .querySelectorAll<HTMLButtonElement>("[data-segment]")
    .forEach((button) => {
      button.onclick = () => {
        if (measuring) {
          notify("Avslutt økten før du velger en annen del.");
          return;
        }
        const index = Number(button.dataset.segment);
        selectStage(index, index);
      };
    });
  const toggle = document.querySelector<HTMLButtonElement>("#combine-toggle");
  if (toggle)
    toggle.onclick = () => {
      if (measuring) {
        notify("Avslutt økten før du velger en annen del.");
        return;
      }
      selectStage(combined ? selectedSegment : 0, selectedSegment);
    };
}

function updatePhase() {
  document
    .querySelectorAll("[data-phase]")
    .forEach((button) =>
      button.classList.toggle(
        "active",
        (button as HTMLElement).dataset.phase === phase,
      ),
    );
  $("#stage-label").innerHTML =
    `<span class="tiny-dot"></span> ${phase === "demo" ? "DEMONSTRASJON" : phase === "learn" ? "TRINNVIS ØVING" : "DANS SAMMEN"}`;
  $("#next-button").innerHTML =
    `${phase === "demo" ? "La oss øve" : phase === "learn" ? (measuring ? "Avslutt del" : "Øv denne delen") : measuring ? "Avslutt økt" : "Start økten"} ${icon(measuring ? "check" : "arrow-right")}`;
  $("#lesson-footer-note").textContent =
    phase === "demo"
      ? "Se bevegelsen i ditt tempo."
      : phase === "learn"
        ? `${stageRange()} av ${reference.segments.length} · rolig repetisjon`
        : "Din bevegelse. Ditt uttrykk.";
  $("#segment-list").classList.toggle("hidden", phase !== "learn");
  $("#cue-label").textContent = customUrl
    ? "AUTOMATISK TIPS"
    : phase === "dance"
      ? "FINN DIN FLYT"
      : "ET STEG OM GANGEN";
  const previous = sessions.find(
    (session) =>
      session.dance === danceName && session.weak.includes(selectedSegment),
  );
  const cues = [
    "Myke knær. Flytt vekten fra side til side.",
    "La armene følge sidebevegelsen. Hold skuldrene avslappet.",
    "Sett armene og stegene sammen, i ditt tempo.",
    "Behold sidebevegelsen og gi den ditt eget uttrykk.",
  ];
  $("#cue-text").textContent = customUrl
    ? phase === "demo"
      ? "Se hele koreografien først. Legg merke til hvordan delene henger sammen."
      : phase === "dance"
        ? "Dans hele koreografien i ditt tempo. Hopp ikke over delene du synes er vanskelige."
        : learnFrom < selectedSegment
          ? `Sett sammen ${stageRange().toLowerCase()}. Hold rytmen mellom delene.`
          : (reference.segments[selectedSegment]?.cue ??
            "Se denne delen langsomt. Gjenta den med små bevegelser først.")
    : cues[selectedSegment % 4];
  if (previous && phase === "learn")
    $("#cue-text").textContent +=
      " Denne delen var utfordrende sist — gi den litt tid.";
  icons();
}

function syncVideo() {
  if (!customUrl || referenceVideo.readyState < 2) return;
  referenceVideo.currentTime = Math.min(playhead, reference.duration - 0.02);
  referenceVideo.playbackRate = speed;
  if (playing && !countdownUntil)
    referenceVideo.play().catch(() => {
      playing = false;
      updatePlayButton();
    });
  else referenceVideo.pause();
}

function updatePlayButton() {
  $("#play-button").innerHTML = icon(playing ? "pause" : "play");
  $("#play-button").setAttribute("aria-label", playing ? "Pause" : "Spill av");
  $("#play-button").title = playing ? "Pause" : "Spill av";
  icons();
}

function changePhase(next: "demo" | "learn" | "dance") {
  if (measuring) {
    notify("Avslutt økten før du bytter fase.");
    return;
  }
  phase = next;
  playhead = next === "learn" ? learnStart() : 0;
  playing = true;
  syncVideo();
  updatePlayButton();
  updatePhase();
}
document
  .querySelectorAll<HTMLButtonElement>("[data-phase]")
  .forEach((button) => {
    button.onclick = () =>
      changePhase(button.dataset.phase as "demo" | "learn" | "dance");
  });
$("#play-button").onclick = () => {
  if (countdownUntil) return;
  playing = !playing;
  syncVideo();
  updatePlayButton();
};
$<HTMLInputElement>("#timeline").oninput = (event) => {
  if (measuring) return;
  playhead = Number((event.target as HTMLInputElement).value);
  syncVideo();
};
$<HTMLSelectElement>("#speed").onchange = (event) => {
  if (measuring) return;
  speed = Number((event.target as HTMLSelectElement).value);
  referenceVideo.playbackRate = speed;
};
$<HTMLInputElement>("#mirror").onchange = (event) => {
  settings.mirror = (event.target as HTMLInputElement).checked;
  writeLocal("move-settings", settings);
  updateSettings();
};
$("#sound-button").onclick = () => {
  sound = !sound;
  if (sound) {
    audio ??= new AudioContext();
    audio.resume().catch(() => notify("Lyd kunne ikke aktiveres."));
  }
  $("#sound-button").innerHTML = icon(sound ? "volume-2" : "volume-x");
  $("#sound-button").setAttribute(
    "aria-label",
    sound ? "Slå av metronom" : "Slå på metronom",
  );
  $("#sound-button").classList.toggle("toggled", sound);
  icons();
};

function stopCamera() {
  personSelector.reset();
  cameraGeneration++;
  cameraStarting = false;
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
  cameraVideo.srcObject = null;
  $("#camera-empty").classList.remove("hidden");
  $("#camera-dot").classList.remove("on");
  $("#camera-frame").classList.remove("active");
  for (const id of ["#framing-banner", "#framing-checks", "#stage-guide"])
    $(id).classList.add("hidden");
  $("#tracking-note").textContent =
    "Sett mobilen stående, 2–3 meter unna. Hode, hender og føtter må være med for å bli vurdert.";
  framing = null;
  framingFilter = createFramingFilter();
  cameraMessage = "Kamera av";
  $("#camera-status").textContent = cameraMessage;
  $("#camera-button").innerHTML = `${icon("camera")} Aktiver kamera`;
  $("#camera-button").removeAttribute("disabled");
  overlay.getContext("2d")?.clearRect(0, 0, overlay.width, overlay.height);
  icons();
}

async function startCamera() {
  if (cameraStarting || analysis) return;
  if (stream) {
    if (measuring) await finishSession();
    stopCamera();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    notify(
      "Kamera krever HTTPS eller localhost og en nettleser med kamerastøtte.",
    );
    return;
  }
  cameraStarting = true;
  const generation = ++cameraGeneration;
  $("#camera-button").innerHTML =
    `${icon("loader-circle", "spin")} Starter kamera`;
  $("#camera-button").setAttribute("disabled", "");
  icons();
  let acquired: MediaStream | null = null;
  try {
    acquired = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    });
    if (generation !== cameraGeneration) {
      acquired.getTracks().forEach((track) => track.stop());
      return;
    }
    stream = acquired;
    cameraVideo.srcObject = stream;
    await cameraVideo.play();
    tracker = await getTracker("VIDEO");
    if (generation !== cameraGeneration) return;
    overlay.width = cameraVideo.videoWidth;
    overlay.height = cameraVideo.videoHeight;
    $("#camera-frame").style.aspectRatio =
      `${cameraVideo.videoWidth} / ${cameraVideo.videoHeight}`;
    $("#camera-empty").classList.add("hidden");
    $("#camera-frame").classList.add("active");
    $("#camera-dot").classList.add("on");
    $("#camera-button").innerHTML = `${icon("camera-off")} Slå av kamera`;
    cameraMessage = "Leter etter kroppen";
    $("#tracking-note").textContent =
      "Stå i den stiplede markeringen, med føttene på gulvmerket.";
    $("#framing-banner").classList.remove("hidden");
    $("#framing-checks").classList.remove("hidden");
    lastVideoTime = -1;
    stream.getVideoTracks()[0].addEventListener("ended", () => {
      if (measuring) void finishSession();
      stopCamera();
    });
  } catch (error) {
    acquired?.getTracks().forEach((track) => track.stop());
    stopCamera();
    notify(
      error instanceof DOMException && error.name === "NotAllowedError"
        ? "Kameratilgang ble ikke gitt. Du kan fortsatt se og øve uten score."
        : "Kamera eller sporingsmodell kunne ikke starte. Kontroller kameratilgang og prøv igjen.",
    );
  } finally {
    cameraStarting = false;
    $("#camera-button").removeAttribute("disabled");
    icons();
  }
}

function cameraConsent() {
  if (stream) {
    void startCamera();
    return;
  }
  openModal(
    `<span class="modal-symbol">${icon("camera")}</span><h2>Ditt lokale øvingsrom.</h2><p>Kameraet brukes til å følge bevegelsene dine på denne enheten. Kameraet starter uten opptak. Ingenting sendes fra enheten.</p><h3>Slik setter du opp</h3><ol class="setup-steps"><li>Sett mobilen stående og stødig, 2–3 meter unna.</li><li>Stå midt i bildet med lys i rommet, ikke foran et vindu.</li><li>Hele kroppen og armene må være med. Appen viser deg hvor du skal stå.</li></ol><label class="check-option"><input type="checkbox" id="age-confirm" />Jeg er 12 år eller eldre.</label><p class="fine-print">Under 18? La gjerne en foresatt være med første gang. Bruk bare videoer du har rett til å bruke, og unngå å filme andre.</p><button class="primary-button wide" id="confirm-camera" disabled>Aktiver kamera ${icon("camera")}</button>`,
  );
  $<HTMLInputElement>("#age-confirm").onchange = (event) => {
    $<HTMLButtonElement>("#confirm-camera").disabled = !(
      event.target as HTMLInputElement
    ).checked;
  };
  $("#confirm-camera").onclick = () => {
    closeModal();
    void startCamera();
  };
}
$("#camera-button").onclick = cameraConsent;

function recordingOptions() {
  if (!stream) {
    cameraConsent();
    return;
  }
  openModal(
    `<h2>${phase === "learn" ? "Gi denne delen litt tid." : "Klar for din gjennomgang?"}</h2><p>${escape(danceName)} · ${phase === "learn" ? escape(stageName()) : formatTime(reference.duration)} · ${speed.toString().replace(".", ",")}× tempo</p><div class="notice">Ha god plass rundt deg. Stopp hvis noe gjør vondt.</div><label class="check-option"><input type="checkbox" id="save-video" ${typeof MediaRecorder === "undefined" ? "disabled" : ""} />Lagre et opptak på denne enheten</label><p class="fine-print">Valgfritt. Kun kamerabildet, uten lyd. Øktresultatet lagres lokalt uansett. ${typeof MediaRecorder === "undefined" ? "Denne nettleseren støtter ikke opptak." : ""}</p><button class="primary-button wide" id="begin-session">Start når du står riktig ${icon("arrow-right")}</button>`,
  );
  $("#begin-session").onclick = () => {
    const save = $<HTMLInputElement>("#save-video").checked;
    closeModal();
    beginSession(save);
  };
}

function beginSession(save: boolean) {
  samples = [];
  latestMovement = null;
  latestTiming = null;
  liveMovement = null;
  liveTiming = null;
  lastMeasuredTime = -1;
  recordChunks = [];
  recordingDone = null;
  recorder = null;
  if (save && stream && typeof MediaRecorder !== "undefined") {
    try {
      const mimeType = [
        "video/webm;codecs=vp8",
        "video/mp4",
        "video/webm",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const activeRecorder = recorder;
      recordingDone = new Promise<Blob>((resolve, reject) => {
        activeRecorder.ondataavailable = (event) => {
          if (event.data.size) recordChunks.push(event.data);
        };
        activeRecorder.onstop = () =>
          resolve(new Blob(recordChunks, { type: activeRecorder.mimeType }));
        activeRecorder.onerror = () => reject(new Error("Opptaket feilet."));
      });
      recordingDone.catch(() => {});
    } catch {
      notify("Opptak er ikke tilgjengelig. Økten fortsetter uten video.");
    }
  }
  measuring = true;
  playing = false;
  countdownUntil = performance.now() + 3000;
  playhead = phase === "learn" ? learnStart() : 0;
  syncVideo();
  $("#countdown").classList.remove("hidden");
  $<HTMLInputElement>("#timeline").disabled = true;
  $<HTMLSelectElement>("#speed").disabled = true;
  statusMessage = "Finn startposisjonen";
  updatePhase();
  updatePlayButton();
}

async function finishSession() {
  if (!measuring) return;
  const wasCountingDown = countdownUntil > 0;
  measuring = false;
  playing = false;
  countdownUntil = 0;
  $("#countdown").classList.add("hidden");
  referenceVideo.pause();
  $<HTMLInputElement>("#timeline").disabled = false;
  $<HTMLSelectElement>("#speed").disabled = false;
  $("#record-badge").classList.add("hidden");
  updatePhase();
  updatePlayButton();
  if (wasCountingDown) {
    recorder = null;
    recordingDone = null;
    return;
  }
  const mean = (values: number[]) =>
    values.length
      ? Math.round(
          values.reduce((sum, value) => sum + value, 0) / values.length,
        )
      : null;
  const movement = mean(samples.map((sample) => sample.movement));
  const timing = mean(
    samples.flatMap((sample) =>
      sample.timing === null ? [] : [sample.timing],
    ),
  );
  const segmentScores = reference.segments.map((_, index) => ({
    index,
    score: mean(
      samples
        .filter((sample) => sample.segment === index)
        .map((sample) =>
          settings.goal === "Finne rytmen"
            ? (sample.timing ?? sample.movement)
            : sample.movement,
        ),
    ),
  }));
  const threshold =
    settings.level === "Nybegynner"
      ? 65
      : settings.level === "Litt erfaring"
        ? 75
        : 85;
  const weak = segmentScores
    .filter((result) => result.score !== null && result.score < threshold)
    .sort((first, last) => first.score! - last.score!)
    .slice(0, 3)
    .map((result) => result.index);
  const session: Session = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    dance: danceName,
    movement,
    timing,
    goal: settings.goal,
    level: settings.level,
    weak,
    duration: Math.round((performance.now() - sessionStart) / 1000),
    samples: samples.length,
  };
  lastResult = session;
  sessions = [session, ...sessions].slice(0, 100);
  if (!writeLocal("move-sessions", sessions))
    notify(
      "Øktresultatet kunne ikke lagres. Nettleserlagringen kan være full.",
    );
  if (recorder && recorder.state !== "inactive") {
    recorder.stop();
    try {
      const blob = await recordingDone;
      if (blob?.size) await saveRecording(session.id, blob);
    } catch {
      notify("Økten er lagret, men videoopptaket kunne ikke lagres.");
    }
  }
  recorder = null;
  recordingDone = null;
  statusMessage = movement === null ? "Ingen sikker måling" : "Et steg videre";
  latestMovement = movement;
  latestTiming = timing;
  showSummary(session);
}

function showSummary(session: Session) {
  const previous = sessions.find(
    (item) =>
      item.id !== session.id &&
      item.dance === session.dance &&
      item.movement !== null,
  );
  const delta =
    previous?.movement !== null &&
    previous?.movement !== undefined &&
    session.movement !== null
      ? session.movement - previous.movement
      : null;
  const next =
    phase === "learn"
      ? nextStage(
          { from: learnFrom, to: selectedSegment },
          reference.segments.length,
        )
      : null;
  const nextButton =
    phase === "learn"
      ? `<button class="primary-button wide" id="next-stage">${next ? (next.from < next.to ? `Neste: sett sammen del ${next.from + 1}–${next.to + 1}` : `Neste: ${escape(reference.segments[next.to].label)}`) : "Dans hele koreografien"} ${icon("arrow-right")}</button>`
      : "";
  openModal(
    `<span class="summary-kicker">${icon("sparkles")} DIN GJENNOMGANG</span><h2>${session.movement === null ? "Øving teller også uten score." : session.weak.length ? "Du har noe å bygge videre på." : "Et steg videre. Bra jobbet."}</h2><p>${escape(session.dance)} · ${session.duration} sek · ${escape(session.level)}</p><div class="summary-metrics"><div><span>Bevegelseslikhet</span><strong>${session.movement ?? "–"}<small>/100</small></strong></div><div><span>Timing</span><strong>${session.timing ?? "–"}<small>/100</small></strong></div></div><p>${session.movement === null ? "Vi fikk ikke nok tydelige kroppspunkter til å vurdere denne økten. Prøv bedre lys og mer avstand, med hele kroppen i bildet." : `Fokuset ditt var ${escape(session.goal.toLowerCase())}. ${delta !== null ? (delta > 0 ? `Bevegelseslikheten er ${delta} poeng høyere enn forrige økt.` : delta < 0 ? "Dagens måling er litt lavere enn sist. Prøv roligere tempo og lik kameravinkel." : "Bevegelseslikheten er på samme nivå som sist.") : "Dette er et første utgangspunkt, ikke en fasit."}`}</p><p class="fine-print">${session.samples} gyldige målinger. Timing er et grovt faseestimat. Score måler ikke personlig stil eller sikkerhet.</p>${session.weak.length ? `<h3>Gi disse delene en ny runde</h3><div class="summary-steps">${session.weak.map((index) => `<button class="summary-step" data-retry="${index}"><span>${String(index + 1).padStart(2, "0")}</span>${escape(reference.segments[index]?.label ?? `Del ${index + 1}`)}${icon("repeat-2")}</button>`).join("")}</div>` : session.movement !== null ? '<div class="notice mint">Ingen målte deler under øvingsterskelen din. Fortsett gjerne i ditt tempo.</div>' : ""}${nextButton}<div class="summary-actions"><button class="secondary-button" id="view-recording">${icon("play")} Se opptak</button><button class="primary-button" id="summary-close">Til studio ${icon("arrow-right")}</button></div>`,
  );
  $("#summary-close").onclick = closeModal;
  const nextStageButton =
    document.querySelector<HTMLButtonElement>("#next-stage");
  if (nextStageButton)
    nextStageButton.onclick = () => {
      closeModal();
      if (next) {
        learnFrom = next.from;
        selectedSegment = next.to;
        changePhase("learn");
        renderSegments();
      } else changePhase("dance");
    };
  $("#view-recording").onclick = () => void recordingModal(session);
  document
    .querySelectorAll<HTMLButtonElement>("[data-retry]")
    .forEach((button) => {
      button.onclick = () => {
        selectedSegment = Number(button.dataset.retry);
        learnFrom = selectedSegment;
        closeModal();
        changePhase("learn");
        renderSegments();
      };
    });
}

async function recordingModal(session: Session) {
  try {
    const blob = await getRecording(session.id);
    if (!blob) {
      notify("Ingen video ble lagret for denne økten.");
      return;
    }
    openModal(
      `<h2>Din gjennomgang.</h2><p>${escape(session.dance)}</p><video id="saved-video" class="saved-video" controls playsinline></video><a class="primary-button wide" id="download-recording" download="move-${session.id}.${blob.type.includes("mp4") ? "mp4" : "webm"}">${icon("download")} Last ned opptak</a>`,
    );
    reviewUrl = URL.createObjectURL(blob);
    $<HTMLVideoElement>("#saved-video").src = reviewUrl;
    $<HTMLAnchorElement>("#download-recording").href = reviewUrl;
  } catch {
    notify("Opptaket kunne ikke åpnes i denne nettleseren.");
  }
}

$("#next-button").onclick = () => {
  if (phase === "demo") {
    changePhase("learn");
    return;
  }
  if (measuring) void finishSession();
  else recordingOptions();
};

function lessonPlanModal() {
  const parts = reference.segments
    .map(
      (segment, index) =>
        `<li><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${escape(segment.label)}</strong><small>${formatTime(segment.start)} – ${formatTime(segment.end)}</small></div></li>`,
    )
    .join("");
  const count = reference.segments.length;
  openModal(
    `<span class="summary-kicker">${icon("sparkles")} DIN OPPLÆRING</span><h2>Slik lærer du ${escape(danceName)}.</h2><p>Videoen er delt i ${count} ${count === 1 ? "del" : "deler"} ut fra målt bevegelse. Du lærer én del om gangen og setter dem sammen underveis, til du kan hele koreografien.</p><ol class="plan-list">${parts}<li class="plan-final"><span>→</span><div><strong>Hele koreografien</strong><small>Dans sammen med videoen</small></div></li></ol><p class="fine-print">Delene og tipsene er automatiske og bygger bare på bevegelsen som er målt i videoen. De navngir ikke steg og vurderer ikke teknikk eller sikkerhet.</p><button class="primary-button wide" id="plan-start">Se hele først ${icon("arrow-right")}</button>`,
  );
  $("#plan-start").onclick = closeModal;
}

function chooseBuiltIn() {
  if (measuring || analysis || cameraStarting) {
    notify("Avslutt den aktive økten eller analysen først.");
    return;
  }
  referenceVideo.pause();
  referenceVideo.removeAttribute("src");
  referenceVideo.load();
  if (customUrl) URL.revokeObjectURL(customUrl);
  customUrl = null;
  customFile = null;
  $("#custom-card").classList.add("hidden");
  $("#builtin-card").classList.add("selected");
  reference = builtInReference();
  danceName = "Bart Simpson";
  $("#reference-video").classList.add("hidden");
  $("#scene").classList.remove("hidden");
  $("#lesson-title").textContent = danceName;
  $("#lesson-genre").textContent = "HIP HOP / GRUNNSTEG";
  $("#stage-tag").textContent = "STILISERT FIGUR";
  selectedSegment = 0;
  learnFrom = 0;
  $<HTMLInputElement>("#timeline").max = String(reference.duration);
  $("#duration").textContent = formatTime(reference.duration);
  renderSegments();
  changePhase("demo");
  setView("studio");
}
$("#builtin-card").onclick = chooseBuiltIn;
function requestUpload() {
  if (measuring || analysis || cameraStarting) {
    notify("Avslutt den aktive økten eller analysen først.");
    return;
  }
  openModal(
    `<span class="modal-symbol">${icon("upload")}</span><h2>Din video. Din dans.</h2><p>Velg et klipp der hele kroppen er synlig. Er det flere i bildet, følger appen personen som står nærmest midten. Demonstrasjonen støtter 1–${maxVideoSeconds} sekunder og maks 100 MB.</p><div class="notice">Automatisk analyse foreslår øvingsdeler fra bevegelse. Den lager ikke pålitelige danseforklaringer og vurderer ikke sikkerhet.</div><label class="check-option"><input type="checkbox" id="upload-age" />Jeg er 12 år eller eldre og har rett til å bruke videoen.</label><button class="primary-button wide" id="choose-file" disabled>Velg lokal video ${icon("upload")}</button><div class="or-divider"><span>eller</span></div><label class="form-label" for="video-url">Lim inn lenke til en videofil</label><input class="text-input" type="url" id="video-url" placeholder="https://…/dans.mp4" autocomplete="off" inputmode="url" spellcheck="false" disabled /><p class="field-error" id="url-error" role="alert"></p><button class="secondary-button wide" id="fetch-url" disabled>Hent fra lenke ${icon("arrow-right")}</button><p class="fine-print">Lenken må gå direkte til en .mp4- eller .webm-fil, og nettstedet må tillate at andre apper leser den. YouTube, TikTok og Instagram støttes ikke. Videoen analyseres på enheten og lastes ikke opp. Med lenke henter enheten videoen direkte fra nettstedet.</p>`,
  );
  const link = $<HTMLInputElement>("#video-url");
  const syncUpload = () => {
    const allowed = $<HTMLInputElement>("#upload-age").checked;
    $<HTMLButtonElement>("#choose-file").disabled = !allowed;
    link.disabled = !allowed;
    $<HTMLButtonElement>("#fetch-url").disabled =
      !allowed || !link.value.trim();
    $("#url-error").textContent = "";
  };
  $<HTMLInputElement>("#upload-age").onchange = syncUpload;
  link.oninput = syncUpload;
  link.onkeydown = (event) => {
    if (event.key === "Enter") $("#fetch-url").click();
  };
  $("#fetch-url").onclick = () => {
    const parsed = parseVideoUrl(link.value);
    if ("error" in parsed) {
      $("#url-error").textContent = parsed.error;
      return;
    }
    closeModal();
    void loadFromLink(parsed.url);
  };
  $("#choose-file").onclick = () => {
    closeModal();
    $<HTMLInputElement>("#video-input").click();
  };
}
async function loadFromLink(link: URL) {
  stopCamera();
  playing = false;
  updatePlayButton();
  const controller = new AbortController();
  analysis = controller;
  openModal(
    `<span class="modal-symbol">${icon("download")}</span><h2>Henter videoen.</h2><p>${escape(link.hostname)}</p><div class="analysis-track"><span id="analysis-bar"></span></div><p id="analysis-status" aria-live="polite">Kobler til …</p><button class="secondary-button wide" id="cancel-analysis">Avbryt ${icon("x")}</button>`,
  );
  $("#cancel-analysis").onclick = () => {
    controller.abort();
    closeModal();
  };
  const abortOnClose = () => controller.abort();
  modal.addEventListener("close", abortOnClose);
  let file: File | null = null;
  try {
    file = await fetchVideo(link, controller.signal, (received, total) => {
      const megabytes = (received / 1024 / 1024).toFixed(1).replace(".", ",");
      if (total && $("#analysis-bar"))
        $("#analysis-bar").style.width = `${(received / total) * 100}%`;
      if ($("#analysis-status"))
        $("#analysis-status").textContent = `${megabytes} MB hentet`;
    });
  } catch (error) {
    closeModal();
    if (!(error instanceof DOMException && error.name === "AbortError"))
      notify(
        error instanceof Error ? error.message : "Videoen kunne ikke hentes.",
      );
  } finally {
    modal.removeEventListener("close", abortOnClose);
    analysis = null;
  }
  if (file) await loadChoreography(file);
}

$("#upload-button").onclick = requestUpload;
$("#library-upload").onclick = requestUpload;
$<HTMLInputElement>("#video-input").onchange = (event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (file) void loadChoreography(file);
};
async function loadChoreography(file: File) {
  if (file.size > maxVideoBytes) {
    notify("Klippet er større enn 100 MB. Velg et kortere klipp.");
    return;
  }
  stopCamera();
  playing = false;
  updatePlayButton();
  const oldUrl = customUrl;
  const oldReference = reference;
  const oldFile = customFile;
  const oldName = danceName;
  const url = URL.createObjectURL(file);
  const controller = new AbortController();
  analysis = controller;
  openModal(
    `<span class="modal-symbol">${icon("scan-line")}</span><h2>Finner bevegelsen din.</h2><p>${escape(file.name)}</p><div class="analysis-track"><span id="analysis-bar"></span></div><p id="analysis-status" aria-live="polite">Laster lokal sporingsmodell …</p><button class="secondary-button wide" id="cancel-analysis">Avbryt ${icon("x")}</button>`,
  );
  $("#cancel-analysis").onclick = () => {
    controller.abort();
    closeModal();
  };
  const abortOnClose = () => controller.abort();
  modal.addEventListener("close", abortOnClose);
  try {
    const loaded = waitForVideo(
      referenceVideo,
      "loadeddata",
      controller.signal,
    );
    referenceVideo.src = url;
    referenceVideo.load();
    await loaded;
    const result = await analyzeVideo(
      referenceVideo,
      (value) => {
        if ($("#analysis-bar"))
          $("#analysis-bar").style.width = `${value * 100}%`;
        if ($("#analysis-status"))
          $("#analysis-status").textContent =
            `${Math.round(value * 100)} % · analyseres på enheten`;
      },
      controller.signal,
    );
    if (controller.signal.aborted)
      throw new DOMException("Avbrutt", "AbortError");
    customUrl = url;
    customFile = file;
    reference = result;
    danceName = file.name.replace(/\.[^.]+$/, "");
    selectedSegment = 0;
    learnFrom = 0;
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    $("#scene").classList.add("hidden");
    $("#reference-video").classList.remove("hidden");
    $("#custom-card").classList.remove("hidden");
    $("#builtin-card").classList.remove("selected");
    $("#custom-name").textContent = danceName;
    $("#custom-meta").textContent =
      `${result.segments.length} øvingsdeler · ${formatTime(result.duration)}`;
    $("#lesson-title").textContent = danceName;
    $("#lesson-genre").textContent = "DIN VIDEO / AUTOMATISKE ØVINGSDELER";
    $("#stage-tag").textContent = "LOKAL VIDEO";
    $<HTMLInputElement>("#timeline").max = String(result.duration);
    $("#duration").textContent = formatTime(result.duration);
    renderSegments();
    updateSettings();
    modal.removeEventListener("close", abortOnClose);
    closeModal();
    changePhase("demo");
    setView("studio");
    lessonPlanModal();
  } catch (error) {
    URL.revokeObjectURL(url);
    reference = oldReference;
    customUrl = oldUrl;
    customFile = oldFile;
    danceName = oldName;
    if (oldUrl) referenceVideo.src = oldUrl;
    else {
      referenceVideo.removeAttribute("src");
      referenceVideo.load();
    }
    modal.removeEventListener("close", abortOnClose);
    closeModal();
    if (!(error instanceof DOMException && error.name === "AbortError"))
      notify(
        error instanceof Error
          ? error.message
          : "Videoen kunne ikke analyseres.",
      );
  } finally {
    analysis = null;
    modal.removeEventListener("close", abortOnClose);
  }
}
$("#custom-card").onclick = () => {
  if (customUrl) setView("studio");
};

function setView(view: string) {
  if (measuring && view !== "studio") {
    notify("Avslutt økten før du går ut av studioet.");
    return;
  }
  document
    .querySelectorAll<HTMLElement>("[data-view]")
    .forEach((button) =>
      button.classList.toggle("active", button.dataset.view === view),
    );
  for (const name of ["studio", "library", "progress"])
    $(`#${name}-view`).classList.toggle("hidden", name !== view);
  if (view !== "studio") {
    playing = false;
    syncVideo();
    updatePlayButton();
    stopCamera();
  }
  if (view === "library") renderLibrary();
  if (view === "progress") renderHistory();
}
document
  .querySelectorAll<HTMLButtonElement>("[data-view]")
  .forEach((button) => {
    button.onclick = () => setView(button.dataset.view!);
  });
$(".brand").onclick = (event) => {
  event.preventDefault();
  setView("studio");
};

function renderLibrary() {
  const thumbnail = $<HTMLImageElement>("#guide-thumbnail").src;
  $("#library-content").innerHTML =
    `<button class="library-item" id="library-builtin"><div class="library-art"><img src="${thumbnail}" alt="Stilisert dansefigur" /><span class="genre-stamp">HIP HOP</span></div><div><span class="small-label">GRUNNSTEG / 16 SEK</span><h3>Bart Simpson</h3><p>Stilisert øvelse · Alle nivåer</p></div>${icon("arrow-up-right")}</button>${customFile ? `<button class="library-item custom-library" id="library-custom"><span class="large-footprints">${icon("footprints")}</span><div><span class="small-label">DIN LOKALE VIDEO</span><h3>${escape(danceName)}</h3><p>${reference.segments.length} automatiske øvingsdeler</p></div>${icon("arrow-up-right")}</button>` : `<button class="library-item library-upload" id="empty-upload">${icon("upload")}<div><h3>Legg til din egen dans</h3><p>Et kort klipp, et nytt utgangspunkt.</p></div>${icon("arrow-up-right")}</button>`}`;
  icons();
  $("#library-builtin").onclick = chooseBuiltIn;
  if ($("#library-custom"))
    $("#library-custom").onclick = () => setView("studio");
  if ($("#empty-upload")) $("#empty-upload").onclick = requestUpload;
}

function renderHistory() {
  const measured = sessions.filter((session) => session.movement !== null);
  $("#history-content").innerHTML =
    `<div class="progress-stats"><div><span>Økter</span><strong>${sessions.length}</strong></div><div><span>Tid i bevegelse</span><strong>${Math.round(sessions.reduce((sum, session) => sum + session.duration, 0) / 60)}<small>min</small></strong></div><div><span>Siste bevegelseslikhet</span><strong>${measured[0]?.movement ?? "–"}<small>/100</small></strong></div></div>${sessions.length ? `<div class="history-list">${sessions.map((session) => `<article class="history-row"><span class="history-icon">${icon("footprints")}</span><div><h3>${escape(session.dance)}</h3><p>${new Date(session.date).toLocaleDateString("nb-NO", { day: "numeric", month: "long" })} · ${escape(session.goal)} · ${session.duration} sek</p></div><div class="history-score"><strong>${session.movement ?? "–"}</strong><small>bevegelse</small></div><button class="icon-button" data-recording="${session.id}" aria-label="Se opptak for ${escape(session.dance)}" title="Se lokalt opptak">${icon("play")}</button></article>`).join("")}</div>` : `<div class="empty-history">${icon("activity")}<h3>Alle begynner med første steg.</h3><p>Ingen økter er lagret ennå.</p><button class="primary-button" id="first-session">Til studio ${icon("arrow-right")}</button></div>`}`;
  icons();
  if ($("#first-session"))
    $("#first-session").onclick = () => setView("studio");
  document
    .querySelectorAll<HTMLButtonElement>("[data-recording]")
    .forEach((button) => {
      button.onclick = () => {
        const session = sessions.find(
          (item) => item.id === button.dataset.recording,
        );
        if (session) void recordingModal(session);
      };
    });
}
$("#clear-data").onclick = () => {
  openModal(
    `<h2>Slette lokale data?</h2><p>Dette sletter alle øktresultater, opptak, nivå og mål på denne nettleseren. Det kan ikke angres.</p><button class="danger-button wide" id="confirm-clear">${icon("trash-2")} Slett alle lokale data</button>`,
  );
  $("#confirm-clear").onclick = async () => {
    try {
      await clearRecordings();
      localStorage.removeItem("move-sessions");
      localStorage.removeItem("move-settings");
      sessions = [];
      lastResult = null;
      settings.level = "Nybegynner";
      settings.goal = "Finne rytmen";
      settings.mirror = true;
      updateSettings();
      renderHistory();
      closeModal();
      notify("Lokale økter, opptak og innstillinger er slettet.");
    } catch {
      notify(
        "Dataene kunne ikke slettes. Prøv nettleserens innstillinger for lagring.",
      );
    }
  };
};

function setHtml(selector: string, html: string) {
  const element = $(selector);
  if (element.innerHTML !== html) element.innerHTML = html;
}

function showFraming(state: Framing) {
  setHtml(
    "#framing-banner",
    `<strong>${state.title}</strong><span>${state.detail}</span>`,
  );
  $("#framing-banner").dataset.ready = String(state.ready);
  document
    .querySelectorAll<HTMLElement>("[data-part]")
    .forEach((chip) =>
      chip.classList.toggle(
        "ok",
        state.parts[chip.dataset.part as keyof Framing["parts"]],
      ),
    );
  const guide = $("#stage-guide");
  guide.classList.toggle("hidden", measuring);
  guide.dataset.ready = String(state.ready);
  setHtml(
    "#stage-guide",
    state.ready
      ? `<strong>Du står riktig</strong>`
      : `<strong>${state.title}</strong><span>${state.detail}</span>`,
  );
}

function updateFeedback() {
  $("#camera-status").textContent = cameraMessage;
  $("#live-feedback").textContent = statusMessage;
  $("#movement-score").innerHTML =
    `${latestMovement ?? "–"}<small>/100</small>`;
  $("#timing-score").innerHTML = `${latestTiming ?? "–"}<small>/100</small>`;
  $("#movement-bar").style.width = `${latestMovement ?? 0}%`;
  $("#timing-bar").style.width = `${latestTiming ?? 0}%`;
}

function tick(now: number) {
  const elapsed = Math.min((now - lastUi) / 1000 || 0, 0.1);
  lastUi = now;
  if (countdownUntil) {
    const waiting = !framing?.ready;
    if (waiting) countdownUntil = now + 3000;
    const remaining = Math.ceil((countdownUntil - now) / 1000);
    $("#countdown").classList.toggle("waiting", waiting);
    setHtml(
      "#countdown",
      waiting
        ? `<strong>${framing?.title ?? "Finn plassen din"}</strong><span>${framing?.detail ?? "Stå foran kameraet, så hele kroppen er med i bildet."}</span>`
        : String(Math.max(1, remaining)),
    );
    if (!waiting && now >= countdownUntil) {
      countdownUntil = 0;
      $("#countdown").classList.add("hidden");
      sessionStart = now;
      playing = true;
      syncVideo();
      updatePlayButton();
      if (recorder) {
        try {
          recorder.start(1000);
          $("#record-badge").classList.remove("hidden");
        } catch {
          recorder = null;
          recordingDone = null;
          notify("Opptak kunne ikke starte. Økten fortsetter uten video.");
        }
      }
    }
  }
  if (playing && !document.hidden) {
    playhead = customUrl
      ? referenceVideo.currentTime
      : playhead + elapsed * speed;
    const end = phase === "learn" ? learnEnd() : reference.duration;
    if (playhead >= end - 0.02 || (customUrl && referenceVideo.ended)) {
      if (measuring) void finishSession();
      else {
        playhead = phase === "learn" ? learnStart() : 0;
        syncVideo();
      }
    }
  }
  if (!customUrl && !$("#studio-view").classList.contains("hidden"))
    scene?.render(playhead);
  const segmentIndex = reference.segments.findIndex(
    (segment) => playhead >= segment.start && playhead < segment.end,
  );
  const currentSegment = Math.max(0, segmentIndex);
  $("#step-number").textContent =
    `BEVEGELSE ${String(currentSegment + 1).padStart(2, "0")} / ${String(reference.segments.length).padStart(2, "0")}`;
  $("#step-title").textContent =
    reference.segments[currentSegment]?.label ?? "Din bevegelse";
  $("#timecode").textContent = formatTime(playhead);
  $<HTMLInputElement>("#timeline").value = String(playhead);
  $("#beat-count").innerHTML =
    `${(Math.floor(playhead * 2) % 8) + 1}<span>/ 8</span>`;
  $("#beat-count").classList.toggle("hidden", !!customUrl);
  if (
    sound &&
    playing &&
    !document.hidden &&
    audio &&
    Math.floor(playhead * 2) !== lastBeat
  ) {
    lastBeat = Math.floor(playhead * 2);
    const oscillator = audio.createOscillator(),
      gain = audio.createGain();
    oscillator.frequency.value = lastBeat % 8 === 0 ? 880 : 660;
    gain.gain.setValueAtTime(0.035, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.07);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.08);
  }
  if (
    stream &&
    tracker &&
    !analysis &&
    cameraVideo.readyState >= 2 &&
    cameraVideo.currentTime !== lastVideoTime &&
    now - lastDetection > 100
  ) {
    lastVideoTime = cameraVideo.currentTime;
    lastDetection = now;
    try {
      const result = tracker.detectForVideo(cameraVideo, now);
      const points = personSelector.pick(result.landmarks) ?? [];
      const actual = features(points);
      framing = framingFilter(assessFraming(points, settings.mirror));
      cameraMessage = framing.ready
        ? "Du står riktig"
        : actual
          ? "Kroppen er synlig"
          : "Juster plasseringen";
      const comparison =
        actual && measuring && playing
          ? compareAt(actual, reference, playhead)
          : null;
      liveJoint =
        comparison && comparison.movement < 75 ? comparison.joint : null;
      drawPose(overlay, points, liveJoint, settings.mirror, {
        ready: framing.ready,
        direction: framing.direction,
        compact: measuring && playing,
      });
      showFraming(framing);
      if (measuring && playing) {
        if (comparison) {
          liveMovement = Math.round(
            liveMovement === null
              ? comparison.movement
              : liveMovement * 0.7 + comparison.movement * 0.3,
          );
          liveTiming =
            comparison.timing === null
              ? null
              : Math.round(
                  liveTiming === null
                    ? comparison.timing
                    : liveTiming * 0.7 + comparison.timing * 0.3,
                );
          latestMovement = liveMovement;
          latestTiming = liveTiming;
          statusMessage =
            comparison.movement >= 75
              ? "Du er i flyten"
              : settings.goal === "Finne rytmen" &&
                  comparison.timing !== null &&
                  comparison.timing < 60
                ? "Finn tempoet, litt etter litt"
                : "Prøv litt roligere";
          if (now - lastMeasuredTime >= 250) {
            samples.push({
              segment: currentSegment,
              movement: comparison.movement,
              timing: comparison.timing,
            });
            lastMeasuredTime = now;
          }
        } else {
          latestMovement = null;
          latestTiming = null;
          statusMessage = actual ? "Referansen er utydelig her" : framing.title;
        }
      } else if (!lastResult)
        statusMessage = framing.ready
          ? "Klar for en gjennomgang"
          : framing.title;
    } catch {
      if (measuring) void finishSession();
      stopCamera();
      notify("Sporingen stoppet. Prøv å aktivere kameraet igjen.");
    }
    updateFeedback();
  }
  if (!stream) updateFeedback();
  requestAnimationFrame(tick);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (measuring) void finishSession();
    playing = false;
    referenceVideo.pause();
    updatePlayButton();
    stopCamera();
  }
});
window.addEventListener("pagehide", () => {
  stream?.getTracks().forEach((track) => track.stop());
  if (recorder?.state === "recording") recorder.stop();
  if (customUrl) URL.revokeObjectURL(customUrl);
  if (reviewUrl) URL.revokeObjectURL(reviewUrl);
});
updateSettings();
renderSegments();
updatePhase();
icons();
requestAnimationFrame(tick);
