import type { Express } from "express";
import { OAuth2Client } from "google-auth-library";
import { SHOPIFY_HOSTED } from "../config/shopify-app.js";
import { deny, OperationFailure } from "../security/errors.js";
import type { ShopifyCleanup } from "./cleanup.js";
import { CLEANUP } from "./cleanup.js";
import { cleanupDiagnostic } from "./runner.js";

export const MAINTENANCE = {
  path: "/internal/shopify/cleanup",
  tokenBytes: 8192,
  authMs: 5000,
  certificateBytes: 65536,
  requestMs: CLEANUP.sweepMs + 5000,
  arrivalsPerMinute: 2,
} as const;
export type MaintenanceVerifier = (
  token: string,
  signal: AbortSignal,
) => Promise<boolean>;

/** Construction is inert. Only the private operation may fetch Google's certs. */
export function googleCleanupVerifier(
  client = new OAuth2Client(),
): MaintenanceVerifier {
  let currentSignal: AbortSignal | undefined;
  client.transporter.interceptors.request.add({
    resolved: async (options) => {
      options.retry = false;
      options.retryConfig = { retry: 0 };
      options.timeout = MAINTENANCE.authMs;
      options.maxRedirects = 0;
      options.maxContentLength = MAINTENANCE.certificateBytes;
      if (currentSignal) options.signal = currentSignal;
      return options;
    },
  });
  return async (token, signal) => {
    if (currentSignal || signal.aborted) return false;
    currentSignal = signal;
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: SHOPIFY_HOSTED.maintenanceAudience,
        maxExpiry: 3600,
      });
      const claims = ticket.getPayload();
      return (
        !signal.aborted &&
        claims?.email_verified === true &&
        claims.email === SHOPIFY_HOSTED.maintenanceIdentity &&
        claims.aud === SHOPIFY_HOSTED.maintenanceAudience &&
        claims.exp * 1000 > Date.now()
      );
    } catch {
      return false;
    } finally {
      currentSignal = undefined;
    }
  };
}

/** Separate private admission; never trusts a scheduler/header label as identity. */
export class ShopifyMaintenance {
  private active = false;
  private arrivals: number[] = [];
  constructor(
    private readonly cleanup: Pick<ShopifyCleanup, "sweep">,
    private readonly verify: MaintenanceVerifier,
    private readonly diagnostic = cleanupDiagnostic,
    private readonly clock = Date.now,
  ) {}
  async run(authorization: string | undefined, signal: AbortSignal) {
    if (
      !authorization ||
      authorization.length > MAINTENANCE.tokenBytes ||
      !/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u.test(
        authorization,
      )
    )
      return deny("FORBIDDEN", 403);
    const now = this.clock();
    this.arrivals = this.arrivals.filter((at) => at > now - 60000);
    if (this.active || this.arrivals.length >= MAINTENANCE.arrivalsPerMinute)
      return deny("BUSY", 429);
    this.arrivals.push(now);
    this.active = true;
    const authOwner = new AbortController(),
      authSignal = AbortSignal.any([signal, authOwner.signal]),
      authTimer = setTimeout(() => authOwner.abort(), MAINTENANCE.authMs);
    let removeAbort: (() => void) | undefined;
    try {
      const verified = await new Promise<boolean>((resolve, reject) => {
        const aborted = () => reject(new OperationFailure("DEADLINE", 504));
        removeAbort = () => authSignal.removeEventListener("abort", aborted);
        authSignal.addEventListener("abort", aborted, { once: true });
        if (authSignal.aborted) return aborted();
        void this.verify(authorization.slice(7), authSignal).then(
          resolve,
          reject,
        );
      });
      if (!verified) return deny("FORBIDDEN", 403);
      if (signal.aborted) return deny("DEADLINE", 504);
      const result = await this.cleanup.sweep(signal);
      this.diagnostic(
        result.claimed ? "completed" : "leased",
        result.calls,
        result.visited,
      );
      return { schemaVersion: 1, ...result };
    } finally {
      clearTimeout(authTimer);
      removeAbort?.();
      authOwner.abort();
      this.active = false;
    }
  }
}

/** IAM-private Cloud Run plus verified OIDC; no public Next forwarding operation. */
export function shopifyMaintenanceRoutes(
  app: Express,
  maintenance: ShopifyMaintenance | undefined,
) {
  if (!maintenance) return;
  app.post(MAINTENANCE.path, async (req, res) => {
    if (
      Object.keys(req.query).length ||
      req.headers["transfer-encoding"] ||
      (req.headers["content-length"] && req.headers["content-length"] !== "0")
    ) {
      res.set("Connection", "close");
      return deny("INVALID_INPUT", 400);
    }
    const owner = new AbortController(),
      stop = () => owner.abort(),
      timer = setTimeout(stop, MAINTENANCE.requestMs);
    req.once("aborted", stop);
    res.once("close", stop);
    try {
      res.json(await maintenance.run(req.headers.authorization, owner.signal));
    } finally {
      clearTimeout(timer);
      req.removeListener("aborted", stop);
      res.removeListener("close", stop);
      owner.abort();
    }
  });
}
