import { useEffect, useState } from "react";
import { announce } from "../announcer/announcer.js";
import { CopyButton } from "../CopyButton/CopyButton.js";
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
  node: InspectorNode | undefined;
  query: string;
}

interface Feedback {
  readonly text: string;
  readonly hasFailed: boolean;
}

const NO_FEEDBACK: Feedback = { text: "", hasFailed: false };
const nodeKeys = new WeakMap<InspectorNode, number>();
let lastNodeKey = 0;

function getNodeKey(node: InspectorNode): number {
  const known = nodeKeys.get(node);
  if (known !== undefined) {
    return known;
  }
  lastNodeKey += 1;
  nodeKeys.set(node, lastNodeKey);
  return lastNodeKey;
}

export function InspectorDetails({
  label,
  labels,
  node,
  query,
}: InspectorDetailsProps) {
  return (
    <section
      aria-label={labels.detailsRegion(label)}
      className={styles.details}
    >
      {node ? (
        <SelectedDetails
          key={getNodeKey(node)}
          labels={labels}
          node={node}
          query={query}
        />
      ) : (
        <p className={styles.note}>{labels.noSelection}</p>
      )}
    </section>
  );
}

interface SelectedDetailsProps {
  labels: ObjectInspectorLabels;
  node: InspectorNode;
  query: string;
}

function SelectedDetails({ labels, node, query }: SelectedDetailsProps) {
  const [feedback, setFeedback] = useState(NO_FEEDBACK);
  const [copied] = useState(() => ({ isComplete: true }));
  const isLeaf = hasValueText(node);
  const text = isLeaf ? getValueText(node) : "";
  const shown = getShownValue(text, query);

  useEffect(() => {
    if (feedback === NO_FEEDBACK) {
      return;
    }
    const timer = setTimeout(() => setFeedback(NO_FEEDBACK), FEEDBACK_DURATION);
    return () => clearTimeout(timer);
  }, [feedback]);

  function read(source: () => CopyText): () => string {
    return () => {
      const copy = source();
      copied.isComplete = copy.isComplete;
      return copy.text;
    };
  }

  function noteCopied(part: string) {
    if (copied.isComplete) {
      setFeedback(NO_FEEDBACK);
      return;
    }
    setFeedback({ text: part, hasFailed: false });
    announce(part);
  }

  function noteFailed() {
    setFeedback({ text: labels.copyFailed, hasFailed: true });
    announce(labels.copyFailed, "assertive");
  }

  return (
    <>
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
        <CopyButton
          size="small"
          value={read(() => ({ text: node.path, isComplete: true }))}
          label={labels.copyPath}
          copiedLabel={labels.pathCopied}
          failedLabel={labels.copyFailedShort}
          onCopied={() => {
            noteCopied(labels.pathPartCopied);
          }}
          onCopyError={noteFailed}
        />
        {node.kind === "range" ? null : (
          <CopyButton
            size="small"
            value={read(() => getCopyText(node))}
            label={labels.copyValue}
            copiedLabel={labels.valueCopied}
            failedLabel={labels.copyFailedShort}
            onCopied={() => {
              noteCopied(labels.valuePartCopied);
            }}
            onCopyError={noteFailed}
          />
        )}
        <span
          className={styles.feedback}
          data-failed={feedback.hasFailed || undefined}
        >
          {feedback.text}
        </span>
      </div>
    </>
  );
}
