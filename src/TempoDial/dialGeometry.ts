export const ARC_START = -150;
export const ARC_END = 150;
const ARC_SPAN = ARC_END - ARC_START;
const DEAD_ZONE_SHARE = 0.4;

export interface DialPoint {
  x: number;
  y: number;
}

export interface DialRange {
  min: number;
  max: number;
  step: number;
}

export function isOnRing(point: DialPoint, size: number): boolean {
  const radius = size / 2;
  return (
    Math.hypot(point.x - radius, point.y - radius) >= radius * DEAD_ZONE_SHARE
  );
}

export function pointAngle(point: DialPoint, size: number): number {
  const radius = size / 2;
  return (Math.atan2(point.x - radius, radius - point.y) * 180) / Math.PI;
}

export function turnBetween(from: number, to: number): number {
  const turn = to - from;
  if (turn > 180) {
    return turn - 360;
  }
  return turn <= -180 ? turn + 360 : turn;
}

export function clampValue(value: number, { min, max }: DialRange): number {
  return Math.min(max, Math.max(min, value));
}

export function turnedValue(
  value: number,
  degrees: number,
  range: DialRange,
): number {
  return clampValue(
    value + (degrees / ARC_SPAN) * (range.max - range.min),
    range,
  );
}

export function angleValue(degrees: number, range: DialRange): number {
  const share =
    (Math.min(ARC_END, Math.max(ARC_START, degrees)) - ARC_START) / ARC_SPAN;
  return range.min + share * (range.max - range.min);
}

export function snapValue(value: number, range: DialRange): number {
  const steps = Math.round((value - range.min) / range.step);
  return clampValue(range.min + steps * range.step, range);
}

export function valueAngle(value: number, range: DialRange): number {
  const span = range.max - range.min;
  const share = span > 0 ? (clampValue(value, range) - range.min) / span : 0;
  return ARC_START + share * ARC_SPAN;
}
