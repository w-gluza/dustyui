"use client";

import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";
import clsx from "clsx";
import { announce, readyAnnouncer } from "../announcer/announcer.js";
import {
  Tree,
  type TreeBaseProps,
  type TreeExpansionProps,
} from "../Tree/Tree.js";
import type { TreeRow } from "../Tree/treeModel.js";
import {
  describeValue,
  type InspectorNode,
  type NodeLabel,
} from "./describe/describe.js";
import { getEscapedText } from "./describe/getEscapedText.js";
import { getNode, getNodeTrail } from "./describe/getNode.js";
import { isPropertiesId, ROOT_ID } from "./describe/getPath.js";
import { UNREADABLE } from "./describe/getPreview.js";
import { getTruncatedText } from "./describe/getTruncatedText.js";
import { getLabelText } from "./getLabelText.js";
import { hasValueText } from "./getValueText.js";
import { InspectorDetails } from "./InspectorDetails.js";
import { InspectorSearch } from "./InspectorSearch.js";
import { DEFAULT_LABELS, type ObjectInspectorLabels } from "./labels.js";
import { getMatches, type Matches } from "./search/getMatches.js";
import { getSearchStatus } from "./search/getSearchStatus.js";
import { getShortPreview } from "./describe/getShortPreview.js";
import { getExcerpt } from "./search/getExcerpt.js";
import { Highlighted } from "./search/Highlighted.js";
import styles from "./ObjectInspector.module.css";

interface InspectorOwnProps extends Omit<
  TreeBaseProps<InspectorNode>,
  "root" | "renderRow" | "getRowText"
> {
  value: unknown;
  searchable?: boolean | undefined;
  showDetails?: boolean | undefined;
  labels?: Partial<ObjectInspectorLabels> | undefined;
}

export type ObjectInspectorProps = InspectorOwnProps & TreeExpansionProps;

const ROOT_OPEN = [ROOT_ID];
const SEARCH_LIMIT = 500_000;
const ANNOUNCE_DELAY = 700;
const LABEL_LIMIT = 80;
const ANNOUNCED_PATH_LIMIT = 120;

function getShownLabel(label: NodeLabel, query = ""): string {
  return getEscapedText(getExcerpt(getLabelText(label), query, LABEL_LIMIT));
}

function getShownPreview(node: InspectorNode, query: string): string {
  if (node.kind !== "string" || typeof node.value !== "string") {
    return node.preview;
  }
  const excerpt = getExcerpt(node.value, query, LABEL_LIMIT);
  return excerpt.startsWith("…")
    ? getEscapedText(JSON.stringify(excerpt))
    : node.preview;
}

function getRowText({ node }: TreeRow<InspectorNode>): string {
  return node.label ? getLabelText(node.label) : "";
}

export function ObjectInspector({
  value,
  label,
  searchable = false,
  showDetails = false,
  labels: givenLabels,
  expanded: controlledExpanded,
  defaultExpanded = ROOT_OPEN,
  onExpandedChange,
  selected: controlledSelected,
  defaultSelected,
  onSelectedChange,
  onRowAction,
  className,
  "aria-describedby": describedBy,
  ...props
}: ObjectInspectorProps) {
  const labels = useMemo(
    () => ({ ...DEFAULT_LABELS, ...givenLabels }),
    [givenLabels],
  );
  const root = useMemo(() => describeValue(value), [value]);
  const [ownExpanded, setOwnExpanded] = useState<ReadonlySet<string>>(
    () => new Set(defaultExpanded),
  );
  const [ownSelected, setOwnSelected] = useState(defaultSelected);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<{
    matches: Matches | undefined;
    index: number;
  }>({ matches: undefined, index: -1 });

  const expanded = controlledExpanded ?? ownExpanded;
  const selected = controlledSelected ?? ownSelected;
  const searched = useDeferredValue(searchable ? query : "");
  const propertiesRead = useMemo(
    () =>
      [...expanded]
        .filter(isPropertiesId)
        .filter((id) => getNode(root, id)?.children() !== undefined)
        .join(),
    [root, expanded],
  );
  const readSoFar = useMemo(
    () => ({ root, propertiesRead }),
    [root, propertiesRead],
  );
  const matches = useMemo(
    () => getMatches(readSoFar.root, searched, SEARCH_LIMIT),
    [readSoFar, searched],
  );
  const current =
    position.matches === matches && matches.ids[position.index] === selected
      ? position.index
      : -1;
  const status = getSearchStatus(
    searched,
    matches,
    current,
    labels.searchStatus,
  );
  const selectedNode = useMemo(
    () =>
      showDetails && selected !== undefined
        ? getNode(root, selected)
        : undefined,
    [showDetails, root, selected],
  );

  useEffect(readyAnnouncer, []);

  const announceStatus = useEffectEvent(() => {
    const id = matches.ids[current];
    const match = id === undefined ? undefined : getNode(root, id);
    announce(
      match
        ? labels.matchAnnouncement(
            status,
            getEscapedText(getTruncatedText(match.path, ANNOUNCED_PATH_LIMIT)),
          )
        : status,
    );
  });

  useEffect(() => {
    if (searched.trim() === "") {
      return;
    }
    const timer = setTimeout(() => announceStatus(), ANNOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [searched, current, propertiesRead]);

  function announceEmpty(next: ReadonlySet<string>) {
    const [opened, ...others] = [...next].filter((id) => !expanded.has(id));
    if (opened === undefined || others.length > 0) {
      return;
    }
    const node = getNode(root, opened);
    if (node?.children().length !== 0) {
      return;
    }
    const isUnread =
      node.kind === "uninspectable" ||
      (node.kind === "range" && node.size === undefined);
    if (!isUnread) {
      announce(labels.noProperties);
      return;
    }
    const at = node.preview.indexOf(UNREADABLE);
    announce(
      labels.unreadable(
        at < 0 ? node.preview : node.preview.slice(at + UNREADABLE.length),
        node.preview,
      ),
    );
  }

  function changeExpanded(next: ReadonlySet<string>) {
    announceEmpty(next);
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
    const closed = getNodeTrail(root, id)
      .slice(0, -1)
      .map((ancestor) => ancestor.id)
      .filter((ancestor) => !expanded.has(ancestor));
    if (closed.length > 0) {
      changeExpanded(new Set([...expanded, ...closed]));
    }
    changeSelected(id);
    setPosition({ matches, index });
  }

  function renderRow({ node }: TreeRow<InspectorNode>) {
    return (
      <>
        {node.label ? (
          <>
            <span>
              <Highlighted
                text={getShownLabel(node.label, searched)}
                query={searched}
              />
            </span>
            <span className={styles.separator}>: </span>
          </>
        ) : null}
        <span className={styles.value} data-kind={node.kind}>
          {hasValueText(node) ? (
            <Highlighted
              text={getShownPreview(node, searched)}
              query={searched}
            />
          ) : expanded.has(node.id) ? (
            getShortPreview(node.kind, node.preview)
          ) : (
            node.preview
          )}
        </span>
      </>
    );
  }

  return (
    <div {...props} className={clsx(styles.inspector, className)}>
      {searchable ? (
        <InspectorSearch
          label={label}
          labels={labels}
          query={query}
          status={status}
          hasMatches={matches.ids.length > 0}
          onQueryChange={setQuery}
          onMove={moveToMatch}
        />
      ) : null}
      <Tree
        root={root}
        label={label}
        className={styles.tree}
        aria-describedby={describedBy}
        expanded={expanded}
        onExpandedChange={changeExpanded}
        selected={selected}
        onSelectedChange={changeSelected}
        onRowAction={onRowAction}
        renderRow={renderRow}
        getRowText={getRowText}
      />
      {showDetails ? (
        <InspectorDetails
          label={label}
          labels={labels}
          node={selectedNode}
          query={searched}
        />
      ) : null}
    </div>
  );
}
