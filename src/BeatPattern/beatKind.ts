export type BeatKind = "normal" | "accent" | "skipped";

const KINDS: readonly BeatKind[] = ["normal", "accent", "skipped"];

export function nextBeatKind(kind: BeatKind): BeatKind {
  return KINDS[(KINDS.indexOf(kind) + 1) % KINDS.length] ?? "normal";
}
