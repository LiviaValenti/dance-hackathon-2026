import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { features, segmentMotion } from "./motion";
import type { MotionFrame, Point, Reference } from "./motion";

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

export function drawPose(
  canvas: HTMLCanvasElement,
  points: Point[],
  joint: number | null,
  mirror: boolean,
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
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
