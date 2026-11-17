import styles from "./RecordSleeve.module.css";

const GROOVES = [44, 38, 32, 26] as const;

export function Vinyl({ playing }: { playing: boolean }) {
  return (
    <div
      className={styles.vinyl}
      data-playing={playing || undefined}
      aria-hidden="true"
    >
      <svg className={styles.disc} viewBox="0 0 100 100">
        <circle className={styles.discBody} cx="50" cy="50" r="50" />
        {GROOVES.map((radius) => (
          <circle
            key={radius}
            className={styles.groove}
            cx="50"
            cy="50"
            r={radius}
          />
        ))}
        <circle className={styles.discLabel} cx="50" cy="50" r="17" />
        <circle className={styles.discMark} cx="50" cy="39" r="3.5" />
        <circle className={styles.discHole} cx="50" cy="50" r="2.5" />
      </svg>
    </div>
  );
}
