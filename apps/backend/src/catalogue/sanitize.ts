import { Worker } from "node:worker_threads";
import { createHash } from "node:crypto";
import {
  PHOTO_LIMITS,
  RecognitionManifestSchema,
} from "@retailor/contracts/photos";
import { inspectRaster } from "@retailor/contracts/raster";
import { ImageCapacity, IMAGE_WORKER_LIMITS } from "./image-capacity.js";
import { deny } from "../security/errors.js";
export type ImageDecoder = (
  bytes: Uint8Array,
  width: number,
  height: number,
  signal: AbortSignal,
) => Promise<Uint8Array>;
export interface SanitizerPorts {
  capacity?: ImageCapacity;
  decode?: ImageDecoder;
  rss?: () => number;
}
const processCapacity = new ImageCapacity();

function decode(
  bytes: Uint8Array,
  width: number,
  height: number,
  signal: AbortSignal,
): Promise<Uint8Array> {
  signal.throwIfAborted();
  const url = new URL(
    import.meta.url.endsWith(".ts") ? "./image-worker.ts" : "./image-worker.js",
    import.meta.url,
  );
  return new Promise((resolve, reject) => {
    const worker = new Worker(url, {
      workerData: { bytes, width, height },
      resourceLimits: { maxOldGenerationSizeMb: 64 },
    });
    let settled = false;
    const timer = setTimeout(() => finish(), PHOTO_LIMITS.decodeMs);
    const abort = () => finish();
    const finish = (value?: Uint8Array) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      // Settle only after termination; admission cannot release while its worker survives.
      void worker.terminate().then(
        () => {
          if (value && !signal.aborted) resolve(value);
          else reject(new Error("Image could not be decoded"));
        },
        () => reject(new Error("Image could not be decoded")),
      );
    };
    worker.once("message", (result: unknown) => {
      if (
        result &&
        typeof result === "object" &&
        "ok" in result &&
        result.ok === true &&
        "bytes" in result &&
        result.bytes instanceof Uint8Array &&
        result.bytes.length <= PHOTO_LIMITS.derivative
      )
        finish(result.bytes);
      else finish();
    });
    worker.once("error", () => finish());
    worker.once("exit", () => {
      if (!settled) finish();
    });
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}
/** Two bounded request loops share two process-wide native slots; retain one result per loop until ordered commit. */
export async function prepareProviderImages(
  manifestInput: unknown,
  files: ReadonlyMap<string, Uint8Array>,
  signal: AbortSignal,
  ports: SanitizerPorts = {},
) {
  signal.throwIfAborted();
  const manifest = RecognitionManifestSchema.parse(manifestInput);
  if (files.size !== manifest.length)
    throw new Error("Image coverage mismatch");
  // Check every submitted identity before creating any native worker.
  for (const image of manifest) {
    signal.throwIfAborted();
    const bytes = files.get(image.id);
    if (
      !bytes ||
      bytes.length !== image.bytes ||
      createHash("sha256").update(bytes).digest("hex") !== image.hash
    )
      throw new Error("Image byte mismatch");
    const header = inspectRaster(bytes);
    if (
      header.mime !== image.mime ||
      header.width !== image.width ||
      header.height !== image.height ||
      header.privateMetadata
    )
      throw new Error("Image manifest mismatch");
  }
  const owner = new AbortController(),
    owned = AbortSignal.any([signal, owner.signal]);
  const capacity = ports.capacity ?? processCapacity,
    decoder = ports.decode ?? decode,
    rss = ports.rss ?? (() => process.memoryUsage.rss());
  const completions = manifest.map(() => {
    let resolve!: () => void;
    const done = new Promise<void>((finish) => {
      resolve = finish;
    });
    return { done, resolve };
  });
  const output = new Map<string, Uint8Array>();
  let cursor = 0,
    total = 0,
    failure: { error: unknown } | undefined;
  const run = async () => {
    while (!owned.aborted && cursor < manifest.length) {
      const index = cursor++,
        image = manifest[index]!;
      try {
        const release = await capacity.enter(owned);
        let sanitized: Uint8Array;
        try {
          owned.throwIfAborted();
          if (rss() >= IMAGE_WORKER_LIMITS.rssBytes) return deny("BUSY", 429);
          sanitized = await decoder(
            files.get(image.id)!,
            image.width,
            image.height,
            owned,
          );
        } finally {
          release();
        }
        if (
          !(sanitized instanceof Uint8Array) ||
          !sanitized.length ||
          sanitized.length > PHOTO_LIMITS.derivative
        )
          throw new Error("Invalid sanitized image");
        if (index) await completions[index - 1]!.done;
        owned.throwIfAborted();
        total += sanitized.length;
        if (total > PHOTO_LIMITS.derivatives)
          throw new Error("Sanitized batch exceeds envelope");
        output.set(image.id, sanitized);
      } catch (error) {
        failure ??= { error };
        owner.abort(error);
      } finally {
        completions[index]!.resolve();
      }
    }
  };
  try {
    // Await every owned decoder's termination, even when a sibling fails first.
    await Promise.allSettled(
      Array.from(
        { length: Math.min(IMAGE_WORKER_LIMITS.active, manifest.length) },
        run,
      ),
    );
    if (failure) throw failure.error;
    owned.throwIfAborted();
    return output;
  } finally {
    owner.abort();
    if (failure || signal.aborted) output.clear();
  }
}
