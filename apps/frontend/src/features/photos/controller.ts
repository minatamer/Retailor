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
      ? new Set(this.entries.keys())
      : new Set<string>();
  }
  require(ids: readonly string[]) {
    requireAvailablePhotos(ids, this.availableIds());
  }
  get(id: string): StoredPhoto | undefined {
    return this.entries.get(id);
  }
  view(id: string): PhotoView | undefined {
    const item = this.entries.get(id);
    return item
      ? { photo: item.photo, name: item.name, url: item.url }
      : undefined;
  }
  descriptors(): Photo[] {
    return [...this.entries.values()].map((item) => item.photo);
  }
  manifest() {
    return RecognitionManifestSchema.parse(
      this.selected.map((id) => this.entries.get(id)!.photo.derivative),
    );
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
      for (let index = 0; index < inputs.length; index++) {
        if (!this.current(generation)) break;
        const input = inputs[index]!;
        const old = replaceId ? this.entries.get(replaceId) : undefined;
        const name = input.name.slice(0, 120);
        try {
          if (select && this.selected.length >= PHOTO_LIMITS.selection && !old)
            throw new Error(
              "Your selection already has 24 photos. Remove one to add another.",
            );
          if (this.entries.size >= PHOTO_LIMITS.sources && !old)
            throw new Error(
              "This demo has 32 cached photos. Remove an unused photo first.",
            );
          const originals =
            [...this.entries.values()].reduce(
              (sum, item) => sum + item.original.size,
              0,
            ) - (old?.original.size ?? 0);
          if (input.blob.size < 1 || input.blob.size > PHOTO_LIMITS.original)
            throw new Error("Each photo must be at most 4 MiB.");
          if (originals + input.blob.size > PHOTO_LIMITS.originals)
            throw new Error("Keep original photos under 40 MiB in total.");
          const id = replaceId ?? this.id();
          const decoded = await this.decode(
            { id, original: input.blob },
            operation.signal,
          );
          if (!this.current(generation)) break;
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
            continue;
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
            throw new Error(
              "The photo previews are full. Remove an unused photo first.",
            );
          let recovery = true;
          try {
            await this.cache.put(stored);
          } catch (error) {
            if (error instanceof CacheConflict) throw error;
            recovery = false;
          }
          if (!this.current(generation)) break;
          const url = this.urls.create(decoded.derivative);
          this.entries.set(id, { ...stored, url });
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
          if (!this.current(generation)) break;
          issues.push({
            name,
            message:
              error instanceof Error
                ? error.message
                : "Unable to read this photo.",
          });
        } finally {
          if (this.current(generation))
            this.update({ progress: index + 1, issues: issues.slice(0, 25) });
        }
      }
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
      for (let index = 0; index < rows.length; index++) {
        if (!this.current(generation)) break;
        const row = rows[index]!;
        try {
          const expectation = expected.get(row.photo.id);
          if (expectedPhotos && !expectation) continue;
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
            operation.signal,
          );
          if (!this.current(generation)) break;
          const old = this.entries.get(row.photo.id);
          if (old) this.urls.revoke(old.url);
          this.entries.set(row.photo.id, {
            ...checked,
            name: row.name,
            url: this.urls.create(checked.derivative),
          });
        } catch {
          issues.push({
            name: row.name,
            message:
              "Saved photo bytes are unavailable. Reselect the exact photo to repair this item.",
          });
        }
        if (this.current(generation)) this.update({ progress: index + 1 });
      }
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
  async reset(notice = "Photos cleared. Start with a fresh collection.") {
    this.cancel();
    const generation = this.generation;
    for (const item of this.entries.values()) this.urls.revoke(item.url);
    this.entries.clear();
    this.selected = [];
    this.protectedIds.clear();
    this.update({ issues: [], progress: 0, total: 0, notice }, true);
    await this.cache.clear().catch(() => {
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
