"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { announce } from "../announcer/announcer.js";
import { Tree, type TreeProps } from "../Tree/Tree.js";
import type { TreeRow } from "../Tree/treeModel.js";
import { describe, type InspectorNode } from "./describe/describe.js";
import { getNode } from "./describe/getNode.js";
import { getAncestorIds, ROOT_ID } from "./describe/getPath.js";
import { getLabelText } from "./getLabelText.js";
import { InspectorDetails } from "./InspectorDetails.js";
import { InspectorSearch } from "./InspectorSearch.js";
import { getHighlightParts } from "./search/getHighlightParts.js";
import { getMatches, type Matches } from "./search/getMatches.js";
import { getSearchStatus } from "./search/getSearchStatus.js";
import styles from "./ObjectInspector.module.css";

export interface ObjectInspectorProps extends Omit<
  TreeProps<InspectorNode>,
  "root" | "renderRow" | "getRowText"
> {
  value: unknown;
  searchable?: boolean;
  showDetails?: boolean;
}

const ROOT_OPEN = [ROOT_ID];
const SEARCH_LIMIT = 500_000;
const ANNOUNCE_DELAY = 700;

function getRowText({ node }: TreeRow<InspectorNode>): string {
  return node.label ? getLabelText(node.label) : "";
}

function Highlighted({ text, query }: { text: string; query: string }) {
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

export function ObjectInspector({
  value,
  searchable = false,
  showDetails = false,
  expanded: controlledExpanded,
  defaultExpanded = ROOT_OPEN,
  onExpandedChange,
  selected: controlledSelected,
  onSelectedChange,
  ...props
}: ObjectInspectorProps) {
  const root = useMemo(() => describe(value), [value]);
  const [ownExpanded, setOwnExpanded] = useState<ReadonlySet<string>>(
    () => new Set(defaultExpanded),
  );
  const [ownSelected, setOwnSelected] = useState<string>();
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<{
    matches: Matches | undefined;
    index: number;
  }>({ matches: undefined, index: -1 });

  const expanded = controlledExpanded ?? ownExpanded;
  const selected = controlledSelected ?? ownSelected;
  const searched = useDeferredValue(searchable ? query : "");
  const matches = useMemo(
    () => getMatches(root, searched, SEARCH_LIMIT),
    [root, searched],
  );
  const current = position.matches === matches ? position.index : -1;
  const status = getSearchStatus(searched, matches, current);
  const selectedNode = useMemo(
    () =>
      showDetails && selected !== undefined
        ? (getNode(root, selected) ?? root)
        : root,
    [showDetails, root, selected],
  );

  useEffect(() => {
    if (status === "") {
      return;
    }
    const timer = setTimeout(() => announce(status), ANNOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [status]);

  function changeExpanded(next: ReadonlySet<string>) {
    if (controlledExpanded === undefined) {
      setOwnExpanded(next);
    }
    onExpandedChange?.(next);
  }

  function changeSelected(next: string) {
    if (controlledSelected === undefined) {
      setOwnSelected(next);
    }
    onSelectedChange?.(next);
  }

  function moveToMatch(step: 1 | -1) {
    const count = matches.ids.length;
    const start = current < 0 && step < 0 ? 0 : current;
    const index = (start + step + count) % count;
    const id = matches.ids[index];
    if (id === undefined) {
      return;
    }
    const closed = getAncestorIds(id).filter(
      (ancestor) => !expanded.has(ancestor),
    );
    if (closed.length > 0) {
      changeExpanded(new Set([...expanded, ...closed]));
    }
    changeSelected(id);
    setPosition({ matches, index });
  }

  const renderRow = useCallback(
    ({ node }: TreeRow<InspectorNode>) => (
      <>
        {node.label ? (
          <>
            <span>
              <Highlighted text={getLabelText(node.label)} query={searched} />
            </span>
            <span className={styles.separator}>: </span>
          </>
        ) : null}
        <span className={styles.value} data-kind={node.kind}>
          {node.childCount === 0 ? (
            <Highlighted text={node.preview} query={searched} />
          ) : (
            node.preview
          )}
        </span>
      </>
    ),
    [searched],
  );

  const tree = (
    <Tree
      {...props}
      root={root}
      expanded={expanded}
      onExpandedChange={changeExpanded}
      selected={selected}
      onSelectedChange={changeSelected}
      renderRow={renderRow}
      getRowText={getRowText}
    />
  );

  if (!searchable && !showDetails) {
    return tree;
  }

  return (
    <div className={styles.inspector}>
      {searchable ? (
        <InspectorSearch
          query={query}
          status={status}
          hasMatches={matches.ids.length > 0}
          onQueryChange={setQuery}
          onMove={moveToMatch}
        />
      ) : null}
      {tree}
      {showDetails ? <InspectorDetails node={selectedNode} /> : null}
    </div>
  );
}
