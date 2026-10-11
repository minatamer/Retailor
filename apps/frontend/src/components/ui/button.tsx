import type { ButtonHTMLAttributes } from "react";
import styles from "./controls.module.css";
export function Button({
  className = "",
  variant = "primary",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet";
}) {
  return (
    <button
      {...props}
      type={type}
      className={`${styles.button} ${styles[variant]} ${className}`}
    />
  );
}
export function Choice({
  selected,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean }) {
  return (
    <button
      {...props}
      type="button"
      aria-pressed={selected}
      className={`${styles.choice} ${selected ? styles.selected : ""} ${className}`}
    />
  );
}
