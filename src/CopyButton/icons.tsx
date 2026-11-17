import styles from "./CopyButton.module.css";

const PATHS = {
  idle: "M7.5 7.5h8.5v9H7.5zM4 12.5V3.5h8.5",
  copied: "m4.5 10.5 3.5 3.5 7.5-8",
  failed: "M10 6v5M10 14h.01M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15z",
} as const;

export function CopyStatusIcon({ status }: { status: keyof typeof PATHS }) {
  return (
    <span className={styles.icons}>
      {(["idle", "copied", "failed"] as const).map((name) => (
        <svg
          key={name}
          className={styles.icon}
          data-shown={name === status || undefined}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={PATHS[name]} />
        </svg>
      ))}
    </span>
  );
}
