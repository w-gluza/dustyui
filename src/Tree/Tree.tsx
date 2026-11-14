"use client";

import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import clsx from "clsx";
import { getStyle } from "../styles/getStyle.js";
import { getWindowItems } from "./getWindow.js";
import {
  findVisibleAncestor,
  keyToAction,
  reduceTree,
  visibleRows,
  type TreeAction,
  type TreeNode,
  type TreeRow,
} from "./treeModel.js";
import { useRowWindow } from "./useRowWindow.js";
import { useTypeahead } from "./useTypeahead.js";
import styles from "./Tree.module.css";

const TAB_STOP = ':scope > [tabindex="0"]';
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

function hasRow(rows: readonly TreeRow[], id: string | undefined): boolean {
  return id !== undefined && rows.some((row) => row.id === id);
}

function getSelected(
  rows: readonly TreeRow[],
  controlled: string | undefined,
  own: string | undefined,
): string | undefined {
  return hasRow(rows, controlled) ? controlled : own;
}

function reveal(container: HTMLElement, row: Element): void {
  row.scrollIntoView({ block: "nearest", inline: "nearest" });
  const content = row.firstElementChild;
  if (!content) {
    return;
  }
  const view = container.getBoundingClientRect();
  const offset = content.getBoundingClientRect().left - view.left;
  if (offset < 0 || offset > view.width / 2) {
    container.scrollBy({ left: offset });
  }
}

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
  | "tabIndex"
  | "aria-label"
  | "aria-labelledby"
  | "aria-multiselectable"
  | "aria-activedescendant"
  | "aria-orientation"
> {
  root: Node;
  label: string;
  renderRow: (row: TreeRow<Node>) => ReactNode;
  getRowText?: ((row: TreeRow<Node>) => string) | undefined;
  expanded?: ReadonlySet<string> | undefined;
  defaultExpanded?: ReadonlySet<string> | readonly string[] | undefined;
  onExpandedChange?: ((expanded: ReadonlySet<string>) => void) | undefined;
  selected?: string | undefined;
  onSelectedChange?: ((selected: string) => void) | undefined;
  "aria-label"?: never;
  "aria-labelledby"?: never;
  "aria-multiselectable"?: never;
  "aria-activedescendant"?: never;
  "aria-orientation"?: never;
}

export function Tree<Node extends TreeNode>({
  root,
  label,
  renderRow,
  getRowText,
  expanded: controlledExpanded,
  defaultExpanded,
  onExpandedChange,
  selected: controlledSelected,
  onSelectedChange,
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
  const [ownSelected, setOwnSelected] = useState<string>();
  const element = useRef<HTMLDivElement>(null);
  const focusTarget = useRef<string | undefined>(undefined);
  const hasFocusWithin = useRef(false);
  const reported = useRef(controlledSelected);

  const expanded = controlledExpanded ?? ownExpanded;
  const rows = useMemo(() => visibleRows(root, expanded), [root, expanded]);
  const [previousRows, setPreviousRows] = useState(rows);

  if (previousRows !== rows) {
    setPreviousRows(rows);
    const before = getSelected(previousRows, controlledSelected, ownSelected);
    if (before !== undefined && !hasRow(rows, before)) {
      setOwnSelected(findVisibleAncestor(previousRows, before, rows));
    }
  }
  if (hasRow(rows, controlledSelected) && ownSelected !== controlledSelected) {
    setOwnSelected(controlledSelected);
  }

  const focused = getSelected(rows, controlledSelected, ownSelected);
  const tabStop = useMemo(
    () =>
      Math.max(
        0,
        rows.findIndex((row) => row.id === focused),
      ),
    [rows, focused],
  );
  const rowWindow = useRowWindow(element, rows.length);
  const withTypedText = useTypeahead();
  const scrolledTo = useRef(focused);
  const notifySelected = useEffectEvent((id: string) => {
    onSelectedChange?.(id);
  });

  useEffect(() => {
    if (
      focused !== undefined &&
      focused !== controlledSelected &&
      focused !== reported.current
    ) {
      reported.current = focused;
      notifySelected(focused);
    }
  }, [focused, controlledSelected]);

  useImperativeHandle(ref, () => element.current as HTMLDivElement, []);

  useLayoutEffect(() => {
    const container = element.current;
    if (!container) {
      return;
    }
    for (const child of container.children) {
      if (!(child instanceof HTMLElement)) {
        continue;
      }
      const gapRows = child.dataset.gapRows;
      if (gapRows === undefined) {
        child.style.setProperty(
          "--tree-level",
          child.getAttribute("aria-level") ?? "1",
        );
      } else {
        child.style.setProperty("--tree-gap-rows", gapRows);
      }
    }
    const lostFocus =
      hasFocusWithin.current && !container.contains(document.activeElement);
    const reachedTarget =
      focusTarget.current !== undefined && focusTarget.current === focused;
    if (reachedTarget || lostFocus) {
      focusTarget.current = undefined;
      const target = container.querySelector(TAB_STOP);
      if (target instanceof HTMLElement) {
        target.focus();
      }
    }
    if (scrolledTo.current !== focused) {
      scrolledTo.current = focused;
      const row = container.querySelector(TAB_STOP);
      if (row) {
        reveal(container, row);
      }
    }
  });

  function select(id: string) {
    if (id === focused) {
      return;
    }
    reported.current = id;
    setOwnSelected(id);
    onSelectedChange?.(id);
  }

  function dispatch(action: TreeAction): void {
    const current = { expanded, focused: rows[tabStop]?.id };
    const next = reduceTree(rows, current, action, getRowText);

    if (next.expanded !== expanded) {
      if (controlledExpanded === undefined) {
        setOwnExpanded(next.expanded);
      }
      onExpandedChange?.(next.expanded);
    }
    if (next.focused !== undefined && next.focused !== focused) {
      focusTarget.current = next.focused;
      select(next.focused);
    }
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
    if (!action || (action.type === "typeahead" && !getRowText)) {
      return;
    }
    event.preventDefault();
    dispatch(withTypedText(action, event.timeStamp));
  }

  function renderTreeRow(row: TreeRow<Node> | undefined, index: number) {
    if (!row) {
      return null;
    }
    return (
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
        style={getStyle({ "--tree-level": row.level })}
        onClick={(event) => {
          if (!isInsideControl(event.target, event.currentTarget)) {
            dispatch({ type: "toggle", id: row.id });
          }
        }}
        onFocus={() => select(row.id)}
        onKeyDown={handleKeyDown}
      >
        <span className={styles.toggle} aria-hidden="true" />
        <span>{renderRow(row)}</span>
      </div>
    );
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
        if (event.target === event.currentTarget) {
          event.currentTarget.querySelector<HTMLElement>(TAB_STOP)?.focus();
        }
        onFocus?.(event);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          hasFocusWithin.current = false;
          focusTarget.current = undefined;
        }
        onBlur?.(event);
      }}
    >
      {rowWindow
        ? getWindowItems(rowWindow, rows.length, tabStop).map((item) =>
            item.type === "gap" ? (
              <div
                key={`gap-${item.id}`}
                role="none"
                className={styles.gap}
                data-gap-rows={item.rowCount}
                style={getStyle({ "--tree-gap-rows": item.rowCount })}
              />
            ) : (
              renderTreeRow(rows[item.index], item.index)
            ),
          )
        : rows.map(renderTreeRow)}
    </div>
  );
}
