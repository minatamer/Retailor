import { PHOTO_LIMITS } from "@retailor/contracts/photos";
export type PhotoOutcome<T> =
  { ok: true; value: T } | { ok: false; error: unknown };
/** At most two foreground results, each held until its ordered commit; never queue the whole selection. */
export async function orderedPhotoProcessing<T>(
  count: number,
  signal: AbortSignal,
  read: (index: number, signal: AbortSignal) => Promise<T>,
  commit: (index: number, result: PhotoOutcome<T>) => Promise<void>,
  canPrefetch: (pending: readonly number[], next: number) => boolean = () =>
    true,
) {
  signal.throwIfAborted();
  const owner = new AbortController(),
    owned = AbortSignal.any([signal, owner.signal]);
  const pending: { index: number; done: Promise<PhotoOutcome<T>> }[] = [];
  let cursor = 0;
  const fill = () => {
    while (
      !owned.aborted &&
      cursor < count &&
      pending.length < PHOTO_LIMITS.localProcessingConcurrency &&
      (!pending.length ||
        canPrefetch(
          pending.map((job) => job.index),
          cursor,
        ))
    ) {
      const index = cursor++;
      const done = Promise.resolve()
        .then(() => {
          owned.throwIfAborted();
          return read(index, owned);
        })
        .then<PhotoOutcome<T>, PhotoOutcome<T>>(
          (value) => ({ ok: true, value }),
          (error) => ({ ok: false, error }),
        );
      pending.push({ index, done });
    }
  };
  try {
    fill();
    while (pending.length && !owned.aborted) {
      const job = pending[0]!,
        result = await job.done;
      owned.throwIfAborted();
      await commit(job.index, result);
      pending.shift();
      fill();
    }
  } finally {
    owner.abort();
    await Promise.all(pending.map((job) => job.done));
  }
}
