import { SampleManifestSchema } from "@retailor/contracts/photos";
import manifest from "../../../public/sample/forme/manifest.json";
import type { NamedPhoto, PhotoController } from "./controller";
import { orderedPhotoProcessing } from "./ordered-processing";
export const SAMPLE = SampleManifestSchema.parse(manifest);
/** Relate only accepted sample bytes. Never overwrites a visitor's existing links. */
export function linkSampleViews(
  controller: PhotoController,
  accepted: readonly string[],
) {
  const { items: views, linksInitialized } = controller.getSnapshot();
  for (const asset of SAMPLE.assets.filter(
    (item) => item.role === "alternate",
  )) {
    const primary = SAMPLE.assets.find((item) => item.id === asset.relatedTo)!;
    const first = views.find(
      (item) => item.photo.source.hash === primary.image.hash,
    );
    const alternate = views.find(
      (item) => item.photo.source.hash === asset.image.hash,
    );
    if (
      first &&
      alternate &&
      (!linksInitialized || accepted.includes(alternate.photo.id)) &&
      !controller
        .getSnapshot()
        .links.some(
          (group) =>
            group.includes(first.photo.id) ||
            group.includes(alternate.photo.id),
        )
    )
      controller.link([first.photo.id, alternate.photo.id], true);
  }
}
/** Fixed local release assets only; never accepts a visitor URL. */
export async function loadSample(
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<NamedPhoto[]> {
  const deadline = new AbortController(),
    timer = setTimeout(() => deadline.abort(), 30000),
    owned = AbortSignal.any([signal, deadline.signal]);
  const files: NamedPhoto[] = [];
  try {
    await orderedPhotoProcessing(
      SAMPLE.assets.length,
      owned,
      async (index, workerSignal) => {
        try {
          const asset = SAMPLE.assets[index]!;
          workerSignal.throwIfAborted();
          const response = await fetcher(asset.path, {
            signal: workerSignal,
            redirect: "error",
          });
          if (!response.ok || !response.body)
            throw new Error(
              "The sample photos are unavailable. You can still choose your own.",
            );
          const reader = response.body.getReader(),
            chunks: Uint8Array[] = [];
          let size = 0;
          const abort = () => {
            void reader.cancel().catch(() => undefined);
          };
          workerSignal.addEventListener("abort", abort, { once: true });
          try {
            for (;;) {
              const item = await reader.read();
              workerSignal.throwIfAborted();
              if (item.done) break;
              size += item.value.length;
              if (size > asset.image.bytes)
                throw new Error("Sample photo size mismatch.");
              chunks.push(item.value);
            }
          } finally {
            workerSignal.removeEventListener("abort", abort);
            await reader.cancel().catch(() => undefined);
            reader.releaseLock();
          }
          if (size !== asset.image.bytes)
            throw new Error("Sample photo is incomplete.");
          const bytes = new Uint8Array(size);
          let offset = 0;
          for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
          }
          const hash = Array.from(
            new Uint8Array(await crypto.subtle.digest("SHA-256", bytes.buffer)),
            (byte) => byte.toString(16).padStart(2, "0"),
          ).join("");
          if (hash !== asset.image.hash)
            throw new Error("Sample photo identity mismatch.");
          workerSignal.throwIfAborted();
          return {
            blob: new Blob([bytes], { type: asset.image.mime }),
            name: `${asset.id}.webp`,
          };
        } catch (error) {
          deadline.abort(error);
          throw error;
        }
      },
      async (_index, result) => {
        if (!result.ok) throw result.error;
        files.push(result.value);
      },
    );
    return files;
  } finally {
    clearTimeout(timer);
    deadline.abort();
  }
}
