import type { KeyboardEvent } from "react";
import { IconButton } from "../IconButton/IconButton.js";
import styles from "./InspectorSearch.module.css";

interface InspectorSearchProps {
  query: string;
  status: string;
  hasMatches: boolean;
  onQueryChange: (query: string) => void;
  onMove: (step: 1 | -1) => void;
}

export function InspectorSearch({
  query,
  status,
  hasMatches,
  onQueryChange,
  onMove,
}: InspectorSearchProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onMove(event.shiftKey ? -1 : 1);
    }
  }

  return (
    <search className={styles.search}>
      <label className={styles.field}>
        <span>Search</span>
        <input
          type="search"
          className={styles.input}
          value={query}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </label>
      <span className={styles.status}>{status}</span>
      <IconButton
        variant="secondary"
        className={styles.move}
        label="Previous match"
        icon="↑"
        aria-disabled={!hasMatches}
        onClick={() => onMove(-1)}
      />
      <IconButton
        variant="secondary"
        className={styles.move}
        label="Next match"
        icon="↓"
        aria-disabled={!hasMatches}
        onClick={() => onMove(1)}
      />
    </search>
  );
}
