import { describe, expectTypeOf, it } from "vitest";
import type { AvatarProps } from "./Avatar/Avatar.js";
import type { AvatarGroupProps } from "./AvatarGroup/AvatarGroup.js";
import type { BadgeProps } from "./Badge/Badge.js";
import type { CardProps, CardTitleProps } from "./Card/Card.js";
import type { EmptyStateProps } from "./EmptyState/EmptyState.js";
import type { PlaybackControlsProps } from "./PlaybackControls/PlaybackControls.js";
import type { ListItemProps } from "./List/List.js";
import type { TabsProps } from "./Tabs/Tabs.js";
import type { ProgressBarProps } from "./ProgressBar/ProgressBar.js";
import type { RecordSleeveProps } from "./RecordSleeve/RecordSleeve.js";
import type { TempoDialProps } from "./TempoDial/TempoDial.js";
import type { TrackListProps } from "./TrackList/TrackList.js";
import type { ExpandableCardProps } from "./ExpandableCard/ExpandableCard.js";
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

type Open = ReadonlySet<string>;

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

  it("refuse controlled and default expansion together", () => {
    expectTypeOf<
      Accepts<
        TreeProps<TreeNode>,
        TreeBase & { expanded: Open; defaultExpanded: Open }
      >
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<
        ObjectInspectorProps,
        InspectorBase & { expanded: Open; defaultExpanded: string[] }
      >
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<TreeProps<TreeNode>, TreeBase & { expanded: Open }>
    >().toEqualTypeOf<true>();
    expectTypeOf<
      Accepts<
        ObjectInspectorProps,
        InspectorBase & { defaultExpanded: string[] }
      >
    >().toEqualTypeOf<true>();
  });

  it("require a heading level on a card title", () => {
    expectTypeOf<
      Accepts<CardTitleProps, { children: string }>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<CardTitleProps, { children: string; level: 1 }>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<CardTitleProps, { children: string; level: 2 }>
    >().toEqualTypeOf<true>();
  });

  it("refuse raw markup inside a card", () => {
    expectTypeOf<
      Accepts<CardProps, { dangerouslySetInnerHTML: { __html: string } }>
    >().toEqualTypeOf<false>();
  });

  it("refuse an icon on an editorial badge, which has its own marker", () => {
    expectTypeOf<
      Accepts<BadgeProps, { label: string; variant: "editorial"; icon: string }>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<
        BadgeProps,
        { label: string; variant: "editorial"; iconPosition: "end" }
      >
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<BadgeProps, { label: string; variant: "editorial" }>
    >().toEqualTypeOf<true>();
    expectTypeOf<
      Accepts<BadgeProps, { label: string; variant: "solid"; icon: string }>
    >().toEqualTypeOf<true>();
    expectTypeOf<
      Accepts<BadgeProps, { label: string; icon: string }>
    >().toEqualTypeOf<true>();
  });

  it("require a heading level on an empty state", () => {
    expectTypeOf<
      Accepts<EmptyStateProps, { title: string }>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<EmptyStateProps, { title: string; level: 2 }>
    >().toEqualTypeOf<true>();
  });

  it("require a label on an avatar group and refuse a second name", () => {
    expectTypeOf<
      Accepts<AvatarGroupProps, { avatars: [] }>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<
        AvatarGroupProps,
        { avatars: []; label: string; "aria-label": string }
      >
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<AvatarGroupProps, { avatars: []; label: string }>
    >().toEqualTypeOf<true>();
  });

  it("require a heading level on an expandable card and refuse two sources of expansion", () => {
    expectTypeOf<
      Accepts<ExpandableCardProps, { title: string }>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<ExpandableCardProps, { title: string; level: 2 }>
    >().toEqualTypeOf<true>();
    expectTypeOf<
      Accepts<
        ExpandableCardProps,
        { title: string; level: 2; expanded: boolean; defaultExpanded: boolean }
      >
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<ExpandableCardProps, { title: string; level: 2; expanded: true }>
    >().toEqualTypeOf<true>();
  });

  it("refuse two sources of playback and require a label on a track list", () => {
    expectTypeOf<
      Accepts<PlaybackControlsProps, { playing: true }>
    >().toEqualTypeOf<true>();
    expectTypeOf<
      Accepts<PlaybackControlsProps, { playing: true; defaultPlaying: true }>
    >().toEqualTypeOf<false>();
    interface List {
      label: string;
      tracks: [];
      onTrackSelect: (index: number) => void;
    }
    expectTypeOf<Accepts<TrackListProps, List>>().toEqualTypeOf<true>();
    expectTypeOf<
      Accepts<TrackListProps, Omit<List, "label">>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<TrackListProps, List & { "aria-label": string }>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<RecordSleeveProps, { revealed: true }>
    >().toEqualTypeOf<false>();
  });

  it("require a label and a range on a tempo dial and refuse two sources of its value", () => {
    interface Dial {
      label: string;
      min: number;
      max: number;
    }
    expectTypeOf<Accepts<TempoDialProps, Dial>>().toEqualTypeOf<true>();
    expectTypeOf<
      Accepts<TempoDialProps, Omit<Dial, "label">>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<TempoDialProps, Omit<Dial, "max">>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<TempoDialProps, Dial & { value: number; defaultValue: number }>
    >().toEqualTypeOf<false>();
  });

  it("keep the note for the editorial progress bar and the shown label for the plain one", () => {
    expectTypeOf<
      Accepts<ProgressBarProps, { label: string; showLabel: true }>
    >().toEqualTypeOf<true>();
    expectTypeOf<
      Accepts<ProgressBarProps, { label: string; note: string }>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<
        ProgressBarProps,
        { label: string; variant: "editorial"; note: string }
      >
    >().toEqualTypeOf<true>();
    expectTypeOf<
      Accepts<
        ProgressBarProps,
        { label: string; variant: "editorial"; showLabel: true }
      >
    >().toEqualTypeOf<false>();
  });

  it("make tabs take a value or a starting value, never both or neither", () => {
    expectTypeOf<
      Accepts<TabsProps, { defaultValue: string }>
    >().toEqualTypeOf<true>();
    expectTypeOf<Accepts<TabsProps, { value: string }>>().toEqualTypeOf<true>();
    expectTypeOf<
      Accepts<TabsProps, { value: string; defaultValue: string }>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Accepts<TabsProps, { variant: "pill" }>
    >().toEqualTypeOf<false>();
  });

  it("let a list item be a link or a button, never both", () => {
    expectTypeOf<
      Accepts<ListItemProps, { title: string }>
    >().toEqualTypeOf<true>();
    expectTypeOf<
      Accepts<ListItemProps, { title: string; href: string }>
    >().toEqualTypeOf<true>();
    expectTypeOf<
      Accepts<
        ListItemProps,
        { title: string; href: string; onClick: () => void }
      >
    >().toEqualTypeOf<false>();
  });
});
