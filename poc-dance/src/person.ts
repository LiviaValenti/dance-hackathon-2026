import type { Point } from "./motion";

type Pose = Point[];
type Spot = { x: number; y: number };

const seen = (point?: Point) => !!point && (point.visibility ?? 0) >= 0.5;

export function poseCenter(pose: Pose): Spot | null {
  if (seen(pose[23]) && seen(pose[24]))
    return {
      x: (pose[23].x + pose[24].x) / 2,
      y: (pose[23].y + pose[24].y) / 2,
    };
  const points = pose.filter(seen);
  if (points.length < 5) return null;
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

export function createPersonSelector(maxJump = 0.2, patience = 5) {
  let last: Spot | null = null;
  let misses = 0;

  const lose = () => {
    if (++misses >= patience) last = null;
    return null;
  };

  return {
    reset() {
      last = null;
      misses = 0;
    },
    pick(poses: Pose[]): Pose | null {
      const candidates = poses.flatMap((pose) => {
        const center = poseCenter(pose);
        return center ? [{ pose, center }] : [];
      });
      if (!candidates.length) return lose();
      const target: Spot = last ?? { x: 0.5, y: 0.5 };
      const weight = last ? 1 : 0.5;
      const distance = (spot: Spot) =>
        Math.hypot(spot.x - target.x, (spot.y - target.y) * weight);
      const best = candidates.reduce((winner, candidate) =>
        distance(candidate.center) < distance(winner.center)
          ? candidate
          : winner,
      );
      if (
        last &&
        Math.hypot(best.center.x - last.x, best.center.y - last.y) > maxJump
      )
        return lose();
      last = best.center;
      misses = 0;
      return best.pose;
    },
  };
}
