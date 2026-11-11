import { createHash, randomBytes } from "node:crypto";
import {
  SHOPIFY_LIMITS,
  ShopifyStatusSchema,
} from "@retailor/contracts/shopify";
import type {
  ShopifyConnect,
  ShopifySessionInput,
} from "@retailor/contracts/shopify";
import { deny } from "../security/errors.js";
import { equalHex, ShopifyAccessRejected } from "./provider.js";
import type { ShopifyProvider } from "./provider.js";
import type { Binding, Installation, LedgerData, Tokens } from "./model.js";
import type { ShopifyLedger } from "./ledger.js";

export const SHOPIFY_COOKIE = "retailor_shopify";
export interface ShopifyScope {
  admit(): Promise<void>;
  update<T>(
    change: (installation: Installation, binding: Binding) => T,
  ): Promise<T>;
}
const fresh = () => randomBytes(32).toString("hex");
export const shopifyHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function shopifyCookie(header: string | undefined) {
  if (!header || header.length > 4096) return undefined;
  const entries = header
    .split(";")
    .map((value) => value.trim())
    .filter((value) => value.startsWith(`${SHOPIFY_COOKIE}=`));
  if (entries.length !== 1) return undefined;
  const value = entries[0]!.slice(SHOPIFY_COOKIE.length + 1);
  return /^[a-f0-9]{64}$/u.test(value) ? value : undefined;
}
export function spend(
  rate: { start: number; count: number },
  now: number,
  limit: number,
  count = 1,
) {
  if (now - rate.start >= 3_600_000) {
    rate.start = now;
    rate.count = 0;
  }
  if (rate.count + count > limit) return deny("BUSY", 429);
  rate.count += count;
}
export function authenticated(
  data: LedgerData,
  cookie: string | undefined,
  proof: string | undefined,
  workspaceId: string,
  now: number,
  allowExpired = false,
): Binding {
  if (!cookie || !proof || !/^[a-f0-9]{64}$/u.test(proof))
    return deny("FORBIDDEN", 403);
  const binding = data.bindings.find(
    (item) =>
      equalHex(item.cookieHash, shopifyHash(cookie)) &&
      equalHex(item.proofHash, shopifyHash(proof)) &&
      item.workspaceId === workspaceId,
  );
  if (!binding) return deny("FORBIDDEN", 403);
  if (binding.expiresAt + (allowExpired ? 7 * 86400000 : 0) <= now)
    return deny("STALE", 409);
  return binding;
}
export function installationFor(data: LedgerData, binding: Binding) {
  return data.installations.find(
    (item) => item.shop === binding.shop && item.bindingId === binding.id,
  );
}
function claim(
  data: LedgerData,
  installation: Installation,
  now: number,
  kind: "user" | "cleanup" = "user",
) {
  if (installation.lease && installation.lease.expiresAt > now)
    return deny("BUSY", 429);
  data.dispatches = data.dispatches.filter((item) => item.expiresAt > now);
  if (data.dispatches.length >= 2) return deny("BUSY", 429);
  if (kind === "user" && data.dispatches.some((item) => item.kind === "user"))
    return deny("BUSY", 429);
  const owner = fresh(),
    expiresAt = now + SHOPIFY_LIMITS.operationMs + 20_000;
  installation.lease = { owner, expiresAt };
  data.dispatches.push({ owner, expiresAt, kind });
  return owner;
}
function owned(data: LedgerData, shop: string, owner: string) {
  const installation = data.installations.find((item) => item.shop === shop);
  if (!installation || installation.lease?.owner !== owner)
    return deny("STALE", 409);
  return installation;
}

export class ShopifyService {
  constructor(
    readonly ledger: ShopifyLedger,
    readonly provider: ShopifyProvider,
    readonly appId: string,
    readonly clock: () => number = Date.now,
  ) {}

  async session(cookie: string | undefined, input: ShopifySessionInput) {
    const now = this.clock();
    // Bootstrap at workspace creation, not when a visitor finally clicks Connect.
    if (input.createdAt > now + 1000 || now - input.createdAt > 30_000)
      return deny("STALE", 409);
    const proof = fresh(),
      candidate = fresh();
    return this.ledger.transact((data) => {
      data.bindings = data.bindings.filter(
        (item) =>
          item.expiresAt > now ||
          data.installations.some((shop) => shop.bindingId === item.id),
      );
      const knownCookie =
        cookie &&
        data.bindings.some((item) =>
          equalHex(item.cookieHash, shopifyHash(cookie)),
        );
      const issued = knownCookie ? cookie : candidate;
      const cookieHash = shopifyHash(issued);
      if (
        data.bindings.some(
          (item) =>
            item.cookieHash === cookieHash &&
            item.workspaceId === input.workspaceId,
        )
      )
        return deny("STALE", 409);
      if (data.bindings.length >= SHOPIFY_LIMITS.sessions)
        return deny("BUSY", 429);
      const expiresAt =
        Math.min(now, input.createdAt) + SHOPIFY_LIMITS.lifetimeMs;
      data.bindings.push({
        id: shopifyHash(`${issued}:${proof}`),
        cookieHash,
        proofHash: shopifyHash(proof),
        workspaceId: input.workspaceId,
        createdAt: now,
        expiresAt,
        generation: 1,
        lifetimeCreates: 0,
        connects: { start: now, count: 0 },
        reads: { start: now, count: 0 },
        pending: null,
        shop: null,
        catalogue: null,
        collectionBrowse: null,
      });
      return {
        cookie: issued,
        result: { schemaVersion: 1 as const, tabProof: proof, expiresAt },
      };
    });
  }
  async status(
    cookie: string | undefined,
    proof: string | undefined,
    workspaceId: string,
    allowExpired = false,
  ) {
    return this.ledger.transact((data) => {
      const binding = authenticated(
        data,
        cookie,
        proof,
        workspaceId,
        this.clock(),
        allowExpired,
      );
      spend(binding.reads, this.clock(), 60);
      const installation = installationFor(data, binding);
      return ShopifyStatusSchema.parse({
        schemaVersion: 1,
        available: true,
        simulated: this.provider.simulated,
        ended: !!installation && installation.endedAt !== null,
        state:
          installation?.state ??
          (binding.pending?.outcome === "pending" &&
          binding.pending.expiresAt > this.clock()
            ? "authorizing"
            : "disconnected"),
        shop: installation?.shop ?? null,
        name: installation?.verified ? installation.name : null,
        currency: installation?.verified ? installation.currency : null,
        expiresAt: binding.expiresAt,
        productCount:
          installation?.products.filter(
            (item) => item.remoteId && item.state !== "removed",
          ).length ?? 0,
        createIntents: Math.max(
          binding.lifetimeCreates,
          installation?.products.length ?? 0,
        ),
        exports:
          installation?.products.map((item) => ({
            id: item.id,
            sourceProductId: item.sourceProductId,
            revision: item.revision,
            state: item.state,
            remoteId: item.remoteId,
            handle: item.handle,
          })) ?? [],
      });
    });
  }
  async connect(
    cookie: string | undefined,
    proof: string | undefined,
    input: ShopifyConnect,
  ) {
    const state = fresh();
    const authorizationUrl = this.provider.installationUrl();
    await this.ledger.transact((data) => {
      const now = this.clock();
      const binding = authenticated(
        data,
        cookie,
        proof,
        input.workspaceId,
        now,
      );
      spend(binding.connects, now, 10);
      // Shopify's initial App URL request has no Retailor nonce. Only one
      // pending attempt in this browser can own that signed return.
      if (
        data.bindings.some(
          (item) =>
            item.id !== binding.id &&
            item.cookieHash === binding.cookieHash &&
            item.expiresAt > now &&
            item.pending?.outcome === "pending" &&
            item.pending.expiresAt > now,
        )
      )
        return deny("BUSY", 429);
      const installation = installationFor(data, binding);
      const reusable =
        installation?.state === "cleaned" &&
        !installation.tokens &&
        !installation.lease;
      if (
        installation &&
        (installation.appId !== this.appId ||
          (!reusable &&
            (!["needs_attention", "authorizing"].includes(installation.state) ||
              installation.uninstallDispatched ||
              (installation.lease && installation.lease.expiresAt > now))))
      )
        return deny("BUSY", 429);
      binding.pending = {
        stateHash: shopifyHash(state),
        stateValue: state,
        shop: null,
        expiresAt: Math.min(binding.expiresAt, now + SHOPIFY_LIMITS.oauthMs),
        returnTo: input.returnTo,
        outcome: "pending",
        cleanupOnly: installation?.endedAt != null,
      };
    });
    return { schemaVersion: 1 as const, authorizationUrl };
  }
  async callback(
    cookie: string | undefined,
    query: string,
    signal: AbortSignal,
  ) {
    const now = this.clock(),
      params = this.provider.verifyQuery(query, now);
    const state = params.get("state") ?? "",
      shop = params.get("shop") ?? "";
    if (
      !cookie ||
      !/^[a-f0-9]{64}$/u.test(state) ||
      !!params.get("code") === !!params.get("error")
    )
      return deny("FORBIDDEN", 403);
    const attempt = await this.ledger.transact((data) => {
      const now = this.clock();
      const binding = data.bindings.find(
        (item) =>
          item.cookieHash === shopifyHash(cookie) &&
          item.pending &&
          equalHex(item.pending.stateHash, shopifyHash(state)),
      );
      if (
        !binding ||
        !binding.pending ||
        binding.pending.shop !== shop ||
        binding.pending.outcome !== "pending" ||
        binding.pending.expiresAt <= now ||
        binding.expiresAt <= now
      )
        return deny("FORBIDDEN", 403);
      const installation = installationFor(data, binding);
      if (!installation || installation.appId !== this.appId)
        return deny("FORBIDDEN", 403);
      const returnTo = binding.pending.returnTo;
      if (params.get("error")) {
        binding.pending.outcome = "cancelled";
        binding.pending.stateValue = null;
        if (!installation.tokens) {
          data.installations = data.installations.filter(
            (item) => item !== installation,
          );
          binding.shop = null;
        } else installation.state = "needs_attention";
        return { returnTo, owner: null };
      }
      spend(installation.calls, now, 120, 2);
      const owner = claim(data, installation, now);
      binding.pending.outcome = "unknown"; // Persist consumption before token HTTP.
      binding.pending.stateValue = null;
      return { returnTo, owner };
    });
    if (!attempt.owner)
      return {
        schemaVersion: 1 as const,
        outcome: "cancelled" as const,
        returnTo: attempt.returnTo,
      };
    const owner = attempt.owner;
    try {
      const tokens = await this.provider.exchange(
        shop,
        params.get("code")!,
        signal,
      );
      await this.ledger.transact((data) => {
        const installation = owned(data, shop, owner);
        installation.tokens = tokens;
        installation.tokenVersion++;
        installation.refreshUnknown = false;
      });
      const identity = await this.provider.identity(
        shop,
        tokens.access,
        signal,
      );
      if (identity.shop !== shop || !identity.development)
        return deny("FORBIDDEN", 403);
      const connected = await this.ledger.transact((data) => {
        const installation = owned(data, shop, owner);
        if (installation.verified && installation.shopId !== identity.id) {
          installation.state = "needs_attention";
          installation.accessBlocked = true;
          return false;
        }
        const binding = data.bindings.find(
          (item) => item.id === installation.bindingId,
        );
        // Keep credentials tracked even if the browser/reset retired this attempt.
        if (
          !binding ||
          binding.expiresAt <= this.clock() ||
          binding.pending?.stateHash !== shopifyHash(state)
        ) {
          installation.state = "cleanup_pending";
          return false;
        }
        installation.shopId = identity.id;
        installation.name = identity.name;
        installation.currency = identity.currency;
        installation.verified = true;
        installation.accessBlocked = false;
        installation.connectedAt = this.clock();
        if (installation.endedAt !== null) {
          if (!binding.pending.cleanupOnly) {
            installation.state = "cleanup_pending";
            return false;
          }
          installation.state = "cleanup_pending";
          installation.maintenanceDue = 0;
          binding.pending.outcome = "used";
          return false;
        }
        installation.state = "connected";
        binding.pending.outcome = "used";
        return true;
      });
      return {
        schemaVersion: 1 as const,
        outcome: connected
          ? ("connected" as const)
          : ("needs_attention" as const),
        returnTo: attempt.returnTo,
      };
    } catch (error) {
      await this.ledger.transact((data) => {
        const installation = owned(data, shop, owner);
        installation.state = "needs_attention";
        if (error instanceof ShopifyAccessRejected)
          installation.accessBlocked = true;
      });
      return {
        schemaVersion: 1 as const,
        outcome: "needs_attention" as const,
        returnTo: attempt.returnTo,
      };
    } finally {
      await this.release(shop, owner);
    }
  }
  async install(cookie: string | undefined, query: string) {
    const params = this.provider.verifyQuery(query, this.clock());
    if (
      !cookie ||
      params.has("code") ||
      params.has("error") ||
      params.has("state")
    )
      return deny("FORBIDDEN", 403);
    const shop = params.get("shop")!;
    return this.ledger.transact((data) => {
      const now = this.clock();
      const candidates = data.bindings.filter(
        (item) =>
          item.cookieHash === shopifyHash(cookie) &&
          item.expiresAt > now &&
          item.pending?.outcome === "pending" &&
          item.pending.expiresAt > now,
      );
      if (candidates.length !== 1) return deny("FORBIDDEN", 403);
      const binding = candidates[0]!,
        pending = binding.pending!;
      if (!pending.stateValue || (pending.shop && pending.shop !== shop))
        return deny("FORBIDDEN", 403);
      if (binding.shop && binding.shop !== shop) return deny("STALE", 409);
      let installation = data.installations.find((item) => item.shop === shop);
      const previousBinding = data.bindings.find(
        (item) => item.id === installation?.bindingId,
      );
      // Exchange admission durably spends two calls before any token HTTP.
      // A cancelled/expired reservation with zero calls has never dispatched
      // an exchange. Unknown exchanges retain their reservation and cleanup.
      const abandoned =
        installation &&
        !installation.tokens &&
        installation.tokenVersion === 0 &&
        !installation.verified &&
        !installation.shopId &&
        installation.calls.count === 0 &&
        installation.products.length === 0 &&
        !installation.collection &&
        !installation.lease &&
        !installation.uninstallDispatched &&
        ((installation.state === "cleanup_pending" &&
          installation.endedAt !== null &&
          (!previousBinding?.pending ||
            previousBinding.pending.outcome === "cancelled")) ||
          (installation.state === "authorizing" &&
            previousBinding?.pending?.outcome === "pending" &&
            previousBinding.pending.expiresAt <= now));
      const previousRates =
        installation && (installation.state === "cleaned" || abandoned)
          ? {
              calls: structuredClone(installation.calls),
              cleanupCalls: structuredClone(installation.cleanupCalls),
            }
          : undefined;
      if (
        installation &&
        (installation.state === "cleaned" || abandoned) &&
        !installation.tokens &&
        !installation.lease
      ) {
        const previous = installation;
        if (previousBinding) {
          previousBinding.lifetimeCreates = Math.max(
            previousBinding.lifetimeCreates,
            previous.products.length,
          );
          if (abandoned && previousBinding.id !== binding.id)
            previousBinding.pending = null;
        }
        data.installations = data.installations.filter(
          (item) => item !== previous,
        );
        for (const old of data.bindings)
          if (old.id === previous.bindingId) old.shop = null;
        installation = undefined;
      }
      const retryPending =
        installation?.state === "authorizing" &&
        binding.pending?.outcome === "pending";
      if (
        installation &&
        (installation.bindingId !== binding.id ||
          installation.appId !== this.appId ||
          (installation.state !== "needs_attention" && !retryPending) ||
          (installation.lease && installation.lease.expiresAt > now))
      )
        return deny("BUSY", 429);
      if (!installation) {
        if (data.installations.length >= SHOPIFY_LIMITS.installations)
          return deny("BUSY", 429);
        installation = {
          shop,
          appId: this.appId,
          bindingId: binding.id,
          shopId: "",
          name: "",
          currency: "",
          verified: false,
          accessBlocked: false,
          state: "authorizing",
          tokens: null,
          tokenVersion: 0,
          lease: null,
          expiresAt: binding.expiresAt,
          endedAt: null,
          connectedAt: 0,
          cleanupCalls: previousRates?.cleanupCalls ?? { start: now, count: 0 },
          maintenanceDue: 0,
          maintenanceAttempts: 0,
          refreshUnknown: false,
          uninstallDispatched: false,
          notice: null,
          noticeVersion: 0,
          calls: previousRates?.calls ?? { start: now, count: 0 },
          products: [],
          collection: null,
        };
        data.installations.push(installation);
      }
      installation.state = "authorizing";
      if (installation.uninstallDispatched) return deny("STALE", 409);
      binding.shop = shop;
      pending.shop = shop;
      pending.cleanupOnly = installation.endedAt !== null;
      return {
        schemaVersion: 1 as const,
        authorizationUrl: this.provider.authorizationUrl(
          shop,
          pending.stateValue,
        ),
      };
    });
  }
  async simulate(
    cookie: string | undefined,
    proof: string | undefined,
    workspaceId: string,
    approved: boolean,
    signal: AbortSignal,
  ) {
    if (!this.provider.simulated || !this.provider.consent)
      return deny("NOT_FOUND", 404);
    const pending = await this.ledger.inspect((data) => {
      const binding = authenticated(
        data,
        cookie,
        proof,
        workspaceId,
        this.clock(),
      );
      if (
        !binding.pending?.stateValue ||
        binding.pending.outcome !== "pending" ||
        binding.pending.expiresAt <= this.clock()
      )
        return deny("STALE", 409);
      return structuredClone(binding.pending);
    });
    const shop = pending.shop ?? "retailor-demo.myshopify.com";
    // Fixture consent can sign a query for either step; no live-provider fallback.
    const installQuery = this.provider.installQuery?.(shop, this.clock());
    if (!installQuery) return deny("NOT_FOUND", 404);
    await this.install(cookie, installQuery);
    return this.callback(
      cookie,
      this.provider.consent(shop, pending.stateValue!, approved, this.clock()),
      signal,
    );
  }
  private async release(shop: string, owner: string) {
    await this.ledger.transact((data) => {
      const installation = data.installations.find(
        (item) => item.shop === shop,
      );
      if (installation?.lease?.owner === owner) installation.lease = null;
      data.dispatches = data.dispatches.filter((item) => item.owner !== owner);
    });
  }
  /** Fixed server use cases call this; it never returns credentials to a route. */
  async withConnection<T>(
    cookie: string | undefined,
    proof: string | undefined,
    workspaceId: string,
    signal: AbortSignal,
    operation: (
      installation: Installation,
      tokens: Tokens,
      scope: ShopifyScope,
    ) => Promise<T>,
  ): Promise<T> {
    const prepared = await this.ledger.transact((data) => {
      const now = this.clock();
      const binding = authenticated(data, cookie, proof, workspaceId, now),
        installation = installationFor(data, binding);
      if (
        !installation ||
        !installation.verified ||
        installation.state !== "connected" ||
        !installation.tokens ||
        installation.appId !== this.appId
      )
        return deny("FORBIDDEN", 403);
      const owner = claim(data, installation, now),
        refresh = installation.tokens.expiresAt <= now + 60_000;
      if (refresh) spend(installation.calls, now, 120);
      if (refresh) {
        installation.state = "checking_outcome";
        installation.refreshUnknown = true;
      }
      return {
        installation: structuredClone(installation),
        tokens: structuredClone(installation.tokens),
        owner,
        refresh,
        generation: binding.generation,
      };
    });
    try {
      let tokens = prepared.tokens;
      if (prepared.refresh) {
        tokens = await this.provider.refresh(
          prepared.installation.shop,
          tokens,
          signal,
        );
        const active = await this.ledger.transact((data) => {
          const installation = owned(
            data,
            prepared.installation.shop,
            prepared.owner,
          );
          if (installation.tokenVersion !== prepared.installation.tokenVersion)
            return deny("STALE", 409);
          installation.tokens = tokens;
          installation.tokenVersion++;
          installation.refreshUnknown = false;
          const binding = data.bindings.find(
            (item) => item.id === installation.bindingId,
          );
          const active =
            !!binding &&
            binding.generation === prepared.generation &&
            binding.expiresAt > this.clock() &&
            installation.endedAt === null &&
            installation.state === "checking_outcome";
          installation.state = active ? "connected" : "cleanup_pending";
          return active;
        });
        if (!active) return deny("STALE", 409);
      }
      const current = await this.ledger.transact((data) => {
        const installation = owned(
          data,
          prepared.installation.shop,
          prepared.owner,
        );
        const binding = data.bindings.find(
          (item) => item.id === installation.bindingId,
        );
        if (
          !binding ||
          binding.generation !== prepared.generation ||
          binding.expiresAt <= this.clock() ||
          installation.endedAt !== null
        ) {
          installation.state = "cleanup_pending";
          return null;
        }
        return installation.state === "connected"
          ? structuredClone(installation)
          : null;
      });
      if (!current) return deny("STALE", 409);
      signal.throwIfAborted();
      let requests = 0;
      const scope: ShopifyScope = {
        update: (change) =>
          this.ledger.transact((data) => {
            const installation = owned(
              data,
              prepared.installation.shop,
              prepared.owner,
            );
            const binding = data.bindings.find(
              (item) => item.id === installation.bindingId,
            );
            if (!binding) return deny("STALE", 409);
            return change(installation, binding);
          }),
        admit: async () => {
          signal.throwIfAborted();
          if (++requests > 64) return deny("BUSY", 429);
          await this.ledger.transact((data) => {
            const installation = owned(
              data,
              prepared.installation.shop,
              prepared.owner,
            );
            const binding = data.bindings.find(
              (item) => item.id === installation.bindingId,
            );
            if (
              !binding ||
              binding.generation !== prepared.generation ||
              binding.expiresAt <= this.clock() ||
              installation.state !== "connected" ||
              installation.endedAt !== null
            )
              return deny("STALE", 409);
            spend(installation.calls, this.clock(), 120);
          });
        },
      };
      return await operation(current, tokens, scope);
    } catch (error) {
      if (prepared.refresh || error instanceof ShopifyAccessRejected)
        await this.ledger.transact((data) => {
          const installation = owned(
            data,
            prepared.installation.shop,
            prepared.owner,
          );
          if (error instanceof ShopifyAccessRejected)
            installation.accessBlocked = true;
          if (
            installation.state === "checking_outcome" ||
            error instanceof ShopifyAccessRejected
          )
            installation.state = "needs_attention";
        });
      throw error;
    } finally {
      await this.release(prepared.installation.shop, prepared.owner);
    }
  }
  close() {
    return this.ledger.close();
  }

  /** Private runner access. Visitor rates/deadlines cannot consume this allowance. */
  async withMaintenance<T>(
    shop: string,
    signal: AbortSignal,
    budget: () => void,
    operation: (
      installation: Installation,
      tokens: Tokens,
      scope: ShopifyScope,
    ) => Promise<T>,
  ) {
    const prepared = await this.ledger.transact((data) => {
      const installation = data.installations.find(
        (item) => item.shop === shop && item.appId === this.appId,
      );
      if (
        !installation?.tokens ||
        installation.refreshUnknown ||
        installation.accessBlocked
      )
        return deny("UNAVAILABLE", 503);
      const owner = claim(data, installation, this.clock(), "cleanup");
      return {
        owner,
        installation: structuredClone(installation),
        tokens: structuredClone(installation.tokens),
      };
    });
    try {
      const scope: ShopifyScope = {
        update: (change) =>
          this.ledger.transact((data) => {
            const installation = owned(data, shop, prepared.owner);
            const binding = data.bindings.find(
              (item) => item.id === installation.bindingId,
            );
            if (!binding) return deny("STALE", 409);
            return change(installation, binding);
          }),
        admit: async () => {
          signal.throwIfAborted();
          budget();
          const allowed = await this.ledger.transact((data) => {
            const installation = owned(data, shop, prepared.owner);
            if (installation.lease!.expiresAt <= this.clock())
              return deny("STALE", 409);
            if (
              installation.endedAt !== null &&
              this.clock() >= installation.endedAt + 86400000
            ) {
              installation.tokens = null;
              installation.state = "needs_attention";
              return false;
            }
            spend(installation.cleanupCalls, this.clock(), 120);
            return true;
          });
          if (!allowed) return deny("STALE", 409);
        },
      };
      let tokens = prepared.tokens;
      if (tokens.expiresAt <= this.clock() + 60000) {
        await scope.admit();
        await scope.update((installation) => {
          installation.refreshUnknown = true;
        });
        tokens = await this.provider.refresh(shop, tokens, signal);
        const retained = await scope.update((installation) => {
          if (
            installation.endedAt !== null &&
            this.clock() >= installation.endedAt + 86400000
          ) {
            installation.tokens = null;
            installation.refreshUnknown = false;
            installation.state = "needs_attention";
            return false;
          }
          installation.tokens = tokens;
          installation.tokenVersion++;
          installation.refreshUnknown = false;
          return true;
        });
        if (!retained) return deny("STALE", 409);
      }
      return await operation(prepared.installation, tokens, scope);
    } catch (error) {
      if (error instanceof ShopifyAccessRejected)
        await this.ledger.transact((data) => {
          const current = owned(data, shop, prepared.owner);
          current.accessBlocked = true;
          current.state = "needs_attention";
        });
      throw error;
    } finally {
      await this.release(shop, prepared.owner);
    }
  }
}
