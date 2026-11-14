"use client";

import {
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import clsx from "clsx";
import {
  findVisibleAncestor,
  getTypeaheadText,
  keyToAction,
  reduceTree,
  visibleRows,
  type TreeAction,
  type TreeNode,
  type TreeRow,
} from "./treeModel.js";
import styles from "./Tree.module.css";

const TYPEAHEAD_PAUSE = 500;
const INTERACTIVE = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "label",
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function isInsideControl(target: EventTarget, row: Element): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  const control = target.closest(INTERACTIVE);
  return control !== null && control !== row && row.contains(control);
}

export interface TreeProps<Node extends TreeNode> extends Omit<
  ComponentProps<"div">,
  | "children"
  | "dangerouslySetInnerHTML"
  | "role"
  | "aria-label"
  | "aria-labelledby"
> {
  root: Node;
  label: string;
  renderRow: (row: TreeRow<Node>) => ReactNode;
  getRowText?: (row: TreeRow<Node>) => string;
  expanded?: ReadonlySet<string>;
  defaultExpanded?: Iterable<string>;
  onExpandedChange?: (expanded: ReadonlySet<string>) => void;
}

export function Tree<Node extends TreeNode>({
  root,
  label,
  renderRow,
  getRowText,
  expanded: controlledExpanded,
  defaultExpanded,
  onExpandedChange,
  className,
  onKeyDown,
  onFocus,
  onBlur,
  ref,
  ...props
}: TreeProps<Node>) {
  const [ownExpanded, setOwnExpanded] = useState<ReadonlySet<string>>(
    () => new Set(defaultExpanded),
  );
  const [focused, setFocused] = useState<string>();
  const element = useRef<HTMLDivElement>(null);
  const focusAfterRender = useRef(false);
  const hasFocusWithin = useRef(false);
  const typed = useRef({ text: "", at: 0 });

  const expanded = controlledExpanded ?? ownExpanded;
  const rows = useMemo(() => visibleRows(root, expanded), [root, expanded]);
  const [previousRows, setPreviousRows] = useState(rows);

  if (previousRows !== rows) {
    setPreviousRows(rows);
    if (focused !== undefined && !rows.some((row) => row.id === focused)) {
      setFocused(findVisibleAncestor(previousRows, focused, rows));
    }
  }

  const tabStop = Math.max(
    0,
    rows.findIndex((row) => row.id === focused),
  );

  useImperativeHandle(ref, () => element.current as HTMLDivElement);

  useLayoutEffect(() => {
    const container = element.current;
    if (!container) {
      return;
    }
    for (const row of container.children) {
      if (row instanceof HTMLElement) {
        row.style.setProperty(
          "--tree-level",
          row.getAttribute("aria-level") ?? "1",
        );
      }
    }
    const lostFocus =
      hasFocusWithin.current && !container.contains(document.activeElement);
    if (focusAfterRender.current || lostFocus) {
      focusAfterRender.current = false;
      const target = container.children[tabStop];
      if (target instanceof HTMLElement) {
        target.focus();
      }
    }
  });

  function dispatch(action: TreeAction) {
    const current = { expanded, focused: rows[tabStop]?.id };
    const next = reduceTree(rows, current, action, getRowText);

    if (next.expanded !== expanded) {
      if (controlledExpanded === undefined) {
        setOwnExpanded(next.expanded);
      }
      onExpandedChange?.(next.expanded);
    }
    if (next.focused !== focused) {
      focusAfterRender.current = true;
      setFocused(next.focused);
    }
  }

  function withTypedText(action: TreeAction, timeStamp: number): TreeAction {
    if (action.type !== "typeahead") {
      return action;
    }
    const isContinuing = timeStamp - typed.current.at < TYPEAHEAD_PAUSE;
    const text = getTypeaheadText(
      typed.current.text,
      action.text,
      isContinuing,
    );
    typed.current = { text, at: timeStamp };
    return { type: "typeahead", text };
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.target !== event.currentTarget
    ) {
      return;
    }
    const action = keyToAction(event.key);
    if (action) {
      event.preventDefault();
      dispatch(withTypedText(action, event.timeStamp));
    }
  }

  return (
    <div
      {...props}
      ref={element}
      role="tree"
      aria-label={label}
      tabIndex={-1}
      className={clsx(styles.tree, className)}
      onFocus={(event) => {
        hasFocusWithin.current = true;
        onFocus?.(event);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          hasFocusWithin.current = false;
        }
        onBlur?.(event);
      }}
    >
      {rows.map((row, index) => (
        <div
          key={row.id}
          role="treeitem"
          aria-level={row.level}
          aria-setsize={row.setSize}
          aria-posinset={row.positionInSet}
          aria-expanded={row.expandable ? row.expanded : undefined}
          aria-selected={row.id === focused}
          tabIndex={index === tabStop ? 0 : -1}
          className={styles.row}
          style={{ "--tree-level": row.level } as CSSProperties}
          onClick={(event) => {
            if (!isInsideControl(event.target, event.currentTarget)) {
              dispatch({ type: "toggle", id: row.id });
            }
          }}
          onFocus={() => setFocused(row.id)}
          onKeyDown={handleKeyDown}
        >
          <span className={styles.toggle} aria-hidden="true" />
          <span>{renderRow(row)}</span>
        </div>
      ))}
    </div>
  );
}
