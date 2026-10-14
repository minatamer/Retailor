"use client";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "./button";
import styles from "./photo-dialog.module.css";

export function focusPhotoDialog(target: HTMLElement) {
  target
    .closest("dialog")
    ?.querySelector<HTMLElement>("h2")
    ?.focus({ preventScroll: true });
}

export function PhotoDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose(): void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null),
    id = useId();
  useEffect(() => {
    const node = ref.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    node?.showModal();
    heading.current?.focus({ preventScroll: true });
    return () => {
      node?.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      data-layout="columns"
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className={styles.header}>
        <h2 id={id} ref={heading} tabIndex={-1}>
          {title}
        </h2>
        <Button
          variant="quiet"
          onClick={onClose}
          aria-label="Close photo editor"
        >
          ✕
        </Button>
      </header>
      <div className={styles.body}>{children}</div>
    </dialog>
  );
}
