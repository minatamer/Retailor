import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { z } from "zod";
import {
  parseCatalogueAction,
  RECOGNITION_LIMITS,
} from "@retailor/contracts/recognition";
import type { CatalogueAction } from "@retailor/contracts/recognition";
import { deny } from "./errors.js";

export interface ChallengeVerifier {
  verify(
    proof: string,
    action: "catalogue",
    signal: AbortSignal,
  ): Promise<boolean>;
}
const ClaimsSchema = z.strictObject({
  v: z.literal(1),
  boot: z.string().max(64),
  safety: z.string().max(64),
  workspace: z.string().max(40),
  operation: z.string().max(40),
  digest: z.string().length(64),
  nonce: z.string().max(64),
  until: z.number().int().nonnegative(),
});
const CookieSchema = z.strictObject({
  v: z.literal(1),
  boot: z.string().max(64),
  safety: z.string().max(64),
  until: z.number().int().nonnegative(),
});
type Attempt = {
  digest: string;
  status: "verifying" | "granted" | "consumed" | "dispatched" | "terminal";
  nonce?: string;
  until: number;
};
type Workspace = {
  created: number;
  expires: number;
  attempts: number;
  operations: Map<string, Attempt>;
  admitted: boolean;
};
export const CATALOGUE_RESERVE_MICRO_USD = 1_000_000;
export interface AdmissionOptions {
  secret: string;
  challenge: ChallengeVerifier;
  budgetMicroUsd: number;
  clock?: () => number;
  id?: () => string;
  boot?: string;
}
/** Process-local and content-free. No provider or filesystem work occurs here. */
export class PaidAdmission {
  private readonly clock: () => number;
  private readonly id: () => string;
  private readonly boot: string;
  private readonly workspaces = new Map<string, Workspace>();
  private readonly rates = new Map<string, number[]>();
  private readonly leases = new Map<string, string>();
  private charged = 0;
  private inputTokens = 0;
  private outputTokens = 0;
  private unknownUsage = 0;
  constructor(private readonly options: AdmissionOptions) {
    if (
      options.secret.length < 32 ||
      !Number.isSafeInteger(options.budgetMicroUsd) ||
      options.budgetMicroUsd < 0
    )
      throw new Error("Admission requires an explicit safe secret and budget.");
    this.clock = options.clock ?? Date.now;
    this.id = options.id ?? randomUUID;
    this.boot = options.boot ?? this.id();
  }
  private mac(text: string) {
    return createHmac("sha256", this.options.secret).update(text).digest("hex");
  }
  private seal(value: unknown) {
    const text = Buffer.from(JSON.stringify(value)).toString("base64url");
    return `${text}.${this.mac(text)}`;
  }
  private unseal(token: string): unknown {
    if (token.length > 2048) return deny("FORBIDDEN", 403);
    const parts = token.split(".");
    if (
      parts.length !== 2 ||
      !/^[A-Za-z0-9_-]+$/u.test(parts[0]!) ||
      !/^[a-f0-9]{64}$/u.test(parts[1]!)
    )
      return deny("FORBIDDEN", 403);
    const expected = Buffer.from(this.mac(parts[0]!), "hex"),
      actual = Buffer.from(parts[1]!, "hex");
    if (!timingSafeEqual(expected, actual)) return deny("FORBIDDEN", 403);
    try {
      return JSON.parse(Buffer.from(parts[0]!, "base64url").toString("utf8"));
    } catch {
      return deny("FORBIDDEN", 403);
    }
  }
  safety(cookie: string | undefined) {
    if (cookie) {
      try {
        const parsed = CookieSchema.parse(this.unseal(cookie));
        if (
          parsed.boot === this.boot &&
          parsed.until > this.clock() &&
          parsed.until <= this.clock() + 7_200_000
        )
          return { identity: parsed.safety, cookie: undefined };
      } catch {
        /* Issue a fresh bounded safety identity, never trust caller labels. */
      }
    }
    const identity = this.id();
    return {
      identity,
      cookie: this.seal({
        v: 1,
        boot: this.boot,
        safety: identity,
        until: this.clock() + 7_200_000,
      }),
    };
  }
  private sweep() {
    const now = this.clock();
    for (const [id, value] of this.workspaces)
      if (value.expires <= now && !this.leases.has(id))
        this.workspaces.delete(id);
    for (const [key, values] of this.rates) {
      const current = values.filter((at) => at > now - 600_000);
      if (current.length) this.rates.set(key, current);
      else this.rates.delete(key);
    }
  }
  private action(input: unknown) {
    let value: CatalogueAction;
    try {
      value = parseCatalogueAction(input);
    } catch {
      return deny("INVALID_INPUT", 400);
    }
    const now = this.clock();
    if (Date.parse(value.createdAt) > now || Date.parse(value.expiresAt) <= now)
      return deny("STALE", 409);
    // Key order is established by the shared strict parser. No raw content/hash is logged.
    return { value, digest: this.mac(JSON.stringify(value)) };
  }
  private workspace(action: CatalogueAction) {
    let state = this.workspaces.get(action.workspaceId);
    if (!state) {
      if (this.workspaces.size >= 256) return deny("BUSY", 429);
      state = {
        created: Date.parse(action.createdAt),
        expires: Date.parse(action.expiresAt),
        attempts: 0,
        operations: new Map(),
        admitted: false,
      };
      this.workspaces.set(action.workspaceId, state);
    }
    if (
      state.created !== Date.parse(action.createdAt) ||
      state.expires !== Date.parse(action.expiresAt)
    )
      return deny("FORBIDDEN", 403);
    return state;
  }
  private rate(identity: string) {
    const now = this.clock(),
      local = this.rates.get(identity) ?? [],
      global = this.rates.get("global") ?? [];
    if (
      local.length >= 2 ||
      global.filter((at) => at > now - 60_000).length >= 12 ||
      (this.rates.size >= 1024 && !this.rates.has(identity))
    )
      return deny("BUSY", 429);
    this.rates.set(identity, [...local, now]);
    this.rates.set("global", [...global, now].slice(-120));
  }
  async admit(
    input: unknown,
    proof: string,
    safety: string,
    signal: AbortSignal,
  ) {
    signal.throwIfAborted();
    this.sweep();
    const { value, digest } = this.action(input);
    if (!this.hasBudget()) return deny("UNAVAILABLE", 503);
    if (typeof proof !== "string" || !proof.length || proof.length > 2048)
      return deny("INVALID_INPUT", 400);
    const existing = this.workspaces.get(value.workspaceId);
    if (
      existing &&
      (existing.attempts >= 2 ||
        existing.operations.has(value.operationId) ||
        existing.operations.size >= 24)
    )
      return deny("FORBIDDEN", 403);
    this.rate(safety);
    const state = this.workspace(value);
    const attempt: Attempt = {
      digest,
      status: "verifying",
      until: Math.min(this.clock() + RECOGNITION_LIMITS.grantMs, state.expires),
    };
    state.operations.set(value.operationId, attempt);
    try {
      if (!(await this.options.challenge.verify(proof, "catalogue", signal)))
        return deny("FORBIDDEN", 403);
      signal.throwIfAborted();
      if (this.clock() >= attempt.until) return deny("FORBIDDEN", 403);
      attempt.nonce = this.id();
      attempt.status = "granted";
      state.admitted = true;
      return {
        schemaVersion: 1 as const,
        operationId: value.operationId,
        grant: this.seal({
          v: 1,
          boot: this.boot,
          safety,
          workspace: value.workspaceId,
          operation: value.operationId,
          digest,
          nonce: attempt.nonce,
          until: attempt.until,
        }),
        expiresAt: new Date(attempt.until).toISOString(),
      };
    } catch (error) {
      attempt.status = "terminal";
      if (
        !state.admitted &&
        this.workspaces.get(value.workspaceId) === state &&
        [...state.operations.values()].every(
          (operation) => operation.status !== "verifying",
        )
      )
        this.workspaces.delete(value.workspaceId);
      throw error;
    }
  }
  /** Reserve before allocating image buffers. Any rejected body consumes its grant,
   * but only dispatch spends an attempt. Release pre-dispatch reservation on failure. */
  begin(input: unknown, grant: string, safety: string) {
    this.sweep();
    const { value, digest } = this.action(input),
      parsed = ClaimsSchema.safeParse(this.unseal(grant));
    if (!parsed.success) return deny("FORBIDDEN", 403);
    const claims = parsed.data,
      state = this.workspaces.get(value.workspaceId),
      attempt = state?.operations.get(value.operationId);
    if (
      claims.boot !== this.boot ||
      claims.safety !== safety ||
      claims.workspace !== value.workspaceId ||
      claims.operation !== value.operationId ||
      claims.digest !== digest ||
      claims.until <= this.clock() ||
      claims.until > this.clock() + RECOGNITION_LIMITS.grantMs ||
      !attempt ||
      attempt.status !== "granted" ||
      claims.nonce !== attempt.nonce ||
      attempt.digest !== digest ||
      claims.until !== attempt.until
    )
      return deny("FORBIDDEN", 403);
    if (!state || state.attempts >= RECOGNITION_LIMITS.attempts)
      return deny("FORBIDDEN", 403);
    const reserve = CATALOGUE_RESERVE_MICRO_USD; // Provisional allowance, not an actual price claim.
    if (!this.hasBudget()) return deny("UNAVAILABLE", 503);
    if (this.leases.has(value.workspaceId) || this.leases.size >= 2)
      return deny("BUSY", 429);
    const lease = this.id();
    this.leases.set(value.workspaceId, lease);
    this.charged += reserve;
    attempt.status = "consumed";
    let dispatched = false,
      released = false,
      observedUsage = false;
    return {
      action: value,
      dispatch: () => {
        if (
          released ||
          dispatched ||
          this.leases.get(value.workspaceId) !== lease ||
          this.clock() >= state.expires
        )
          return deny("FORBIDDEN", 403);
        state.attempts++;
        dispatched = true;
        attempt.status = "dispatched";
      },
      recordUsage: (usage: { input: number; output: number }) => {
        if (
          !dispatched ||
          released ||
          observedUsage ||
          !Number.isSafeInteger(usage.input) ||
          !Number.isSafeInteger(usage.output) ||
          usage.input < 0 ||
          usage.input > 1_050_000 ||
          usage.output < 0 ||
          usage.output > RECOGNITION_LIMITS.outputTokens
        )
          return;
        observedUsage = true;
        this.inputTokens += usage.input;
        this.outputTokens += usage.output;
      },
      finish: () => {
        if (released) return;
        released = true;
        attempt.status = "terminal";
        if (this.leases.get(value.workspaceId) === lease)
          this.leases.delete(value.workspaceId);
        if (!dispatched) this.charged -= reserve;
        else if (!observedUsage) this.unknownUsage++;
        // Until actual pricing/usage acceptance, retain the conservative dispatched
        // reserve even on success. Never return unknown usage to the spend pool.
      },
    };
  }
  counters() {
    return Object.freeze({
      active: this.leases.size,
      reservedMicroUsd: this.charged,
    });
  }
  usageCounters() {
    return Object.freeze({
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      unknownDispatches: this.unknownUsage,
    });
  }
  hasBudget() {
    return (
      this.charged + CATALOGUE_RESERVE_MICRO_USD <= this.options.budgetMicroUsd
    );
  }
}
