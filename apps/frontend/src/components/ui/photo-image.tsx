"use client";
import Image from "next/image";
import type { ImageProps } from "next/image";
import { useState } from "react";
import styles from "./loading-state.module.css";

/** Remains one image element so its existing consumer owns size and fit. */
export function PhotoImage({
  className = "",
  onLoad,
  onError,
  ...props
}: ImageProps) {
  const [settledSource, setSettledSource] = useState<ImageProps["src"] | null>(
    null,
  );
  return (
    <Image
      {...props}
      className={`${styles.image} ${className}`}
      data-image-pending={settledSource !== props.src}
      onLoad={(event) => {
        setSettledSource(props.src);
        onLoad?.(event);
      }}
      onError={(event) => {
        setSettledSource(props.src);
        onError?.(event);
      }}
    />
  );
}
