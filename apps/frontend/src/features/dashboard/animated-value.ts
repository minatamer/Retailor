export interface ValueAnimationPort {
  write(value: number): void;
  request(step: (time: number) => void): number;
  cancel(frame: number): void;
}

/** Presentation only: interpolate integer minor units, never registered facts. */
export function animateValue(
  port: ValueAnimationPort,
  from: number,
  to: number,
) {
  let frame: number | null = null;
  let stopped = false;
  let started: number | undefined;
  const cancel = () => {
    stopped = true;
    if (frame !== null) port.cancel(frame);
    frame = null;
  };
  if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from === to)
    return cancel;
  const step = (time: number) => {
    if (stopped) return;
    frame = null;
    if (!Number.isFinite(time)) return cancel();
    started ??= time;
    const progress = Math.max(0, Math.min(1, (time - started) / 800));
    const eased = 1 - (1 - progress) ** 3;
    const value = progress === 1 ? to : Math.round(from + (to - from) * eased);
    port.write(value === 0 ? 0 : value);
    if (progress < 1) frame = port.request(step);
    else stopped = true;
  };
  frame = port.request(step);
  return cancel;
}
