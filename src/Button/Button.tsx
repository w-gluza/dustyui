import React from "react";
import styles from "./Button.module.css";

type Props = {
  children: React.ReactNode;
};

export const Button = ({ children }: Props) => {
  return <button className={styles.button}>{children}</button>;
};
