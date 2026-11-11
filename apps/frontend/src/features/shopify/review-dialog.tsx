"use client";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { Icon } from "../../components/ui/icon";
import styles from "./connections.module.css";

export function ReviewDialog({
  title,
  children,
  onClose,
  eyebrow,
  footer,
}: {
  title: string;
  children: ReactNode;
  onClose(): void;
  eyebrow?: string;
  footer?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    titleId = useId();
  useEffect(() => {
    const node = dialog.current,
      opener = document.activeElement;
    node?.showModal();
    return () => {
      node?.close();
      if (
        opener instanceof HTMLElement &&
        opener.isConnected &&
        !opener.matches(":disabled")
      )
        opener.focus({ preventScroll: true });
      else
        document
          .getElementById("shopify-heading")
          ?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`${styles.dialog} ${footer ? styles.framedDialog : ""}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        onClose();
      }}
    >
      <div className={styles.dialogHeader}>
        <div>
          {eyebrow && <p className={styles.dialogEyebrow}>{eyebrow}</p>}
          <h2 id={titleId}>{title}</h2>
        </div>
        <button
          className={styles.close}
          aria-label="Close dialog"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {footer ? (
        <>
          <div className={styles.dialogBody}>{children}</div>
          <div className={styles.dialogFooter}>{footer}</div>
        </>
      ) : (
        children
      )}
    </dialog>
  );
}
