import { Worker } from "node:worker_threads";
import { createHash } from "node:crypto";
import {
  PHOTO_LIMITS,
  RecognitionManifestSchema,
} from "@retailor/contracts/photos";
import { inspectRaster } from "@retailor/contracts/raster";

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
/** One worker at a time; parent owns the deadline, cancellation and exact input hash. */
export async function prepareProviderImages(
  manifestInput: unknown,
  files: ReadonlyMap<string, Uint8Array>,
  signal: AbortSignal,
) {
  const manifest = RecognitionManifestSchema.parse(manifestInput);
  if (files.size !== manifest.length)
    throw new Error("Image coverage mismatch");
  const output = new Map<string, Uint8Array>();
  let total = 0;
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
    const sanitized = await decode(bytes, image.width, image.height, signal);
    total += sanitized.length;
    if (total > PHOTO_LIMITS.derivatives)
      throw new Error("Sanitized batch exceeds envelope");
    output.set(image.id, sanitized);
  }
  return output;
}
