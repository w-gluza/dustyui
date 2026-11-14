import { describe, expectTypeOf, it } from "vitest";
import type { AvatarProps } from "./Avatar/Avatar.js";
import type { IconButtonProps } from "./IconButton/IconButton.js";
import type { ObjectInspectorProps } from "./ObjectInspector/ObjectInspector.js";
import type { TreeProps } from "./Tree/Tree.js";
import type { TreeNode } from "./Tree/treeModel.js";

type Accepts<Props, Candidate> = Candidate extends Props ? true : false;

interface IconButtonBase {
  label: string;
  icon: null;
}

interface AvatarBase {
  name: string;
}

interface TreeBase {
  root: TreeNode;
  label: string;
  renderRow: () => null;
}

interface InspectorBase {
  label: string;
  value: unknown;
}

describe("props", () => {
  it("accept other attributes of the element", () => {
    expectTypeOf<
      Accepts<
        IconButtonProps,
        IconButtonBase & { "aria-describedby": string; "data-test": string }
      >
    >().toEqualTypeOf<true>();
    expectTypeOf<
      Accepts<AvatarProps, AvatarBase & { "aria-describedby": string }>
    >().toEqualTypeOf<true>();
    expectTypeOf<
      Accepts<TreeProps<TreeNode>, TreeBase & { "aria-describedby": string }>
    >().toEqualTypeOf<true>();
  });

  it("refuse a second accessible name on an icon button", () => {
    expectTypeOf<
      Accepts<IconButtonProps, IconButtonBase & { "aria-label": string }>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<IconButtonProps, IconButtonBase & { "aria-labelledby": string }>
    >().toEqualTypeOf<false>();
  });

  it("refuse a name or a hidden state that contradicts the avatar", () => {
    expectTypeOf<
      Accepts<AvatarProps, AvatarBase & { "aria-label": string }>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<AvatarProps, AvatarBase & { "aria-labelledby": string }>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<AvatarProps, AvatarBase & { "aria-hidden": true }>
    >().toEqualTypeOf<false>();
  });

  it("refuse a second name and unsupported tree attributes on a tree", () => {
    expectTypeOf<
      Accepts<TreeProps<TreeNode>, TreeBase & { "aria-label": string }>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<TreeProps<TreeNode>, TreeBase & { "aria-labelledby": string }>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<TreeProps<TreeNode>, TreeBase & { "aria-multiselectable": true }>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<
        TreeProps<TreeNode>,
        TreeBase & { "aria-activedescendant": string }
      >
    >().toEqualTypeOf<false>();
  });

  it("refuse the same on an object inspector", () => {
    expectTypeOf<
      Accepts<
        ObjectInspectorProps,
        InspectorBase & { "aria-labelledby": string }
      >
    >().toEqualTypeOf<false>();
  });
});
