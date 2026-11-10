"use client";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { Icon } from "../../components/ui/icon";
import styles from "./connections.module.css";

export function ReviewDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose(): void;
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
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        onClose();
      }}
    >
      <div className={styles.dialogHeader}>
        <h2 id={titleId}>{title}</h2>
        <button
          className={styles.close}
          aria-label="Close dialog"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
