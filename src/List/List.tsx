import type { ComponentProps, MouseEventHandler, ReactNode } from "react";
import clsx from "clsx";
import visuallyHidden from "../styles/visuallyHidden.module.css";
import styles from "./List.module.css";

export type ListVariant = "plain" | "divided" | "contained";

export interface ListProps extends Omit<
  ComponentProps<"ul">,
  "dangerouslySetInnerHTML"
> {
  variant?: ListVariant | undefined;
  numbered?: boolean | undefined;
  loading?: boolean | undefined;
  loadingLabel?: string | undefined;
  loadingRows?: number | undefined;
}

export function List({
  variant = "divided",
  numbered = false,
  loading = false,
  loadingLabel = "Loading",
  loadingRows = 3,
  className,
  children,
  ...props
}: ListProps) {
  const Element = (numbered ? "ol" : "ul") as "ul";

  return (
    <Element
      {...props}
      className={clsx(
        styles.list,
        styles[variant],
        numbered && styles.numbered,
        className,
      )}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <>
          <li className={visuallyHidden.visuallyHidden}>
            <output>{loadingLabel}</output>
          </li>
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
      )}
    </Element>
  );
}

interface ListItemBaseProps extends Omit<
  ComponentProps<"li">,
  "title" | "children" | "onClick" | "dangerouslySetInnerHTML"
> {
  title: ReactNode;
  overline?: ReactNode | undefined;
  description?: ReactNode | undefined;
  leading?: ReactNode | undefined;
  trailing?: ReactNode | undefined;
  selected?: boolean | undefined;
}

export type ListItemProps = ListItemBaseProps &
  (
    | { href: string; onClick?: never }
    | { href?: never; onClick: MouseEventHandler<HTMLButtonElement> }
    | { href?: never; onClick?: never }
  );

export function ListItem({
  title,
  overline,
  description,
  leading,
  trailing,
  selected = false,
  href,
  onClick,
  className,
  ...props
}: ListItemProps) {
  const current = selected ? "true" : undefined;
  const body = (
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
      {trailing != null ? (
        <span className={styles.trailing}>{trailing}</span>
      ) : null}
    </>
  );

  return (
    <li {...props} className={clsx(styles.item, className)}>
      {href !== undefined ? (
        <a
          className={clsx(styles.row, styles.action)}
          href={href}
          aria-current={current}
        >
          {body}
        </a>
      ) : onClick ? (
        <button
          type="button"
          className={clsx(styles.row, styles.action)}
          aria-current={current}
          onClick={onClick}
        >
          {body}
        </button>
      ) : (
        <span className={styles.row} aria-current={current}>
          {body}
        </span>
      )}
    </li>
  );
}
