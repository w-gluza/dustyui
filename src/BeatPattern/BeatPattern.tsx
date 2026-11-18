"use client";

import { useEffect, type ComponentProps } from "react";
import clsx from "clsx";
import { announce, readyAnnouncer } from "../announcer/announcer.js";
import styles from "./BeatPattern.module.css";

export type BeatKind = "normal" | "accent" | "skipped";

const KINDS: readonly BeatKind[] = ["normal", "accent", "skipped"];

export function nextBeatKind(kind: BeatKind): BeatKind {
  return KINDS[(KINDS.indexOf(kind) + 1) % KINDS.length] ?? "normal";
}

function defaultBeatLabel(beat: number, kind: BeatKind): string {
  return `Beat ${String(beat)}, ${kind}`;
}

export interface BeatPatternProps extends Omit<
  ComponentProps<"ol">,
  "children" | "dangerouslySetInnerHTML" | "aria-label" | "aria-labelledby"
> {
  label: string;
  beats: readonly BeatKind[];
  playingBeat?: number | undefined;
  beatLabel?: ((beat: number, kind: BeatKind) => string) | undefined;
  onBeatChange: (index: number, kind: BeatKind) => void;
  "aria-label"?: never;
  "aria-labelledby"?: never;
}

export function BeatPattern({
  label,
  beats,
  playingBeat,
  beatLabel = defaultBeatLabel,
  onBeatChange,
  className,
  ...props
}: BeatPatternProps) {
  useEffect(readyAnnouncer, []);

  return (
    <ol
      {...props}
      role="list"
      className={clsx(styles.pattern, className)}
      aria-label={label}
    >
      {beats.map((kind, index) => (
        <li key={index}>
          <button
            type="button"
            className={styles.beat}
            data-kind={kind}
            data-playing={index === playingBeat || undefined}
            aria-label={beatLabel(index + 1, kind)}
            onClick={() => {
              const next = nextBeatKind(kind);
              onBeatChange(index, next);
              announce(beatLabel(index + 1, next));
            }}
          >
            <span className={styles.accentMark} aria-hidden="true">
              &gt;
            </span>
            <span className={styles.pill} />
            <span className={styles.playhead} />
          </button>
        </li>
      ))}
    </ol>
  );
}
