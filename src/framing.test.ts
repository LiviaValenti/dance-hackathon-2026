import { describe, expect, it } from "vitest";
import { assessFraming, createFramingFilter } from "./framing";
import type { Point } from "./motion";

function pose(scale = 1, dx = 0): Point[] {
  const base: Record<number, [number, number]> = {
    0: [0.5, 0.2],
    11: [0.55, 0.32],
    12: [0.45, 0.32],
    13: [0.6, 0.45],
    14: [0.4, 0.45],
    15: [0.62, 0.55],
    16: [0.38, 0.55],
    23: [0.53, 0.55],
    24: [0.47, 0.55],
    25: [0.54, 0.72],
    26: [0.46, 0.72],
    27: [0.54, 0.88],
    28: [0.46, 0.88],
  };
  const points: Point[] = Array.from({ length: 33 }, () => ({
    x: 0.5 + dx,
    y: 0.5,
    visibility: 1,
  }));
  for (const [index, [x, y]] of Object.entries(base))
    points[Number(index)] = {
      x: 0.5 + (x - 0.5) * scale + dx,
      y: 0.54 + (y - 0.54) * scale,
      visibility: 1,
    };
  return points;
}

describe("framing guidance", () => {
  it("is ready when the whole body is centred at a good distance", () => {
    const result = assessFraming(pose(), true);
    expect(result.ready).toBe(true);
    expect(result.parts).toEqual({ head: true, hands: true, feet: true });
  });

  it("asks the user to step back when the feet are outside the frame", () => {
    const points = pose();
    points[27] = { x: 0.54, y: 1.05, visibility: 1 };
    const result = assessFraming(points, true);
    expect(result).toMatchObject({ ready: false, direction: "back" });
    expect(result.parts.feet).toBe(false);
  });

  it("detects too close and too far", () => {
    expect(assessFraming(pose(1.25), true).direction).toBe("back");
    expect(assessFraming(pose(0.6), true).direction).toBe("forward");
  });

  it("gives sideways directions as seen on screen, respecting mirroring", () => {
    expect(assessFraming(pose(1, -0.3), true).direction).toBe("left");
    expect(assessFraming(pose(1, -0.3), false).direction).toBe("right");
  });

  it("is never ready without a body", () => {
    const result = assessFraming([], true);
    expect(result.ready).toBe(false);
    expect(result.direction).toBeNull();
  });

  it("is not ready when joints are too uncertain to score", () => {
    const points = pose();
    points[15] = { ...points[15], visibility: 0.52 };
    expect(assessFraming(points, true).ready).toBe(false);
  });

  it("holds a state until the change persists", () => {
    const filter = createFramingFilter(3, 4);
    const ready = assessFraming(pose(), true);
    const far = assessFraming(pose(0.6), true);
    expect(filter(ready).ready).toBe(true);
    expect(filter(far).ready).toBe(true);
    expect(filter(far).ready).toBe(true);
    expect(filter(far).title).toBe(far.title);
    expect(filter(ready).ready).toBe(false);
  });
});
