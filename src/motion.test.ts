import { describe, expect, it } from "vitest";
import {
  angle,
  compareAt,
  features,
  segmentMotion,
  similarity,
} from "./motion";
import type { Point, Reference } from "./motion";

describe("local motion comparison", () => {
  it("is invariant to translation and body scale", () => {
    const points: Point[] = Array.from({ length: 33 }, (_, index) => ({
      x: Math.sin(index),
      y: Math.cos(index),
      visibility: 1,
    }));
    const transformed = points.map((point) => ({
      x: point.x * 3 + 5,
      y: point.y * 3 + 9,
      visibility: 1,
    }));
    expect(similarity(features(points)!, features(transformed)!)).toBe(100);
    expect(angle({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBe(90);
  });
  it("withholds scores when required joints are hidden or degenerate", () => {
    expect(features([])).toBeNull();
    const points = Array.from({ length: 33 }, () => ({
      x: 0,
      y: 0,
      visibility: 1,
    }));
    expect(features(points)).toBeNull();
    expect(similarity([NaN], [90])).toBeNull();
  });
  it("withholds timing for a static pose and has no score outside reference coverage", () => {
    const reference: Reference = {
      duration: 2,
      segments: [],
      frames: [0, 0.5, 1, 1.5].map((time) => ({
        time,
        angles: Array(8).fill(90),
      })),
    };
    expect(compareAt(Array(8).fill(90), reference, 1)?.timing).toBeNull();
    expect(compareAt(Array(8).fill(90), reference, 4)).toBeNull();
  });
  it("finds a nearby moving pose and estimates phase offset", () => {
    const reference: Reference = {
      duration: 2,
      segments: [],
      frames: [0, 0.2, 0.4].map((time) => ({
        time,
        angles: Array(8).fill(40 + time * 200),
      })),
    };
    const result = compareAt(Array(8).fill(120), reference, 0.2)!;
    expect(result.movement).toBe(100);
    expect(result.delta).toBeCloseTo(0.2);
    expect(result.timing).toBeLessThan(100);
  });
  it("builds continuous segments without inventing semantic step names", () => {
    const frames = Array.from({ length: 80 }, (_, index) => ({
      time: index / 5,
      angles: Array(8).fill(90 + Math.sin(index)),
    }));
    const segments = segmentMotion(frames, 16);
    expect(segments[0].start).toBe(0);
    expect(segments.at(-1)?.end).toBe(16);
    expect(
      segments.every(
        (segment, index) =>
          segment.end > segment.start &&
          (!index || segment.start === segments[index - 1].end),
      ),
    ).toBe(true);
    expect(segmentMotion([], 16)).toEqual([]);
  });
});
