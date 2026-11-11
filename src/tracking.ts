import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { features, segmentMotion } from "./motion";
import type { MotionFrame, Point, Reference } from "./motion";
import type { Direction } from "./framing";

let model: PoseLandmarker | null = null;
let pending: Promise<PoseLandmarker> | null = null;

export async function getTracker(
  mode: "IMAGE" | "VIDEO",
): Promise<PoseLandmarker> {
  if (!pending) {
    pending = FilesetResolver.forVisionTasks("/vision")
      .then((files) =>
        PoseLandmarker.createFromOptions(files, {
          baseOptions: {
            modelAssetPath: "/models/pose_landmarker_lite.task",
            delegate: "CPU",
          },
          runningMode: mode,
          numPoses: 1,
          minPoseDetectionConfidence: 0.6,
          minPosePresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
        }),
      )
      .then((result) => {
        model = result;
        return result;
      })
      .catch((error) => {
        pending = null;
        throw error;
      });
  }
  const tracker = model ?? (await pending);
  await tracker.setOptions({ runningMode: mode });
  return tracker;
}

export function waitForVideo(
  video: HTMLVideoElement,
  event: string,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Avbrutt", "AbortError"));
      return;
    }
    const timer = setTimeout(
      () => finish(new Error("Videoen svarte ikke. Prøv et annet klipp.")),
      12000,
    );
    const success = () => finish();
    const failed = () =>
      finish(new Error("Videoformatet kunne ikke leses. Prøv MP4 eller WebM."));
    const abort = () => finish(new DOMException("Avbrutt", "AbortError"));
    const finish = (error?: Error) => {
      clearTimeout(timer);
      video.removeEventListener(event, success);
      video.removeEventListener("error", failed);
      signal?.removeEventListener("abort", abort);
      error ? reject(error) : resolve();
    };
    video.addEventListener(event, success, { once: true });
    video.addEventListener("error", failed, { once: true });
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export async function analyzeVideo(
  video: HTMLVideoElement,
  progress: (value: number) => void,
  signal: AbortSignal,
): Promise<Reference> {
  if (
    !Number.isFinite(video.duration) ||
    video.duration < 1 ||
    video.duration > 30
  )
    throw new Error(
      "Velg et klipp mellom 1 og 30 sekunder for denne demonstrasjonen.",
    );
  const tracker = await getTracker("IMAGE");
  const frames: MotionFrame[] = [];
  const duration = video.duration;
  for (let time = 0.01; time < duration; time += 1 / 6) {
    if (signal.aborted) throw new DOMException("Avbrutt", "AbortError");
    const sought = waitForVideo(video, "seeked", signal);
    video.currentTime = time;
    await sought;
    const result = tracker.detect(video);
    const angles = features(result.landmarks[0] ?? []);
    if (angles) frames.push({ time, angles });
    progress(time / duration);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
  }
  video.currentTime = 0;
  if (frames.length < duration * 6 * 0.35)
    throw new Error(
      "Hele kroppen var ikke tydelig nok. Prøv en video med én person, synlige føtter og godt lys.",
    );
  return { frames, duration, segments: segmentMotion(frames, duration) };
}

const connections = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];
const highlighted = [
  [11, 13, 15],
  [12, 14, 16],
  [23, 25, 27],
  [24, 26, 28],
  [13, 11, 23],
  [14, 12, 24],
  [11, 23, 25],
  [12, 24, 26],
];

export type Guide = {
  ready: boolean;
  direction: Direction | null;
  compact: boolean;
};

function drawGuide(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  guide: Guide,
) {
  const color = guide.ready ? "#bbedb4" : "#ffac78";
  const unit = Math.max(2, height / 220);
  const x = (fraction: number) => width * fraction;
  const y = (fraction: number) => height * fraction;
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = unit;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.globalAlpha = guide.compact ? 0.35 : 0.9;

  context.setLineDash([unit * 4, unit * 3]);
  context.beginPath();
  context.roundRect(x(0.26), y(0.05), x(0.48), y(0.9), unit * 6);
  context.stroke();

  if (!guide.compact) {
    context.globalAlpha = 0.55;
    context.beginPath();
    context.arc(x(0.5), y(0.17), y(0.055), 0, Math.PI * 2);
    context.moveTo(x(0.5), y(0.225));
    context.lineTo(x(0.5), y(0.26));
    context.moveTo(x(0.4), y(0.29));
    context.quadraticCurveTo(x(0.5), y(0.25), x(0.6), y(0.29));
    context.lineTo(x(0.64), y(0.52));
    context.moveTo(x(0.4), y(0.29));
    context.lineTo(x(0.36), y(0.52));
    context.moveTo(x(0.44), y(0.31));
    context.lineTo(x(0.455), y(0.56));
    context.lineTo(x(0.455), y(0.86));
    context.moveTo(x(0.56), y(0.31));
    context.lineTo(x(0.545), y(0.56));
    context.lineTo(x(0.545), y(0.86));
    context.stroke();
  }

  context.setLineDash([]);
  context.globalAlpha = guide.compact ? 0.4 : 0.95;
  context.beginPath();
  context.ellipse(x(0.5), y(0.9), x(0.17), y(0.028), 0, 0, Math.PI * 2);
  context.stroke();
  if (!guide.compact) {
    context.font = `700 ${Math.round(height * 0.03)}px "DM Sans", sans-serif`;
    context.textAlign = "center";
    context.fillText("STÅ HER", x(0.5), y(0.975));
  }

  if (guide.direction === "left" || guide.direction === "right") {
    const sign = guide.direction === "left" ? -1 : 1;
    const base = x(0.5 + sign * 0.34);
    context.globalAlpha = 1;
    context.lineWidth = unit * 2.5;
    for (const step of [0, 1]) {
      const offset = sign * step * x(0.05);
      context.beginPath();
      context.moveTo(base - sign * x(0.03) + offset, y(0.44));
      context.lineTo(base + sign * x(0.03) + offset, y(0.5));
      context.lineTo(base - sign * x(0.03) + offset, y(0.56));
      context.stroke();
    }
  }
  context.restore();
}

export function drawPose(
  canvas: HTMLCanvasElement,
  points: Point[],
  joint: number | null,
  mirror: boolean,
  guide?: Guide,
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (guide) drawGuide(context, canvas.width, canvas.height, guide);
  const position = (point: Point) => ({
    x: (mirror ? 1 - point.x : point.x) * canvas.width,
    y: point.y * canvas.height,
  });
  context.lineWidth = Math.max(3, canvas.width / 180);
  context.lineCap = "round";
  for (const [first, last] of connections) {
    if (
      !points[first] ||
      !points[last] ||
      (points[first].visibility ?? 0) < 0.5 ||
      (points[last].visibility ?? 0) < 0.5
    )
      continue;
    context.strokeStyle =
      joint !== null &&
      highlighted[joint].includes(first) &&
      highlighted[joint].includes(last)
        ? "#ffac78"
        : "#bbedb4";
    const start = position(points[first]),
      end = position(points[last]);
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  }
  for (const index of new Set(connections.flat())) {
    if (!points[index] || (points[index].visibility ?? 0) < 0.5) continue;
    const point = position(points[index]);
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(
      point.x,
      point.y,
      Math.max(4, canvas.width / 130),
      0,
      Math.PI * 2,
    );
    context.fill();
  }
}
