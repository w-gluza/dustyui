"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import clsx from "clsx";
import { announce, readyAnnouncer } from "../announcer/announcer.js";
import { nextBeatKind, type BeatKind } from "./beatKind.js";
import styles from "./BeatPattern.module.css";

const REQUEST_LIFETIME = 1000;

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
  const requested = useRef<{
    index: number;
    kind: BeatKind;
    expires: number;
  }>(null);

  useEffect(readyAnnouncer, []);

  useEffect(() => {
    const request = requested.current;
    requested.current = null;
    if (
      request &&
      performance.now() < request.expires &&
      beats[request.index] === request.kind
    ) {
      announce(beatLabel(request.index + 1, request.kind));
    }
  }, [beats, beatLabel]);

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
              requested.current = {
                index,
                kind: next,
                expires: performance.now() + REQUEST_LIFETIME,
              };
              onBeatChange(index, next);
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
