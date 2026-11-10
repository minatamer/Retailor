import { randomBytes } from "node:crypto";
import { authenticated, installationFor } from "./service.js";
import type { ShopifyService, ShopifyScope } from "./service.js";
import type { ShopifyCatalogue } from "./catalogue.js";
import { deny, OperationFailure } from "../security/errors.js";
import { ShopifyRateLimit } from "./rate-limit.js";
import { ShopifyAccessRejected } from "./provider.js";
import { ShopifyCollection } from "./collection.js";

export const CLEANUP = {
  cadenceMs: 60000,
  sweepMs: 55000,
  calls: 40,
  attempts: 8,
  credentialMs: 86400000,
  metadataMs: 7 * 86400000,
} as const;
const backoff = [
  60000, 120000, 300000, 900000, 3600000, 14400000, 43200000, 86400000,
];
const delay = (attempt: number, error?: unknown) =>
  Math.max(
    backoff[Math.min(attempt - 1, 7)]!,
    error instanceof ShopifyRateLimit ? error.retryAfterMs : 0,
  );

/** Same durable use case for browser requests, local timer and private scheduled job. */
export class ShopifyCleanup {
  constructor(
    readonly auth: ShopifyService,
    readonly catalogue: ShopifyCatalogue,
  ) {}

  async beforeWrite(signal: AbortSignal) {
    signal.throwIfAborted();
    const available = await this.auth.ledger.inspect(
      (data) =>
        data.lastSweepAt > 0 && this.auth.clock() - data.lastSweepAt <= 120000,
    );
    if (!available) return deny("UNAVAILABLE", 503);
  }

  async request(
    cookie: string | undefined,
    proof: string | undefined,
    workspaceId: string,
    exportId?: string,
  ) {
    await this.auth.ledger.transact((data) => {
      const now = this.auth.clock(),
        binding = authenticated(data, cookie, proof, workspaceId, now, true),
        installation = installationFor(data, binding);
      if (!installation) {
        if (!exportId) {
          binding.pending = null;
          binding.generation++;
        }
        return;
      }
      if (installation.appId !== this.auth.appId) return deny("FORBIDDEN", 403);
      if (exportId) {
        if (installation.endedAt !== null || binding.expiresAt <= now)
          return deny("STALE", 409);
        const intent = installation.products.find(
          (item) => item.id === exportId,
        );
        if (!intent) return deny("NOT_FOUND", 404);
        if (intent.state === "removed") return;
        intent.removalRequested = true;
        intent.state = "removal_pending";
      } else {
        installation.endedAt ??= Math.min(now, installation.expiresAt);
        if (installation.state !== "cleaned")
          installation.state = installation.accessBlocked
            ? "needs_attention"
            : "cleanup_pending";
        binding.pending = null;
      }
      // Fence any foreground result before acknowledging durable removal/end.
      binding.generation++;
    });
    return this.auth.status(cookie, proof, workspaceId, true);
  }

  async sweep(parent: AbortSignal) {
    const owner = randomBytes(32).toString("hex"),
      clock = this.auth.clock;
    const claimed = await this.auth.ledger.transact((data) => {
      const now = clock();
      if (data.maintenance && data.maintenance.expiresAt > now) return false;
      data.maintenance = { owner, expiresAt: now + 75000 };
      // Persist expiry/retention even if the browser and provider are gone.
      for (const installation of data.installations) {
        if (installation.expiresAt <= now && installation.endedAt === null) {
          installation.endedAt = installation.expiresAt;
          if (installation.state !== "cleaned")
            installation.state = installation.accessBlocked
              ? "needs_attention"
              : "cleanup_pending";
          const binding = data.bindings.find(
            (item) => item.id === installation.bindingId,
          );
          if (binding) {
            binding.generation++;
            binding.pending = null;
          }
        }
        if (
          installation.endedAt !== null &&
          now >= installation.endedAt + CLEANUP.credentialMs
        ) {
          installation.tokens = null;
          if (installation.state !== "cleaned")
            installation.state = "needs_attention";
        }
      }
      data.installations = data.installations.filter(
        (installation) =>
          !(
            installation.notice === "redact" &&
            ((installation.endedAt !== null && !installation.tokens) ||
              installation.accessBlocked) &&
            (!installation.lease || installation.lease.expiresAt <= now)
          ) &&
          (installation.endedAt === null ||
            now < installation.endedAt + CLEANUP.metadataMs),
      );
      data.bindings = data.bindings.filter(
        (binding) =>
          binding.expiresAt > now ||
          data.installations.some(
            (installation) => installation.bindingId === binding.id,
          ),
      );
      data.deliveries = data.deliveries.filter(
        (delivery) => delivery.expiresAt > now,
      );
      return true;
    });
    if (!claimed) return { claimed: false, calls: 0, visited: 0 };
    const stop = new AbortController(),
      signal = AbortSignal.any([parent, stop.signal]),
      timer = setTimeout(() => stop.abort(), CLEANUP.sweepMs);
    let calls = 0,
      visited = 0;
    const budget = () => {
      signal.throwIfAborted();
      if (++calls > CLEANUP.calls) return deny("BUSY", 429);
    };
    try {
      const candidates = await this.auth.ledger.inspect((data) =>
        data.installations
          .filter(
            (installation) =>
              installation.tokens &&
              !installation.accessBlocked &&
              installation.maintenanceDue <= clock() &&
              installation.maintenanceAttempts < CLEANUP.attempts &&
              installation.state !== "cleaned" &&
              (installation.endedAt !== null ||
                installation.notice ||
                installation.products.some(
                  (item) => item.removalRequested && item.state !== "removed",
                )),
          )
          .map((installation) => installation.shop),
      );
      for (const shop of candidates.slice(0, 10)) {
        if (signal.aborted || calls >= CLEANUP.calls) break;
        visited++;
        try {
          await this.auth.withMaintenance(
            shop,
            signal,
            budget,
            async (installation, tokens, scope) => {
              const context = {
                shop,
                access: tokens.access,
                signal,
                admit: scope.admit,
              };
              if (
                installation.maintenanceDue > clock() ||
                installation.maintenanceAttempts >= CLEANUP.attempts
              )
                return;
              if (installation.notice || installation.uninstallDispatched) {
                if (installation.uninstallDispatched)
                  await scope.update((current) => {
                    current.maintenanceAttempts++;
                    current.maintenanceDue =
                      clock() + delay(current.maintenanceAttempts);
                  });
                // Webhook headers have no installation generation; current credentials decide.
                await scope.admit();
                try {
                  const identity = await this.auth.provider.identity(
                    shop,
                    tokens.access,
                    signal,
                  );
                  if (
                    identity.shop !== shop ||
                    (installation.shopId && identity.id !== installation.shopId)
                  )
                    return deny("FORBIDDEN", 403);
                  const currentDelivery = await scope.update((current) => {
                    if (current.noticeVersion !== installation.noticeVersion)
                      return false;
                    current.notice = null;
                    if (
                      current.endedAt === null &&
                      !current.uninstallDispatched
                    )
                      current.state = "connected";
                    return true;
                  });
                  if (!currentDelivery) return;
                } catch (error) {
                  if (
                    error instanceof OperationFailure &&
                    error.code === "FORBIDDEN"
                  ) {
                    await this.revoked(scope, installation.notice === "redact");
                    return;
                  }
                  throw error;
                }
                // A timed-out uninstall is never dispatched again while its outcome is unknown.
                if (installation.uninstallDispatched) return;
                if (installation.endedAt === null) return;
              }
              const intents = await scope.update((current) =>
                structuredClone(
                  current.products.filter(
                    (item) =>
                      item.state !== "removed" &&
                      (current.endedAt !== null || item.removalRequested),
                  ),
                ),
              );
              for (const intent of intents) {
                if (signal.aborted || calls + 3 > CLEANUP.calls) break;
                if (
                  intent.cleanupDue > clock() ||
                  intent.cleanupAttempts >= CLEANUP.attempts
                )
                  continue;
                await scope.update((current) => {
                  const row = current.products.find(
                    (item) => item.id === intent.id,
                  )!;
                  row.cleanupAttempts++;
                  row.cleanupDue = clock() + delay(row.cleanupAttempts);
                  row.removalRequested = true;
                });
                try {
                  await this.catalogue.removeOwned(context, intent, (change) =>
                    scope.update((current) =>
                      change(
                        current.products.find((item) => item.id === intent.id)!,
                      ),
                    ),
                  );
                } catch (error) {
                  await scope.update((current) => {
                    const row = current.products.find(
                      (item) => item.id === intent.id,
                    )!;
                    row.cleanupDue =
                      clock() + delay(row.cleanupAttempts, error);
                    row.state =
                      row.cleanupAttempts >= CLEANUP.attempts
                        ? "needs_attention"
                        : "removal_pending";
                  });
                  if (error instanceof ShopifyAccessRejected) throw error;
                  if (
                    error instanceof OperationFailure &&
                    error.code === "FORBIDDEN"
                  )
                    break;
                }
              }
              const removeCollection = await scope.update(
                (current) =>
                  current.endedAt !== null &&
                  current.products.every((item) => item.state === "removed") &&
                  !!current.collection &&
                  !current.collection.removed,
              );
              if (removeCollection && calls + 3 <= CLEANUP.calls) {
                await scope.update((current) => {
                  current.maintenanceAttempts++;
                  current.maintenanceDue =
                    clock() + delay(current.maintenanceAttempts);
                });
                await new ShopifyCollection(
                  this.catalogue.provider.collections,
                ).remove(context, scope);
              }
              const settled = await scope.update((current) => {
                if (current.endedAt === null) return false;
                const complete =
                  current.products.every((item) => item.state === "removed") &&
                  (!current.collection || current.collection.removed);
                current.state = complete
                  ? "disconnecting"
                  : current.products.some(
                        (item) => item.cleanupAttempts >= CLEANUP.attempts,
                      ) || current.maintenanceAttempts >= CLEANUP.attempts
                    ? "needs_attention"
                    : "cleanup_pending";
                return complete;
              });
              if (!settled || calls >= CLEANUP.calls) return;
              await scope.update((current) => {
                current.uninstallDispatched = true;
                // Collection removal and uninstall share this sweep's single
                // maintenance attempt; never exceed the durable eight-attempt cap.
                if (!removeCollection) current.maintenanceAttempts++;
                current.maintenanceDue =
                  clock() + delay(current.maintenanceAttempts);
              });
              const success = await this.catalogue.provider.uninstall(context);
              await scope.update((current) => {
                if (success) {
                  current.tokens = null;
                  current.state = "cleaned";
                  current.refreshUnknown = false;
                } else {
                  current.uninstallDispatched = false;
                  current.state = "cleanup_pending";
                }
              });
            },
          );
        } catch (error) {
          // Durable leases/budgets are checked before recording an attempt: a busy
          // foreground owner is not a failed cleanup and never loses its mapping.
          if (!(error instanceof OperationFailure && error.code === "BUSY")) {
            await this.auth.ledger.transact((data) => {
              const installation = data.installations.find(
                (item) => item.shop === shop,
              );
              if (!installation || installation.lease) return;
              if (!installation.uninstallDispatched)
                installation.maintenanceAttempts = Math.min(
                  8,
                  installation.maintenanceAttempts + 1,
                );
              installation.maintenanceDue =
                clock() + delay(installation.maintenanceAttempts, error);
              installation.state = "needs_attention";
            });
          }
        }
      }
      return { claimed: true, calls: Math.min(calls, CLEANUP.calls), visited };
    } finally {
      clearTimeout(timer);
      stop.abort();
      await this.auth.ledger.transact((data) => {
        if (data.maintenance?.owner === owner) {
          data.maintenance = null;
          data.lastSweepAt = clock();
        }
      });
    }
  }

  private async revoked(scope: ShopifyScope, redact: boolean) {
    const bindingId = await scope.update((current) => {
      current.endedAt ??= this.auth.clock();
      current.notice = null;
      current.state =
        current.products.every((item) => item.state === "removed") &&
        (!current.collection || current.collection.removed)
          ? "cleaned"
          : "needs_attention";
      current.tokens = null;
      return current.bindingId;
    });
    if (redact)
      await this.auth.ledger.transact((data) => {
        data.installations = data.installations.filter(
          (item) => item.bindingId !== bindingId,
        );
        data.bindings = data.bindings.filter((item) => item.id !== bindingId);
      });
  }
}
