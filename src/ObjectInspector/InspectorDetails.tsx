import { useEffect, useState } from "react";
import { announce } from "../announcer/announcer.js";
import { Button } from "../Button/Button.js";
import type { InspectorNode } from "./describe/describe.js";
import { getEscapedText } from "./describe/getEscapedText.js";
import { getCopyText, type CopyText } from "./getCopyText.js";
import { getShownValue } from "./getShownValue.js";
import { getTypeText } from "./getTypeText.js";
import { getValueText, hasValueText } from "./getValueText.js";
import type { ObjectInspectorLabels } from "./labels.js";
import { Highlighted } from "./search/Highlighted.js";
import styles from "./InspectorDetails.module.css";

const FEEDBACK_DURATION = 5000;

interface InspectorDetailsProps {
  label: string;
  labels: ObjectInspectorLabels;
  node: InspectorNode;
  query: string;
}

interface Feedback {
  readonly node: InspectorNode | undefined;
  readonly text: string;
  readonly hasFailed: boolean;
}

const NO_FEEDBACK: Feedback = { node: undefined, text: "", hasFailed: false };

export function InspectorDetails({
  label,
  labels,
  node,
  query,
}: InspectorDetailsProps) {
  const [feedback, setFeedback] = useState(NO_FEEDBACK);
  const isLeaf = hasValueText(node);
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

  async function copy(whole: string, part: string, read: () => CopyText) {
    let result: string;
    let hasFailed = false;
    try {
      const { text: copied, isComplete } = read();
      await navigator.clipboard.writeText(copied);
      result = isComplete ? whole : part;
    } catch {
      result = labels.copyFailed;
      hasFailed = true;
    }
    setFeedback({ node, text: result, hasFailed });
    announce(result, hasFailed ? "assertive" : "polite");
  }

  return (
    <section
      aria-label={labels.detailsRegion(label)}
      className={styles.details}
    >
      <dl className={styles.facts}>
        <dt>{labels.path}</dt>
        <dd>{getEscapedText(getShownValue(node.path).text)}</dd>
        <dt>{labels.type}</dt>
        <dd>{labels.typeName(node.kind, getTypeText(node))}</dd>
        {isLeaf ? (
          <>
            <dt>{labels.value}</dt>
            <dd>
              <span className={styles.value}>
                <Highlighted text={shown.text} query={query} />
              </span>
              {shown.isWhole ? null : (
                <p className={styles.note}>
                  {labels.shownCharacters(shown.text.length, text.length)}
                </p>
              )}
            </dd>
          </>
        ) : null}
      </dl>
      <div className={styles.actions}>
        <Button
          variant="secondary"
          size="small"
          onClick={() =>
            void copy(labels.pathCopied, labels.pathPartCopied, () => ({
              text: node.path,
              isComplete: true,
            }))
          }
        >
          {labels.copyPath}
        </Button>
        {node.kind === "range" ? null : (
          <Button
            variant="secondary"
            size="small"
            onClick={() =>
              void copy(labels.valueCopied, labels.valuePartCopied, () =>
                getCopyText(node),
              )
            }
          >
            {labels.copyValue}
          </Button>
        )}
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
