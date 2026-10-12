import {
  CurrencySchema,
  CurrencyScopeSchema,
  INITIAL_CURRENCY,
  DisplayMinorSchema,
} from "@retailor/contracts/currency";
import type { Currency, CurrencyScope } from "@retailor/contracts/currency";
import { validateSnapshot } from "@retailor/commerce/currency";
import { requestCurrencyQuote } from "../currency/request";
import { selectedScope } from "../currency/display";
import { generateScenario } from "@retailor/commerce/scenarios";
import type {
  ScenarioPreset,
  ScenarioInfo,
} from "@retailor/contracts/scenarios";
import { ScenarioPresetSchema } from "@retailor/contracts/scenarios";
import {
  INITIAL_DASHBOARD,
  DashboardPeriodSchema,
  DashboardSeriesSchema,
  DashboardTargetSchema,
  dashboardRecord,
} from "../dashboard/state";
import type {
  DashboardPeriod,
  DashboardSeries,
  DashboardTarget,
} from "../dashboard/state";
import { previewCommand } from "@retailor/commerce/effects";
import { animatePrefill, prefillFields } from "../assistants/operation-prefill";
import { USD_SCOPE } from "@retailor/contracts/currency";
import {
  openOwnerForm,
  editOwnerField,
  ownerIntent,
  OwnerFormSchema,
  OwnerViewSchema,
} from "../operations/state";
import type {
  OwnerForm,
  OwnerField,
  OwnerOperationType,
  OwnerReview,
  OwnerView,
} from "../operations/state";
import { INITIAL_SHOPPING, SHOPPER_INACTIVITY_MS } from "../bag/state";
import type { CheckoutReview } from "../bag/state";
import { bagEntries, bagWitness, bagTotals } from "../bag/quote";
import { DesignSchema } from "@retailor/contracts/design";
import type { Design } from "@retailor/contracts/design";
import type { CommerceGraph } from "@retailor/contracts/commerce";
import type { Photo } from "@retailor/contracts/photos";
import { CommandSchema } from "@retailor/contracts/commands";
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
  INITIAL_SETUP,
  confirmSetup,
  reconcileSetup,
  logoEligible,
  designConfirmed,
  SetupStepSchema,
  updateBrand,
  brandValues,
  CLEAN_BRAND,
} from "../assistants/setup";
import type { BrandDraft } from "../assistants/setup";
import type { SetupStep } from "../assistants/setup";
import {
  INITIAL_DESIGN,
  SESSION_KEY,
  SESSION_BYTES,
  restoreProjection,
  recoverDesignPresets,
  recoverCurrency,
  serializeProjection,
} from "./projection";
import type { Projection, Stage } from "./projection";
import {
  ASSISTANT_LIMITS,
  AssistantPayloadSchema,
  AssistantResultSchema,
  assistantFence,
} from "@retailor/contracts/assistant";
import type {
  AssistantResult,
  AssistantNavigation,
  AssistantRole,
} from "@retailor/contracts/assistant";
import { appendMessage, replyCurrent } from "../assistants/conversation";
import type { ChatMessage } from "../assistants/conversation";
import { currentAssistantContext, roleOf } from "../assistants/context";
import { localReply } from "../assistants/local";
import type { LocalShortcut } from "../assistants/local";
import { assistantRequester } from "../assistants/request";
import type { AssistantRequester } from "../assistants/request";
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
  assistantRequest?: AssistantRequester;
  signal?: AbortSignal;
  fixtureAllowed: boolean;
  processor?: CatalogueProcessor;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  clock?: () => number;
  id?: () => string;
  cache?: (workspace: string, owner: string, expires: number) => PhotoCache;
  photos?: (cache: PhotoCache, expires: number) => PhotoController;
  scenarioFactory?: (
    catalogue: CommerceGraph,
    preset: ScenarioPreset,
    options: Parameters<typeof generateScenario>[2],
  ) => { graph: CommerceGraph; info: ScenarioInfo | null };
  currencyQuote?: (signal: AbortSignal) => Promise<unknown>;
}
export type ScenarioReview = ReturnType<typeof generateScenario> & {
  expectedRevision: number;
  sourceScenarioId: string;
  expiresAt: number;
  photoWitness: string;
};
export interface SessionSnapshot {
  assistantDraft: string;
  assistantBusy: boolean;
  assistantNotice: string;
  tour: { role: AssistantRole; index: number } | null;
  dialog: "reset" | "rebuild" | "leave-design" | null;
  state: Projection;
  notice: string;
  recoveryNotice: string;
  ready: boolean;
  sampleBusy: boolean;
  processStep: ProcessStep;
  missingPhotoIds: readonly string[];
  heroBusy: boolean;
  currencyBusy: boolean;
  currencyNotice: string;
  ownerForm: OwnerForm | null;
  ownerSurface: "dashboard" | "tailor";
  ownerFilling: OwnerField | null;
  ownerResult: {
    receiptId: string;
    type: OwnerOperationType;
    effect: OwnerReview["effect"];
  } | null;
  ownerReview: OwnerReview | null;
  ownerNotice: string;
  ownerPhotoBusy: boolean;
  scenarioReview: ScenarioReview | null;
  bagOpen: boolean;
  bagReceiptId: string | null;
  bagNotice: string;
  checkoutReview: CheckoutReview | null;
  preparedLogo: {
    designRevision: number;
    name: string;
    theme: Design["theme"];
    typography: Design["typography"];
    candidates: 3;
  } | null;
}
/** The single owner of workflow/domain/presentation; photo resources remain its owned child. */
export class SessionController {
  private readonly clock: () => number;
  private readonly id: () => string;
  private readonly owner: string;
  private readonly aborted = () => this.dispose();
  private listeners = new Set<() => void>();
  private generation = 0;
  private pendingStage: Stage | null = null;
  private currencyOperation: AbortController | undefined;
  private currencyGeneration = 0;
  private operation: AbortController | undefined;
  private assistantOperation: AbortController | undefined;
  private cancelPrefill: (() => void) | undefined;
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
      assistantDraft: "",
      assistantBusy: false,
      assistantNotice: "",
      tour: null,
      dialog: null,
      state: this.fresh(),
      notice: "",
      recoveryNotice: "",
      ready: false,
      sampleBusy: false,
      processStep: "Checking photos",
      missingPhotoIds: [],
      heroBusy: false,
      currencyBusy: false,
      currencyNotice: "",
      ownerForm: null,
      ownerSurface: "dashboard",
      ownerFilling: null,
      ownerResult: null,
      ownerReview: null,
      ownerNotice: "",
      ownerPhotoBusy: false,
      scenarioReview: null,
      bagOpen: false,
      bagReceiptId: null,
      bagNotice: "",
      checkoutReview: null,
      preparedLogo: null,
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
      setup: structuredClone(INITIAL_SETUP),
      hasAcceptedLook: false,
      designEditing: false,
      currency: structuredClone(INITIAL_CURRENCY),
      orderDisplays: [],
      shopping: structuredClone(INITIAL_SHOPPING),
      scenario: null,
      ownerView: "overview",
      ownerSearch: "",
      ownerPage: 0,
      dashboard: structuredClone(INITIAL_DASHBOARD),
      conversation: [],
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
    if (
      state.graph.revision !== this.snapshot.state.graph.revision ||
      state.stage !== this.snapshot.state.stage ||
      state.ownerView !== this.snapshot.state.ownerView ||
      state.graph.scenarioId !== this.snapshot.state.graph.scenarioId
    ) {
      this.cancelPrefill?.();
      this.cancelPrefill = undefined;
      patch = { ...patch, ownerFilling: null };
    }
    if (
      this.assistantOperation &&
      (state.graph.revision !== this.snapshot.state.graph.revision ||
        state.graph.scenarioId !== this.snapshot.state.graph.scenarioId ||
        state.graph.workspaceId !== this.snapshot.state.graph.workspaceId ||
        roleOf(state) !== roleOf(this.snapshot.state))
    ) {
      this.assistantOperation.abort();
      this.assistantOperation = undefined;
      patch = {
        ...patch,
        assistantBusy: false,
        assistantNotice:
          "The workspace changed. Send again with the current view.",
      };
    }
    if (state.stage !== this.snapshot.state.stage)
      patch = { ...patch, tour: null, assistantDraft: "" };
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
        if (
          recoverCurrency(raw, this.clock(), this.options.fixtureAllowed)
            .repaired
        )
          this.snapshot.currencyNotice =
            "Euro pricing is unavailable right now; prices are shown in USD. Price bounds were cleared.";
        if (recoverDesignPresets(raw).repaired)
          this.snapshot.recoveryNotice =
            "An unavailable saved style was replaced with Studio, Ink / Paper or Editorial. Your catalogue and records are preserved; review the look with Tailor.";
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
    this.protectDesignPhotos();
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
  private cancelCurrencyRequest() {
    this.currencyGeneration++;
    this.currencyOperation?.abort();
    this.currencyOperation = undefined;
    this.update({ currencyBusy: false }, false);
  }
  private applyCurrency(
    selected: Currency,
    acceptedSnapshot = this.snapshot.state.currency.acceptedSnapshot,
  ) {
    const state = this.snapshot.state,
      changed = selected !== state.currency.selected;
    this.state({
      currency: { selected, acceptedSnapshot },
      ...(changed
        ? {
            browse: {
              ...state.browse,
              filters: {
                ...state.browse.filters,
                minPrice: null,
                maxPrice: null,
              },
            },
            presentationRevision: state.presentationRevision + 1,
          }
        : {}),
    });
    if (changed)
      this.update(
        {
          checkoutReview: null,
          bagNotice: "Currency changed. Review the displayed order again.",
        },
        false,
      );
    this.update(
      {
        currencyNotice: changed
          ? `Prices are shown in ${selected}. Price bounds were cleared for this currency.`
          : "",
      },
      false,
    );
  }
  async selectCurrency(value: Currency) {
    if (
      !this.valid() ||
      !["style", "storefront", "dashboard"].includes(
        this.snapshot.state.stage,
      ) ||
      !CurrencySchema.safeParse(value).success
    )
      return;
    this.cancelCurrencyRequest();
    if (value === "USD") {
      this.applyCurrency("USD");
      return;
    }
    const accepted = this.snapshot.state.currency.acceptedSnapshot;
    if (accepted) {
      try {
        validateSnapshot(accepted, this.clock(), this.options.fixtureAllowed);
        this.applyCurrency("EUR", accepted);
        return;
      } catch {
        this.applyCurrency("USD", null);
      }
    }
    const operation = new AbortController(),
      generation = this.currencyGeneration,
      workspace = this.snapshot.state.graph.workspaceId;
    this.currencyOperation = operation;
    this.update(
      {
        currencyBusy: true,
        currencyNotice:
          "Getting Euro reference prices. USD browsing remains available.",
      },
      false,
    );
    const stopped = new Promise<never>((_resolve, reject) => {
      operation.signal.addEventListener(
        "abort",
        () => reject(new Error("Currency request stopped")),
        { once: true },
      );
    });
    const timer = setTimeout(() => operation.abort(), 7000);
    try {
      const quote = await Promise.race([
        (this.options.currencyQuote ?? requestCurrencyQuote)(operation.signal),
        stopped,
      ]);
      if (
        !this.active ||
        operation.signal.aborted ||
        generation !== this.currencyGeneration ||
        workspace !== this.snapshot.state.graph.workspaceId ||
        !this.valid()
      )
        return;
      const snapshot = validateSnapshot(
        quote,
        this.clock(),
        this.options.fixtureAllowed,
      );
      this.applyCurrency("EUR", snapshot);
    } catch {
      if (
        this.active &&
        generation === this.currencyGeneration &&
        workspace === this.snapshot.state.graph.workspaceId
      )
        this.update(
          {
            currencyNotice:
              "Euro pricing is unavailable right now; prices are shown in USD.",
          },
          false,
        );
    } finally {
      clearTimeout(timer);
      operation.abort();
      if (this.active && generation === this.currencyGeneration) {
        this.currencyOperation = undefined;
        this.update({ currencyBusy: false }, false);
      }
    }
  }
  filterDisplayBudget(maximum: number, expectedScope: CurrencyScope) {
    if (
      !this.valid() ||
      this.snapshot.state.stage !== "storefront" ||
      !DisplayMinorSchema.safeParse(maximum).success
    )
      return;
    const state = this.snapshot.state;
    if (
      JSON.stringify(expectedScope) !==
      JSON.stringify(selectedScope(state.currency))
    ) {
      this.update(
        { currencyNotice: "Currency changed. Review your price budget." },
        false,
      );
      return;
    }
    this.browse({
      page: "collection",
      filters: { ...state.browse.filters, minPrice: null, maxPrice: maximum },
    });
  }
  ownerNavigate(view: OwnerView) {
    if (!this.ownerAllowed() || !OwnerViewSchema.safeParse(view).success)
      return;
    this.stopOwnerPrefill();
    this.update({ ownerReview: null }, false);
    this.state({
      ownerView: view,
      ownerSearch: "",
      ownerPage: 0,
      presentationRevision: this.snapshot.state.presentationRevision + 1,
    });
  }
  setDashboardPeriod(period: DashboardPeriod) {
    if (
      !this.ownerAllowed() ||
      !DashboardPeriodSchema.safeParse(period).success
    )
      return;
    this.state({
      dashboard: {
        ...this.snapshot.state.dashboard,
        period,
        source: null,
        page: 0,
      },
      presentationRevision: this.snapshot.state.presentationRevision + 1,
    });
  }
  setDashboardSeries(series: DashboardSeries) {
    if (
      !this.ownerAllowed() ||
      !DashboardSeriesSchema.safeParse(series).success
    )
      return;
    this.state({
      dashboard: {
        ...this.snapshot.state.dashboard,
        series,
        source: null,
        page: 0,
      },
      presentationRevision: this.snapshot.state.presentationRevision + 1,
    });
  }
  pinDashboard(target: DashboardTarget) {
    if (!this.ownerAllowed()) return;
    const parsed = DashboardTargetSchema.safeParse(target);
    if (parsed.success)
      this.state({
        dashboard: { ...this.snapshot.state.dashboard, pinned: parsed.data },
      });
  }
  openDashboardEvidence(target: DashboardTarget) {
    if (!this.ownerAllowed()) return;
    const parsed = DashboardTargetSchema.safeParse(target);
    if (parsed.success)
      this.state({
        dashboard: {
          ...this.snapshot.state.dashboard,
          target: parsed.data,
          pinned: parsed.data,
          source: null,
          page: 0,
        },
      });
  }
  openDashboardSource(reference: string | null) {
    if (!this.ownerAllowed() || !this.snapshot.state.dashboard.target) return;
    if (reference && !dashboardRecord(this.snapshot.state.graph, reference))
      return;
    this.state({
      dashboard: { ...this.snapshot.state.dashboard, source: reference },
    });
  }
  closeDashboardEvidence() {
    if (this.valid())
      this.state({
        dashboard: {
          ...this.snapshot.state.dashboard,
          target: null,
          source: null,
        },
      });
  }
  setDashboardEvidencePage(page: number) {
    if (
      !this.ownerAllowed() ||
      !Number.isInteger(page) ||
      page < 0 ||
      page > 40
    )
      return;
    this.state({ dashboard: { ...this.snapshot.state.dashboard, page } });
  }
  ownerSearch(value: string) {
    if (!this.ownerAllowed() || value.length > 100) return;
    this.state({ ownerSearch: value, ownerPage: 0 });
  }
  ownerPage(value: number) {
    if (
      !this.ownerAllowed() ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > 16
    )
      return;
    this.state({ ownerPage: value });
  }
  editOwnerReview() {
    this.update({ ownerReview: null }, false);
  }
  private ownerAllowed() {
    return (
      this.valid() &&
      this.snapshot.state.stage === "dashboard" &&
      !this.snapshot.state.designEditing
    );
  }
  openOwnerOperation(type: OwnerOperationType, targetId?: string) {
    if (!this.ownerAllowed()) return;
    this.stopOwnerPrefill();
    this.photos.cancel();
    try {
      this.update(
        {
          ownerForm: openOwnerForm(
            this.snapshot.state.graph,
            type,
            targetId,
            this.id,
          ),
          ownerReview: null,
          ownerSurface: "dashboard",
          ownerResult: null,
          ownerPhotoBusy: false,
          ownerNotice: "",
          scenarioReview: null,
        },
        false,
      );
      this.protectDesignPhotos();
    } catch {
      this.update(
        { ownerNotice: "That form is unavailable. Choose a current record." },
        false,
      );
    }
  }
  closeOwnerOperation() {
    this.stopOwnerPrefill();
    this.photos.cancel();
    this.update(
      { ownerForm: null, ownerReview: null, ownerPhotoBusy: false },
      false,
    );
    this.protectDesignPhotos();
  }
  stopOwnerPrefill() {
    this.cancelPrefill?.();
    this.cancelPrefill = undefined;
    if (this.snapshot.ownerFilling) this.update({ ownerFilling: null }, false);
  }
  moveOwnerForm(surface: "dashboard" | "tailor") {
    if (!this.ownerAllowed() || !this.snapshot.ownerForm) return;
    this.stopOwnerPrefill();
    this.update({ ownerSurface: surface }, false);
    this.toggleTailor(surface === "tailor");
  }
  editOwnerField(
    field: OwnerField,
    value: string,
    origin: "human" | "suggestion" = "human",
    expectedFormId = this.snapshot.ownerForm?.id,
  ) {
    if (
      !this.ownerAllowed() ||
      !this.snapshot.ownerForm ||
      this.snapshot.ownerForm.id !== expectedFormId
    )
      return;
    try {
      const form = editOwnerField(
        this.snapshot.ownerForm,
        field,
        value,
        origin,
      );
      if (form !== this.snapshot.ownerForm)
        this.update(
          { ownerForm: form, ownerReview: null, ownerNotice: "" },
          false,
        );
    } catch {
      this.update(
        { ownerNotice: "Keep this field within the demo’s supported values." },
        false,
      );
    }
  }
  addOwnerVariant() {
    if (
      !this.ownerAllowed() ||
      !this.snapshot.ownerForm ||
      this.snapshot.ownerForm.variants.length >= 24
    )
      return;
    const id = this.id();
    this.editOwnerRows("variants", [
      ...this.snapshot.ownerForm.variants,
      {
        id,
        size: "New option",
        colour: "Unconfirmed",
        sku: `DEMO-${id.slice(0, 16)}`,
        price: "60.00",
        cost: "24.00",
        stock: "10",
        archived: false,
      },
    ]);
  }
  editOwnerRows<
    K extends "variants" | "photoIds" | "lines" | "unitsSelection" | "refunds",
  >(
    key: K,
    value: OwnerForm[K],
    origin: "human" | "suggestion" = "human",
    expectedFormId = this.snapshot.ownerForm?.id,
  ) {
    if (!this.ownerAllowed() || !this.snapshot.ownerForm) return;
    if (this.snapshot.ownerForm.id !== expectedFormId) return;
    const before = this.snapshot.ownerForm,
      dirtyKey: OwnerForm["dirty"][number] =
        key === "photoIds"
          ? "photos"
          : key === "variants"
            ? "variants"
            : key === "lines"
              ? "lines"
              : key === "unitsSelection"
                ? "unitsSelection"
                : "refunds";
    if (origin === "suggestion" && before.dirty.includes(dirtyKey)) return;
    const parsed = OwnerFormSchema.safeParse({
      ...before,
      [key]: value,
      dirty:
        origin === "human"
          ? [...new Set([...before.dirty, dirtyKey])]
          : before.dirty,
    });
    if (!parsed.success) {
      this.update(
        { ownerNotice: "That selection exceeds the supported form limits." },
        false,
      );
      return;
    }
    if (
      key === "photoIds" &&
      parsed.data.photoIds.some((id) => !this.photos.availableIds().has(id))
    ) {
      this.update(
        { ownerNotice: "Choose a validated available photo." },
        false,
      );
      return;
    }
    this.update(
      { ownerForm: parsed.data, ownerReview: null, ownerNotice: "" },
      false,
    );
    this.protectDesignPhotos();
  }
  async uploadOwnerPhoto(file: NamedPhoto) {
    this.stopOwnerPrefill();
    if (
      !this.ownerAllowed() ||
      !this.snapshot.ownerForm ||
      this.snapshot.ownerPhotoBusy
    )
      return;
    const form = this.snapshot.ownerForm,
      generation = this.generation,
      photos = this.photos,
      witness = JSON.stringify(form.photoIds);
    this.update({ ownerPhotoBusy: true }, false);
    try {
      const ids = await photos.add([file], undefined, false),
        id = ids[0];
      if (
        !this.active ||
        generation !== this.generation ||
        photos !== this.photos ||
        this.snapshot.ownerForm?.id !== form.id ||
        JSON.stringify(this.snapshot.ownerForm.photoIds) !== witness ||
        !this.ownerAllowed()
      )
        return;
      if (!id) {
        this.update(
          {
            ownerNotice:
              photos.getSnapshot().issues[0]?.message ??
              photos.getSnapshot().notice ??
              "Choose a valid clothing photo.",
          },
          false,
        );
        return;
      }
      const state = this.snapshot.state,
        descriptors = photos.descriptors(),
        available = new Set(photos.availableIds());
      const next = applyCommand(
        state.graph,
        this.makeCommand(state.graph, "registerPhotos", {
          photos: descriptors.filter((p) => available.has(p.id)),
        }),
        {
          now: new Date(this.clock()).toISOString(),
          availablePhotoIds: available,
        },
      );
      if (!next.ok) {
        this.update({ ownerNotice: next.message }, false);
        return;
      }
      const retained = new Map(state.photos.map((p) => [p.id, p]));
      for (const p of descriptors) retained.set(p.id, p);
      this.update({
        state: freeze({
          ...state,
          graph: next.graph,
          photos: [...retained.values()],
        }),
        ownerReview: null,
        ownerNotice:
          "Photo checked and available. Review the garment before creating it.",
      });
      this.editOwnerRows("photoIds", [
        ...new Set([...this.snapshot.ownerForm.photoIds, id]),
      ]);
    } catch {
      if (this.active && generation === this.generation)
        this.update(
          {
            ownerNotice:
              "That photo could not be added. Keep or choose another available photo.",
          },
          false,
        );
    } finally {
      if (
        this.active &&
        generation === this.generation &&
        this.snapshot.ownerForm?.id === form.id
      )
        this.update({ ownerPhotoBusy: false }, false);
    }
  }
  reviewOwnerOperation() {
    if (
      !this.ownerAllowed() ||
      !this.snapshot.ownerForm ||
      this.snapshot.ownerPhotoBusy
    )
      return;
    this.stopOwnerPrefill();
    try {
      const state = this.snapshot.state,
        form = this.snapshot.ownerForm,
        intent = ownerIntent(form, state.graph);
      const command = this.makeCommand(
        state.graph,
        intent.type,
        intent.payload,
      );
      const result = previewCommand(state.graph, command, {
        now: new Date(this.clock()).toISOString(),
        availablePhotoIds: this.photos.availableIds(),
      });
      if (!result.ok) {
        this.update({ ownerReview: null, ownerNotice: result.message }, false);
        return;
      }
      if (intent.type === "saveOrderDraft") {
        const rows = intent.payload.lines.map((line) => ({
          quantity: line.quantity,
          unitPrice: state.graph.products
            .flatMap((p) => p.variants)
            .find((v) => v.id === line.variantId)!.price,
        }));
        bagTotals(
          rows,
          intent.payload.discount,
          intent.payload.delivery,
          intent.payload.tax,
        );
      }
      this.update(
        {
          ownerReview: freeze({
            command,
            effect: result.effect,
            formId: form.id,
          }),
          ownerNotice:
            "Review the exact effects. Nothing has been applied yet.",
        },
        false,
      );
    } catch {
      this.update(
        {
          ownerReview: null,
          ownerNotice:
            "Review the required fields, whole quantities, USD amounts and available photo.",
        },
        false,
      );
    }
  }
  confirmOwnerOperation(review: OwnerReview) {
    if (
      !this.ownerAllowed() ||
      this.snapshot.ownerReview !== review ||
      this.snapshot.ownerForm?.id !== review.formId
    )
      return;
    const type = this.snapshot.ownerForm.type;
    const result = this.applyCommerce(review.command);
    if (!result.ok) {
      this.update({ ownerReview: null, ownerNotice: result.message }, false);
      return;
    }
    this.closeOwnerOperation();
    this.update(
      {
        ownerResult: {
          receiptId: result.receipt.id,
          type,
          effect: review.effect,
        },
        ownerNotice:
          "Applied once to this demo. Current records and storefront now reflect the reviewed effect.",
      },
      false,
    );
    this.protectDesignPhotos();
    return result.receipt;
  }
  prepareScenario(preset: ScenarioPreset) {
    if (!this.ownerAllowed() || !ScenarioPresetSchema.safeParse(preset).success)
      return;
    try {
      const state = this.snapshot.state,
        now = new Date(this.clock()).toISOString();
      const generated = generateScenario(state.graph, preset, {
        scenarioId: this.id(),
        now,
        availablePhotoIds: this.photos.availableIds(),
      });
      this.update(
        {
          scenarioReview: freeze({
            ...generated,
            expectedRevision: state.graph.revision,
            sourceScenarioId: state.graph.scenarioId,
            expiresAt: Math.min(
              this.clock() + 120_000,
              Date.parse(state.graph.expiresAt),
            ),
            photoWitness: JSON.stringify(
              [...this.photos.availableIds()].sort(),
            ),
          }),
          ownerNotice: "",
        },
        false,
      );
    } catch {
      this.update(
        {
          scenarioReview: null,
          ownerNotice:
            "This story cannot be rebuilt from the current catalogue. Keep your existing records and review availability.",
        },
        false,
      );
    }
  }
  cancelScenario() {
    this.update({ scenarioReview: null }, false);
  }
  confirmScenario(review: ScenarioReview) {
    if (!this.ownerAllowed() || this.snapshot.scenarioReview !== review) return;
    const state = this.snapshot.state;
    if (
      state.graph.revision !== review.expectedRevision ||
      state.graph.scenarioId !== review.sourceScenarioId ||
      this.clock() >= review.expiresAt ||
      review.photoWitness !==
        JSON.stringify([...this.photos.availableIds()].sort())
    ) {
      this.update(
        {
          scenarioReview: null,
          ownerNotice:
            "The catalogue, availability or records changed. Review this scenario again.",
        },
        false,
      );
      return;
    }
    this.cancelOperation();
    this.photos.cancel();
    this.update({
      state: freeze({
        ...state,
        graph: review.graph,
        ownerPage: 0,
        scenario: review.info,
        dashboard: {
          ...state.dashboard,
          target: null,
          pinned: null,
          source: null,
        },
        shopping: structuredClone(INITIAL_SHOPPING),
        orderDisplays: [],
      }),
      scenarioReview: null,
      ownerForm: null,
      ownerReview: null,
      ownerPhotoBusy: false,
      checkoutReview: null,
      bagOpen: false,
      bagReceiptId: null,
      heroBusy: false,
      preparedLogo: null,
      ownerNotice: review.bagChanged
        ? "Business activity replaced. Bag selections were revalidated against the rebuilt stock/prices."
        : "Business activity replaced. Your catalogue, photos and accepted look are preserved.",
    });
    this.protectDesignPhotos();
  }
  private shoppingAllowed() {
    return (
      this.valid() &&
      this.snapshot.state.stage === "storefront" &&
      this.snapshot.state.hasAcceptedLook &&
      !this.snapshot.state.designEditing
    );
  }
  private makeCommand<T extends CommerceCommand["type"]>(
    graph: CommerceGraph,
    type: T,
    payload: Extract<CommerceCommand, { type: T }>["payload"],
  ): Extract<CommerceCommand, { type: T }> {
    const at = new Date(this.clock()).toISOString();
    return CommandSchema.parse({
      id: this.id(),
      workspaceId: graph.workspaceId,
      scenarioId: graph.scenarioId,
      expectedRevision: graph.revision,
      at,
      expiresAt: new Date(
        Math.min(this.clock() + 120_000, Date.parse(graph.expiresAt)),
      ).toISOString(),
      origin: "guest_action",
      type,
      payload,
    }) as Extract<CommerceCommand, { type: T }>;
  }
  /** One owned command path. No caller can replace the graph or bypass command validation. */
  applyCommerce(command: CommerceCommand) {
    if (
      !this.valid() ||
      !["storefront", "dashboard"].includes(this.snapshot.state.stage) ||
      this.snapshot.state.designEditing
    )
      return {
        ok: false as const,
        message: "Return to your accepted store or owner workspace.",
      };
    if (
      command.type === "placeOrder" &&
      !(
        this.snapshot.state.stage === "dashboard" &&
        this.snapshot.ownerReview?.command === command
      )
    )
      return {
        ok: false as const,
        message: "Review the order before placing it.",
      };
    const result = applyCommand(this.snapshot.state.graph, command, {
      now: new Date(this.clock()).toISOString(),
      availablePhotoIds: this.photos.availableIds(),
    });
    if (result.ok) {
      this.update({
        checkoutReview: null,
        ownerReview: null,
        bagNotice: this.snapshot.state.graph.bag.some(
          (line) =>
            !result.graph.bag.some((next) => next.variantId === line.variantId),
        )
          ? "An unavailable garment was removed from the bag. Review the remaining selections; no substitute was chosen."
          : this.snapshot.bagNotice,
        state: freeze({
          ...this.snapshot.state,
          graph: result.graph,
          ownerPage: 0,
          orderDisplays:
            command.type === "placeOrder" &&
            !this.snapshot.state.orderDisplays.some(
              (item) => item.orderId === command.payload.orderId,
            )
              ? [
                  ...this.snapshot.state.orderDisplays,
                  { orderId: command.payload.orderId, scope: USD_SCOPE },
                ]
              : this.snapshot.state.orderDisplays,
          shopping: {
            ...this.snapshot.state.shopping,
            draftId: result.graph.orderDrafts.some(
              (draft) => draft.id === this.snapshot.state.shopping.draftId,
            )
              ? this.snapshot.state.shopping.draftId
              : null,
          },
        }),
      });
    } else this.update({ bagNotice: result.message }, false);
    return result;
  }
  private shopper(
    stage: "visit" | "engaged" | "bag" | "checkout",
    productId?: string,
  ) {
    if (!this.shoppingAllowed()) return false;
    let graph = this.snapshot.state.graph;
    const shopping = { ...this.snapshot.state.shopping };
    const apply = (command: CommerceCommand) => {
      const result = applyCommand(graph, command, {
        now: new Date(this.clock()).toISOString(),
        availablePhotoIds: this.photos.availableIds(),
      });
      if (!result.ok) {
        this.update({ bagNotice: result.message }, false);
        return false;
      }
      graph = result.graph;
      return true;
    };
    const previous = graph.traffic.find((item) => item.id === shopping.visitId);
    if (
      !previous ||
      this.clock() - Date.parse(shopping.lastActivityAt ?? previous.lastAt) >=
        SHOPPER_INACTIVITY_MS
    ) {
      const visitId = this.id();
      if (
        !apply(
          this.makeCommand(graph, "addTraffic", {
            sessions: [
              {
                id: visitId,
                actor: "shopper",
                origin: "guest_action",
                startedAt: new Date(this.clock()).toISOString(),
                lastAt: new Date(this.clock()).toISOString(),
                productIds: [],
              },
            ],
          }),
        )
      )
        return false;
      shopping.visitId = visitId;
    }
    const visit = graph.traffic.find((item) => item.id === shopping.visitId)!;
    const reached =
      stage === "visit" ||
      (stage === "engaged"
        ? !!visit.engagedAt
        : stage === "bag"
          ? !!visit.bagAt
          : !!visit.checkoutAt);
    // Refresh graph activity at most once per minute; exact inactivity uses the owned lastActivityAt.
    if (
      !reached ||
      (productId && !visit.productIds.includes(productId)) ||
      this.clock() - Date.parse(visit.lastAt) >= 60_000
    ) {
      if (
        !apply(
          this.makeCommand(graph, "touchTraffic", {
            sessionId: visit.id,
            stage,
            ...(productId ? { productId } : {}),
          }),
        )
      )
        return false;
    }
    shopping.lastActivityAt = new Date(this.clock()).toISOString();
    this.state({ graph, shopping });
    return true;
  }
  openBag() {
    if (!this.shoppingAllowed()) return;
    const tracked = this.shopper(
      this.snapshot.state.graph.bag.length ? "bag" : "visit",
    );
    this.update(
      {
        bagOpen: true,
        bagReceiptId: this.snapshot.state.graph.bag.length
          ? null
          : this.snapshot.state.shopping.lastOrderId,
        checkoutReview: null,
        bagNotice: tracked ? "" : this.snapshot.bagNotice,
      },
      false,
    );
  }
  closeBag() {
    this.update({ bagOpen: false, checkoutReview: null }, false);
  }
  editBag() {
    this.update({ checkoutReview: null }, false);
  }
  addToBag(productId: string, variantId: string, quantity: number) {
    if (!this.shoppingAllowed()) return;
    const graph = this.snapshot.state.graph;
    if (
      !graph.products
        .find((item) => item.id === productId)
        ?.variants.some((item) => item.id === variantId)
    )
      return;
    const combined =
      (graph.bag.find((line) => line.variantId === variantId)?.quantity ?? 0) +
      quantity;
    if (!Number.isInteger(quantity) || quantity < 1 || combined > 5) {
      this.update(
        {
          bagOpen: true,
          bagReceiptId: null,
          bagNotice: "Keep each option to five units or fewer.",
        },
        false,
      );
      return;
    }
    if (!this.shopper("bag", productId)) {
      this.update({ bagOpen: true, bagReceiptId: null }, false);
      return;
    }
    const result = this.applyCommerce(
      this.makeCommand(this.snapshot.state.graph, "setBagLine", {
        variantId,
        quantity: combined,
      }),
    );
    if (!result.ok) this.update({ bagOpen: true, bagReceiptId: null }, false);
    if (result.ok)
      this.update(
        {
          bagOpen: true,
          bagReceiptId: null,
          bagNotice:
            "Added to your bag. Stock updates only when you place a demo order.",
        },
        false,
      );
  }
  setBagQuantity(variantId: string, quantity: number) {
    if (
      !this.shoppingAllowed() ||
      !this.snapshot.state.graph.bag.some(
        (line) => line.variantId === variantId,
      )
    )
      return;
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 5) return;
    const result = this.applyCommerce(
      this.makeCommand(this.snapshot.state.graph, "setBagLine", {
        variantId,
        quantity,
      }),
    );
    if (result.ok)
      this.update(
        {
          bagNotice: quantity
            ? "Bag updated. Review current prices before placing your order."
            : "Garment removed from your bag.",
        },
        false,
      );
  }
  reviewBag(discount = 0) {
    if (!this.shoppingAllowed()) return;
    const entries = bagEntries(
      this.snapshot.state.graph,
      this.photos.availableIds(),
    );
    if (!entries.length || entries.some((row) => row.unavailable)) {
      this.update(
        {
          checkoutReview: null,
          bagNotice:
            "Review unavailable garments before ordering. No stock has been deducted.",
        },
        false,
      );
      return;
    }
    let totals;
    try {
      totals = bagTotals(entries, discount);
    } catch {
      this.update(
        {
          checkoutReview: null,
          bagNotice: "This demo discount or amount needs review.",
        },
        false,
      );
      return;
    }
    if (!this.shopper("checkout", entries[0]!.productId ?? undefined)) return;
    let graph = this.snapshot.state.graph;
    const shopping = { ...this.snapshot.state.shopping };
    const apply = (command: CommerceCommand) => {
      const result = applyCommand(graph, command, {
        now: new Date(this.clock()).toISOString(),
        availablePhotoIds: this.photos.availableIds(),
      });
      if (!result.ok) {
        this.update({ checkoutReview: null, bagNotice: result.message }, false);
        return false;
      }
      graph = result.graph;
      return true;
    };
    if (!shopping.buyerId) {
      const buyerId = this.id();
      if (
        !apply(
          this.makeCommand(graph, "addBuyers", {
            buyers: [
              {
                id: buyerId,
                label: "Demo shopper",
                origin: "guest_action",
                fictional: true,
              },
            ],
          }),
        )
      )
        return;
      shopping.buyerId = buyerId;
    }
    const draftId = shopping.draftId ?? this.id();
    if (
      !apply(
        this.makeCommand(graph, "saveOrderDraft", {
          id: draftId,
          actor: "shopper",
          buyerId: shopping.buyerId!,
          trafficId: shopping.visitId!,
          lines: entries.map((row) => ({
            variantId: row.variantId,
            quantity: row.quantity,
          })),
          discount: totals.discount,
          delivery: totals.delivery,
          tax: totals.tax,
        }),
      )
    )
      return;
    shopping.draftId = draftId;
    const review: CheckoutReview = {
      command: this.makeCommand(graph, "placeOrder", {
        draftId,
        orderId: this.id(),
      }),
      scope: selectedScope(this.snapshot.state.currency),
      witness: bagWitness(graph, this.photos.availableIds()),
      discount,
    };
    this.update({
      state: freeze({ ...this.snapshot.state, graph, shopping }),
      checkoutReview: freeze(review),
      bagNotice:
        "Review your exact total and selected options. No stock has been deducted.",
    });
  }
  placeReviewed(review: CheckoutReview) {
    if (!this.shoppingAllowed()) return;
    const state = this.snapshot.state;
    // A previously successful click returns the same local confirmation without replaying any effect.
    const recorded = state.orderDisplays.find(
      (item) => item.orderId === review.command.payload.orderId,
    );
    if (
      recorded &&
      state.graph.receipts.some((item) => item.id === review.command.id) &&
      state.graph.orders.some((item) => item.id === recorded.orderId)
    )
      return recorded.orderId;
    if (
      this.snapshot.checkoutReview !== review ||
      review.command.expectedRevision !== state.graph.revision ||
      review.witness !== bagWitness(state.graph, this.photos.availableIds()) ||
      JSON.stringify(review.scope) !==
        JSON.stringify(selectedScope(state.currency)) ||
      this.clock() >= Date.parse(review.command.expiresAt)
    ) {
      this.update(
        {
          checkoutReview: null,
          bagNotice:
            "Your bag, stock, prices or currency changed. Review the current order again; no purchase was placed.",
        },
        false,
      );
      return;
    }
    const result = applyCommand(state.graph, review.command, {
      now: new Date(this.clock()).toISOString(),
      availablePhotoIds: this.photos.availableIds(),
    });
    if (!result.ok) {
      this.update({ checkoutReview: null, bagNotice: result.message }, false);
      return;
    }
    this.update({
      state: freeze({
        ...state,
        graph: result.graph,
        shopping: {
          ...state.shopping,
          draftId: null,
          lastOrderId: review.command.payload.orderId,
        },
        orderDisplays: [
          ...state.orderDisplays,
          { orderId: review.command.payload.orderId, scope: review.scope },
        ],
      }),
      checkoutReview: null,
      bagReceiptId: review.command.payload.orderId,
      bagNotice:
        "Demo order placed. Your stock and owner figures now reflect this exact order.",
    });
    return review.command.payload.orderId;
  }
  rememberOrderDisplay(orderId: string, scope: CurrencyScope) {
    if (!this.valid()) return;
    const state = this.snapshot.state;
    if (
      !state.graph.orders.some((order) => order.id === orderId) ||
      state.orderDisplays.some((item) => item.orderId === orderId)
    )
      return;
    const parsed = CurrencyScopeSchema.safeParse(scope);
    if (
      !parsed.success ||
      JSON.stringify(parsed.data) !==
        JSON.stringify(selectedScope(state.currency))
    )
      return;
    this.state({
      orderDisplays: [...state.orderDisplays, { orderId, scope: parsed.data }],
    });
  }
  private refreshCurrencyValidity() {
    const state = this.snapshot.state;
    if (this.active && state.currency.acceptedSnapshot) {
      try {
        validateSnapshot(
          state.currency.acceptedSnapshot,
          this.clock(),
          this.options.fixtureAllowed,
        );
      } catch {
        this.cancelCurrencyRequest();
        this.applyCurrency("USD", null);
        this.update(
          {
            currencyNotice:
              state.currency.selected === "EUR"
                ? "Euro pricing is unavailable right now; prices are shown in USD. Price bounds were cleared."
                : "Euro pricing is unavailable right now; prices are shown in USD.",
          },
          false,
        );
      }
    }
  }
  checkExpiry() {
    this.refreshCurrencyValidity();
    if (
      this.active &&
      this.clock() >= Date.parse(this.snapshot.state.graph.expiresAt)
    )
      void this.reset("This temporary demo expired. Start a fresh collection.");
  }
  private valid() {
    this.refreshCurrencyValidity();
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
    this.stopOwnerPrefill();
    this.assistantOperation?.abort();
    this.assistantOperation = undefined;
    this.snapshot = { ...this.snapshot, assistantBusy: false };
    this.cancelCurrencyRequest();
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
      const composed = (this.options.scenarioFactory ?? generateScenario)(
        graph,
        "healthy",
        {
          scenarioId: graph.scenarioId,
          now,
          availablePhotoIds: context.availablePhotoIds,
        },
      );
      graph = composed.graph;
      this.state(
        {
          graph,
          scenario: composed.info,
          dashboard: {
            ...state.dashboard,
            target: null,
            pinned: null,
            source: null,
            page: 0,
          },
          stage: "style",
          orderDisplays: [],
          shopping: structuredClone(INITIAL_SHOPPING),
        },
        "Catalogue accepted. This is your local demo; no website was published externally.",
      );
      this.protectDesignPhotos();
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
    if (
      stage === "storefront" &&
      state.stage === "style" &&
      !state.hasAcceptedLook
    )
      return;
    if (
      (state.stage === "style" || state.designEditing) &&
      this.designDirty()
    ) {
      this.pendingStage = stage;
      this.update({ dialog: "leave-design" }, false);
      return;
    }
    this.cancelOperation();
    this.photos.cancel();
    this.update(
      {
        heroBusy: false,
        preparedLogo: null,
        ownerForm: ["storefront", "dashboard"].includes(stage)
          ? this.snapshot.ownerForm
          : null,
        ownerReview: null,
        ownerPhotoBusy: false,
        scenarioReview: null,
        bagOpen: false,
        bagReceiptId: null,
        checkoutReview: null,
      },
      false,
    );
    this.state({
      stage,
      designEditing: false,
      ...(stage === "style" && ["storefront", "dashboard"].includes(state.stage)
        ? {
            previewDesign: state.acceptedDesign,
            setup: state.hasAcceptedLook
              ? {
                  ...state.setup,
                  step: "summary" as const,
                  expanded: true,
                  template: state.acceptedDesign.template,
                  theme: state.acceptedDesign.theme,
                  typography: state.acceptedDesign.typography,
                  brandConfirmed: true,
                  wordmarkKept: true,
                  brandDraft: brandValues(state.acceptedDesign),
                  brandDirty: { ...CLEAN_BRAND },
                }
              : structuredClone(INITIAL_SETUP),
          }
        : {}),
    });
  }
  private designDirty() {
    const state = this.snapshot.state;
    const accepted = { ...state.acceptedDesign, revision: 0 },
      preview = { ...state.previewDesign, revision: 0 };
    return (
      JSON.stringify(accepted) !== JSON.stringify(preview) ||
      Object.values(state.setup.brandDirty).some(Boolean)
    );
  }
  discardDesignAndLeave() {
    const stage = this.pendingStage;
    this.pendingStage = null;
    this.cancelDesign();
    this.closeDialog();
    if (stage) this.go(stage);
  }
  askReset() {
    this.update({ dialog: "reset" }, false);
  }
  browse(patch: Partial<BrowseState>, expectedCurrency?: CurrencyScope) {
    if (
      !this.valid() ||
      !["style", "storefront", "dashboard"].includes(this.snapshot.state.stage)
    )
      return;
    if (
      patch.filters &&
      expectedCurrency &&
      JSON.stringify(expectedCurrency) !==
        JSON.stringify(selectedScope(this.snapshot.state.currency))
    ) {
      this.update(
        { currencyNotice: "Currency changed. Review your price filters." },
        false,
      );
      return;
    }
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
    if (
      this.shoppingAllowed() &&
      !this.shopper(
        next.page === "product" ? "engaged" : "visit",
        next.page === "product" ? (next.productId ?? undefined) : undefined,
      )
    )
      return;
    this.state({
      browse: next,
      presentationRevision: this.snapshot.state.presentationRevision + 1,
    });
  }
  closeDialog() {
    this.pendingStage = null;
    this.update({ dialog: null }, false);
  }
  design(design: Design) {
    if (
      !this.valid() ||
      !["style", "dashboard"].includes(this.snapshot.state.stage) ||
      (this.snapshot.state.stage === "dashboard" &&
        !this.snapshot.state.designEditing)
    )
      return;
    try {
      const previewDesign = DesignSchema.parse({
        ...design,
        revision: this.snapshot.state.previewDesign.revision + 1,
      });
      if (
        previewDesign.heroPhotoId &&
        !this.photos.availableIds().has(previewDesign.heroPhotoId)
      )
        throw new Error("Unavailable hero image");
      this.state({
        previewDesign,
        setup: reconcileSetup(this.snapshot.state.setup, previewDesign),
        presentationRevision: this.snapshot.state.presentationRevision + 1,
      });
      this.protectDesignPhotos();
      this.update({ preparedLogo: null }, false);
    } catch {
      this.update({ notice: "Choose one of the accepted design presets." });
    }
  }
  acceptDesign() {
    if (
      !this.valid() ||
      this.snapshot.state.stage !== "style" ||
      !designConfirmed(
        this.snapshot.state.setup,
        this.snapshot.state.previewDesign,
      ) ||
      !this.snapshot.state.setup.brandConfirmed ||
      !this.snapshot.state.setup.wordmarkKept
    )
      return;
    this.cancelOperation();
    this.photos.cancel();
    this.state({
      acceptedDesign: this.snapshot.state.previewDesign,
      presentationRevision: this.snapshot.state.presentationRevision + 1,
      stage: "storefront",
      hasAcceptedLook: true,
      setup: { ...this.snapshot.state.setup, expanded: false },
      designEditing: false,
    });
    this.protectDesignPhotos();
    this.update({ preparedLogo: null, heroBusy: false }, false);
  }
  cancelDesign() {
    if (this.valid()) {
      const state = this.snapshot.state;
      this.cancelOperation();
      this.photos.cancel();
      this.state({
        previewDesign: state.acceptedDesign,
        designEditing: false,
        setup: state.hasAcceptedLook
          ? {
              ...state.setup,
              template: state.acceptedDesign.template,
              theme: state.acceptedDesign.theme,
              typography: state.acceptedDesign.typography,
              brandConfirmed: true,
              wordmarkKept: true,
              brandDraft: brandValues(state.acceptedDesign),
              brandDirty: { ...CLEAN_BRAND },
              step: "summary",
            }
          : structuredClone(INITIAL_SETUP),
        presentationRevision: this.snapshot.state.presentationRevision + 1,
      });
      this.protectDesignPhotos();
      this.update(
        {
          heroBusy: false,
          preparedLogo: null,
          bagOpen: false,
          bagReceiptId: null,
          checkoutReview: null,
        },
        false,
      );
    }
  }
  private protectDesignPhotos() {
    const state = this.snapshot.state;
    this.photos.protect([
      ...new Set([
        ...state.graph.products.flatMap((item) => item.imageIds),
        ...state.graph.orders.flatMap((order) =>
          order.lines.map((line) => line.photoId),
        ),
        ...(this.snapshot.ownerForm?.photoIds ?? []),
        ...[
          state.acceptedDesign.heroPhotoId,
          state.previewDesign.heroPhotoId,
        ].filter((id): id is string => id !== null),
      ]),
    ]);
  }
  toggleTailor(expanded: boolean) {
    if (!expanded) this.stopOwnerPrefill();
    if (this.valid())
      this.state({ setup: { ...this.snapshot.state.setup, expanded } });
  }
  assistantContext() {
    return currentAssistantContext(
      this.snapshot.state,
      this.photos.availableIds(),
    );
  }
  assistantInput(value: string) {
    if (this.valid() && value.length <= ASSISTANT_LIMITS.promptChars)
      this.update({ assistantDraft: value }, false);
  }
  private saveAssistant(result: AssistantResult) {
    const message: ChatMessage = {
      id: this.id(),
      role: result.role,
      author: "assistant",
      text: result.reply.text,
      at: new Date(this.clock()).toISOString(),
      scenarioId: result.fence.scenarioId,
      result,
      restored: false,
    };
    this.state({
      conversation: appendMessage(this.snapshot.state.conversation, message),
    });
  }
  private assistantNavigation(navigation: AssistantNavigation | null) {
    if (!navigation) return;
    const state = this.snapshot.state;
    if (navigation.kind === "filter" && roleOf(state) === "shopper")
      this.browse(
        {
          page: "collection",
          filters: {
            search: navigation.query,
            category: navigation.category,
            minPrice: navigation.minimum,
            maxPrice: navigation.maximum,
            colour: null,
            size: null,
            available: true,
          },
        },
        selectedScope(state.currency),
      );
    else if (navigation.kind === "open-product")
      this.browse({
        page: "product",
        productId: navigation.productId,
        variantId: null,
      });
    else if (navigation.kind === "owner-view" && roleOf(state) === "owner")
      this.ownerNavigate(navigation.view);
    else if (navigation.kind === "tour" && roleOf(state) === navigation.role)
      this.startTour();
  }
  tailorShortcut(shortcut: LocalShortcut) {
    if (
      !this.valid() ||
      !["style", "storefront", "dashboard"].includes(this.snapshot.state.stage)
    )
      return;
    const context = this.assistantContext(),
      reply = localReply(context, shortcut);
    this.assistantNavigation(reply.navigation);
    this.saveAssistant(
      AssistantResultSchema.parse({
        schemaVersion: 1,
        mode: this.options.fixtureAllowed ? "fake" : "live",
        operationId: this.id(),
        role: context.role,
        fence: assistantFence(this.assistantContext()),
        reply,
        sensitivity: {
          currency: context.role === "shopper",
          scope: reply.references.some((r) => r.kind === "fact"),
          design: context.role === "creator",
          filters: false,
        },
      }),
    );
  }
  async sendAssistant() {
    if (
      !this.valid() ||
      this.snapshot.assistantBusy ||
      !["style", "storefront", "dashboard"].includes(this.snapshot.state.stage)
    )
      return;
    const prompt = this.snapshot.assistantDraft.trim();
    if (!prompt || prompt.length > ASSISTANT_LIMITS.promptChars) return;
    const context = this.assistantContext(),
      role = context.role,
      operationId = this.id(),
      owner = new AbortController();
    const history = this.snapshot.state.conversation
      .filter(
        (m) =>
          m.role === role &&
          m.scenarioId === context.graph.scenarioId &&
          !m.restored,
      )
      .slice(-ASSISTANT_LIMITS.recentMessages)
      .map((m) => ({ role: m.author, text: m.text }));
    const payload = AssistantPayloadSchema.parse({
      schemaVersion: 1,
      mode: this.options.fixtureAllowed ? "fake" : "live",
      operationId,
      context,
      prompt,
      history,
    });
    this.assistantOperation = owner;
    this.update({
      assistantBusy: true,
      assistantDraft: "",
      assistantNotice: "",
      state: freeze({
        ...this.snapshot.state,
        conversation: appendMessage(this.snapshot.state.conversation, {
          id: this.id(),
          role,
          author: "user",
          text: prompt,
          at: new Date(this.clock()).toISOString(),
          scenarioId: context.graph.scenarioId,
          result: null,
          restored: false,
        }),
      }),
    });
    try {
      const result = AssistantResultSchema.parse(
        await (this.options.assistantRequest ?? assistantRequester())(
          payload,
          owner.signal,
        ),
      );
      if (
        owner.signal.aborted ||
        this.assistantOperation !== owner ||
        !this.valid()
      )
        return;
      if (
        result.operationId !== operationId ||
        result.mode !== payload.mode ||
        !replyCurrent(result, this.assistantContext())
      ) {
        this.update(
          {
            assistantNotice:
              "That answer belongs to an earlier view. Send again with your current choices.",
          },
          false,
        );
        return;
      }
      this.assistantOperation = undefined;
      this.assistantNavigation(result.reply.navigation);
      this.saveAssistant({
        ...result,
        fence: assistantFence(this.assistantContext()),
      });
    } catch (error) {
      if (!owner.signal.aborted && this.assistantOperation === owner)
        this.update(
          {
            assistantNotice:
              error instanceof CatalogueRequestError
                ? error.message
                : "Tailor couldn’t complete that answer. Your messages and local controls are still here.",
          },
          false,
        );
    } finally {
      if (this.assistantOperation === owner) {
        this.assistantOperation = undefined;
        this.update({ assistantBusy: false }, false);
      } else if (!owner.signal.aborted)
        this.update({ assistantBusy: false }, false);
      owner.abort();
    }
  }
  cancelAssistant() {
    this.assistantOperation?.abort();
    this.assistantOperation = undefined;
    this.update(
      {
        assistantBusy: false,
        assistantNotice: "Request cancelled. Your local controls are ready.",
      },
      false,
    );
  }
  currentAssistantMessage(id: string) {
    const m = this.snapshot.state.conversation.find((m) => m.id === id);
    return m?.result &&
      !m.restored &&
      replyCurrent(m.result, this.assistantContext())
      ? m
      : null;
  }
  openAssistantReference(id: string, index: number) {
    if (!this.valid()) return;
    const ref =
      this.currentAssistantMessage(id)?.result?.reply.references[index];
    if (!ref) return;
    if (ref.kind === "product") {
      if (roleOf(this.snapshot.state) === "owner") {
        this.ownerNavigate("products");
        this.ownerSearch(
          this.snapshot.state.graph.products.find((p) => p.id === ref.productId)
            ?.title ?? "",
        );
      } else
        this.browse({
          page: "product",
          productId: ref.productId,
          variantId: null,
        });
    } else if (ref.kind === "variant") {
      const p = this.snapshot.state.graph.products.find((p) =>
        p.variants.some((v) => v.id === ref.variantId),
      );
      if (!p) return;
      if (roleOf(this.snapshot.state) === "owner") {
        this.openDashboardEvidence({
          kind: "inventory",
          variantId: ref.variantId,
        });
      } else
        this.browse({
          page: "product",
          productId: p.id,
          variantId: ref.variantId,
        });
    } else if (ref.kind === "fact")
      this.openDashboardEvidence(
        ref.day
          ? { kind: "day", day: ref.day, factId: ref.factId }
          : ref.productId &&
              (ref.factId === "product_net_contribution" ||
                ref.factId === "net_units")
            ? { kind: "product", productId: ref.productId, factId: ref.factId }
            : { kind: "metric", factId: ref.factId },
      );
    else {
      this.openDashboardEvidence({
        kind: "metric",
        factId: "operating_result",
      });
      this.openDashboardSource(`${ref.recordKind}:${ref.recordId}`);
    }
  }
  prepareAssistantProposal(id: string, targetId?: string) {
    if (!this.valid()) return;
    const message = this.currentAssistantMessage(id);
    const proposal = message?.result?.reply.proposal;
    if (!proposal) return;
    if (
      proposal.kind === "operation" ||
      proposal.kind === "operation-choices"
    ) {
      if (!message || this.clock() - Date.parse(message.at) >= 120_000) {
        this.update(
          { assistantNotice: "This proposal expired. Ask for a fresh draft." },
          false,
        );
        return;
      }
      if (
        proposal.kind === "operation-choices" &&
        (!targetId || !proposal.targetIds.includes(targetId))
      )
        return;
      if (this.snapshot.ownerForm?.dirty.length) {
        this.update(
          {
            assistantNotice:
              "Your current draft has edits. Finish or close it before opening this proposal.",
          },
          false,
        );
        return;
      }
      this.openOwnerOperation(
        proposal.operation,
        proposal.kind === "operation"
          ? (proposal.targetId ?? undefined)
          : targetId,
      );
      const form = this.snapshot.ownerForm;
      if (form) {
        const fields = prefillFields(form, proposal.prefill);
        this.update({ ownerSurface: "tailor", assistantNotice: "" }, false);
        this.toggleTailor(true);
        const graph = this.snapshot.state.graph;
        this.cancelPrefill = animatePrefill(
          fields,
          (field, value) => {
            if (
              !this.ownerAllowed() ||
              this.snapshot.ownerForm?.id !== form.id ||
              this.snapshot.state.graph !== graph
            )
              return false;
            this.editOwnerField(field, value, "suggestion", form.id);
            return true;
          },
          (field) => this.update({ ownerFilling: field }, false),
        );
      }
    } else if (proposal.kind === "bag") {
      const p = this.snapshot.state.graph.products.find((p) =>
        p.variants.some((v) => v.id === proposal.variantId),
      );
      if (p)
        this.browse({
          page: "product",
          productId: p.id,
          variantId: proposal.variantId,
        });
      this.update(
        {
          assistantNotice:
            "Review this exact option, price and quantity on the product page before adding it to your bag.",
        },
        false,
      );
    } else if (proposal.kind === "design") {
      if (roleOf(this.snapshot.state) === "owner") this.beginOwnerDesign();
      const design = this.snapshot.state.previewDesign;
      this.design({
        ...design,
        template: proposal.template ?? design.template,
        theme: proposal.theme ?? design.theme,
        typography: proposal.typography ?? design.typography,
      });
    } else if (proposal.kind === "logo-offer") {
      if (roleOf(this.snapshot.state) === "owner") this.beginOwnerDesign();
      this.prepareLogo();
    } else this.prepareScenario(proposal.preset);
  }
  startTour() {
    if (this.valid())
      this.update(
        { tour: { role: roleOf(this.snapshot.state), index: 0 } },
        false,
      );
  }
  tourStep(index: number) {
    if (
      this.snapshot.tour &&
      Number.isInteger(index) &&
      index >= 0 &&
      index < 9
    )
      this.update({ tour: { ...this.snapshot.tour, index } }, false);
  }
  finishTour() {
    this.update({ tour: null }, false);
  }
  stylingStep(step: SetupStep) {
    const state = this.snapshot.state;
    if (
      !this.valid() ||
      state.stage !== "style" ||
      !SetupStepSchema.safeParse(step).success ||
      (step === "logo" && !logoEligible(state.setup, state.previewDesign))
    )
      return;
    this.state({ setup: { ...state.setup, step, expanded: true } });
  }
  confirmStyle(step: "template" | "theme" | "typography" | "brand") {
    const state = this.snapshot.state;
    if (!this.valid() || state.stage !== "style" || state.setup.step !== step)
      return;
    if (step === "brand" && state.setup.brandDraft?.name.trim() === "") {
      this.update({
        notice: "Choose a store name, or keep the suggested details.",
      });
      return;
    }
    this.state({ setup: confirmSetup(state.setup, state.previewDesign, step) });
  }
  brandInput(
    patch: Partial<BrandDraft>,
    origin: "human" | "suggestion" = "human",
  ) {
    const state = this.snapshot.state;
    if (
      !this.valid() ||
      !["style", "dashboard"].includes(state.stage) ||
      (state.stage === "dashboard" && !state.designEditing)
    )
      return;
    try {
      const setup = updateBrand(
          state.setup,
          state.previewDesign,
          patch,
          origin,
        ),
        draft = setup.brandDraft ?? brandValues(state.previewDesign);
      if (setup === state.setup) return;
      if (
        draft.heroPhotoId &&
        !this.photos.availableIds().has(draft.heroPhotoId)
      )
        return;
      this.state({ setup: reconcileSetup(setup, state.previewDesign) });
      const preview = {
        ...state.previewDesign,
        name: draft.name.trim() || state.previewDesign.name,
        headline: draft.headline,
        heroPhotoId: draft.heroPhotoId,
      };
      if (
        JSON.stringify(brandValues(preview)) !==
        JSON.stringify(brandValues(state.previewDesign))
      )
        this.design(preview);
      else this.update({ preparedLogo: null }, false);
    } catch {
      this.update({
        notice:
          "Use a short store name and headline from the available brand fields.",
      });
    }
  }
  keepBrandDetails() {
    const state = this.snapshot.state;
    if (
      !this.valid() ||
      state.stage !== "style" ||
      state.setup.step !== "brand"
    )
      return;
    this.state({
      setup: {
        ...state.setup,
        brandDraft: brandValues(state.previewDesign),
        brandDirty: { ...CLEAN_BRAND },
      },
    });
    this.confirmStyle("brand");
  }
  useCurrentLook() {
    const state = this.snapshot.state;
    if (!this.valid() || state.stage !== "style") return;
    this.state({
      setup: {
        ...state.setup,
        template: state.previewDesign.template,
        theme: state.previewDesign.theme,
        typography: state.previewDesign.typography,
        brandConfirmed: true,
        brandDraft: brandValues(state.previewDesign),
        brandDirty: { ...CLEAN_BRAND },
        wordmarkKept: false,
        step: "logo",
        expanded: true,
      },
    });
  }
  keepWordmark() {
    const state = this.snapshot.state;
    if (
      !this.valid() ||
      state.stage !== "style" ||
      !designConfirmed(state.setup, state.previewDesign) ||
      !state.setup.brandConfirmed
    )
      return;
    this.state({
      setup: { ...state.setup, wordmarkKept: true, step: "summary" },
    });
    this.update({ preparedLogo: null }, false);
  }
  prepareLogo() {
    const state = this.snapshot.state;
    if (
      !this.valid() ||
      !["style", "dashboard"].includes(state.stage) ||
      !logoEligible(state.setup, state.previewDesign)
    )
      return;
    const design = state.previewDesign;
    this.update(
      {
        preparedLogo: {
          designRevision: design.revision,
          name: design.name,
          theme: design.theme,
          typography: design.typography,
          candidates: 3,
        },
      },
      false,
    );
  }
  beginOwnerDesign() {
    if (
      !this.valid() ||
      this.snapshot.state.stage !== "dashboard" ||
      this.snapshot.state.designEditing
    )
      return;
    this.cancelDesign();
    this.state({ designEditing: true });
  }
  applyOwnerDesign() {
    const state = this.snapshot.state;
    if (!this.valid() || state.stage !== "dashboard" || !state.designEditing)
      return;
    if (state.setup.brandDraft?.name.trim() === "") {
      this.update({ notice: "Choose a store name before applying this look." });
      return;
    }
    this.cancelOperation();
    this.photos.cancel();
    this.state({
      acceptedDesign: state.previewDesign,
      hasAcceptedLook: true,
      designEditing: false,
      setup: {
        ...state.setup,
        template: state.previewDesign.template,
        theme: state.previewDesign.theme,
        typography: state.previewDesign.typography,
        brandConfirmed: true,
        wordmarkKept: true,
        brandDraft: brandValues(state.previewDesign),
        brandDirty: { ...CLEAN_BRAND },
        step: "summary",
      },
      presentationRevision: state.presentationRevision + 1,
    });
    this.protectDesignPhotos();
    this.update({ preparedLogo: null, heroBusy: false }, false);
  }
  async uploadHero(file: NamedPhoto) {
    const state = this.snapshot.state;
    if (
      !this.valid() ||
      !["style", "dashboard"].includes(state.stage) ||
      this.snapshot.heroBusy ||
      (state.stage === "dashboard" && !state.designEditing)
    )
      return;
    const generation = this.generation,
      photos = this.photos,
      stage = state.stage,
      designRevision = state.previewDesign.revision;
    this.update({ heroBusy: true }, false);
    try {
      const ids = await photos.add([file], undefined, false);
      if (
        !this.active ||
        generation !== this.generation ||
        photos !== this.photos ||
        this.snapshot.state.stage !== stage ||
        this.snapshot.state.previewDesign.revision !== designRevision
      )
        return;
      const id = ids[0];
      if (!id) {
        this.update({
          notice:
            photos.getSnapshot().notice ||
            "That hero photo could not be added. Your current look is preserved.",
        });
        return;
      }
      const retained = new Map(
        this.snapshot.state.photos.map((photo) => [photo.id, photo]),
      );
      for (const photo of photos.descriptors()) retained.set(photo.id, photo);
      this.state({ photos: [...retained.values()] });
      this.brandInput({ heroPhotoId: id });
    } catch {
      if (this.active && generation === this.generation)
        this.update({
          notice:
            "That hero photo could not be added. Your current look is preserved.",
        });
    } finally {
      if (
        this.active &&
        generation === this.generation &&
        photos === this.photos
      )
        this.update({ heroBusy: false }, false);
    }
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
    this.update({
      assistantDraft: "",
      assistantBusy: false,
      assistantNotice: "",
      tour: null,
      ready: false,
      sampleBusy: false,
      dialog: null,
      heroBusy: false,
      currencyBusy: false,
      currencyNotice: "",
      ownerForm: null,
      ownerSurface: "dashboard",
      ownerFilling: null,
      ownerResult: null,
      ownerReview: null,
      ownerNotice: "",
      ownerPhotoBusy: false,
      scenarioReview: null,
      bagOpen: false,
      bagReceiptId: null,
      bagNotice: "",
      checkoutReview: null,
      preparedLogo: null,
    });
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
