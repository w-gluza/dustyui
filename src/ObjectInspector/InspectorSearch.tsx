import { useId, type KeyboardEvent } from "react";
import { IconButton } from "../IconButton/IconButton.js";
import styles from "./InspectorSearch.module.css";

interface InspectorSearchProps {
  label: string;
  query: string;
  status: string;
  hasMatches: boolean;
  onQueryChange: (query: string) => void;
  onMove: (step: 1 | -1) => void;
}

export function InspectorSearch({
  label,
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
    <search aria-label={`Search ${label}`} className={styles.search}>
      <div className={styles.field}>
        <label htmlFor={inputId}>Search</label>
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
        label="Previous match"
        icon="↑"
        aria-disabled={!hasMatches}
        onClick={() => onMove(-1)}
      />
      <IconButton
        variant="secondary"
        size="small"
        label="Next match"
        icon="↓"
        aria-disabled={!hasMatches}
        onClick={() => onMove(1)}
      />
    </search>
  );
}
