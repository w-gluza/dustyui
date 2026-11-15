import {
  getChildLists,
  getEntryList,
  getListLength,
  type Child,
  type ChildList,
  type ChildLists,
  type ChildSource,
} from "./getChildren.js";
import {
  getChildId,
  getPath,
  getPropertiesId,
  getRangeId,
  getRangeSegment,
  ROOT_ID,
  type PathStep,
} from "./getPath.js";
import { getEscapedText } from "./getEscapedText.js";
import { getPreview, type Members } from "./getPreview.js";
import { getRanges } from "./getRanges.js";
import { getTruncatedText } from "./getTruncatedText.js";
import { getValueKind, type ValueKind } from "./getValueKind.js";
import {
  getConstructorName,
  getFailureReason,
  getMapSize,
  getSetSize,
} from "./safeRead.js";

export type { ValueKind } from "./getValueKind.js";

export type NodeLabel =
  | { readonly type: "property"; readonly key: string }
  | { readonly type: "symbol"; readonly key: symbol }
  | { readonly type: "index"; readonly index: number }
  | { readonly type: "entry"; readonly index: number }
  | { readonly type: "entryKey" }
  | { readonly type: "entryValue" };

export interface InspectorNode {
  readonly id: string;
  readonly path: string;
  readonly label: NodeLabel | undefined;
  readonly value: unknown;
  readonly kind: ValueKind;
  readonly typeName: string | undefined;
  readonly preview: string;
  readonly hasChildren: boolean;
  readonly size: number | undefined;
  children(): readonly InspectorNode[];
  findChild(id: string): InspectorNode | undefined;
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
}

interface Located {
  readonly list: ChildList;
  readonly position: number;
}

const MEMBERS_READ = 6;
const FAILURE_LENGTH = 80;
const PROPERTIES = "Properties";
const UNIT_NAMES = {
  items: "Items",
  entries: "Entries",
  properties: "Properties",
} as const;

function isObject(value: unknown): value is object {
  return (
    (typeof value === "object" && value !== null) || typeof value === "function"
  );
}

function toLeaf(kind: ValueKind, detail = ""): Shape {
  return { kind, typeName: undefined, detail };
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
    case "hole":
      return toLeaf("hole");
    case "failure":
      return toLeaf("uninspectable", source.reason);
    case "entry":
      return toLeaf("entry");
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

function getKnownSize(value: unknown, kind: ValueKind): number | undefined {
  try {
    switch (kind) {
      case "array":
        return getListLength(value as object);
      case "map":
        return getMapSize(value);
      case "set":
        return getSetSize(value);
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}

function isInside(id: string, ancestorId: string): boolean {
  return id.startsWith(`${ancestorId}/`);
}

type Member = ValueNode | RangeNode | PropertiesNode;

const NO_LISTS: ChildLists = { lists: [], readProperties: undefined };

function findMember(
  owner: ValueNode,
  members: readonly Member[],
  id: string,
): InspectorNode | undefined {
  const direct = members.find(
    (member) =>
      member.id === id ||
      (member instanceof ValueNode && isInside(id, member.id)),
  );
  if (direct) {
    return direct;
  }
  const located = owner.locate(id);
  return (
    located &&
    members.find((member) =>
      member instanceof RangeNode
        ? member.list === located.list &&
          member.start <= located.position &&
          located.position < member.end
        : member instanceof PropertiesNode && member.list === located.list,
    )
  );
}

class RangeNode implements InspectorNode {
  readonly id: string;
  readonly path: string;
  readonly label = undefined;
  readonly value = undefined;
  readonly kind = "range";
  readonly typeName = undefined;
  readonly size: number;
  readonly preview: string;
  readonly list: ChildList;
  readonly start: number;
  readonly end: number;
  readonly #owner: ValueNode;
  #children: readonly Member[] | undefined;

  constructor(owner: ValueNode, list: ChildList, start: number, end: number) {
    this.id = getRangeId(owner.id, list.unit, start, end);
    this.path = owner.path;
    this.preview = `${UNIT_NAMES[list.unit]} ${start.toLocaleString("en-GB")} to ${(end - 1).toLocaleString("en-GB")}`;
    this.list = list;
    this.start = start;
    this.end = end;
    this.size = end - start;
    this.#owner = owner;
  }

  get hasChildren(): boolean {
    return this.#children === undefined || this.#children.length > 0;
  }

  children(): readonly InspectorNode[] {
    return this.#members;
  }

  findChild(id: string): InspectorNode | undefined {
    return findMember(this.#owner, this.#members, id);
  }

  get #members(): readonly Member[] {
    this.#children ??= this.#owner.createMembers(
      this.list,
      this.start,
      this.end,
    );
    return this.#children;
  }
}

class PropertiesNode implements InspectorNode {
  readonly id: string;
  readonly path: string;
  readonly label = undefined;
  readonly value = undefined;
  readonly kind = "range";
  readonly typeName = undefined;
  list: ChildList | undefined;
  #failure: string | undefined;
  readonly #owner: ValueNode;
  readonly #read: () => ChildList;
  #children: readonly Member[] | undefined;

  constructor(owner: ValueNode, read: () => ChildList) {
    this.id = getPropertiesId(owner.id);
    this.path = owner.path;
    this.#owner = owner;
    this.#read = read;
  }

  get hasChildren(): boolean {
    return this.#children === undefined || this.#children.length > 0;
  }

  get preview(): string {
    return this.#failure === undefined
      ? PROPERTIES
      : getEscapedText(
          `${PROPERTIES}: Could not be read: ${getTruncatedText(this.#failure, FAILURE_LENGTH)}`,
        );
  }

  get size(): number | undefined {
    return this.list?.size;
  }

  children(): readonly InspectorNode[] {
    return this.#members;
  }

  findChild(id: string): InspectorNode | undefined {
    return findMember(this.#owner, this.#members, id);
  }

  get #members(): readonly Member[] {
    this.#children ??= this.#load();
    return this.#children;
  }

  #load(): Member[] {
    try {
      this.list = this.#owner.addList(this.#read());
      return this.#owner.createMembers(this.list, 0, this.list.size);
    } catch (error) {
      this.#failure = getFailureReason(error);
      return [];
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
  #lists: readonly ChildList[] | undefined;
  #children: readonly Member[] | undefined;
  #childAncestors: Ancestor | undefined;
  #size: number | undefined | null = null;

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

  get #canHaveChildren(): boolean {
    const { kind } = this.#resolved;
    if (this.#source.type === "entry") {
      return true;
    }
    return (
      this.#source.type === "value" &&
      isObject(this.#source.value) &&
      kind !== "circular" &&
      kind !== "uninspectable"
    );
  }

  get #properties(): Members | undefined {
    const list = this.#lists?.find(({ unit }) => unit === "properties");
    if (this.#lists === undefined) {
      return undefined;
    }
    const children = list?.read(0, MEMBERS_READ) ?? [];
    return { children, hasMore: (list?.size ?? 0) > MEMBERS_READ };
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
      properties: this.#properties,
    });
    return this.#preview;
  }

  get hasChildren(): boolean {
    return this.#children === undefined
      ? this.#canHaveChildren
      : this.#children.length > 0;
  }

  get size(): number | undefined {
    if (this.#size === null) {
      this.#size = this.#canHaveChildren
        ? getKnownSize(this.value, this.kind)
        : undefined;
    }
    return this.#size;
  }

  children(): readonly InspectorNode[] {
    return this.#members;
  }

  findChild(id: string): InspectorNode | undefined {
    return isInside(id, this.id)
      ? findMember(this, this.#members, id)
      : undefined;
  }

  locate(id: string): Located | undefined {
    const [segment = ""] = id.slice(this.id.length + 1).split("/");
    const range = getRangeSegment(segment);
    for (const list of this.#lists ?? []) {
      const position = range
        ? range.unit === list.unit
          ? range.start
          : undefined
        : list.find(segment);
      if (position !== undefined) {
        return { list, position };
      }
    }
    return undefined;
  }

  createMembers(list: ChildList, start: number, end: number): Member[] {
    const ranges = getRanges(start, end);
    return ranges
      ? ranges.map((range) => new RangeNode(this, list, range.start, range.end))
      : list.read(start, end - start).map((child) => this.#createValue(child));
  }

  get #members(): readonly Member[] {
    this.#children ??= this.#load();
    return this.#children;
  }

  addList(list: ChildList): ChildList {
    this.#lists = [...(this.#lists ?? []), list];
    return list;
  }

  #load(): Member[] {
    this.#preview = undefined;
    const { lists, readProperties } = this.#readLists();
    this.#lists = lists;
    const { value } = this;
    this.#childAncestors = this.#ancestors;
    if (this.#source.type === "value" && isObject(value)) {
      this.#opened.add(value);
      this.#childAncestors = {
        value,
        path: this.path,
        parent: this.#ancestors,
      };
    }
    const members = lists.flatMap((list) =>
      this.createMembers(list, 0, list.size),
    );
    return readProperties
      ? [...members, new PropertiesNode(this, readProperties)]
      : members;
  }

  #readLists(): ChildLists {
    if (!this.#canHaveChildren) {
      return NO_LISTS;
    }
    if (this.#source.type === "entry") {
      return {
        lists: [getEntryList(this.#source.key, this.#source.value)],
        readProperties: undefined,
      };
    }
    try {
      return getChildLists(this.value as object, this.kind);
    } catch (error) {
      this.#shape = toLeaf("uninspectable", getFailureReason(error));
      return NO_LISTS;
    }
  }

  #createValue({ step, source }: Child): ValueNode {
    return new ValueNode(
      getChildId(this.id, step),
      getPath(this.path, step),
      toLabel(step),
      source,
      this.#childAncestors,
      this.#opened,
    );
  }
}

export function describeValue(value: unknown): InspectorNode {
  return new ValueNode(
    ROOT_ID,
    ROOT_ID,
    undefined,
    { type: "value", value },
    undefined,
    new WeakSet(),
  );
}
