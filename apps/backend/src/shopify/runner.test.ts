import { expect, it, vi } from "vitest";
import { startShopifyCleanup } from "./runner.js";
import type { ShopifyCleanup } from "./cleanup.js";

it("starts only explicitly, prevents overlapping timer work, aborts and settles on stop", async () => {
  vi.useFakeTimers();
  try {
    let finish!: () => void;
    let signal: AbortSignal | undefined;
    const sweep = vi.fn(async (input: AbortSignal) => {
      signal = input;
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      return { claimed: true, calls: 3, visited: 1 };
    });
    const diagnostic = vi.fn();
    expect(sweep).not.toHaveBeenCalled();
    const stop = startShopifyCleanup(
      { sweep, onRequested: () => () => {} } as unknown as ShopifyCleanup,
      diagnostic,
    );
    expect(sweep).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(120000);
    expect(sweep).toHaveBeenCalledTimes(1);
    const stopping = stop();
    expect(signal?.aborted).toBe(true);
    finish();
    await stopping;
    await vi.advanceTimersByTimeAsync(120000);
    expect(sweep).toHaveBeenCalledTimes(1);
    expect(diagnostic).toHaveBeenCalledWith("completed", 3, 1);
  } finally {
    vi.useRealTimers();
  }
});

it("wakes immediately, coalesces requests during a sweep, and detaches without overlapping or replaying on stop", async () => {
  vi.useFakeTimers();
  try {
    let wake!: () => void;
    const detach = vi.fn();
    const finishes: (() => void)[] = [];
    const sweep = vi.fn(async () => {
      await new Promise<void>((resolve) => finishes.push(resolve));
      return { claimed: true, calls: 0, visited: 0 };
    });
    const stop = startShopifyCleanup(
      {
        sweep,
        onRequested: (listener: () => void) => {
          wake = listener;
          return detach;
        },
      } as unknown as ShopifyCleanup,
      vi.fn(),
    );
    wake();
    wake();
    wake();
    expect(sweep).toHaveBeenCalledTimes(1);
    finishes.shift()!();
    await vi.advanceTimersByTimeAsync(0);
    expect(sweep).toHaveBeenCalledTimes(2);
    finishes.shift()!();
    await vi.advanceTimersByTimeAsync(0);
    expect(sweep).toHaveBeenCalledTimes(2);
    wake();
    expect(sweep).toHaveBeenCalledTimes(3);
    wake();
    const stopping = stop();
    expect(detach).toHaveBeenCalledTimes(1);
    finishes.shift()!();
    await stopping;
    wake();
    await vi.advanceTimersByTimeAsync(120000);
    expect(sweep).toHaveBeenCalledTimes(3);
  } finally {
    vi.useRealTimers();
  }
});
