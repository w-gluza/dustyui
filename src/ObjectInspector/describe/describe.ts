import {
  getChildren,
  getEntryChildren,
  type Child,
  type ChildSource,
} from "./getChildren.js";
import { getChildId, getPath, ROOT_ID, type PathStep } from "./getPath.js";
import { getPreview } from "./getPreview.js";
import { getValueKind, type ValueKind } from "./getValueKind.js";
import { getConstructorName, getFailureReason } from "./safeRead.js";

export type { ValueKind } from "./getValueKind.js";

export type NodeLabel =
  | { readonly type: "property"; readonly key: string }
  | { readonly type: "symbol"; readonly key: symbol }
  | { readonly type: "index"; readonly index: number }
  | { readonly type: "entry"; readonly index: number }
  | { readonly type: "entryKey" }
  | { readonly type: "entryValue" }
  | { readonly type: "rest" };

export interface InspectorNode {
  readonly id: string;
  readonly path: string;
  readonly label: NodeLabel | undefined;
  readonly value: unknown;
  readonly kind: ValueKind;
  readonly typeName: string | undefined;
  readonly preview: string;
  readonly childCount: number;
  children(): readonly InspectorNode[];
}

interface Ancestor {
  readonly value: object;
  readonly path: string;
  readonly parent: Ancestor | undefined;
}

interface Shape {
  readonly kind: ValueKind;
  readonly typeName: string | undefined;
  readonly detail: string;
  readonly children: readonly Child[];
}

const NO_CHILDREN: readonly Child[] = [];

function isObject(value: unknown): value is object {
  return (
    (typeof value === "object" && value !== null) || typeof value === "function"
  );
}

function toLeaf(kind: ValueKind, detail = ""): Shape {
  return { kind, typeName: undefined, detail, children: NO_CHILDREN };
}

function toLabel(step: PathStep): NodeLabel | undefined {
  switch (step.type) {
    case "hole":
      return undefined;
    case "symbol":
      return { type: "symbol", key: step.key };
    case "item":
      return { type: "index", index: step.index };
    default:
      return step;
  }
}

function findAncestor(
  value: object,
  ancestors: Ancestor | undefined,
): Ancestor | undefined {
  for (let current = ancestors; current; current = current.parent) {
    if (current.value === value) {
      return current;
    }
  }
  return undefined;
}

function getObjectShape(
  target: object,
  ancestors: Ancestor | undefined,
  opened: WeakSet<object>,
): Shape {
  const repeated = opened.has(target)
    ? findAncestor(target, ancestors)
    : undefined;
  if (repeated) {
    return toLeaf("circular", repeated.path);
  }
  const kind = getValueKind(target);
  return {
    kind,
    typeName: kind === "function" ? undefined : getConstructorName(target),
    detail: "",
    children: getChildren(target, kind),
  };
}

function getShape(
  source: ChildSource,
  ancestors: Ancestor | undefined,
  opened: WeakSet<object>,
): Shape {
  switch (source.type) {
    case "getter":
      return toLeaf("getter");
    case "rest":
      return toLeaf("rest");
    case "hole":
      return toLeaf("hole");
    case "failure":
      return toLeaf("uninspectable", source.reason);
    case "entry":
      return {
        kind: "entry",
        typeName: undefined,
        detail: "",
        children: getEntryChildren(source.key, source.value),
      };
    case "value":
      try {
        return isObject(source.value)
          ? getObjectShape(source.value, ancestors, opened)
          : toLeaf(getValueKind(source.value));
      } catch (error) {
        return toLeaf("uninspectable", getFailureReason(error));
      }
  }
}

class ValueNode implements InspectorNode {
  readonly id: string;
  readonly path: string;
  readonly label: NodeLabel | undefined;
  readonly #source: ChildSource;
  readonly #ancestors: Ancestor | undefined;
  readonly #opened: WeakSet<object>;
  #shape: Shape | undefined;
  #preview: string | undefined;
  #children: readonly InspectorNode[] | undefined;

  constructor(
    id: string,
    path: string,
    label: NodeLabel | undefined,
    source: ChildSource,
    ancestors: Ancestor | undefined,
    opened: WeakSet<object>,
  ) {
    this.id = id;
    this.path = path;
    this.label = label;
    this.#source = source;
    this.#ancestors = ancestors;
    this.#opened = opened;
  }

  get #resolved(): Shape {
    this.#shape ??= getShape(this.#source, this.#ancestors, this.#opened);
    return this.#shape;
  }

  get value(): unknown {
    return this.#source.type === "value" ? this.#source.value : undefined;
  }

  get kind(): ValueKind {
    return this.#resolved.kind;
  }

  get typeName(): string | undefined {
    return this.#resolved.typeName;
  }

  get preview(): string {
    this.#preview ??= getPreview({
      ...this.#resolved,
      source: this.#source,
    });
    return this.#preview;
  }

  get childCount(): number {
    return this.#resolved.children.length;
  }

  children(): readonly InspectorNode[] {
    this.#children ??= this.#createChildren();
    return this.#children;
  }

  #createChildren(): readonly InspectorNode[] {
    const { value } = this;
    let ancestors = this.#ancestors;
    if (this.#source.type === "value" && isObject(value)) {
      this.#opened.add(value);
      ancestors = { value, path: this.path, parent: this.#ancestors };
    }

    return this.#resolved.children.map(
      ({ step, source }) =>
        new ValueNode(
          getChildId(this.id, step),
          getPath(this.path, step),
          toLabel(step),
          source,
          ancestors,
          this.#opened,
        ),
    );
  }
}

export function describe(value: unknown): InspectorNode {
  return new ValueNode(
    ROOT_ID,
    ROOT_ID,
    undefined,
    { type: "value", value },
    undefined,
    new WeakSet(),
  );
}
