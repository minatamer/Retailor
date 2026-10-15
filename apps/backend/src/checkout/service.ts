import { createHash } from "node:crypto";
import {
  CHECKOUT_LIMITS,
  CheckoutResultSchema,
} from "@retailor/contracts/checkout";
import type {
  CheckoutStart,
  CheckoutResult,
} from "@retailor/contracts/checkout";
import { parseGraph } from "@retailor/commerce/graph";
import { checkoutQuote } from "@retailor/commerce/checkout";
import { validateSnapshot } from "@retailor/commerce/currency";
import { prepareProviderImages } from "../catalogue/sanitize.js";
import { deny, OperationFailure } from "../security/errors.js";
import type { CheckoutImages } from "./storage.js";
import type { CheckoutPayment, StripeSession } from "./provider.js";

type Identity = { expires: number; attempts: number; active: boolean };
type Attempt = {
  identity: string;
  digest: string;
  result: CheckoutResult;
  providerId?: string;
  images: string[];
  busy: boolean;
  reads: number;
  failed: boolean;
};
export class CheckoutService {
  private readonly identities = new Map<string, Identity>();
  private readonly attempts = new Map<string, Attempt>();
  private active = 0;
  constructor(
    private readonly payment: CheckoutPayment,
    private readonly images: CheckoutImages,
    private readonly fixtureAllowed: boolean,
    private readonly clock: () => number = Date.now,
    private readonly sanitize: typeof prepareProviderImages = prepareProviderImages,
  ) {}

  identity(id: string) {
    for (const [key, state] of this.identities)
      if (
        state.expires <= this.clock() &&
        !state.active &&
        ![...this.attempts.values()].some(
          (attempt) => attempt.identity === key && attempt.busy,
        )
      ) {
        this.identities.delete(key);
        for (const [attemptId, attempt] of this.attempts)
          if (attempt.identity === key && !attempt.busy)
            this.attempts.delete(attemptId);
      }
    if (this.identities.has(id)) return;
    if (this.identities.size >= CHECKOUT_LIMITS.identities)
      return deny("BUSY", 429);
    this.identities.set(id, {
      expires: this.clock() + 7_200_000,
      attempts: 0,
      active: false,
    });
  }
  private requireIdentity(id: string | undefined) {
    const identity = id ? this.identities.get(id) : undefined;
    return identity && identity.expires > this.clock()
      ? identity
      : deny("FORBIDDEN", 403);
  }
  private checked(attempt: Attempt, session: StripeSession) {
    if (
      (attempt.providerId && session.id !== attempt.providerId) ||
      session.currency.toUpperCase() !== attempt.result.currency ||
      session.amount_total !== attempt.result.total ||
      session.livemode !== false
    )
      return deny("UPSTREAM_FAILED", 502);
    if (session.status === "complete" && session.payment_status !== "paid")
      return deny("UPSTREAM_FAILED", 502);
    attempt.providerId = session.id;
    attempt.result = CheckoutResultSchema.parse({
      ...attempt.result,
      status: session.status,
      url: session.status === "open" ? session.url : null,
    });
    if (attempt.result.status === "open" && !attempt.result.url)
      return deny("UPSTREAM_FAILED", 502);
    return attempt.result;
  }
  async start(
    id: string | undefined,
    input: CheckoutStart,
    signal: AbortSignal,
  ) {
    const identity = this.requireIdentity(id);
    const digest = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
    const existing = this.attempts.get(input.attemptId);
    if (existing) {
      if (existing.identity !== id || existing.digest !== digest)
        return deny("FORBIDDEN", 403);
      if (existing.busy) return deny("BUSY", 429);
      if (
        existing.failed ||
        Date.parse(existing.result.expiresAt) <= this.clock()
      )
        return deny("STALE", 409);
      return existing.result;
    }
    if (identity.active || this.active >= CHECKOUT_LIMITS.active)
      return deny("BUSY", 429);
    if (identity.attempts >= CHECKOUT_LIMITS.attempts)
      return deny("FORBIDDEN", 403);
    let graph: ReturnType<typeof parseGraph>;
    let quote: ReturnType<typeof checkoutQuote>;
    try {
      graph = parseGraph(input.graph);
      const now = this.clock();
      if (
        Date.parse(graph.createdAt) > now ||
        Date.parse(graph.expiresAt) - now < CHECKOUT_LIMITS.sessionMs + 5000
      )
        return deny("STALE", 409);
      if (input.scope.snapshot)
        validateSnapshot(input.scope.snapshot, now, this.fixtureAllowed);
      if (
        new Set(input.availablePhotoIds).size !==
          input.availablePhotoIds.length ||
        input.availablePhotoIds.some(
          (photo) => !graph.photos.some((item) => item.id === photo),
        )
      )
        return deny("INVALID_INPUT", 400);
      quote = checkoutQuote(
        graph,
        new Set(input.availablePhotoIds),
        input.scope,
        input.promoApplied,
      );
    } catch (error) {
      if (error instanceof OperationFailure) throw error;
      return deny("INVALID_INPUT", 400);
    }
    if (quote.total !== input.expectedTotal) return deny("STALE", 409);
    const ids = [...new Set(quote.lines.map((line) => line.photoId))];
    if (
      ids.length !== input.photos.length ||
      new Set(input.photos.map((photo) => photo.image.id)).size !==
        ids.length ||
      ids.some(
        (photoId) => !input.photos.some((photo) => photo.image.id === photoId),
      )
    )
      return deny("INVALID_INPUT", 400);
    for (const photo of input.photos) {
      const recorded = graph.photos.find(
        (item) => item.id === photo.image.id,
      )?.derivative;
      if (!recorded || JSON.stringify(recorded) !== JSON.stringify(photo.image))
        return deny("INVALID_INPUT", 400);
    }
    const expires =
      Math.ceil((this.clock() + CHECKOUT_LIMITS.sessionMs + 2000) / 1000) *
      1000;
    const attempt: Attempt = {
      identity: id!,
      digest,
      result: {
        schemaVersion: 1,
        attemptId: input.attemptId,
        status: "open",
        currency: quote.currency,
        total: quote.total,
        expiresAt: new Date(expires).toISOString(),
        url: null,
      },
      images: ids,
      busy: true,
      reads: 0,
      failed: false,
    };
    this.attempts.set(input.attemptId, attempt);
    identity.attempts++;
    identity.active = true;
    this.active++;
    try {
      const files = new Map(
        input.photos.map((photo) => {
          const bytes = Buffer.from(photo.base64, "base64");
          if (bytes.toString("base64") !== photo.base64)
            return deny("INVALID_INPUT", 400);
          return [photo.image.id, bytes] as const;
        }),
      );
      const prepared = await this.sanitize(
        input.photos.map((photo) => photo.image),
        files,
        signal,
      );
      const urls = new Map<string, string>();
      for (const photoId of ids) {
        signal.throwIfAborted();
        urls.set(
          photoId,
          await this.images.put(
            input.attemptId,
            photoId,
            prepared.get(photoId)!,
            Math.min(
              this.clock() + CHECKOUT_LIMITS.imageLinkMs,
              Date.parse(graph.expiresAt),
            ),
            signal,
          ),
        );
      }
      prepared.clear();
      signal.throwIfAborted();
      // Stripe's minimum expiry is measured when create arrives, after photo preparation.
      const sessionExpires =
        Math.ceil((this.clock() + CHECKOUT_LIMITS.sessionMs + 2000) / 1000) *
        1000;
      if (sessionExpires > Date.parse(graph.expiresAt))
        return deny("STALE", 409);
      attempt.result.expiresAt = new Date(sessionExpires).toISOString();
      const created = await this.payment.create(
        {
          attemptId: input.attemptId,
          quote,
          name: input.brand.name,
          theme: input.brand.theme,
          images: urls,
          expiresAt: sessionExpires,
        },
        signal,
      );
      attempt.providerId = created.id;
      const result = this.checked(attempt, created);
      signal.throwIfAborted();
      return result;
    } catch (error) {
      attempt.failed = true;
      if (attempt.providerId) {
        const cleanup = AbortSignal.timeout(15_000);
        await this.payment
          .expire(attempt.providerId, cleanup)
          .finally(() => this.images.remove(input.attemptId, ids));
      } else await this.images.remove(input.attemptId, ids);
      throw error;
    } finally {
      attempt.busy = false;
      identity.active = false;
      this.active--;
    }
  }
  async status(
    id: string | undefined,
    attemptId: string,
    cancel: boolean,
    signal: AbortSignal,
  ) {
    this.requireIdentity(id);
    const attempt = this.attempts.get(attemptId);
    if (!attempt || attempt.identity !== id) return deny("FORBIDDEN", 403);
    if (attempt.busy) return deny("BUSY", 429);
    if (attempt.failed || !attempt.providerId) return deny("STALE", 409);
    if (attempt.result.status !== "open") return attempt.result;
    if (attempt.reads >= CHECKOUT_LIMITS.statusReads)
      return deny("FORBIDDEN", 403);
    attempt.reads++;
    attempt.busy = true;
    try {
      const result = this.checked(
        attempt,
        await this.payment.get(attempt.providerId, signal),
      );
      signal.throwIfAborted();
      if (
        result.status === "open" &&
        (cancel || Date.parse(result.expiresAt) <= this.clock())
      ) {
        const expired = this.checked(
          attempt,
          await this.payment.expire(attempt.providerId, signal),
        );
        if (expired.status === "expired")
          attempt.result = {
            ...expired,
            status: cancel ? "cancelled" : "expired",
            url: null,
          };
        else if (expired.status !== "complete")
          return deny("UPSTREAM_FAILED", 502);
      }
      if (
        attempt.result.status === "cancelled" ||
        attempt.result.status === "expired"
      )
        await this.images.remove(attemptId, attempt.images);
      return attempt.result;
    } finally {
      attempt.busy = false;
    }
  }
}
