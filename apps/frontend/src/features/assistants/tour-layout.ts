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
