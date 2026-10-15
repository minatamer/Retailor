import { sameTourRect } from "./tour-layout";
import type { TourRect } from "./tour-layout";

export const TOUR_WELCOME_DELAY_MS = 1000;
const PAGE_WAIT_LIMIT_MS = 10_000;

/** Wait for the mounted page, then give it a quiet second. Failed resources cannot trap the visitor. */
export function waitForTourPage(root: Document, ready: () => void) {
  const view = root.defaultView;
  if (!view) return () => {};
  const started = view.performance.now();
  let frame = 0,
    disposed = false,
    settledAt: number | null = null,
    previous: TourRect | null = null;
  const measure = () => {
    frame = 0;
    if (disposed) return;
    const now = view.performance.now(),
      bounds = root.documentElement.getBoundingClientRect();
    const loaded =
      root.readyState === "complete" &&
      root.fonts.status !== "loading" &&
      [...root.images].every((image) => {
        if (image.complete) return true;
        const rect = image.getBoundingClientRect();
        return (
          !rect.width ||
          !rect.height ||
          (image.loading === "lazy" &&
            (rect.bottom <= 0 || rect.top >= view.innerHeight))
        );
      });
    if (now - started >= PAGE_WAIT_LIMIT_MS) {
      // A stalled network/font or continuous layout must not leave a hidden tour running forever.
      settledAt ??= now;
    } else if (!loaded || !previous || !sameTourRect(bounds, previous)) {
      settledAt = null;
    } else settledAt ??= now;
    previous = bounds;
    if (settledAt !== null && now - settledAt >= TOUR_WELCOME_DELAY_MS) {
      disposed = true;
      ready();
    } else frame = view.requestAnimationFrame(measure);
  };
  frame = view.requestAnimationFrame(measure);
  return () => {
    disposed = true;
    view.cancelAnimationFrame(frame);
  };
}
