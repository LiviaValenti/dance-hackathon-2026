import { features } from "./motion";
import type { Point } from "./motion";

export type Direction = "left" | "right" | "back" | "forward";
export type Framing = {
  ready: boolean;
  title: string;
  detail: string;
  direction: Direction | null;
  parts: { head: boolean; hands: boolean; feet: boolean };
};

const bodyPoints = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
const margin = 0.02;
const tooFar = 0.5;
const tooClose = 0.8;

export function assessFraming(points: Point[], mirror: boolean): Framing {
  const inFrame = (index: number) => {
    const point = points[index];
    return (
      !!point &&
      (point.visibility ?? 0) >= 0.5 &&
      point.x > margin &&
      point.x < 1 - margin &&
      point.y > margin &&
      point.y < 1 - margin
    );
  };
  const parts = {
    head: inFrame(0),
    hands: inFrame(15) && inFrame(16),
    feet: inFrame(27) && inFrame(28),
  };
  const make = (
    title: string,
    detail: string,
    direction: Direction | null = null,
  ): Framing => ({ ready: false, title, detail, direction, parts });

  if (bodyPoints.filter(inFrame).length < 5)
    return make(
      "Jeg ser deg ikke",
      "Gå bakover til hele kroppen er i bildet, og sørg for godt lys.",
    );
  if (!parts.feet)
    return make(
      "Føttene må være med",
      "Ta et par steg bakover til du ser føttene dine i bildet.",
      "back",
    );
  if (!parts.head)
    return make(
      "Hodet må være med",
      "Ta et par steg bakover til du ser hele deg i bildet.",
      "back",
    );

  const span = Math.max(points[27].y, points[28].y) - points[0].y;
  if (span > tooClose)
    return make(
      "Litt for nær",
      "Ta et steg bakover. Du trenger plass til armene.",
      "back",
    );
  if (span < tooFar)
    return make(
      "Litt for langt unna",
      "Ta et steg nærmere kameraet.",
      "forward",
    );
  if (!parts.hands)
    return make(
      "Armene må være synlige",
      "Hold armene litt ut fra kroppen, eller gå et steg bakover.",
    );
  if (!features(points))
    return make(
      "Kroppen er delvis skjult",
      "Fjern det som skjuler deg, og sørg for at det er lyst nok.",
    );

  const hips = (points[23].x + points[24].x) / 2;
  const shown = mirror ? 1 - hips : hips;
  if (shown < 0.36)
    return make(
      "Flytt deg litt mot høyre",
      "Stå midt i markeringen på bildet.",
      "right",
    );
  if (shown > 0.64)
    return make(
      "Flytt deg litt mot venstre",
      "Stå midt i markeringen på bildet.",
      "left",
    );

  return {
    ready: true,
    title: "Perfekt. Bli stående her.",
    detail: "Hele kroppen er synlig. Du kan starte.",
    direction: null,
    parts,
  };
}

// Hold back flickering: a new state must persist for a few samples before it is shown.
export function createFramingFilter(holdSamples = 4, readySamples = 6) {
  let shown: Framing | null = null;
  let candidate = "";
  let count = 0;
  return (next: Framing): Framing => {
    if (!shown || next.title === shown.title) {
      shown = next;
      candidate = "";
      count = 0;
      return shown;
    }
    count = next.title === candidate ? count + 1 : 1;
    candidate = next.title;
    if (count >= (next.ready ? readySamples : holdSamples)) {
      shown = next;
      candidate = "";
      count = 0;
    }
    return shown;
  };
}
