import styles from "./RecordSleeve.module.css";

export interface RecordTrack {
  title: string;
  duration: string;
}

interface TrackListProps {
  label: string;
  tracks: readonly RecordTrack[];
  currentTrack: number;
  onSelect: (index: number) => void;
}

export function TrackList({
  label,
  tracks,
  currentTrack,
  onSelect,
}: TrackListProps) {
  return (
    <ol className={styles.tracks} aria-label={label}>
      {tracks.map((track, index) => (
        <li key={`${String(index)}-${track.title}`}>
          <button
            type="button"
            className={styles.track}
            aria-current={index === currentTrack ? "true" : undefined}
            onClick={() => {
              onSelect(index);
            }}
          >
            <span className={styles.trackNumber} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className={styles.trackTitle}>{track.title}</span>
            <span className={styles.trackDuration}>{track.duration}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
