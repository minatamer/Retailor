"use client";

import { useCallback, useEffect, useRef } from "react";

export interface ScrollAnimationPort {
  position(): number;
  write(top: number): void;
  request(step: (time: number) => void): number;
  cancel(frame: number): void;
}

/** One timed animation; no browser/OS motion preference can shorten it to a jump. */
export function animateScroll(
  port: ScrollAnimationPort,
  top: number,
  durationMs = 800,
  finished?: () => void,
) {
  const start = port.position();
  let frame: number | null = null;
  let cancelled = false;
  let started: number | undefined;
  const cancel = () => {
    cancelled = true;
    if (frame !== null) port.cancel(frame);
    frame = null;
  };
  if (!Number.isFinite(start) || !Number.isFinite(top)) return cancel;
  const duration = Number.isFinite(durationMs)
    ? Math.max(450, Math.min(1200, durationMs))
    : 800;
  const step = (now: number) => {
    if (cancelled) return;
    frame = null;
    if (!Number.isFinite(now)) return cancel();
    started ??= now;
    const progress = Math.min(1, Math.max(0, (now - started) / duration));
    const eased = 1 - (1 - progress) ** 3;
    port.write(start + (top - start) * eased);
    if (progress < 1) frame = port.request(step);
    else {
      cancelled = true;
      finished?.();
    }
  };
  frame = port.request(step);
  return cancel;
}

/** Explicit scrolling shared by authored UI flows; replacement owns cancellation. */
export function useAnimatedScroll() {
  const pending = useRef<(() => void) | null>(null);
  const cancel = useCallback(() => {
    pending.current?.();
    pending.current = null;
  }, []);
  const scrollTo = useCallback(
    (top: number, durationMs = 800, finished?: () => void) => {
      cancel();
      const maximum = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      pending.current = animateScroll(
        {
          position: () => window.scrollY,
          // Each frame sets a position immediately. The frame timeline, rather
          // than a second native smooth animation, supplies the visible motion.
          write: (position) =>
            window.scrollTo({ top: position, behavior: "instant" }),
          request: (step) => requestAnimationFrame(step),
          cancel: (frame) => cancelAnimationFrame(frame),
        },
        Math.max(0, Math.min(top, maximum)),
        durationMs,
        () => {
          pending.current = null;
          finished?.();
        },
      );
    },
    [cancel],
  );
  useEffect(() => {
    const events = [
      "wheel",
      "touchstart",
      "pointerdown",
      "keydown",
      "popstate",
      "resize",
      "pagehide",
    ] as const;
    for (const event of events)
      window.addEventListener(event, cancel, { passive: true });
    return () => {
      cancel();
      for (const event of events) window.removeEventListener(event, cancel);
    };
  }, [cancel]);
  return { scrollTo, cancel };
}
