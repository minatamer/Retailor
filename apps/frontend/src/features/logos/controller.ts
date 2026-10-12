import {
  LogoMetadataSchema,
  LogoResultSchema,
  type LogoMetadata,
  type LogoResult,
} from "@retailor/contracts/brand";
import type { PhotoCache, StoredLogo } from "../photos/cache";
export type LogoVerifier = (
  row: StoredLogo,
  signal: AbortSignal,
) => Promise<StoredLogo>;
export const verifyLogo: LogoVerifier = (row, signal) =>
  new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const worker = new Worker(new URL("./logo.worker.ts", import.meta.url), {
      type: "module",
    });
    let settled = false;
    const finish = (error?: unknown, value?: StoredLogo) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      worker.terminate();
      if (error) reject(error);
      else if (value) resolve(value);
    };
    const abort = () => finish(new Error("Logo review cancelled."));
    const timer = setTimeout(
      () => finish(new Error("Logo review took too long.")),
      10000,
    );
    signal.addEventListener("abort", abort, { once: true });
    worker.onerror = () => finish(new Error("Logo review is unavailable."));
    worker.onmessage = (event: MessageEvent<unknown>) => {
      const data = event.data;
      if (
        !data ||
        typeof data !== "object" ||
        !("metadata" in data) ||
        !("blob" in data) ||
        !(data.blob instanceof Blob)
      )
        return finish(new Error("Unavailable logo."));
      const metadata = LogoMetadataSchema.safeParse(data.metadata);
      if (
        !metadata.success ||
        JSON.stringify(metadata.data) !== JSON.stringify(row.metadata) ||
        data.blob.size !== row.blob.size
      )
        return finish(new Error("Unavailable logo."));
      finish(undefined, { metadata: metadata.data, blob: data.blob });
    };
    worker.postMessage(row);
    if (signal.aborted) abort();
  });
/** Resources owned by the session; borrows its photo lease and never closes it independently. */
export class LogoAssets {
  private urls = new Map<string, string>();
  constructor(
    private readonly cache: PhotoCache,
    private readonly verify: LogoVerifier = verifyLogo,
    private readonly urlPort = {
      create: (blob: Blob) => URL.createObjectURL(blob),
      revoke: (url: string) => URL.revokeObjectURL(url),
    },
  ) {}
  url(id: string | null | undefined) {
    return id ? this.urls.get(id) : undefined;
  }
  async prepare(input: LogoResult, signal: AbortSignal): Promise<StoredLogo[]> {
    const result = LogoResultSchema.parse(input),
      rows: StoredLogo[] = [];
    for (const candidate of result.candidates) {
      signal.throwIfAborted();
      const binary = atob(candidate.data);
      if (binary.length !== candidate.bytes || btoa(binary) !== candidate.data)
        throw new Error("Invalid logo bytes.");
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const metadata = LogoMetadataSchema.parse({
        id: candidate.id,
        hash: candidate.hash,
        mime: candidate.mime,
        bytes: candidate.bytes,
        width: candidate.width,
        height: candidate.height,
        context: candidate.context,
        generatedAt: candidate.generatedAt,
        mode: candidate.mode,
      });
      rows.push(
        await this.verify(
          { metadata, blob: new Blob([bytes], { type: "image/png" }) },
          signal,
        ),
      );
    }
    signal.throwIfAborted();
    return rows;
  }
  async commit(rows: readonly StoredLogo[], signal: AbortSignal) {
    signal.throwIfAborted();
    // A cache failure leaves a complete, validated set usable in this tab.
    let persisted = true;
    try {
      if (!this.cache.putLogos) throw new Error("No logo cache");
      await this.cache.putLogos(rows);
    } catch {
      persisted = false;
    }
    signal.throwIfAborted();
    this.replace(rows);
    return persisted;
  }
  async recover(expected: readonly LogoMetadata[], signal: AbortSignal) {
    if (!expected.length) return [];
    try {
      const rows = (await this.cache.readLogos?.()) ?? [];
      if (rows.length !== 3 || expected.length !== 3) return [];
      const verified: StoredLogo[] = [];
      for (const meta of expected) {
        const row = rows.find(
          (row) => JSON.stringify(row.metadata) === JSON.stringify(meta),
        );
        if (!row) return [];
        verified.push(await this.verify(row, signal));
      }
      signal.throwIfAborted();
      this.replace(verified);
      return verified.map((row) => row.metadata);
    } catch {
      return [];
    }
  }
  private replace(rows: readonly StoredLogo[]) {
    const next = new Map<string, string>();
    try {
      for (const row of rows)
        next.set(row.metadata.id, this.urlPort.create(row.blob));
    } catch (error) {
      for (const url of next.values()) this.urlPort.revoke(url);
      throw error;
    }
    this.dispose();
    this.urls = next;
  }
  unavailable(id: string) {
    const url = this.urls.get(id);
    if (url) this.urlPort.revoke(url);
    this.urls.delete(id);
  }
  dispose() {
    for (const url of this.urls.values()) this.urlPort.revoke(url);
    this.urls.clear();
  }
}
