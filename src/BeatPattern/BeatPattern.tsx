"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import clsx from "clsx";
import { announce, readyAnnouncer } from "../announcer/announcer.js";
import { nextBeatKind, type BeatKind } from "./beatKind.js";
import styles from "./BeatPattern.module.css";

interface BeatRequest {
  index: number;
  kind: BeatKind;
  awaiting: boolean;
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
  onBeatChange: (index: number, kind: BeatKind) => void | Promise<unknown>;
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
  const requested = useRef<BeatRequest>(null);

  function forgetSoon(request: BeatRequest) {
    setTimeout(() => {
      if (requested.current === request) {
        requested.current = null;
      }
    });
  }

  useEffect(readyAnnouncer, []);

  useEffect(() => {
    const request = requested.current;
    if (request && beats[request.index] === request.kind) {
      requested.current = null;
      announce(beatLabel(request.index + 1, request.kind));
    } else if (request && !request.awaiting) {
      requested.current = null;
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
              const request: BeatRequest = {
                index,
                kind: next,
                awaiting: false,
              };
              requested.current = request;
              const answer = onBeatChange(index, next);
              if (answer instanceof Promise) {
                request.awaiting = true;
                answer.then(
                  () => {
                    request.awaiting = false;
                    forgetSoon(request);
                  },
                  () => {
                    if (requested.current === request) {
                      requested.current = null;
                    }
                  },
                );
              } else {
                forgetSoon(request);
              }
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
