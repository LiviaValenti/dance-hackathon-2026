#!/usr/bin/env python3
"""score.py - CLI scoring harness.

Usage:
    python score.py baseline.mp4 attempt.mp4

Outputs:
  - overall / form / timing summary line
  - per-joint table  (joint | score | mean error deg | ASCII bar)
  - "Focus area: <worst joint>"
"""
import argparse
import sys

from pose_extractor import extract
from scoring import score


BAR_WIDTH = 40


def _bar(score_pct: int) -> str:
    """ASCII bar chart: filled/empty characters, BAR_WIDTH wide."""
    filled = int(round(score_pct / 100.0 * BAR_WIDTH))
    empty  = BAR_WIDTH - filled
    return "[" + "=" * filled + " " * empty + "]"


def main():
    ap = argparse.ArgumentParser(description="Score a dance attempt against a baseline.")
    ap.add_argument("baseline", help="Path to baseline video (mp4)")
    ap.add_argument("attempt",  help="Path to attempt video (mp4)")
    args = ap.parse_args()

    print(f"Loading baseline: {args.baseline}")
    base_frames = extract(args.baseline)
    print(f"  -> {len(base_frames)} pose frames extracted (cached if present)")

    print(f"Loading attempt: {args.attempt}")
    att_frames = extract(args.attempt)
    print(f"  -> {len(att_frames)} pose frames extracted (cached if present)")

    result = score(base_frames, att_frames)

    # ── Summary ────────────────────────────────────────────────────────────
    print()
    print("─" * 56)
    print(f"  Overall  {result['overall']:3d}  │  Form  {result['form']:3d}  │  Timing  {result['timing']:3d}")
    print("─" * 56)

    # ── Per-joint table ────────────────────────────────────────────────────
    # Column headers (left-aligned within 24 chars, right-padded)
    fmt  = "  {name:<24} {score:>4}  {deg:>6}°  {bar}"
    hlen = 24 + 1 + 4 + 2 + 7 + 2 + BAR_WIDTH + 2

    print()
    print(fmt.format(name="Joint", score="Sc", deg="Deg", bar=""))
    print("─" * hlen)

    if result["per_joint"]:
        for feat, data in sorted(result["per_joint"].items(),
                                  key=lambda kv: kv[1]["score"]):
            label = feat.replace("_", " ").title()
            print(fmt.format(
                name  = label,
                score = data["score"],
                deg   = f"{data['mean_error_deg']:.1f}",
                bar   = _bar(data["score"]),
            ))
    else:
        print("  (no valid joint comparisons)")

    print("─" * hlen)
    print()
    if result["focus_area"]:
        print(f"Focus area: {result['focus_area']}")
    else:
        print("Focus area: (none)")


if __name__ == "__main__":
    main()