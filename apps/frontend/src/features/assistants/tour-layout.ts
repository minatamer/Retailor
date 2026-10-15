export type TourRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
};
export type TourViewport = {
  width: number;
  height: number;
  top: number;
  left: number;
};
export const TOUR_SETTLE_MS = 180;
export const TOUR_FADE_MS = 180;
type TourBox = { top: number; left: number; width: number; height: number };
/** Keep the backdrop only when both the sharp hole and the actual guide stay put. */
export function sameTourLocation(
  previous: { rect: TourBox | null; card: TourBox },
  next: { rect: TourBox | null; card: TourBox },
) {
  const same = (a: TourBox, b: TourBox) =>
    (["top", "left", "width", "height"] as const).every(
      (key) => Math.abs(a[key] - b[key]) < 0.5,
    );
  return (
    !!previous.rect &&
    !!next.rect &&
    same(previous.rect, next.rect) &&
    same(previous.card, next.card)
  );
}
/** A small target must fully arrive; an oversized section must fill its visible axis. */
export function tourTargetVisible(rect: TourRect, viewport: TourViewport) {
  const fits = (start: number, end: number, origin: number, size: number) =>
    end - start <= size - 32
      ? start >= origin + 8 && end <= origin + size - 8
      : start <= origin + 32 && end >= origin + size - 32;
  return (
    fits(rect.top, rect.bottom, viewport.top, viewport.height) &&
    fits(rect.left, rect.right, viewport.left, viewport.width)
  );
}
export function sameTourRect(a: TourRect, b: TourRect) {
  return (["top", "left", "right", "bottom"] as const).every(
    (key) => Math.abs(a[key] - b[key]) < 0.5,
  );
}
export function tourSpotlight(rect: TourRect, viewport: TourViewport) {
  const top = Math.max(viewport.top, rect.top - 6),
    left = Math.max(viewport.left, rect.left - 6);
  return {
    top,
    left,
    width: Math.max(
      0,
      Math.min(rect.right + 6, viewport.left + viewport.width) - left,
    ),
    height: Math.max(
      0,
      Math.min(rect.bottom + 6, viewport.top + viewport.height) - top,
    ),
  };
}
/** Four non-overlapping backdrop panels leave the selected rectangle sharp. */
export function tourPanels(
  rect: { top: number; left: number; width: number; height: number } | null,
  viewport: TourViewport,
) {
  if (!rect)
    return [
      {
        top: viewport.top,
        left: viewport.left,
        width: viewport.width,
        height: viewport.height,
      },
    ];
  return [
    {
      top: viewport.top,
      left: viewport.left,
      width: viewport.width,
      height: rect.top - viewport.top,
    },
    {
      top: rect.top,
      left: viewport.left,
      width: rect.left - viewport.left,
      height: rect.height,
    },
    {
      top: rect.top,
      left: rect.left + rect.width,
      width: viewport.left + viewport.width - rect.left - rect.width,
      height: rect.height,
    },
    {
      top: rect.top + rect.height,
      left: viewport.left,
      width: viewport.width,
      height: viewport.top + viewport.height - rect.top - rect.height,
    },
  ];
}
export function tourPlacement(
  target: { top: number; left: number; right: number; bottom: number },
  viewport: { width: number; height: number; top: number; left: number },
  cardHeight: number,
) {
  const margin = 16,
    width = Math.min(348, viewport.width - margin * 2),
    left = Math.min(
      viewport.left + viewport.width - width - margin,
      Math.max(viewport.left + margin, target.left),
    );
  const below = target.bottom + 14,
    above = target.top - cardHeight - 14;
  if (
    below + cardHeight > viewport.top + viewport.height - margin &&
    above < viewport.top + margin
  ) {
    const sideLeft =
      target.right + 14 + width <= viewport.left + viewport.width - margin
        ? target.right + 14
        : target.left - width - 14 >= viewport.left + margin
          ? target.left - width - 14
          : null;
    if (sideLeft !== null)
      return {
        left: sideLeft,
        top: Math.max(
          viewport.top + margin,
          Math.min(
            target.top,
            viewport.top + viewport.height - cardHeight - margin,
          ),
        ),
        width,
      };
  }
  const top =
    below + cardHeight <= viewport.top + viewport.height - margin
      ? below
      : above >= viewport.top + margin
        ? above
        : viewport.top + margin;
  return {
    left,
    top: Math.max(
      viewport.top + margin,
      Math.min(top, viewport.top + viewport.height - cardHeight - margin),
    ),
    width,
  };
}
