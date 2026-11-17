"use client";

import type { ComponentProps, ReactNode } from "react";
import { ExpandableCard } from "../ExpandableCard/ExpandableCard.js";
import type { HeadingLevel } from "../headingLevel.js";
import { PlayerControls, type PlayerLabels } from "./PlayerControls.js";
import { SleeveStage } from "./SleeveStage.js";
import { TrackList, type RecordTrack } from "./TrackList.js";
import { useControllableState } from "./useControllableState.js";
import styles from "./RecordSleeve.module.css";

export type { RecordTrack } from "./TrackList.js";

export interface RecordSleeveLabels extends PlayerLabels {
  close: string;
  tracks: string;
}

const DEFAULT_LABELS: RecordSleeveLabels = {
  play: "Play",
  pause: "Pause",
  previous: "Previous track",
  next: "Next track",
  progress: "Track progress",
  close: "Close",
  tracks: "Tracks",
};

interface RecordSleeveBaseProps extends Omit<
  ComponentProps<"article">,
  "title" | "children" | "dangerouslySetInnerHTML"
> {
  title: string;
  artist: string;
  level: HeadingLevel;
  artwork: ReactNode;
  tracks: readonly RecordTrack[];
  meta?: string | undefined;
  note?: ReactNode | undefined;
  progress?: number | undefined;
  labels?: Partial<RecordSleeveLabels> | undefined;
  onExpandedChange?: ((expanded: boolean) => void) | undefined;
  onPlayingChange?: ((playing: boolean) => void) | undefined;
  onCurrentTrackChange?: ((index: number) => void) | undefined;
}

export type RecordSleeveProps = RecordSleeveBaseProps &
  (
    | { expanded: boolean; defaultExpanded?: never }
    | { expanded?: undefined; defaultExpanded?: boolean | undefined }
  ) &
  (
    | { playing: boolean; defaultPlaying?: never }
    | { playing?: undefined; defaultPlaying?: boolean | undefined }
  ) &
  (
    | { currentTrack: number; defaultCurrentTrack?: never }
    | { currentTrack?: undefined; defaultCurrentTrack?: number | undefined }
  );

function clampIndex(index: number, length: number): number {
  return Math.min(Math.max(0, Math.trunc(index) || 0), Math.max(0, length - 1));
}

export function RecordSleeve({
  title,
  artist,
  level,
  artwork,
  tracks,
  meta,
  note,
  progress,
  labels,
  expanded,
  defaultExpanded,
  playing: controlledPlaying,
  defaultPlaying = false,
  currentTrack: controlledTrack,
  defaultCurrentTrack = 0,
  onPlayingChange,
  onCurrentTrackChange,
  ...props
}: RecordSleeveProps) {
  const text = { ...DEFAULT_LABELS, ...labels };
  const [playing, setPlaying] = useControllableState(
    controlledPlaying,
    defaultPlaying,
    onPlayingChange,
  );
  const [track, setTrack] = useControllableState(
    controlledTrack,
    defaultCurrentTrack,
    onCurrentTrackChange,
  );
  const currentTrack = clampIndex(track, tracks.length);
  const expansion = expanded === undefined ? { defaultExpanded } : { expanded };

  function selectTrack(index: number) {
    setTrack(index);
    setPlaying(true);
  }

  return (
    <ExpandableCard
      {...props}
      {...expansion}
      title={title}
      level={level}
      closeLabel={text.close}
      media={<div className={styles.cover}>{artwork}</div>}
      expandedMedia={<SleeveStage artwork={artwork} playing={playing} />}
      summary={
        <>
          <span className={styles.artist}>{artist}</span>
          {meta ? <span className={styles.meta}>{meta}</span> : null}
        </>
      }
    >
      {tracks.length > 0 ? (
        <>
          <PlayerControls
            playing={playing}
            hasPrevious={currentTrack > 0}
            hasNext={currentTrack < tracks.length - 1}
            progress={progress}
            labels={text}
            onPlayingChange={setPlaying}
            onStep={(offset) => {
              setTrack(currentTrack + offset);
            }}
          />
          <TrackList
            label={text.tracks}
            tracks={tracks}
            currentTrack={currentTrack}
            onSelect={selectTrack}
          />
        </>
      ) : null}
      {note != null ? <div className={styles.note}>{note}</div> : null}
    </ExpandableCard>
  );
}
