"use client";
import { preload } from "react-dom";

export function FontPreloads() {
  for (const file of [
    "inter-latin-wght-normal.woff2",
    "dm-sans-latin-wght-normal.woff2",
    "manrope-latin-wght-normal.woff2",
    "dm-serif-display-latin-400-normal.woff2",
    "dm-serif-display-latin-400-italic.woff2",
  ])
    preload(`/fonts/${file}`, {
      as: "font",
      type: "font/woff2",
      crossOrigin: "anonymous",
    });
  return null;
}
