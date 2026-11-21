"use client";

import type { ComponentProps } from "react";
import clsx from "clsx";
import styles from "./TrackList.module.css";

export interface Track {
  id?: string | undefined;
  title: string;
  duration: string;
}

export interface TrackListProps extends Omit<
  ComponentProps<"ol">,
  "children" | "dangerouslySetInnerHTML" | "aria-label" | "aria-labelledby"
> {
  label: string;
  tracks: readonly Track[];
  currentTrack?: number | undefined;
  onTrackSelect?: ((index: number) => void) | undefined;
  "aria-label"?: never;
  "aria-labelledby"?: never;
}

interface TrackRowProps {
  track: Track;
  number: number;
  current: boolean;
  onSelect: (() => void) | undefined;
}

function TrackRow({ track, number, current, onSelect }: TrackRowProps) {
  const cells = (
    <>
      <span className={styles.number} aria-hidden="true">
        {String(number).padStart(2, "0")}
      </span>
      <span className={styles.title}>{track.title}</span>
      <span className={styles.duration}>{track.duration}</span>
    </>
  );
  const ariaCurrent = current ? "true" : undefined;

  return onSelect ? (
    <button
      type="button"
      className={styles.track}
      aria-current={ariaCurrent}
      onClick={onSelect}
    >
      {cells}
    </button>
  ) : (
    <div className={styles.track} aria-current={ariaCurrent}>
      {cells}
    </div>
  );
}

export function TrackList({
  label,
  tracks,
  currentTrack,
  onTrackSelect,
  className,
  ...props
}: TrackListProps) {
  return (
    <ol
      {...props}
      role="list"
      className={clsx(styles.tracks, className)}
      aria-label={label}
    >
      {tracks.map((track, index) => (
        <li
          key={
            track.id === undefined
              ? `index:${String(index)}-${track.title}`
              : `id:${track.id}`
          }
        >
          <TrackRow
            track={track}
            number={index + 1}
            current={index === currentTrack}
            onSelect={
              onTrackSelect &&
              (() => {
                onTrackSelect(index);
              })
            }
          />
        </li>
      ))}
    </ol>
  );
}
