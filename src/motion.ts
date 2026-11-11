export type Point = { x: number; y: number; z?: number; visibility?: number };
export type MotionFrame = { time: number; angles: number[] };
export type Segment = { start: number; end: number; label: string };
export type Reference = {
  frames: MotionFrame[];
  duration: number;
  segments: Segment[];
};

const joints = [
  [11, 13, 15],
  [12, 14, 16],
  [23, 25, 27],
  [24, 26, 28],
  [13, 11, 23],
  [14, 12, 24],
  [11, 23, 25],
  [12, 24, 26],
];
const required = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

export function angle(first: Point, center: Point, last: Point): number {
  const firstX = first.x - center.x;
  const firstY = first.y - center.y;
  const lastX = last.x - center.x;
  const lastY = last.y - center.y;
  const denominator = Math.hypot(firstX, firstY) * Math.hypot(lastX, lastY);
  if (denominator < 0.00001) return NaN;
  return (
    (Math.acos(
      Math.max(
        -1,
        Math.min(1, (firstX * lastX + firstY * lastY) / denominator),
      ),
    ) *
      180) /
    Math.PI
  );
}

export function features(points: Point[]): number[] | null {
  if (
    required.some(
      (index) => !points[index] || (points[index].visibility ?? 1) < 0.55,
    )
  )
    return null;
  const result = joints.map(([first, center, last]) =>
    angle(points[first], points[center], points[last]),
  );
  return result.every(Number.isFinite) ? result : null;
}

export function similarity(actual: number[], target: number[]): number | null {
  if (
    actual.length !== 8 ||
    target.length !== 8 ||
    ![...actual, ...target].every(Number.isFinite)
  )
    return null;
  const error =
    actual.reduce(
      (sum, value, index) => sum + Math.abs(value - target[index]),
      0,
    ) / actual.length;
  return Math.round(Math.max(0, 100 - error * 1.5));
}

export function compareAt(
  actual: number[],
  reference: Reference,
  time: number,
): {
  movement: number;
  timing: number | null;
  delta: number;
  joint: number;
} | null {
  const nearby = reference.frames.filter(
    (frame) => Math.abs(frame.time - time) <= 0.65,
  );
  if (!nearby.length) return null;
  const nearest = nearby.reduce((best, frame) =>
    Math.abs(frame.time - time) < Math.abs(best.time - time) ? frame : best,
  );
  const best = nearby.reduce((winner, frame) =>
    (similarity(actual, frame.angles) ?? -1) >
    (similarity(actual, winner.angles) ?? -1)
      ? frame
      : winner,
  );
  const movement = similarity(actual, best.angles);
  if (movement === null) return null;
  const variation = nearby.reduce(
    (maximum, frame) =>
      Math.max(
        maximum,
        100 - (similarity(frame.angles, nearest.angles) ?? 100),
      ),
    0,
  );
  const delta = best.time - time;
  const differences = actual.map((value, index) =>
    Math.abs(value - best.angles[index]),
  );
  return {
    movement,
    timing:
      variation > 8
        ? Math.round(Math.max(0, 100 - (Math.abs(delta) / 0.65) * 100))
        : null,
    delta,
    joint: differences.indexOf(Math.max(...differences)),
  };
}

export function segmentMotion(
  frames: MotionFrame[],
  duration: number,
): Segment[] {
  if (!frames.length || duration <= 0) return [];
  const boundaries = [0];
  for (let target = 4; target < duration - 2; target += 4) {
    const candidates = frames.filter(
      (frame, index) =>
        index > 0 &&
        Math.abs(frame.time - target) < 0.8 &&
        frame.time - boundaries[boundaries.length - 1] >= 2,
    );
    if (!candidates.length) continue;
    const energy = (frame: MotionFrame) => {
      const previous = frames[Math.max(0, frames.indexOf(frame) - 1)];
      return frame.angles.reduce(
        (sum, value, index) => sum + Math.abs(value - previous.angles[index]),
        0,
      );
    };
    boundaries.push(
      candidates.reduce((best, frame) =>
        energy(frame) < energy(best) ? frame : best,
      ).time,
    );
  }
  boundaries.push(duration);
  return boundaries
    .slice(0, -1)
    .map((start, index) => ({
      start,
      end: boundaries[index + 1],
      label: `Del ${index + 1}`,
    }));
}
