import type {
  ComponentProps,
  CSSProperties,
  MouseEventHandler,
  ReactNode,
} from "react";
import clsx from "clsx";
import { ListLoadingAnnouncement } from "./ListLoadingAnnouncement.js";
import styles from "./List.module.css";

export type ListVariant = "plain" | "divided" | "contained";

export interface ListProps extends Omit<
  ComponentProps<"ul">,
  "dangerouslySetInnerHTML"
> {
  variant?: ListVariant | undefined;
  numbered?: boolean | undefined;
  start?: number | undefined;
  loading?: boolean | undefined;
  loadingLabel?: string | undefined;
  loadingRows?: number | undefined;
}

export function List({
  variant = "divided",
  numbered = false,
  start,
  loading = false,
  loadingLabel = "Loading",
  loadingRows = 3,
  className,
  style,
  children,
  ...props
}: ListProps) {
  const numbering =
    numbered && start !== undefined && Number.isInteger(start)
      ? ({ ...style, "--list-start": start - 1 } as CSSProperties)
      : style;
  const listProps = {
    ...props,
    style: numbering,
    className: clsx(
      styles.list,
      styles[variant],
      numbered && styles.numbered,
      className,
    ),
    "aria-busy": loading || undefined,
  };
  const content = loading ? (
    <>
      <ListLoadingAnnouncement label={loadingLabel} />
      {Array.from({ length: loadingRows }, (_, index) => (
        <li key={index} className={styles.item} aria-hidden="true">
          <span className={clsx(styles.row, styles.skeleton)}>
            <span className={styles.bone} />
            <span className={styles.content}>
              <span className={styles.bone} />
              <span className={styles.bone} />
            </span>
          </span>
        </li>
      ))}
    </>
  ) : (
    children
  );

  return numbered ? (
    <ol role="list" start={start} {...(listProps as ComponentProps<"ol">)}>
      {content}
    </ol>
  ) : (
    <ul role="list" {...listProps}>
      {content}
    </ul>
  );
}

export type ListItemSelected = boolean | "page" | "step" | "location";

interface ListItemBaseProps extends Omit<
  ComponentProps<"li">,
  "title" | "children" | "onClick" | "dangerouslySetInnerHTML"
> {
  title: ReactNode;
  overline?: ReactNode | undefined;
  description?: ReactNode | undefined;
  leading?: ReactNode | undefined;
  trailing?: ReactNode | undefined;
  actions?: ReactNode | undefined;
  selected?: ListItemSelected | undefined;
}

export type ListItemLinkProps = Omit<
  ComponentProps<"a">,
  "href" | "children" | "dangerouslySetInnerHTML" | "aria-current"
>;

export type ListItemButtonProps = Omit<
  ComponentProps<"button">,
  | "type"
  | "disabled"
  | "onClick"
  | "children"
  | "dangerouslySetInnerHTML"
  | "aria-current"
>;

export type ListItemProps = ListItemBaseProps &
  (
    | {
        href: string;
        onClick?: never;
        actionProps?: ListItemLinkProps | undefined;
      }
    | {
        href?: never;
        onClick: MouseEventHandler<HTMLButtonElement>;
        actionProps?: ListItemButtonProps | undefined;
      }
    | { href?: never; onClick?: never; actionProps?: never }
  );

export function ListItem({
  title,
  overline,
  description,
  leading,
  trailing,
  actions,
  selected = false,
  href,
  onClick,
  actionProps,
  className,
  ...props
}: ListItemProps) {
  const actionClassName = clsx(styles.action, actionProps?.className);
  const current = selected === true ? "true" : selected || undefined;
  const interactive = href !== undefined || onClick !== undefined;
  const main = (
    <>
      {leading != null ? (
        <span className={styles.leading}>{leading}</span>
      ) : null}
      <span className={styles.content}>
        {overline != null ? (
          <span className={styles.overline}>{overline}</span>
        ) : null}
        <span className={styles.title}>{title}</span>
        {description != null ? (
          <span className={styles.description}>{description}</span>
        ) : null}
      </span>
    </>
  );
  const trailingSlot =
    trailing != null ? (
      <span className={styles.trailing}>{trailing}</span>
    ) : null;
  const actionsSlot =
    actions != null ? <span className={styles.actions}>{actions}</span> : null;

  return (
    <li {...props} className={clsx(styles.item, className)}>
      {interactive ? (
        <span className={styles.interactive}>
          {href !== undefined ? (
            <a
              {...actionProps}
              className={actionClassName}
              href={href}
              aria-current={current}
            >
              <span className={styles.main}>{main}</span>
            </a>
          ) : (
            <button
              {...actionProps}
              type="button"
              className={actionClassName}
              aria-current={current}
              onClick={onClick}
            >
              <span className={styles.main}>{main}</span>
            </button>
          )}
          {trailingSlot || actionsSlot ? (
            <span className={styles.end}>
              {trailingSlot}
              {actionsSlot}
            </span>
          ) : null}
        </span>
      ) : (
        <span className={styles.row} aria-current={current}>
          {main}
          {trailingSlot}
          {actionsSlot}
        </span>
      )}
    </li>
  );
}
