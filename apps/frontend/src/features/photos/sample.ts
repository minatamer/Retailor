import { SampleManifestSchema } from "@retailor/contracts/photos";
import manifest from "../../../public/sample/forme/manifest.json";
import type { NamedPhoto } from "./controller";
export const SAMPLE = SampleManifestSchema.parse(manifest);
/** Fixed local release assets only; never accepts a visitor URL. */
export async function loadSample(signal: AbortSignal): Promise<NamedPhoto[]> {
  const files: NamedPhoto[] = [];
  for (const asset of SAMPLE.assets) {
    signal.throwIfAborted();
    const response = await fetch(asset.path, { signal, redirect: "error" });
    if (!response.ok || !response.body)
      throw new Error(
        "The sample photos are unavailable. You can still choose your own.",
      );
    const reader = response.body.getReader(),
      chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const item = await reader.read();
        if (item.done) break;
        size += item.value.length;
        if (size > asset.image.bytes)
          throw new Error("Sample photo size mismatch.");
        chunks.push(item.value);
      }
    } finally {
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
    files.push({
      blob: new Blob([bytes], { type: asset.image.mime }),
      name: `${asset.id}.webp`,
    });
  }
  return files;
}
