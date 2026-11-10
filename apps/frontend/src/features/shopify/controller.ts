import { z } from "zod";
import {
  ShopifyProofSchema,
  ShopifyStatusSchema,
} from "@retailor/contracts/shopify";
import type {
  ShopifyStatus,
  ShopifyProductSummary,
  ShopifyExportInput,
  ShopifyExportSummary,
} from "@retailor/contracts/shopify";
import type { Product } from "@retailor/contracts/product";
import type { ShopifyRequester } from "./request";
import { ApiRequestError } from "../../http/api-error";

export const SHOPIFY_TAB_KEY = "retailor.shopify.tab.v1";
const ProofSchema = z.strictObject({
  workspaceId: z.string().max(100),
  proof: ShopifyProofSchema,
  expiresAt: z.number().int().positive(),
});
type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export interface ShopifyReview {
  products: Product[];
  revision: number;
  update: boolean;
}
export interface ShopifyView {
  available: boolean | null;
  verified: boolean;
  status: ShopifyStatus | null;
  busy: string | null;
  notice: string;
  reference: string;
  consent: boolean;
  catalogue: {
    products: ShopifyProductSummary[];
    nextCursor: string | null;
    page: number;
    limited: boolean;
    currency: string;
  } | null;
  review: ShopifyReview | null;
}
export const emptyShopifyView = (): ShopifyView => ({
  available: null,
  verified: false,
  status: null,
  busy: null,
  notice: "",
  reference: "",
  consent: false,
  catalogue: null,
  review: null,
});
export interface ShopifyContext {
  workspaceId: string;
  createdAt: number;
  expiresAt: number;
  revision(): number;
}

/** Bounded request child owned by SessionController; no graph, report or token store. */
export class ShopifyController {
  private view = emptyShopifyView();
  private proof: string | undefined;
  private operation: AbortController | undefined;
  private generation = 0;
  private navigationGeneration = 0;
  private bootstrapping = false;
  private active = true;
  private shown = false;
  private polls = 0;
  private poll: ReturnType<typeof setTimeout> | undefined;
  private blockedUntil = 0;
  private initialized: Promise<void> | undefined;
  constructor(
    readonly context: ShopifyContext,
    private readonly port: ShopifyRequester,
    private readonly changed: (view: ShopifyView) => void,
    private readonly storage?: StoragePort,
    private readonly navigate: (url: string) => void = (url) =>
      window.location.assign(url),
    private readonly clock: () => number = Date.now,
  ) {}
  getSnapshot() {
    return this.view;
  }
  private update(patch: Partial<ShopifyView>) {
    if (!this.active) return;
    this.view = { ...this.view, ...patch };
    this.changed(this.view);
  }
  initialize() {
    return (this.initialized ??= this.bootstrap());
  }
  private async bootstrap() {
    this.bootstrapping = true;
    const owner = new AbortController(),
      generation = this.generation;
    this.operation = owner;
    this.update({ busy: "Checking Shopify availability…" });
    try {
      const saved = (() => {
        const raw = this.storage?.getItem(SHOPIFY_TAB_KEY);
        if (!raw || raw.length > 2048) return null;
        try {
          const parsed = ProofSchema.safeParse(JSON.parse(raw));
          return parsed.success ? parsed.data : null;
        } catch {
          return null;
        }
      })();
      if (
        saved &&
        saved.workspaceId === this.context.workspaceId &&
        saved.expiresAt === this.context.expiresAt &&
        saved.expiresAt > this.clock()
      )
        this.proof = saved.proof;
      if (!(await this.port.available(owner.signal))) {
        this.update({
          available: false,
          notice:
            "Shopify connection is unavailable on this demo. You can continue without it.",
        });
        return;
      }
      if (!this.current(owner, generation)) return;
      this.update({ available: true });
      if (!this.proof) {
        if (this.clock() - this.context.createdAt > 30000) {
          this.update({
            notice:
              "This saved demo has no recoverable Shopify connection. Start a fresh demo to connect, or continue without Shopify.",
          });
          return;
        }
        if (!this.storage) throw new ApiRequestError("UNAVAILABLE");
        const session = await this.port.session(
          {
            schemaVersion: 1,
            workspaceId: this.context.workspaceId,
            createdAt: this.context.createdAt,
          },
          owner.signal,
        );
        if (
          !this.current(owner, generation) ||
          session.expiresAt !== this.context.expiresAt
        )
          return;
        this.storage.setItem(
          SHOPIFY_TAB_KEY,
          JSON.stringify({
            workspaceId: this.context.workspaceId,
            proof: session.tabProof,
            expiresAt: session.expiresAt,
          }),
        );
        this.proof = session.tabProof;
      }
      const status = await this.port.status(
        this.context.workspaceId,
        this.proof,
        owner.signal,
      );
      if (this.current(owner, generation))
        this.update({ status, verified: true });
    } catch (error) {
      if (this.current(owner, generation))
        this.failure(
          error,
          "Connection could not be verified. Your collection is safe; continue without Shopify or try again.",
        );
    } finally {
      this.bootstrapping = false;
      if (this.current(owner, generation)) {
        this.operation = undefined;
        this.update({ busy: null });
        this.schedule();
      }
    }
  }
  private current(owner: AbortController, generation: number) {
    return (
      this.active &&
      this.operation === owner &&
      generation === this.generation &&
      !owner.signal.aborted &&
      this.context.expiresAt > this.clock()
    );
  }
  private failure(error: unknown, message: string) {
    const known = error instanceof ApiRequestError;
    if (known) this.blockedUntil = this.clock() + error.retryAfterMs;
    this.update({
      notice: message,
      reference: known ? (error.requestId ?? "") : "",
    });
  }
  private async run(
    label: string,
    action: (signal: AbortSignal, proof: string) => Promise<void>,
    failure = "This action could not be confirmed. Refresh the connection before trying again.",
    verifyAfterFailure = false,
  ) {
    const requestedGeneration = this.generation;
    const requestedNavigation = this.navigationGeneration;
    await this.initialize();
    if (
      !this.active ||
      requestedGeneration !== this.generation ||
      requestedNavigation !== this.navigationGeneration ||
      this.operation ||
      !this.proof ||
      this.context.expiresAt <= this.clock()
    )
      return;
    if (this.blockedUntil > this.clock()) {
      this.update({
        notice: "Please wait before trying again. Your collection is safe.",
      });
      return;
    }
    const owner = new AbortController(),
      generation = this.generation;
    this.operation = owner;
    this.update({ busy: label, notice: "", reference: "" });
    try {
      await action(owner.signal, this.proof);
    } catch (error) {
      if (this.current(owner, generation)) {
        if (this.view.consent) this.update({ consent: false });
        if (
          verifyAfterFailure ||
          (error instanceof ApiRequestError &&
            (error.code === "FORBIDDEN" || error.code === "STALE"))
        )
          this.update({ verified: false });
        this.failure(error, failure);
      }
    } finally {
      if (this.current(owner, generation)) {
        this.operation = undefined;
        this.update({ busy: null });
        this.schedule();
      }
    }
  }
  private setStatus(status: ShopifyStatus, signal: AbortSignal) {
    if (!signal.aborted && this.active)
      this.update({
        status: ShopifyStatusSchema.parse(status),
        verified: true,
      });
  }
  refresh() {
    return this.run("Checking connection…", async (signal, proof) =>
      this.setStatus(
        await this.port.status(this.context.workspaceId, proof, signal),
        signal,
      ),
    );
  }
  connect(
    shop: string,
    returnTo: "onboarding" | "connections",
    beforeLeave: (signal: AbortSignal) => Promise<boolean>,
  ) {
    return this.run(
      "Opening connection…",
      async (signal, proof) => {
        const simulated = this.view.status?.simulated;
        if (!this.view.verified || !this.view.available)
          throw new ApiRequestError("STALE");
        if (!simulated && !(await beforeLeave(signal))) {
          this.update({
            notice:
              "Your collection cannot safely resume after leaving this page. Continue without Shopify; your current work is kept.",
          });
          return;
        }
        const result = await this.port.connect(
          {
            schemaVersion: 1,
            workspaceId: this.context.workspaceId,
            shop: shop.trim().toLowerCase(),
            returnTo,
          },
          proof,
          signal,
        );
        if (signal.aborted || !this.active) return;
        this.update({
          consent: !!simulated,
          status: this.view.status
            ? { ...this.view.status, state: "authorizing" }
            : null,
          notice: simulated
            ? "This consent screen is a local simulation. No Shopify account is contacted."
            : "Opening Shopify’s consent screen…",
        });
        if (!simulated) this.navigate(result.authorizationUrl);
      },
      "Shopify could not be opened. Check the test-store address, or continue without connecting.",
    );
  }
  consent(approved: boolean) {
    return this.run(
      approved ? "Connecting simulation…" : "Cancelling connection…",
      async (signal, proof) => {
        if (!this.view.status?.simulated || !this.view.consent)
          throw new ApiRequestError("STALE");
        await this.port.simulate(
          this.context.workspaceId,
          approved,
          proof,
          signal,
        );
        this.setStatus(
          await this.port.status(this.context.workspaceId, proof, signal),
          signal,
        );
        if (!signal.aborted)
          this.update({
            consent: false,
            notice: approved
              ? "Connected to the simulated store. Connecting created no products."
              : "Connection cancelled. Your storefront is ready without Shopify.",
          });
      },
    );
  }
  async resume(outcome: "connected" | "cancelled" | "needs_attention") {
    await this.refresh();
    this.update({
      consent: false,
      notice:
        this.view.verified && this.view.status?.state === "connected"
          ? "Shopify connection verified. No products were created by connecting."
          : outcome === "cancelled"
            ? "Shopify connection was cancelled. Continue without it."
            : "The Shopify connection could not be verified. Continue without it, or check Connections.",
    });
  }
  browse(next = false) {
    return this.run(
      "Reading Shopify products…",
      async (signal, proof) => {
        const cursor = next ? this.view.catalogue?.nextCursor : null;
        if (next && !cursor) return;
        const catalogue = await this.port.products(
          this.context.workspaceId,
          cursor ?? null,
          proof,
          signal,
        );
        if (!signal.aborted)
          this.update({
            catalogue,
            status: this.view.status
              ? { ...this.view.status, currency: catalogue.currency }
              : null,
          });
      },
      "Shopify products could not be read. Your local collection is unchanged.",
    );
  }
  prepare(products: Product[], update: boolean) {
    if (
      this.operation ||
      !this.view.verified ||
      this.view.status?.state !== "connected" ||
      this.view.status.currency !== "USD" ||
      !products.length ||
      products.length > 10
    )
      return;
    if (this.poll) clearTimeout(this.poll);
    this.poll = undefined;
    this.update({
      review: {
        products: structuredClone(products),
        revision: this.context.revision(),
        update,
      },
      notice: "",
    });
  }
  cancelReview() {
    const interrupted = !!this.operation;
    this.view = { ...this.view, review: null };
    if (interrupted) this.cancel();
    this.update({
      review: null,
      ...(interrupted
        ? {
            verified: false,
            notice:
              "The request was interrupted. Its outcome may be unknown; refresh and check before another write.",
          }
        : {}),
    });
    this.schedule();
  }
  missingPhotos() {
    this.update({
      notice:
        "Every selected garment needs its available photos before export.",
    });
  }
  private merge(result: ShopifyExportSummary, signal: AbortSignal) {
    const status = this.view.status;
    if (!status || signal.aborted) return;
    const exports = [
      ...status.exports.filter((item) => item.id !== result.id),
      result,
    ].slice(-10);
    this.setStatus(
      {
        ...status,
        exports,
        createIntents: Math.max(status.createIntents, exports.length),
        productCount: exports.filter(
          (item) => item.remoteId && item.state !== "removed",
        ).length,
      },
      signal,
    );
  }
  confirm(
    input: (
      product: Product,
      revision: number,
      signal: AbortSignal,
    ) => Promise<ShopifyExportInput>,
  ) {
    const review = this.view.review;
    if (!review || review.revision !== this.context.revision())
      return Promise.resolve();
    return this.run(
      review.update ? "Updating reviewed draft…" : "Exporting reviewed drafts…",
      async (signal, proof) => {
        if (
          review !== this.view.review ||
          review.revision !== this.context.revision()
        )
          throw new ApiRequestError("STALE");
        for (const product of review.products) {
          const prepared = await input(product, review.revision, signal);
          signal.throwIfAborted();
          if (this.context.revision() !== review.revision)
            throw new ApiRequestError("STALE");
          const result = await this.port.write(
            prepared,
            review.update,
            proof,
            signal,
          );
          this.merge(result.export, signal);
        }
        if (!signal.aborted)
          this.update({
            review: null,
            notice:
              "Reviewed products were submitted. Check each result below; only Ready confirms fields and images.",
          });
      },
      "A write outcome may be unknown. Refresh and check its result before another Export or Update; completed items remain tracked for cleanup.",
      true,
    );
  }
  check(exportId: string) {
    return this.run("Checking draft result…", async (signal, proof) =>
      this.merge(
        (
          await this.port.check(
            this.context.workspaceId,
            exportId,
            proof,
            signal,
          )
        ).export,
        signal,
      ),
    );
  }
  remove(exportId: string) {
    return this.run("Requesting draft removal…", async (signal, proof) => {
      this.setStatus(
        await this.port.remove(
          this.context.workspaceId,
          exportId,
          proof,
          signal,
        ),
        signal,
      );
      if (!signal.aborted)
        this.update({
          notice:
            "Removal requested. The cleanup worker will verify it; refresh to check.",
        });
    });
  }
  disconnect() {
    return this.run(
      "Requesting cleanup and disconnect…",
      async (signal, proof) => {
        if (this.view.status)
          this.update({
            status: { ...this.view.status, state: "cleanup_pending" },
            verified: false,
          });
        this.setStatus(
          await this.port.end(this.context.workspaceId, true, proof, signal),
          signal,
        );
        if (!signal.aborted)
          this.update({
            notice:
              "Cleanup requested. Owned products are removed before the app is uninstalled. Your local storefront is kept.",
          });
      },
      "Disconnect is not confirmed. Check status or retry Disconnect. Original session expiry remains the cleanup backstop.",
    );
  }
  invalidate() {
    if (
      this.view.review &&
      this.view.review.revision !== this.context.revision()
    ) {
      this.view = { ...this.view, review: null };
      this.cancel();
      this.update({
        review: null,
        notice:
          "Your local collection changed. Review it again before writing to Shopify.",
      });
    }
  }
  visible(value: boolean) {
    if (this.shown === value) return;
    this.shown = value;
    this.navigationGeneration++;
    if (!value) {
      if (!this.bootstrapping) this.cancel();
      this.update({ review: null, consent: false, catalogue: null });
    } else {
      this.polls = 0;
      if (!this.bootstrapping && this.proof && !this.view.verified)
        void this.refresh();
      else this.schedule();
    }
  }
  private schedule() {
    if (this.poll) clearTimeout(this.poll);
    if (
      !this.active ||
      !this.shown ||
      !this.proof ||
      this.operation ||
      this.view.review ||
      this.view.consent ||
      this.polls >= 12
    )
      return;
    this.poll = setTimeout(
      () => {
        this.poll = undefined;
        if (!this.shown || !this.active) return;
        this.polls++;
        void this.refresh();
      },
      Math.max(90000, this.blockedUntil - this.clock()),
    );
  }
  private cancel() {
    const interrupted = !!this.operation;
    this.generation++;
    this.operation?.abort();
    this.operation = undefined;
    if (this.poll) clearTimeout(this.poll);
    this.poll = undefined;
    this.update({ busy: null, ...(interrupted ? { verified: false } : {}) });
  }
  async endAndDetach() {
    const proof = this.proof;
    this.cancel();
    let acknowledged = !proof;
    if (proof) {
      const owner = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        acknowledged = await Promise.race([
          this.port
            .end(this.context.workspaceId, false, proof, owner.signal)
            .then(
              () => true,
              () => false,
            ),
          new Promise<boolean>((resolve) => {
            timer = setTimeout(() => {
              owner.abort();
              resolve(false);
            }, 1000);
          }),
        ]);
      } catch {
        /* Original durable expiry remains the browser-independent backstop. */
      } finally {
        if (timer) clearTimeout(timer);
        owner.abort();
      }
    }
    try {
      this.storage?.removeItem(SHOPIFY_TAB_KEY);
    } catch {
      acknowledged = false;
    }
    this.proof = undefined;
    this.dispose();
    return acknowledged;
  }
  dispose() {
    this.cancel();
    this.active = false;
  }
}
