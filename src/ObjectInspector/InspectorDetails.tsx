import { useEffect, useState } from "react";
import { announce } from "../announcer/announcer.js";
import { Button } from "../Button/Button.js";
import type { InspectorNode } from "./describe/describe.js";
import { getEscapedText } from "./describe/getEscapedText.js";
import { getCopyText, type CopyText } from "./getCopyText.js";
import { getShownValue } from "./getShownValue.js";
import { getTypeText } from "./getTypeText.js";
import { getValueText } from "./getValueText.js";
import { Highlighted } from "./search/Highlighted.js";
import styles from "./InspectorDetails.module.css";

const FEEDBACK_DURATION = 5000;

interface InspectorDetailsProps {
  label: string;
  node: InspectorNode;
  query: string;
}

interface Feedback {
  readonly node: InspectorNode | undefined;
  readonly text: string;
  readonly hasFailed: boolean;
}

const NO_FEEDBACK: Feedback = { node: undefined, text: "", hasFailed: false };
const FAILURE = "Could not copy. Select the text and copy it by hand.";

export function InspectorDetails({
  label,
  node,
  query,
}: InspectorDetailsProps) {
  const [feedback, setFeedback] = useState(NO_FEEDBACK);
  const isLeaf = node.childCount === 0;
  const text = isLeaf ? getValueText(node) : "";
  const shown = getShownValue(text, query);

  if (feedback.node !== undefined && feedback.node !== node) {
    setFeedback(NO_FEEDBACK);
  }

  useEffect(() => {
    if (feedback.node === undefined) {
      return;
    }
    const timer = setTimeout(() => setFeedback(NO_FEEDBACK), FEEDBACK_DURATION);
    return () => clearTimeout(timer);
  }, [feedback]);

  async function copy(name: "Path" | "Value", read: () => CopyText) {
    let result: string;
    let hasFailed = false;
    try {
      const { text: copied, isComplete } = read();
      await navigator.clipboard.writeText(copied);
      result = isComplete
        ? `${name} copied`
        : `Part of the ${name.toLowerCase()} copied. It is too large to copy whole.`;
    } catch {
      result = FAILURE;
      hasFailed = true;
    }
    setFeedback({ node, text: result, hasFailed });
    announce(result, hasFailed ? "assertive" : "polite");
  }

  return (
    <section
      aria-label={`Selected value in ${label}`}
      className={styles.details}
    >
      <dl className={styles.facts}>
        <dt>Path</dt>
        <dd>{getEscapedText(getShownValue(node.path).text)}</dd>
        <dt>Type</dt>
        <dd>{getTypeText(node)}</dd>
        {isLeaf ? (
          <>
            <dt>Value</dt>
            <dd>
              <span className={styles.value}>
                <Highlighted text={shown.text} query={query} />
              </span>
              {shown.isWhole ? null : (
                <p className={styles.note}>
                  Showing {shown.text.length.toLocaleString("en-GB")} of{" "}
                  {text.length.toLocaleString("en-GB")} characters. Copy value
                  copies all of it.
                </p>
              )}
            </dd>
          </>
        ) : null}
      </dl>
      <div className={styles.actions}>
        <Button
          variant="secondary"
          className={styles.copy}
          onClick={() =>
            void copy("Path", () => ({ text: node.path, isComplete: true }))
          }
        >
          Copy path
        </Button>
        <Button
          variant="secondary"
          className={styles.copy}
          onClick={() => void copy("Value", () => getCopyText(node))}
        >
          Copy value
        </Button>
        <span
          className={styles.feedback}
          data-failed={feedback.hasFailed || undefined}
        >
          {feedback.node === node ? feedback.text : ""}
        </span>
      </div>
    </section>
  );
}
