import { describe, expect, it } from "vitest";
import { explainFailure } from "./diagnosis";
import { missingParts } from "./motion";
import type { Point } from "./motion";

describe("analysis failure explanation", () => {
  it("blames the missing person when most frames had nobody in the middle", () => {
    expect(
      explainFailure({ total: 100, noPerson: 80, missing: { føttene: 20 } }),
    ).toMatch(/Fant ingen tydelig person i midten i 80 %/);
  });

  it("names the body part that was most often hidden", () => {
    const message = explainFailure({
      total: 100,
      noPerson: 10,
      missing: { føttene: 70, armene: 30 },
    });
    expect(message).toMatch(/føttene var skjult eller utenfor bildet i 70 %/);
  });

  it("handles an empty tally", () => {
    expect(explainFailure({ total: 0, noPerson: 0, missing: {} })).toMatch(
      /0 %/,
    );
  });
});

describe("missing body parts", () => {
  const pose = (hidden: number[]): Point[] =>
    Array.from({ length: 33 }, (_, index) => ({
      x: 0.5,
      y: 0.5,
      visibility: hidden.includes(index) ? 0.2 : 1,
    }));

  it("lists only the hidden parts", () => {
    expect(missingParts(pose([]))).toEqual([]);
    expect(missingParts(pose([27]))).toEqual(["føttene"]);
    expect(missingParts(pose([15, 25]))).toEqual(["knærne", "armene"]);
  });

  it("respects a lower visibility threshold", () => {
    expect(missingParts(pose([27]), 0.1)).toEqual([]);
  });
});
