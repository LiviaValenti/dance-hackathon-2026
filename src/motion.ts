export type Point = { x: number; y: number; z?: number; visibility?: number };
export type MotionFrame = { time: number; angles: number[] };
export type Segment = {
  start: number;
  end: number;
  label: string;
  cue?: string;
};
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

export function features(
  points: Point[],
  minVisibility = 0.55,
): number[] | null {
  if (
    required.some(
      (index) =>
        !points[index] || (points[index].visibility ?? 1) < minVisibility,
    )
  )
    return null;
  const result = joints.map(([first, center, last]) =>
    angle(points[first], points[center], points[last]),
  );
  return result.every(Number.isFinite) ? result : null;
}

const bodyParts: [string, number[]][] = [
  ["føttene", [27, 28]],
  ["knærne", [25, 26]],
  ["armene", [13, 14, 15, 16]],
  ["overkroppen", [11, 12, 23, 24]],
];

// Names the body parts that are hidden or too uncertain to use.
export function missingParts(points: Point[], minVisibility = 0.55): string[] {
  return bodyParts
    .filter(([, joints]) =>
      joints.some(
        (index) =>
          !points[index] || (points[index].visibility ?? 1) < minVisibility,
      ),
    )
    .map(([name]) => name);
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

const armJoints = [0, 1, 4, 5];
const legJoints = [2, 3, 6, 7];

export type Stage = { from: number; to: number };

// Part-whole order: part 1, part 2, 1+2, part 3, 1+2+3, and so on; null means the full run-through.
export function nextStage(stage: Stage, count: number): Stage | null {
  if (stage.from === stage.to && stage.to > 0) return { from: 0, to: stage.to };
  return stage.to < count - 1 ? { from: stage.to + 1, to: stage.to + 1 } : null;
}

// Describes only what was measured: which joint groups change most in the part.
export function describeSegment(
  frames: MotionFrame[],
  start: number,
  end: number,
): { focus: string; cue: string } {
  const inside = frames.filter(
    (frame) => frame.time >= start && frame.time < end,
  );
  if (inside.length < 2)
    return {
      focus: "Rolig del",
      cue: "Her er det lite målt bevegelse. Stå stødig og følg videoen.",
    };
  const spread = (joint: number) => {
    const values = inside.map((frame) => frame.angles[joint]);
    return Math.max(...values) - Math.min(...values);
  };
  const average = (joints: number[]) =>
    joints.reduce((sum, joint) => sum + spread(joint), 0) / joints.length;
  const arms = average(armJoints);
  const legs = average(legJoints);
  if (Math.max(arms, legs) < 15)
    return {
      focus: "Holdning",
      cue: "Dette er et rolig parti. Stå stødig, pust og hold overkroppen avslappet.",
    };
  if (arms > legs * 1.4)
    return {
      focus: "Armene",
      cue: "Armene gjør mest her. Se hvor de starter og slutter, og hold knærne myke.",
    };
  if (legs > arms * 1.4)
    return {
      focus: "Beina",
      cue: "Beina og vektflytten styrer denne delen. Start med små steg, og la armene følge etterpå.",
    };
  return {
    focus: "Hele kroppen",
    cue: "Armer og bein jobber sammen. Øv først beina, så armene, og sett dem sammen.",
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
  return boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1];
    const { focus, cue } = describeSegment(frames, start, end);
    return { start, end, label: `Del ${index + 1} · ${focus}`, cue };
  });
}
