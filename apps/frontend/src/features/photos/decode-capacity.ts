import { PHOTO_LIMITS } from "@retailor/contracts/photos";
/** CPU/bitmap resources only, independent of retained photo state and provider admission. */
export class DecodeCapacity {
  private active = 0;
  private pixels = 0;
  private waiting: {
    pixels: number;
    signal: AbortSignal;
    abort(): void;
    resolve(release: () => void): void;
  }[] = [];
  async enter(pixels: number, signal: AbortSignal): Promise<() => void> {
    signal.throwIfAborted();
    if (
      !Number.isSafeInteger(pixels) ||
      pixels < 1 ||
      pixels > PHOTO_LIMITS.activeDecodePixels
    )
      return Promise.reject(
        new Error("This photo exceeds the active decode envelope."),
      );
    if (!this.waiting.length && this.fits(pixels))
      return Promise.resolve(this.acquire(pixels));
    if (this.waiting.length >= PHOTO_LIMITS.localProcessingConcurrency)
      return Promise.reject(
        new Error(
          "Photo processing is busy. Try again after the current selection.",
        ),
      );
    return new Promise((resolve, reject) => {
      const waiter = {
        pixels,
        signal,
        resolve,
        abort: () => {
          const index = this.waiting.indexOf(waiter);
          if (index >= 0) this.waiting.splice(index, 1);
          signal.removeEventListener("abort", waiter.abort);
          reject(new Error("Photo selection cancelled."));
          this.drain();
        },
      };
      this.waiting.push(waiter);
      signal.addEventListener("abort", waiter.abort, { once: true });
      if (signal.aborted) waiter.abort();
    });
  }
  private fits(pixels: number) {
    return (
      this.active < PHOTO_LIMITS.localProcessingConcurrency &&
      this.pixels + pixels <= PHOTO_LIMITS.activeDecodePixels
    );
  }
  private acquire(pixels: number) {
    this.active++;
    this.pixels += pixels;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active--;
      this.pixels -= pixels;
      this.drain();
    };
  }
  private drain() {
    while (this.waiting.length && this.fits(this.waiting[0]!.pixels)) {
      const next = this.waiting.shift()!;
      next.signal.removeEventListener("abort", next.abort);
      if (!next.signal.aborted) next.resolve(this.acquire(next.pixels));
    }
  }
}
