import type { ComponentProps } from "react";
import clsx from "clsx";
import styles from "./TrackList.module.css";

export interface Track {
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
  onTrackSelect: (index: number) => void;
  "aria-label"?: never;
  "aria-labelledby"?: never;
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
      className={clsx(styles.tracks, className)}
      aria-label={label}
    >
      {tracks.map((track, index) => (
        <li key={`${String(index)}-${track.title}`}>
          <button
            type="button"
            className={styles.track}
            aria-current={index === currentTrack ? "true" : undefined}
            onClick={() => {
              onTrackSelect(index);
            }}
          >
            <span className={styles.number} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className={styles.title}>{track.title}</span>
            <span className={styles.duration}>{track.duration}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
