import {
  PhotoSchema,
  PHOTO_LIMITS,
  RecognitionManifestSchema,
  requireAvailablePhotos,
} from "@retailor/contracts/photos";
import type { Photo } from "@retailor/contracts/photos";
import { CacheConflict } from "./cache";
import type { PhotoCache, StoredPhoto } from "./cache";
import { decodePhoto } from "./decode";
import type { PhotoDecoder } from "./decode";
import { orderedPhotoProcessing } from "./ordered-processing";
import { PhotoInputError, photoNotice } from "./errors";
export interface NamedPhoto {
  blob: Blob;
  name: string;
}
export interface PhotoView {
  photo: Photo;
  name: string;
  url: string;
}
export interface PhotoSnapshot {
  items: readonly PhotoView[];
  busy: boolean;
  progress: number;
  total: number;
  notice: string;
  issues: readonly { name: string; message: string }[];
  revision: number;
}
interface ControllerOptions {
  cache: PhotoCache;
  expires: number;
  decode?: PhotoDecoder;
  clock?: () => number;
  id?: () => string;
  urls?: { create(blob: Blob): string; revoke(url: string): void };
}
/** Photo resources only. RTL-005's session controller owns this instance. */
export class PhotoController {
  private readonly cache: PhotoCache;
  private readonly decode: PhotoDecoder;
  private readonly clock: () => number;
  private readonly id: () => string;
  private readonly urls: NonNullable<ControllerOptions["urls"]>;
  private readonly expires: number;
  private entries = new Map<string, StoredPhoto & { url: string }>();
  private selected: string[] = [];
  private listeners = new Set<() => void>();
  private operation: AbortController | undefined;
  private generation = 0;
  private active = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  private protectedIds = new Set<string>();
  private failedIds = new Set<string>();
  private snapshot: PhotoSnapshot = {
    items: [],
    busy: false,
    progress: 0,
    total: 0,
    notice: "Photos stay on this device until you choose to process them.",
    issues: [],
    revision: 0,
  };
  constructor(options: ControllerOptions) {
    this.cache = options.cache;
    this.expires = options.expires;
    this.decode = options.decode ?? decodePhoto;
    this.clock = options.clock ?? Date.now;
    this.id = options.id ?? (() => `photo_${crypto.randomUUID()}`);
    this.urls = options.urls ?? {
      create: (blob) => URL.createObjectURL(blob),
      revoke: (url) => URL.revokeObjectURL(url),
    };
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(patch: Partial<PhotoSnapshot>, changed = false) {
    this.snapshot = {
      ...this.snapshot,
      ...patch,
      items: this.selected.flatMap((id) => {
        const item = this.entries.get(id);
        return item
          ? [{ photo: item.photo, name: item.name, url: item.url }]
          : [];
      }),
      revision: this.snapshot.revision + (changed ? 1 : 0),
    };
    for (const listener of this.listeners) listener();
  }
  activate() {
    this.active = true;
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      if (!this.active) return;
      if (this.clock() >= this.expires) {
        void this.reset(
          "Your temporary photo workspace expired. Start a new demo.",
        );
        return;
      }
      // Idle heartbeat is bounded, content-free and never calls a provider.
      void this.cache.heartbeat().catch((error: unknown) => {
        if (error instanceof CacheConflict) {
          this.cancel();
          this.update({ notice: error.message });
        }
      });
    }, 5000);
  }
  private valid() {
    if (!this.active || this.clock() >= this.expires) {
      if (this.active)
        void this.reset(
          "This temporary photo workspace has expired. Start a new demo.",
        );
      return false;
    }
    return true;
  }
  protect(ids: readonly string[]) {
    this.protectedIds = new Set(ids);
  }
  availableIds() {
    return this.active && this.clock() < this.expires
      ? new Set(
          [...this.entries.keys()].filter((id) => !this.failedIds.has(id)),
        )
      : new Set<string>();
  }
  reportUnavailable(id: string) {
    if (!this.valid() || !this.entries.has(id) || this.failedIds.has(id))
      return;
    this.failedIds.add(id);
    this.update({
      notice:
        "A photo could not be displayed. Repair the exact original before purchasing this garment.",
    });
  }
  require(ids: readonly string[]) {
    requireAvailablePhotos(ids, this.availableIds());
  }
  get(id: string): StoredPhoto | undefined {
    return this.entries.get(id);
  }
  view(id: string): PhotoView | undefined {
    if (this.failedIds.has(id)) return undefined;
    const item = this.entries.get(id);
    return item
      ? { photo: item.photo, name: item.name, url: item.url }
      : undefined;
  }
  descriptors(): Photo[] {
    return [...this.entries.values()].map((item) => item.photo);
  }
  manifest() {
    this.requireSelection(this.selected);
    return RecognitionManifestSchema.parse(
      this.selected.map((id) => this.entries.get(id)!.photo.derivative),
    );
  }
  requireSelection(ids: readonly string[]) {
    const available = this.availableIds();
    if (ids.some((id) => !available.has(id)))
      throw new Error(
        "Selected photo bytes are unavailable. Repair them before processing.",
      );
    RecognitionManifestSchema.parse(
      ids.map((id) => this.entries.get(id)!.photo.derivative),
    );
  }
  private inputNotice(error: unknown, fallback: string) {
    return error instanceof CacheConflict
      ? error.message
      : photoNotice(error, fallback);
  }
  private current(generation: number) {
    return (
      this.active &&
      this.generation === generation &&
      this.clock() < this.expires
    );
  }
  async add(
    files: readonly NamedPhoto[],
    replaceId?: string,
    select = true,
  ): Promise<string[]> {
    if (!this.valid() || this.snapshot.busy) return [];
    if (
      replaceId &&
      (this.protectedIds.has(replaceId) || !this.entries.has(replaceId))
    ) {
      this.update({
        notice:
          "Keep the photo used by this product. Add a new photo through its edit form.",
      });
      return [];
    }
    const generation = ++this.generation;
    const operation = new AbortController();
    this.operation = operation;
    const inputs = files.slice(0, replaceId ? 1 : PHOTO_LIMITS.selection);
    const accepted: string[] = [];
    const issues: { name: string; message: string }[] = [];
    if (files.length > inputs.length)
      issues.push({
        name: "Selection",
        message:
          "Choose at most 24 photos at a time. Other accepted photos are kept.",
      });
    this.update({ busy: true, progress: 0, total: inputs.length, issues: [] });
    try {
      await orderedPhotoProcessing(
        inputs.length,
        operation.signal,
        async (index, signal) => {
          if (!this.current(generation))
            throw new Error("Selection cancelled.");
          const input = inputs[index]!;
          const old = replaceId ? this.entries.get(replaceId) : undefined;
          const name = input.name.slice(0, 120);
          if (select && this.selected.length >= PHOTO_LIMITS.selection && !old)
            throw new PhotoInputError(
              "Your selection already has 24 photos. Remove one to add another.",
            );
          if (this.entries.size >= PHOTO_LIMITS.sources && !old)
            throw new PhotoInputError(
              "This demo has 32 cached photos. Remove an unused photo first.",
            );
          const originals =
            [...this.entries.values()].reduce(
              (sum, item) => sum + item.original.size,
              0,
            ) - (old?.original.size ?? 0);
          if (input.blob.size < 1 || input.blob.size > PHOTO_LIMITS.original)
            throw new PhotoInputError("Each photo must be at most 4 MiB.");
          if (originals + input.blob.size > PHOTO_LIMITS.originals)
            throw new PhotoInputError(
              "Keep original photos under 40 MiB in total.",
            );
          const id = replaceId ?? this.id();
          const decoded = await this.decode(
            { id, original: input.blob },
            signal,
          );
          return { decoded, id, name, old };
        },
        async (index, result) => {
          if (!this.current(generation)) return;
          const name = inputs[index]!.name.slice(0, 120);
          try {
            if (!result.ok) throw result.error;
            const { decoded, id, old } = result.value;
            const checked = PhotoSchema.parse(decoded.photo);
            const originals =
              [...this.entries.values()].reduce(
                (sum, row) => sum + row.original.size,
                0,
              ) - (old?.original.size ?? 0);
            if (
              checked.id !== id ||
              decoded.original.size !== checked.source.bytes ||
              decoded.derivative.size !== checked.derivative.bytes ||
              decoded.original.size > PHOTO_LIMITS.original ||
              originals + decoded.original.size > PHOTO_LIMITS.originals
            )
              throw new Error(
                "Decoded photo exceeds its original-byte envelope.",
              );
            const duplicate = [...this.entries.values()].find(
              (item) =>
                item.photo.source.hash === decoded.photo.source.hash ||
                item.photo.derivative.hash === decoded.photo.derivative.hash,
            );
            if (duplicate) {
              if (select && !this.selected.includes(duplicate.photo.id))
                this.selected.push(duplicate.photo.id);
              issues.push({
                name,
                message:
                  "These exact photo bytes are already here. Kept one copy.",
              });
              accepted.push(duplicate.photo.id);
              this.update({}, true);
              return;
            }
            const stored: StoredPhoto = { ...decoded, name };
            const derivatives =
              [...this.entries.values()].reduce(
                (sum, item) => sum + item.derivative.size,
                0,
              ) - (old?.derivative.size ?? 0);
            const selectedBytes =
              this.selected.reduce(
                (sum, photoId) =>
                  sum + this.entries.get(photoId)!.derivative.size,
                0,
              ) - (old?.derivative.size ?? 0);
            if (
              derivatives + decoded.derivative.size >
                PHOTO_LIMITS.cachedDerivatives ||
              (select &&
                selectedBytes + decoded.derivative.size >
                  PHOTO_LIMITS.derivatives)
            )
              throw new PhotoInputError(
                "The photo previews are full. Remove an unused photo first.",
              );
            let recovery = true;
            try {
              await this.cache.put(stored);
            } catch (error) {
              if (error instanceof CacheConflict) throw error;
              recovery = false;
            }
            if (!this.current(generation)) return;
            const url = this.urls.create(decoded.derivative);
            this.entries.set(id, { ...stored, url });
            this.failedIds.delete(id);
            if (old) this.urls.revoke(old.url);
            if (select && !this.selected.includes(id)) this.selected.push(id);
            accepted.push(id);
            this.update(
              {
                notice: recovery
                  ? "Photo checked. Originals stay local; only inspected previews are used for processing."
                  : "Photo ready in memory. Temporary storage is unavailable, so refreshing may lose this photo.",
              },
              true,
            );
          } catch (error) {
            if (!this.current(generation)) return;
            issues.push({
              name,
              message: this.inputNotice(error, "Unable to read this photo."),
            });
          } finally {
            if (this.current(generation))
              this.update({ progress: index + 1, issues: issues.slice(0, 25) });
          }
        },
        (pending, next) => {
          const old = replaceId ? this.entries.get(replaceId) : undefined;
          const originals =
            [...this.entries.values()].reduce(
              (sum, row) => sum + row.original.size,
              0,
            ) - (old?.original.size ?? 0);
          const pendingBytes = pending.reduce(
            (sum, index) => sum + inputs[index]!.blob.size,
            0,
          );
          return (
            this.current(generation) &&
            originals + pendingBytes + inputs[next]!.blob.size <=
              PHOTO_LIMITS.originals &&
            this.entries.size + pending.length + 1 - (old ? 1 : 0) <=
              PHOTO_LIMITS.sources &&
            (!select ||
              this.selected.length + pending.length + 1 - (old ? 1 : 0) <=
                PHOTO_LIMITS.selection)
          );
        },
      );
    } catch (error) {
      if (this.current(generation) && !operation.signal.aborted)
        issues.push({
          name: "Selection",
          message: this.inputNotice(error, "Unable to check this selection."),
        });
    } finally {
      if (this.current(generation)) {
        this.operation = undefined;
        this.update({ busy: false, issues: issues.slice(0, 25) });
      }
    }
    return this.current(generation) ? accepted : [];
  }
  cancel() {
    this.generation++;
    this.operation?.abort();
    this.operation = undefined;
    this.update({
      busy: false,
      notice: "Selection cancelled. Your accepted photos are kept.",
    });
  }
  move(id: string, direction: -1 | 1) {
    if (!this.valid() || this.snapshot.busy) return;
    const index = this.selected.indexOf(id),
      target = index + direction;
    if (index < 0 || target < 0 || target >= this.selected.length) return;
    [this.selected[index], this.selected[target]] = [
      this.selected[target]!,
      this.selected[index]!,
    ];
    this.update({}, true);
  }
  async remove(id: string) {
    if (!this.valid() || this.snapshot.busy || this.protectedIds.has(id)) {
      this.update({
        notice:
          "Keep at least one usable photo on every product. Replace it through the product edit form.",
      });
      return;
    }
    const item = this.entries.get(id);
    if (!item) return;
    const generation = ++this.generation;
    this.selected = this.selected.filter((value) => value !== id);
    this.entries.delete(id);
    this.urls.revoke(item.url);
    this.update(
      { notice: "Photo removed. Other accepted photos are kept." },
      true,
    );
    await this.cache.remove(id).catch(() => {
      if (this.current(generation))
        this.update({
          notice:
            "Photo removed from memory. Temporary storage could not be updated; recovery will check for missing photos.",
        });
    });
  }
  async recover(
    selectedIds?: readonly string[],
    expectedPhotos?: readonly Photo[],
  ) {
    if (!this.valid() || this.snapshot.busy) return;
    const generation = ++this.generation,
      operation = new AbortController();
    this.operation = operation;
    this.update({
      busy: true,
      notice: "Checking your locally saved photos…",
      issues: [],
    });
    const issues: { name: string; message: string }[] = [];
    try {
      if (
        expectedPhotos &&
        (expectedPhotos.length > PHOTO_LIMITS.sources ||
          new Set(expectedPhotos.map((photo) => photo.id)).size !==
            expectedPhotos.length)
      )
        throw new Error("Invalid saved photo metadata.");
      const expected = new Map(
        (expectedPhotos ?? this.descriptors()).map((photo) => {
          const value = PhotoSchema.parse(photo);
          return [value.id, value] as const;
        }),
      );
      const recovered = await this.cache.read();
      const rows = recovered.photos;
      if (!this.current(generation)) return;
      if (recovered.missingIds.length)
        issues.push({
          name: "Recovery",
          message:
            "Some saved photo bytes are unavailable. Your valid photos are kept; reselect the missing ones.",
        });
      this.update({ total: rows.length, progress: 0 });
      await orderedPhotoProcessing(
        rows.length,
        operation.signal,
        async (index, signal) => {
          if (!this.current(generation)) throw new Error("Recovery cancelled.");
          const row = rows[index]!;
          const expectation = expected.get(row.photo.id);
          if (expectedPhotos && !expectation) return null;
          if (
            expectation &&
            (expectation.source.hash !== row.photo.source.hash ||
              expectation.derivative.hash !== row.photo.derivative.hash)
          )
            throw new Error("Stale cached photo.");
          const prior = this.entries.get(row.photo.id);
          const totals = [...this.entries.values()].reduce(
            (sum, item) => ({
              original: sum.original + item.original.size,
              derivative: sum.derivative + item.derivative.size,
            }),
            { original: 0, derivative: 0 },
          );
          if (
            (!prior && this.entries.size >= PHOTO_LIMITS.sources) ||
            totals.original + row.original.size - (prior?.original.size ?? 0) >
              PHOTO_LIMITS.originals ||
            totals.derivative +
              row.derivative.size -
              (prior?.derivative.size ?? 0) >
              PHOTO_LIMITS.cachedDerivatives
          )
            throw new Error("Recovered cache exceeds the photo envelope.");
          const checked = await this.decode(
            { id: row.photo.id, original: row.original, existing: row },
            signal,
          );
          return { row, checked };
        },
        async (index, result) => {
          if (!this.current(generation)) return;
          const row = rows[index]!;
          try {
            if (!result.ok) throw result.error;
            if (!result.value) return;
            const { checked } = result.value;
            const metadata = PhotoSchema.parse(checked.photo),
              prior = this.entries.get(row.photo.id);
            const totals = [...this.entries.values()].reduce(
              (sum, item) => ({
                original: sum.original + item.original.size,
                derivative: sum.derivative + item.derivative.size,
              }),
              { original: 0, derivative: 0 },
            );
            if (
              metadata.id !== row.photo.id ||
              checked.original.size !== metadata.source.bytes ||
              checked.derivative.size !== metadata.derivative.bytes ||
              totals.original +
                checked.original.size -
                (prior?.original.size ?? 0) >
                PHOTO_LIMITS.originals ||
              totals.derivative +
                checked.derivative.size -
                (prior?.derivative.size ?? 0) >
                PHOTO_LIMITS.cachedDerivatives
            )
              throw new Error("Recovered cache exceeds its envelope.");
            const old = this.entries.get(row.photo.id);
            if (old) this.urls.revoke(old.url);
            this.entries.set(row.photo.id, {
              ...checked,
              name: row.name,
              url: this.urls.create(checked.derivative),
            });
            this.failedIds.delete(row.photo.id);
          } catch {
            if (!this.current(generation)) return;
            issues.push({
              name: row.name,
              message:
                "Saved photo bytes are unavailable. Reselect the exact photo to repair this item.",
            });
          } finally {
            if (this.current(generation)) this.update({ progress: index + 1 });
          }
        },
        (pending, next) => {
          const bytes = [...this.entries.values()].reduce(
            (sum, row) => sum + row.original.size,
            0,
          );
          return (
            this.current(generation) &&
            bytes +
              pending.reduce(
                (sum, index) => sum + rows[index]!.original.size,
                0,
              ) +
              rows[next]!.original.size <=
              PHOTO_LIMITS.originals &&
            this.entries.size + pending.length + 1 <= PHOTO_LIMITS.sources
          );
        },
      );
      if (!this.current(generation)) return;
      this.selected = (selectedIds ?? rows.map((row) => row.photo.id))
        .filter((id) => this.entries.has(id))
        .slice(0, PHOTO_LIMITS.selection);
      if (selectedIds?.some((id) => !this.entries.has(id)))
        issues.push({
          name: "Recovery",
          message:
            "Some photos are missing. Reselect them before opening or purchasing affected products.",
        });
      this.update(
        {
          issues,
          notice: issues.length
            ? "Your valid photos are kept. Missing photos need repair."
            : "Local photos restored and verified. No processing request was repeated.",
        },
        true,
      );
    } catch (error) {
      if (this.current(generation))
        this.update({
          notice:
            error instanceof CacheConflict
              ? error.message
              : "Temporary photo storage is unavailable. Reselect your photos; no server kept a copy.",
        });
    } finally {
      if (this.current(generation)) {
        this.operation = undefined;
        this.update({ busy: false });
      }
    }
  }
  selectAvailable(ids: readonly string[]) {
    if (
      !this.valid() ||
      new Set(ids).size !== ids.length ||
      ids.length > PHOTO_LIMITS.selection
    )
      return;
    const available = ids.filter((id) => this.entries.has(id));
    if (available.length)
      RecognitionManifestSchema.parse(
        available.map((id) => this.entries.get(id)!.photo.derivative),
      );
    this.selected = available;
    this.update({}, true);
  }
  async repair(expectedInput: Photo, file: NamedPhoto) {
    if (!this.valid() || this.snapshot.busy) return;
    const expected = PhotoSchema.parse(expectedInput);
    const prior = this.entries.get(expected.id);
    if (prior && !this.failedIds.has(expected.id)) return;
    if (
      (!prior && this.entries.size >= PHOTO_LIMITS.sources) ||
      file.blob.size < 1 ||
      file.blob.size > PHOTO_LIMITS.original
    ) {
      this.update({
        notice: "Reselect a supported photo within the remaining cache limits.",
      });
      return;
    }
    const originals = [...this.entries.values()].reduce(
      (sum, item) => sum + item.original.size,
      0,
    );
    if (
      originals + file.blob.size - (prior?.original.size ?? 0) >
      PHOTO_LIMITS.originals
    ) {
      this.update({ notice: "Keep original photos under 40 MiB in total." });
      return;
    }
    const generation = ++this.generation,
      operation = new AbortController();
    this.operation = operation;
    this.update({
      busy: true,
      notice: "Checking the exact saved photo identity…",
    });
    try {
      const decoded = await this.decode(
        { id: expected.id, original: file.blob },
        operation.signal,
      );
      if (!this.current(generation)) return;
      if (
        JSON.stringify(PhotoSchema.parse(decoded.photo)) !==
        JSON.stringify(expected)
      )
        throw new PhotoInputError(
          "Choose the exact original photo used by this garment. Different bytes cannot replace its saved identity.",
        );
      const derivatives = [...this.entries.values()].reduce(
        (sum, item) => sum + item.derivative.size,
        0,
      );
      if (
        derivatives + decoded.derivative.size - (prior?.derivative.size ?? 0) >
        PHOTO_LIMITS.cachedDerivatives
      )
        throw new PhotoInputError(
          "The saved photo previews have reached their cache limit.",
        );
      const stored = { ...decoded, name: file.name.slice(0, 120) };
      let recoverable = true;
      try {
        await this.cache.put(stored);
      } catch (error) {
        if (error instanceof CacheConflict) throw error;
        recoverable = false;
      }
      if (!this.current(generation)) return;
      this.entries.set(expected.id, {
        ...stored,
        url: this.urls.create(decoded.derivative),
      });
      if (prior) this.urls.revoke(prior.url);
      this.failedIds.delete(expected.id);
      this.update(
        {
          notice: recoverable
            ? "Exact garment photo restored. No interpretation was repeated."
            : "Exact photo restored in memory. Storage is unavailable, so refreshing may lose it.",
        },
        true,
      );
    } catch (error) {
      if (this.current(generation))
        this.update({
          notice: this.inputNotice(
            error,
            "This photo could not repair the saved garment.",
          ),
        });
    } finally {
      if (this.current(generation)) {
        this.operation = undefined;
        this.update({ busy: false });
      }
    }
  }
  async reset(notice = "Photos cleared. Start with a fresh collection.") {
    this.cancel();
    const generation = this.generation;
    for (const item of this.entries.values()) this.urls.revoke(item.url);
    this.entries.clear();
    this.selected = [];
    this.protectedIds.clear();
    this.failedIds.clear();
    this.update({ issues: [], progress: 0, total: 0, notice }, true);
    let cleared = true;
    await this.cache.clear().catch(() => {
      cleared = false;
      if (this.active && this.generation === generation)
        this.update({
          notice:
            "Photos cleared from this demo. Temporary storage cleanup is unavailable; earlier cached bytes remain subject to their fixed expiry.",
        });
    });
    if (this.clock() >= this.expires && this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    return cleared;
  }
  dispose() {
    this.active = false;
    this.generation++;
    this.operation?.abort();
    this.operation = undefined;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = undefined;
    for (const item of this.entries.values()) this.urls.revoke(item.url);
    this.entries.clear();
    this.selected = [];
    this.update({ busy: false }, true);
    void this.cache.close().catch(() => undefined);
  }
}
