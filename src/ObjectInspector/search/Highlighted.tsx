import { getHighlightParts } from "./getHighlightParts.js";
import styles from "../ObjectInspector.module.css";

interface HighlightedProps {
  text: string;
  query: string;
}

export function Highlighted({ text, query }: HighlightedProps) {
  if (query === "") {
    return text;
  }
  return getHighlightParts(text, query).map((part, index) =>
    part.isMatch ? (
      <mark key={index} className={styles.match}>
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  );
}
