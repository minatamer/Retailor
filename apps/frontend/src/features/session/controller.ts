import { DesignSchema } from "@retailor/contracts/design";
import type { Design } from "@retailor/contracts/design";
import type { CommerceGraph } from "@retailor/contracts/commerce";
import type { Photo } from "@retailor/contracts/photos";
import type { CommerceCommand } from "@retailor/contracts/commands";
import type { ProductInput } from "@retailor/contracts/product";
import { applyCommand } from "@retailor/commerce/commands";
import { emptyGraph, freeze } from "@retailor/commerce/graph";
import { BrowserPhotoCache, CacheConflict } from "../photos/cache";
import type { PhotoCache } from "../photos/cache";
import { PhotoController } from "../photos/controller";
import type { NamedPhoto } from "../photos/controller";
import { loadSample } from "../photos/sample";
import {
  parseDraft,
  reviseDraft,
  includeDraft,
  mergeDraft,
  splitDraft,
  excludeSource,
} from "../catalogue/draft";
import type { CatalogueDraft } from "../catalogue/draft";
import { CatalogueRequestError } from "../catalogue/request-error";
import { BrowseSchema, INITIAL_BROWSE } from "../storefront/browse";
import type { BrowseState } from "../storefront/browse";
import {
  INITIAL_DESIGN,
  SESSION_KEY,
  SESSION_BYTES,
  restoreProjection,
  serializeProjection,
} from "./projection";
import type { Projection, Stage } from "./projection";
export type ProcessStep =
  | "Checking photos"
  | "Approving this request"
  | "Drafting products"
  | "Validating catalogue"
  | "Preparing your preview";
export interface CatalogueProcessor {
  mode: "development-fixture" | "live";
  interpret(input: {
    photos: Photo[];
    operationId: string;
    inputRevision: number;
    workspaceId: string;
    createdAt: string;
    expiresAt: string;
    derivatives: ReadonlyMap<string, Blob>;
    signal: AbortSignal;
    step(value: ProcessStep): void;
  }): Promise<CatalogueDraft>;
}
interface SessionOptions {
  signal?: AbortSignal;
  fixtureAllowed: boolean;
  processor?: CatalogueProcessor;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  clock?: () => number;
  id?: () => string;
  cache?: (workspace: string, owner: string, expires: number) => PhotoCache;
  photos?: (cache: PhotoCache, expires: number) => PhotoController;
  seed?: (catalogue: CommerceGraph) => CommerceGraph;
}
export interface SessionSnapshot {
  dialog: "reset" | "rebuild" | null;
  state: Projection;
  notice: string;
  recoveryNotice: string;
  ready: boolean;
  sampleBusy: boolean;
  processStep: ProcessStep;
  missingPhotoIds: readonly string[];
}
/** The single owner of workflow/domain/presentation; photo resources remain its owned child. */
export class SessionController {
  private readonly clock: () => number;
  private readonly id: () => string;
  private readonly owner: string;
  private readonly aborted = () => this.dispose();
  private listeners = new Set<() => void>();
  private generation = 0;
  private operation: AbortController | undefined;
  private active = true;
  private recovering = false;
  private resetting = false;
  private unlistenPhotos: (() => void) | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;
  private lastPhotoRevision = 0;
  private snapshot: SessionSnapshot;
  photos!: PhotoController;
  private constructor(private readonly options: SessionOptions) {
    this.clock = options.clock ?? Date.now;
    this.id = options.id ?? (() => crypto.randomUUID());
    this.owner = this.id();
    options.signal?.addEventListener("abort", this.aborted, { once: true });
    this.snapshot = {
      dialog: null,
      state: this.fresh(),
      notice: "",
      recoveryNotice: "",
      ready: false,
      sampleBusy: false,
      processStep: "Checking photos",
      missingPhotoIds: [],
    };
  }
  private fresh(): Projection {
    const at = new Date(this.clock()).toISOString();
    return {
      schemaVersion: 1,
      savedAt: at,
      graph: emptyGraph({
        workspaceId: this.id(),
        scenarioId: this.id(),
        createdAt: at,
      }),
      stage: "choose",
      inputRevision: 0,
      selectedIds: [],
      photos: [],
      draft: null,
      acceptedDesign: { ...INITIAL_DESIGN },
      previewDesign: { ...INITIAL_DESIGN },
      presentationRevision: 0,
      fixture: this.options.fixtureAllowed,
      browse: structuredClone(INITIAL_BROWSE),
    };
  }
  static async open(options: SessionOptions) {
    const controller = new SessionController(options);
    await controller.initialize();
    return controller;
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(patch: Partial<SessionSnapshot>, persist = true) {
    const state = patch.state ?? this.snapshot.state;
    this.snapshot = {
      ...this.snapshot,
      ...patch,
      missingPhotoIds: state.photos
        .filter((photo) => !this.photos?.availableIds().has(photo.id))
        .map((photo) => photo.id),
    };
    if (persist && this.snapshot.ready) this.persist();
    for (const listener of this.listeners) listener();
  }
  private state(patch: Partial<Projection>, notice = this.snapshot.notice) {
    this.update({
      state: freeze({ ...this.snapshot.state, ...patch }),
      notice,
    });
  }
  private persist() {
    try {
      if (!this.options.storage) throw new Error("Storage unavailable");
      this.options.storage?.setItem(
        SESSION_KEY,
        serializeProjection(this.snapshot.state, this.clock()),
      );
    } catch {
      this.snapshot = {
        ...this.snapshot,
        recoveryNotice:
          "Your work is usable in memory. Browser storage is unavailable; refresh may lose changes.",
      };
    }
  }
  private async initialize() {
    if (this.options.signal?.aborted) {
      this.dispose();
      return;
    }
    let interrupted = false;
    try {
      const encoded = this.options.storage?.getItem(SESSION_KEY);
      if (encoded) {
        if (encoded.length > SESSION_BYTES)
          throw new Error("Oversized projection");
        const raw: unknown = JSON.parse(encoded);
        const restored = restoreProjection(
          raw,
          this.clock(),
          this.options.fixtureAllowed,
        );
        interrupted =
          typeof raw === "object" &&
          raw !== null &&
          "stage" in raw &&
          raw.stage === "process";
        this.snapshot.state = restored;
      }
    } catch {
      this.snapshot.recoveryNotice =
        "The saved workspace is unavailable or expired. Begin a fresh collection; no processing was repeated.";
      try {
        this.options.storage?.removeItem(SESSION_KEY);
      } catch {
        /* Memory remains usable. */
      }
    }
    await this.attachPhotos();
    if (!this.active) return;
    this.update({
      ready: true,
      notice: interrupted
        ? "Processing was interrupted. Its outcome may be unknown; retry only when you choose."
        : "Your temporary workspace is ready. Photos are processed only on your instruction.",
    });
    this.timer = setInterval(() => this.checkExpiry(), 5000);
  }
  private async attachPhotos(): Promise<void> {
    if (!this.active) return;
    const graph = this.snapshot.state.graph,
      expires = Date.parse(graph.expiresAt),
      cache =
        this.options.cache?.(graph.workspaceId, this.owner, expires) ??
        new BrowserPhotoCache(graph.workspaceId, this.owner, expires);
    try {
      try {
        await cache.heartbeat();
      } catch (error) {
        if (!(error instanceof CacheConflict)) throw error;
        await new Promise<void>((resolve) => {
          const finish = () => {
            clearTimeout(timer);
            this.options.signal?.removeEventListener("abort", finish);
            resolve();
          };
          const timer = setTimeout(finish, 150);
          this.options.signal?.addEventListener("abort", finish, {
            once: true,
          });
        });
        if (!this.active) {
          await cache.close().catch(() => undefined);
          return;
        }
        await cache.heartbeat();
      }
    } catch (error) {
      if (error instanceof CacheConflict) {
        await cache.close().catch(() => undefined);
        this.snapshot = {
          ...this.snapshot,
          state: this.fresh(),
          recoveryNotice:
            "Another tab owns that collection. This tab starts its own independent demo; the other tab is preserved.",
        };
        return this.attachPhotos();
      }
      this.snapshot.recoveryNotice =
        "Temporary photo storage is unavailable. In-memory work is usable; refresh recovery may need reselection.";
    }
    if (!this.active) {
      await cache.close().catch(() => undefined);
      return;
    }
    this.photos =
      this.options.photos?.(cache, expires) ??
      new PhotoController({ cache, expires });
    this.photos.activate();
    this.recovering = true;
    if (this.snapshot.state.photos.length)
      await this.photos.recover(
        this.snapshot.state.selectedIds,
        this.snapshot.state.photos,
      );
    this.recovering = false;
    if (!this.active) return;
    this.lastPhotoRevision = this.photos.getSnapshot().revision;
    this.photos.protect([
      ...new Set(
        this.snapshot.state.graph.products.flatMap(
          (product) => product.imageIds,
        ),
      ),
    ]);
    this.unlistenPhotos = this.photos.subscribe(() => this.photoChanged());
  }
  private photoChanged() {
    if (!this.active || this.recovering) return;
    const photoState = this.photos.getSnapshot();
    if (photoState.revision !== this.lastPhotoRevision) {
      this.lastPhotoRevision = photoState.revision;
      const selectedIds = photoState.items.map((item) => item.photo.id);
      const changed =
        selectedIds.join("|") !== this.snapshot.state.selectedIds.join("|");
      if (changed) {
        if (this.snapshot.state.stage === "process") this.cancelOperation();
        const retained = new Map(
          this.snapshot.state.graph.photos.map((photo) => [photo.id, photo]),
        );
        for (const photo of this.photos.descriptors())
          retained.set(photo.id, photo);
        this.state(
          {
            selectedIds,
            photos: [...retained.values()],
            draft: null,
            inputRevision: this.snapshot.state.inputRevision + 1,
            stage: "choose",
          },
          "Photo selection changed. Any previous draft needs a deliberate rebuild.",
        );
        return;
      }
    }
    this.update({}, false);
  }
  checkExpiry() {
    if (
      this.active &&
      this.clock() >= Date.parse(this.snapshot.state.graph.expiresAt)
    )
      void this.reset("This temporary demo expired. Start a fresh collection.");
  }
  private valid() {
    if (
      !this.active ||
      this.clock() >= Date.parse(this.snapshot.state.graph.expiresAt)
    ) {
      this.checkExpiry();
      return false;
    }
    return true;
  }
  private cancelOperation() {
    this.generation++;
    this.operation?.abort();
    this.operation = undefined;
  }
  async sample() {
    if (
      !this.valid() ||
      this.snapshot.sampleBusy ||
      this.photos.getSnapshot().busy ||
      this.snapshot.state.stage === "process"
    )
      return;
    this.cancelOperation();
    const operation = new AbortController(),
      generation = this.generation;
    this.operation = operation;
    this.update({ sampleBusy: true });
    try {
      const files = await loadSample(operation.signal);
      if (this.active && generation === this.generation)
        await this.photos.add(files);
    } catch {
      if (this.active && generation === this.generation)
        this.update({
          notice:
            "The sample could not load. Your accepted photos are kept; choose your own or try again.",
        });
    } finally {
      if (this.operation === operation) {
        this.operation = undefined;
        this.update({ sampleBusy: false });
      }
    }
  }
  cancel() {
    this.cancelOperation();
    this.photos.cancel();
    this.update({ sampleBusy: false });
    if (this.snapshot.state.stage === "process")
      this.state(
        { stage: "choose" },
        "Processing cancelled. Accepted photos are kept; an interrupted provider outcome may be unknown.",
      );
  }
  async draftCatalogue() {
    if (
      !this.valid() ||
      this.snapshot.state.stage !== "choose" ||
      this.photos.getSnapshot().busy ||
      this.snapshot.sampleBusy
    )
      return;
    const processor = this.options.processor;
    if (
      !processor ||
      (processor.mode === "development-fixture" && !this.options.fixtureAllowed)
    ) {
      this.update({
        notice:
          "Live catalogue drafting is unavailable right now. Your photos are kept. Try again when it is available or change the selection.",
      });
      return;
    }
    if (!this.snapshot.state.selectedIds.length) {
      this.update({
        notice: "Choose at least one validated clothing photo first.",
      });
      return;
    }
    this.cancelOperation();
    const operation = new AbortController(),
      generation = this.generation,
      workspaceId = this.snapshot.state.graph.workspaceId,
      inputRevision = this.snapshot.state.inputRevision;
    this.operation = operation;
    const current = () =>
      this.active &&
      generation === this.generation &&
      this.snapshot.state.graph.workspaceId === workspaceId &&
      inputRevision === this.snapshot.state.inputRevision &&
      this.clock() < Date.parse(this.snapshot.state.graph.expiresAt);
    this.state({ stage: "process" });
    this.update({ processStep: "Checking photos" });
    try {
      this.photos.requireSelection(this.snapshot.state.selectedIds);
      const photos = this.snapshot.state.selectedIds.map(
        (id) => this.photos.get(id)!.photo,
      );
      const operationId = this.id();
      if (processor.mode === "development-fixture")
        this.update({ processStep: "Drafting products" });
      const response = await processor.interpret({
        photos,
        workspaceId,
        createdAt: this.snapshot.state.graph.createdAt,
        expiresAt: this.snapshot.state.graph.expiresAt,
        derivatives: new Map(
          photos.map((photo) => [
            photo.id,
            this.photos.get(photo.id)!.derivative,
          ]),
        ),
        inputRevision,
        operationId,
        signal: operation.signal,
        step: (step) => {
          if (current()) this.update({ processStep: step }, false);
        },
      });
      if (!current()) return;
      this.update({ processStep: "Validating catalogue" });
      const draft = parseDraft(response);
      if (
        draft.operationId !== operationId ||
        draft.inputRevision !== inputRevision ||
        draft.mode !== processor.mode ||
        draft.photos.length !== photos.length ||
        draft.photos.some(
          (photo, index) =>
            JSON.stringify(photo) !== JSON.stringify(photos[index]),
        )
      )
        throw new Error("Stale input response");
      for (const item of draft.items.filter((item) => item.included))
        this.photos.require(item.product.imageIds);
      this.update({ processStep: "Preparing your preview" });
      this.state(
        { draft, stage: "catalogue" },
        "Your photo-backed draft is ready. Corrections are local and never rerun processing.",
      );
    } catch (error) {
      if (current())
        this.state(
          { stage: "choose" },
          error instanceof CatalogueRequestError
            ? `${error.message} A new attempt requires your instruction.`
            : "The catalogue could not be completed. Your photos are kept; a new attempt requires your instruction.",
        );
    } finally {
      if (this.operation === operation) this.operation = undefined;
    }
  }
  edit(productId: string, product: ProductInput) {
    return this.review((draft) => reviseDraft(draft, productId, product));
  }
  include(productId: string, included: boolean) {
    this.review((draft) => includeDraft(draft, productId, included));
  }
  merge(ids: readonly string[]) {
    this.review((draft) => mergeDraft(draft, ids));
  }
  split(productId: string, photoId: string) {
    this.review((draft) => splitDraft(draft, productId, photoId, this.id()));
  }
  excludeSource(photoId: string) {
    this.review((draft) => excludeSource(draft, photoId));
  }
  private review(change: (draft: CatalogueDraft) => CatalogueDraft) {
    if (
      !this.valid() ||
      this.snapshot.state.stage !== "catalogue" ||
      !this.snapshot.state.draft
    )
      return false;
    try {
      this.state(
        { draft: change(this.snapshot.state.draft) },
        "Catalogue updated locally. Your source photos and review history are preserved.",
      );
      return true;
    } catch {
      this.update({
        notice:
          "That edit needs review. Keep valid photo links, clothing/options and the twenty-product limit.",
      });
      return false;
    }
  }
  publish(rebuildApproved = false) {
    if (
      !this.valid() ||
      this.snapshot.state.stage !== "catalogue" ||
      !this.snapshot.state.draft
    )
      return;
    const state = this.snapshot.state;
    try {
      if (state.graph.orders.length && !rebuildApproved) {
        this.update({ dialog: "rebuild" });
        return;
      }
      const draft = parseDraft(state.draft),
        items = draft.items.filter((item) => item.included);
      if (!items.length) throw new Error("No included garments");
      if (draft.dispositions.some((item) => item.kind === "review"))
        throw new Error("Unresolved source review");
      const now = new Date(this.clock()).toISOString();
      const context = { now, availablePhotoIds: this.photos.availableIds() };
      let graph = emptyGraph({
        workspaceId: state.graph.workspaceId,
        scenarioId: this.id(),
        createdAt: state.graph.createdAt,
        revision: state.graph.revision,
      });
      const dispatch = (command: Pick<CommerceCommand, "type" | "payload">) => {
        const result = applyCommand(
          graph,
          {
            ...command,
            id: this.id(),
            workspaceId: graph.workspaceId,
            scenarioId: graph.scenarioId,
            expectedRevision: graph.revision,
            expiresAt: new Date(
              Math.min(Date.parse(now) + 120000, Date.parse(graph.expiresAt)),
            ).toISOString(),
            at: now,
            origin: "guest_action",
          },
          context,
        );
        if (!result.ok) throw new Error("Invalid catalogue publication");
        graph = result.graph;
      };
      dispatch({ type: "registerPhotos", payload: { photos: draft.photos } });
      for (const item of items)
        dispatch({ type: "createProduct", payload: item.product });
      if (this.options.seed) graph = this.options.seed(graph);
      else if (draft.mode !== "development-fixture")
        throw new Error("Scenario composition unavailable");
      this.photos.protect([
        ...new Set(graph.products.flatMap((product) => product.imageIds)),
      ]);
      this.state(
        { graph, stage: "style" },
        "Catalogue accepted. This is your local demo; no website was published externally.",
      );
      this.update({ dialog: null }, false);
    } catch {
      this.update({
        notice:
          state.graph.orders.length && !rebuildApproved
            ? "Rebuilding replaces existing demo activity. Confirm that reset before regrouping."
            : "Review remaining sources and included garments. Every product needs available validated photos and a valid option structure.",
      });
    }
  }
  go(stage: Stage) {
    if (!this.valid() || stage === "process") return;
    const state = this.snapshot.state;
    const legal: Record<Stage, Stage[]> = {
      choose: ["catalogue"],
      process: [],
      catalogue: ["choose"],
      style: ["catalogue", "storefront"],
      storefront: ["style", "dashboard", "catalogue"],
      dashboard: ["storefront", "style", "catalogue"],
    };
    if (
      !legal[state.stage].includes(stage) ||
      (stage === "catalogue" && !state.draft)
    )
      return;
    this.cancelOperation();
    this.state({ stage });
  }
  askReset() {
    this.update({ dialog: "reset" }, false);
  }
  browse(patch: Partial<BrowseState>) {
    if (
      !this.valid() ||
      !["style", "storefront", "dashboard"].includes(this.snapshot.state.stage)
    )
      return;
    const parsed = BrowseSchema.safeParse({
      ...this.snapshot.state.browse,
      ...patch,
    });
    if (!parsed.success) {
      this.update({ notice: "Choose valid collection filters." });
      return;
    }
    const next = parsed.data;
    if (
      next.variantId &&
      !this.snapshot.state.graph.products
        .find((item) => item.id === next.productId)
        ?.variants.some((variant) => variant.id === next.variantId)
    )
      return;
    this.state({ browse: next });
  }
  closeDialog() {
    this.update({ dialog: null }, false);
  }
  design(design: Design) {
    if (
      !this.valid() ||
      !["style", "dashboard"].includes(this.snapshot.state.stage)
    )
      return;
    try {
      const previewDesign = DesignSchema.parse(design);
      this.state({
        previewDesign,
        presentationRevision: this.snapshot.state.presentationRevision + 1,
      });
    } catch {
      this.update({ notice: "Choose one of the accepted design presets." });
    }
  }
  acceptDesign() {
    if (
      !this.valid() ||
      !["style", "dashboard"].includes(this.snapshot.state.stage)
    )
      return;
    this.state({
      acceptedDesign: this.snapshot.state.previewDesign,
      presentationRevision: this.snapshot.state.presentationRevision + 1,
      stage: "storefront",
    });
  }
  cancelDesign() {
    if (this.valid())
      this.state({
        previewDesign: this.snapshot.state.acceptedDesign,
        presentationRevision: this.snapshot.state.presentationRevision + 1,
      });
  }
  async repair(expectedId: string, file: NamedPhoto) {
    const expected = this.snapshot.state.photos.find(
      (photo) => photo.id === expectedId,
    );
    if (!expected || !this.valid()) return;
    const photos = this.photos,
      generation = this.generation;
    this.recovering = true;
    try {
      await photos.repair(expected, file);
      if (
        this.active &&
        generation === this.generation &&
        this.photos === photos
      )
        photos.selectAvailable(this.snapshot.state.selectedIds);
    } finally {
      this.recovering = false;
      this.lastPhotoRevision = this.photos.getSnapshot().revision;
    }
    this.update({}, false);
  }
  async reset(
    notice = "Fresh collection. Your previous temporary workspace has been cleared.",
  ) {
    if (!this.active || this.resetting) return;
    this.resetting = true;
    this.cancelOperation();
    this.unlistenPhotos?.();
    this.unlistenPhotos = undefined;
    this.update({ ready: false, sampleBusy: false, dialog: null });
    const previous = this.photos;
    const cleared = await previous.reset();
    if (!cleared)
      this.snapshot.recoveryNotice =
        "This demo was cleared from memory. Earlier cached bytes could not be removed and retain their original fixed expiry.";
    previous.dispose();
    try {
      this.options.storage?.removeItem(SESSION_KEY);
    } catch {
      this.snapshot.recoveryNotice =
        "Saved metadata could not be cleared; its original fixed expiry still applies.";
    }
    this.snapshot.state = this.fresh();
    await this.attachPhotos();
    this.resetting = false;
    if (this.active) this.update({ ready: true, notice });
  }
  dispose() {
    this.active = false;
    this.options.signal?.removeEventListener("abort", this.aborted);
    this.cancelOperation();
    this.unlistenPhotos?.();
    if (this.timer) clearInterval(this.timer);
    this.photos?.dispose();
    this.listeners.clear();
  }
}
