"use client";

import {
  useEffect,
  useRef,
  type ComponentProps,
  type CSSProperties,
} from "react";
import clsx from "clsx";
import { announce, readyAnnouncer } from "../announcer/announcer.js";
import { nextBeatKind, type BeatKind } from "./beatKind.js";
import visuallyHidden from "../styles/visuallyHidden.module.css";
import styles from "./BeatPattern.module.css";

function BeatMarks() {
  return (
    <>
      <span className={styles.accentMark} aria-hidden="true">
        &gt;
      </span>
      <span className={styles.pill} />
      <span className={styles.playhead} />
    </>
  );
}

interface BeatRequest {
  index: number;
  kind: BeatKind;
  awaiting: boolean;
  shown: boolean;
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
  onBeatChange?: ((index: number, kind: BeatKind) => unknown) | undefined;
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
  style,
  ...props
}: BeatPatternProps) {
  const requested = useRef<BeatRequest>(null);
  const latestBeatLabel = useRef(beatLabel);

  function forgetSoon(request: BeatRequest) {
    setTimeout(() => {
      if (requested.current === request) {
        requested.current = null;
      }
    });
  }

  useEffect(readyAnnouncer, []);

  useEffect(
    () => () => {
      requested.current = null;
    },
    [],
  );

  useEffect(() => {
    latestBeatLabel.current = beatLabel;
    const request = requested.current;
    if (!request) {
      return;
    }
    request.shown = beats[request.index] === request.kind;
    if (request.awaiting) {
      return;
    }
    requested.current = null;
    if (request.shown) {
      announce(beatLabel(request.index + 1, request.kind));
    }
  }, [beats, beatLabel]);

  return (
    <ol
      {...props}
      role="list"
      className={clsx(styles.pattern, className)}
      style={
        {
          "--dusty-beat-pattern-count": beats.length,
          ...style,
        } as CSSProperties
      }
      aria-label={label}
    >
      {beats.map((kind, index) => (
        <li key={index}>
          {onBeatChange ? (
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
                  shown: false,
                };
                requested.current = request;
                const answer = onBeatChange(index, next);
                if (answer instanceof Promise) {
                  request.awaiting = true;
                  answer.then(
                    () => {
                      request.awaiting = false;
                      if (requested.current !== request) {
                        return;
                      }
                      if (request.shown) {
                        requested.current = null;
                        announce(latestBeatLabel.current(index + 1, next));
                      } else {
                        forgetSoon(request);
                      }
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
              <BeatMarks />
            </button>
          ) : (
            <span
              className={styles.beat}
              data-kind={kind}
              data-playing={index === playingBeat || undefined}
            >
              <span className={visuallyHidden.visuallyHidden}>
                {beatLabel(index + 1, kind)}
              </span>
              <BeatMarks />
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
