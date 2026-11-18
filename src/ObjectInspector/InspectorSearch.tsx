import { useId, type KeyboardEvent } from "react";
import { IconButton } from "../IconButton/IconButton.js";
import type { ObjectInspectorLabels } from "./labels.js";
import styles from "./InspectorSearch.module.css";

interface InspectorSearchProps {
  label: string;
  labels: ObjectInspectorLabels;
  query: string;
  status: string;
  hasMatches: boolean;
  onQueryChange: (query: string) => void;
  onMove: (step: 1 | -1) => void;
}

export function InspectorSearch({
  label,
  labels,
  query,
  status,
  hasMatches,
  onQueryChange,
  onMove,
}: InspectorSearchProps) {
  const inputId = useId();
  const statusId = useId();

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onMove(event.shiftKey ? -1 : 1);
    }
  }

  return (
    <search aria-label={labels.searchRegion(label)} className={styles.search}>
      <div className={styles.field}>
        <label htmlFor={inputId}>{labels.search}</label>
        <input
          id={inputId}
          type="search"
          className={styles.input}
          value={query}
          autoComplete="off"
          spellCheck={false}
          aria-describedby={statusId}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <span id={statusId} className={styles.status}>
        {status}
      </span>
      <IconButton
        variant="secondary"
        size="small"
        label={labels.previousMatch}
        icon="↑"
        aria-disabled={!hasMatches}
        onClick={() => onMove(-1)}
      />
      <IconButton
        variant="secondary"
        size="small"
        label={labels.nextMatch}
        icon="↓"
        aria-disabled={!hasMatches}
        onClick={() => onMove(1)}
      />
    </search>
  );
}
