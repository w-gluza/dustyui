import { useState } from "react";
import { announce } from "../announcer/announcer.js";
import { Button } from "../Button/Button.js";
import type { InspectorNode } from "./describe/describe.js";
import { getCopyText } from "./getCopyText.js";
import { getValueText } from "./getValueText.js";
import styles from "./InspectorDetails.module.css";

const SHOWN_VALUE_LENGTH = 2000;

interface InspectorDetailsProps {
  node: InspectorNode;
}

function getTypeText(node: InspectorNode): string {
  return node.typeName ? `${node.kind} (${node.typeName})` : node.kind;
}

function getShownValue(node: InspectorNode): string {
  const text = getValueText(node);
  return text.length > SHOWN_VALUE_LENGTH
    ? `${text.slice(0, SHOWN_VALUE_LENGTH)}…`
    : text;
}

export function InspectorDetails({ node }: InspectorDetailsProps) {
  const [feedback, setFeedback] = useState({ id: "", text: "" });

  async function copy(text: string, name: string) {
    let result = `${name} copied`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      result = "Copying failed";
    }
    setFeedback({ id: node.id, text: result });
    announce(result);
  }

  return (
    <section aria-label="Selected value" className={styles.details}>
      <dl className={styles.facts}>
        <dt>Path</dt>
        <dd>{node.path}</dd>
        <dt>Type</dt>
        <dd>{getTypeText(node)}</dd>
        {node.childCount === 0 ? (
          <>
            <dt>Value</dt>
            <dd className={styles.value}>{getShownValue(node)}</dd>
          </>
        ) : null}
      </dl>
      <div className={styles.actions}>
        <Button
          variant="secondary"
          className={styles.copy}
          onClick={() => void copy(node.path, "Path")}
        >
          Copy path
        </Button>
        <Button
          variant="secondary"
          className={styles.copy}
          onClick={() => void copy(getCopyText(node), "Value")}
        >
          Copy value
        </Button>
        <span className={styles.feedback}>
          {feedback.id === node.id ? feedback.text : ""}
        </span>
      </div>
    </section>
  );
}
