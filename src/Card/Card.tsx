import type { ComponentProps, ReactNode } from "react";
import clsx from "clsx";
import type { HeadingLevel } from "../headingLevel.js";
import styles from "./Card.module.css";

export type CardElement = "article" | "section" | "div";

export type CardVariant = "plain" | "poster";

export type CardTitleLevel = HeadingLevel;

export interface CardProps extends Omit<
  ComponentProps<"article">,
  "dangerouslySetInnerHTML"
> {
  as?: CardElement | undefined;
  variant?: CardVariant | undefined;
}

export function Card({
  as = "article",
  variant = "plain",
  className,
  ...props
}: CardProps) {
  const Element = as as "article";

  return (
    <Element
      {...props}
      className={clsx(
        styles.card,
        variant === "poster" && styles.poster,
        className,
      )}
    />
  );
}

export interface CardMediaProps extends Omit<
  ComponentProps<"div">,
  "dangerouslySetInnerHTML"
> {
  label?: string | undefined;
}

export function CardMedia({
  label,
  className,
  children,
  ...props
}: CardMediaProps) {
  return (
    <div {...props} className={clsx(styles.media, className)}>
      {children}
      {label ? (
        <p className={styles.label}>
          <span className={styles.labelText}>{label}</span>
        </p>
      ) : null}
    </div>
  );
}

export type CardContentProps = Omit<
  ComponentProps<"div">,
  "dangerouslySetInnerHTML"
>;

export function CardContent({ className, ...props }: CardContentProps) {
  return <div {...props} className={clsx(styles.content, className)} />;
}

export interface CardTitleProps extends Omit<
  ComponentProps<"h2">,
  "dangerouslySetInnerHTML"
> {
  level: CardTitleLevel;
}

export function CardTitle({
  level,
  className,
  children,
  ...props
}: CardTitleProps) {
  const Heading = `h${level}` as const;

  return (
    <Heading {...props} className={clsx(styles.title, className)}>
      {children}
    </Heading>
  );
}

export type CardDescriptionProps = Omit<
  ComponentProps<"p">,
  "dangerouslySetInnerHTML"
>;

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return <p {...props} className={clsx(styles.description, className)} />;
}

export interface CardFooterProps extends Omit<
  ComponentProps<"footer">,
  "dangerouslySetInnerHTML"
> {
  end?: ReactNode | undefined;
}

export function CardFooter({
  end,
  className,
  children,
  ...props
}: CardFooterProps) {
  return (
    <footer {...props} className={clsx(styles.footer, className)}>
      {children}
      {end != null ? <span className={styles.end}>{end}</span> : null}
    </footer>
  );
}
