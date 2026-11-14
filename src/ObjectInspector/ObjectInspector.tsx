"use client";

import { useMemo } from "react";
import { Tree, type TreeProps } from "../Tree/Tree.js";
import type { TreeRow } from "../Tree/treeModel.js";
import { describe, type InspectorNode } from "./describe/describe.js";
import { ROOT_ID } from "./describe/getPath.js";
import { getLabelText } from "./getLabelText.js";
import styles from "./ObjectInspector.module.css";

export interface ObjectInspectorProps extends Omit<
  TreeProps<InspectorNode>,
  "root" | "renderRow" | "getRowText"
> {
  value: unknown;
}

const ROOT_OPEN = [ROOT_ID];

function getRowText({ node }: TreeRow<InspectorNode>): string {
  return node.label ? getLabelText(node.label) : "";
}

function renderRow({ node }: TreeRow<InspectorNode>) {
  return (
    <>
      {node.label ? (
        <>
          <span>{getLabelText(node.label)}</span>
          <span className={styles.separator}>: </span>
        </>
      ) : null}
      <span className={styles.value} data-kind={node.kind}>
        {node.preview}
      </span>
    </>
  );
}

export function ObjectInspector({
  value,
  defaultExpanded = ROOT_OPEN,
  ...props
}: ObjectInspectorProps) {
  const root = useMemo(() => describe(value), [value]);

  return (
    <Tree
      {...props}
      root={root}
      defaultExpanded={defaultExpanded}
      renderRow={renderRow}
      getRowText={getRowText}
    />
  );
}
