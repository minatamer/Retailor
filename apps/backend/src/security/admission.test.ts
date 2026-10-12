import { describe, expect, it, vi } from "vitest";
import { PaidAdmission } from "./admission.js";
import { action } from "../../../../test/fixtures/recognition.js";
import { turnstile } from "./turnstile.js";
import type { AssistantAction } from "@retailor/contracts/assistant";
import type { LogoAction } from "@retailor/contracts/brand";
describe("action-bound one-use paid admission", () => {
  const secret = "s".repeat(32);
  it("binds exact logo context, shares paid capacity and retains both batch reservations without a third dispatch", async () => {
    const created = Date.now();
    const gate = new PaidAdmission({
      secret,
      budgetMicroUsd: 10_000_000,
      clock: () => created,
      challenge: { verify: async () => true },
    });
    const safety = gate.safety(undefined).identity;
    const logo = (operationId: string): LogoAction => ({
      schemaVersion: 1,
      action: "logos",
      mode: "live",
      workspaceId: "logos_workspace",
      operationId,
      createdAt: new Date(created).toISOString(),
      expiresAt: new Date(created + 7200000).toISOString(),
      nameDigest: "a".repeat(64),
      theme: "ink",
      typography: "editorial",
      designRevision: 1,
      count: 3,
      promptPolicy: "clothing-brand-v1",
      outputPolicy: "transparent-png-v1",
      disclosureVersion: "brand-context-v1",
    });
    const first = logo("logo_1"),
      grant = await gate.admit(
        first,
        "proof",
        safety,
        new AbortController().signal,
      );
    expect(() =>
      gate.beginLogos({ ...first, theme: "pine" }, grant.grant, safety),
    ).toThrow("FORBIDDEN");
    expect(() =>
      gate.beginLogos(
        { ...first, nameDigest: "b".repeat(64) },
        grant.grant,
        safety,
      ),
    ).toThrow("FORBIDDEN");
    const lease = gate.beginLogos(first, grant.grant, safety);
    const text = {
      schemaVersion: 1,
      action: "assistant",
      mode: "live",
      role: "owner",
      workspaceId: first.workspaceId,
      operationId: "text",
      scenarioId: "story",
      dataRevision: 0,
      createdAt: first.createdAt,
      expiresAt: first.expiresAt,
      disclosureVersion: "tailor-context-v1",
      digest: "a".repeat(64),
    };
    const textGrant = await gate.admit(
      text,
      "proof",
      safety,
      new AbortController().signal,
    );
    expect(() => gate.beginAssistant(text, textGrant.grant, safety)).toThrow(
      "BUSY",
    );
    lease.dispatch();
    lease.finish();
    expect(gate.counters()).toEqual({ active: 0, reservedMicroUsd: 2_000_000 });
    expect(() => gate.beginLogos(first, grant.grant, safety)).toThrow(
      "FORBIDDEN",
    );
    const retry = logo("logo_2"),
      retryGrant = await gate.admit(
        retry,
        "proof",
        safety,
        new AbortController().signal,
      );
    const second = gate.beginLogos(retry, retryGrant.grant, safety);
    second.dispatch();
    second.recordUsage({ input: 100, output: 20000 });
    second.finish();
    expect(gate.counters()).toEqual({ active: 0, reservedMicroUsd: 4_000_000 });
    expect(gate.usageCounters()).toEqual({
      inputTokens: 100,
      outputTokens: 20000,
      unknownDispatches: 1,
    });
    await expect(
      gate.admit(logo("logo_3"), "proof", safety, new AbortController().signal),
    ).rejects.toThrow("FORBIDDEN");
    const textLease = gate.beginAssistant(text, textGrant.grant, safety);
    textLease.finish();
    expect(gate.counters().reservedMicroUsd).toBe(4_000_000);
  });
  const textAction = (
    operationId: string,
    created: number,
    role: AssistantAction["role"] = "owner",
  ): AssistantAction => ({
    schemaVersion: 1,
    action: "assistant",
    mode: "live",
    role,
    workspaceId: "workspace",
    operationId,
    scenarioId: "story",
    dataRevision: 0,
    createdAt: new Date(created).toISOString(),
    expiresAt: new Date(created + 7200000).toISOString(),
    disclosureVersion: "tailor-context-v1",
    digest: "a".repeat(64),
  });
  it("binds text roles/digests, shares catalogue capacity and caps combined text dispatches", async () => {
    const start = Date.now();
    let now = start;
    const verify = vi.fn(
        async (_proof: string, _action: "catalogue" | "assistant" | "logos") =>
          true,
      ),
      gate = new PaidAdmission({
        secret,
        budgetMicroUsd: 20000000,
        clock: () => now,
        challenge: { verify },
      });
    const safety = gate.safety(undefined).identity,
      signal = new AbortController().signal;
    const vision = action("workspace", "vision", start),
      approval = await gate.admit(vision, "proof", safety, signal),
      lease = gate.begin(vision, approval.grant, safety);
    const text = textAction("first", start),
      admitted = await gate.admit(text, "proof", safety, signal);
    expect(verify.mock.calls.at(-1)?.[1]).toBe("assistant");
    expect(() =>
      gate.beginAssistant({ ...text, role: "shopper" }, admitted.grant, safety),
    ).toThrow("FORBIDDEN");
    expect(() =>
      gate.beginAssistant(
        { ...text, digest: "b".repeat(64) },
        admitted.grant,
        safety,
      ),
    ).toThrow("FORBIDDEN");
    expect(() => gate.beginAssistant(text, admitted.grant, safety)).toThrow(
      "BUSY",
    );
    lease.finish();
    const first = gate.beginAssistant(text, admitted.grant, safety);
    first.dispatch();
    first.finish();
    for (let i = 1; i < 12; i++) {
      now += 60001;
      const value = textAction(
          `turn_${i}`,
          start,
          i % 2 ? "creator" : "shopper",
        ),
        grant = await gate.admit(value, "proof", safety, signal),
        owned = gate.beginAssistant(value, grant.grant, safety);
      owned.dispatch();
      owned.finish();
    }
    now += 60001;
    await expect(
      gate.admit(textAction("over", start), "proof", safety, signal),
    ).rejects.toThrow("FORBIDDEN");
    expect(gate.counters()).toEqual({ active: 0, reservedMicroUsd: 12000000 });
  });
  it("limits text challenges to six per minute without consuming catalogue challenge allowance", async () => {
    const now = Date.now(),
      verify = vi.fn(async () => true),
      gate = new PaidAdmission({
        secret,
        budgetMicroUsd: 20000000,
        clock: () => now,
        challenge: { verify },
      }),
      safety = gate.safety(undefined).identity,
      signal = new AbortController().signal;
    for (let i = 0; i < 6; i++)
      await gate.admit(textAction(`text_${i}`, now), "proof", safety, signal);
    await expect(
      gate.admit(textAction("text_over", now), "proof", safety, signal),
    ).rejects.toThrow("BUSY");
    expect(
      (
        await gate.admit(
          action("workspace", "vision", now),
          "proof",
          safety,
          signal,
        )
      ).grant,
    ).toBeTruthy();
    expect(verify).toHaveBeenCalledTimes(7);
  });
  it("does not let repeated invalid challenges exhaust the workspace ledger", async () => {
    const start = Date.now();
    let now = start;
    const gate = new PaidAdmission({
      secret,
      budgetMicroUsd: 1_000_000,
      clock: () => now,
      challenge: { verify: async (proof) => proof === "valid" },
    });
    for (let i = 0; i < 300; i++) {
      now = start + Math.floor(i / 12) * 60_001;
      await expect(
        gate.admit(
          action(`invalid${i}`, "operation", now),
          "invalid",
          gate.safety(undefined).identity,
          new AbortController().signal,
        ),
      ).rejects.toThrow("FORBIDDEN");
    }
    now += 60_001;
    expect(
      (
        await gate.admit(
          action("valid", "operation", now),
          "valid",
          gate.safety(undefined).identity,
          new AbortController().signal,
        )
      ).grant.length,
    ).toBeGreaterThan(0);
  });
  it("binds the exact input revision, safety identity, expiry and process boot", async () => {
    const gate = new PaidAdmission({
      secret,
      budgetMicroUsd: 5_000_000,
      challenge: { verify: async () => true },
    });
    const safety = gate.safety(undefined),
      value = action();
    expect(gate.safety(safety.cookie).identity).toBe(safety.identity);
    const approval = await gate.admit(
      value,
      "proof",
      safety.identity,
      new AbortController().signal,
    );
    expect(() =>
      gate.begin(
        { ...value, inputRevision: 1 },
        approval.grant,
        safety.identity,
      ),
    ).toThrow("FORBIDDEN");
    expect(() => gate.begin(value, approval.grant, "foreign")).toThrow(
      "FORBIDDEN",
    );
    const reboot = new PaidAdmission({
      secret,
      budgetMicroUsd: 5_000_000,
      challenge: { verify: async () => true },
    });
    expect(() => reboot.begin(value, approval.grant, safety.identity)).toThrow(
      "FORBIDDEN",
    );
    const lease = gate.begin(value, approval.grant, safety.identity);
    expect(() => gate.begin(value, approval.grant, safety.identity)).toThrow(
      "FORBIDDEN",
    );
    lease.dispatch();
    expect(() => lease.dispatch()).toThrow("FORBIDDEN");
    lease.finish();
    lease.finish();
    expect(gate.counters()).toEqual({ active: 0, reservedMicroUsd: 1_000_000 });
    expect(gate.usageCounters()).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      unknownDispatches: 1,
    });
    expect(() => gate.begin(value, approval.grant, safety.identity)).toThrow(
      "FORBIDDEN",
    );
  });
  it("reserves before images, releases only pre-dispatch and enforces two process slots", async () => {
    const gate = new PaidAdmission({
      secret,
      budgetMicroUsd: 3_000_000,
      challenge: { verify: async () => true },
    });
    const leases = [];
    for (let i = 0; i < 3; i++) {
      const value = action(`workspace${i}`),
        safety = gate.safety(undefined).identity;
      const approval = await gate.admit(
        value,
        "proof",
        safety,
        new AbortController().signal,
      );
      if (i < 2) leases.push(gate.begin(value, approval.grant, safety));
      else
        expect(() => gate.begin(value, approval.grant, safety)).toThrow("BUSY");
    }
    expect(gate.counters()).toEqual({ active: 2, reservedMicroUsd: 2_000_000 });
    leases[0]!.finish();
    expect(gate.counters().reservedMicroUsd).toBe(1_000_000);
    leases[1]!.dispatch();
    leases[1]!.recordUsage({ input: 100, output: 200 });
    leases[1]!.recordUsage({ input: 999, output: 999 });
    leases[1]!.finish();
    expect(gate.usageCounters()).toEqual({
      inputTokens: 100,
      outputTokens: 200,
      unknownDispatches: 0,
    });
    expect(gate.counters().reservedMicroUsd).toBe(1_000_000);
  });
  it("fences concurrent proof replay, caps deliberate dispatches and expires grants", async () => {
    let now = Date.now(),
      release!: (value: boolean) => void;
    const verify = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          release = resolve;
        }),
    );
    const gate = new PaidAdmission({
      secret,
      budgetMicroUsd: 4_000_000,
      clock: () => now,
      challenge: { verify },
    });
    const safety = gate.safety(undefined).identity,
      value = action("workspace", "one", now);
    const pending = gate.admit(
      value,
      "proof",
      safety,
      new AbortController().signal,
    );
    await expect(
      gate.admit(value, "proof", safety, new AbortController().signal),
    ).rejects.toThrow("FORBIDDEN");
    expect(verify).toHaveBeenCalledTimes(1);
    release(true);
    const first = await pending;
    const lease = gate.begin(value, first.grant, safety);
    lease.dispatch();
    lease.finish();
    verify.mockImplementation(async () => true);
    const secondAction = { ...value, operationId: "two" };
    const second = await gate.admit(
      secondAction,
      "proof",
      safety,
      new AbortController().signal,
    );
    const lease2 = gate.begin(secondAction, second.grant, safety);
    lease2.dispatch();
    lease2.finish();
    now += 600_001;
    await expect(
      gate.admit(
        { ...value, operationId: "three" },
        "proof",
        safety,
        new AbortController().signal,
      ),
    ).rejects.toThrow("FORBIDDEN");
    const other = action("other", "expiry", now),
      identity = gate.safety(undefined).identity;
    const expired = await gate.admit(
      other,
      "proof",
      identity,
      new AbortController().signal,
    );
    now += 120_001;
    expect(() => gate.begin(other, expired.grant, identity)).toThrow(
      "FORBIDDEN",
    );
  });
  it("keeps explicit zero budget closed and never grants invalid challenges", async () => {
    const verify = vi.fn(async (proof: string) => proof === "valid");
    const gate = new PaidAdmission({
      secret,
      budgetMicroUsd: 0,
      challenge: { verify },
    });
    const safety = gate.safety(undefined).identity;
    await expect(
      gate.admit(action(), "invalid", safety, new AbortController().signal),
    ).rejects.toThrow("UNAVAILABLE");
    await expect(
      gate.admit(
        action("other"),
        "valid",
        safety,
        new AbortController().signal,
      ),
    ).rejects.toThrow("UNAVAILABLE");
    expect(verify).not.toHaveBeenCalled();
    expect(gate.counters().reservedMicroUsd).toBe(0);
  });
});
describe("fixed Turnstile validation", () => {
  it("requires success, exact hostname and catalogue action; sends no IP", async () => {
    let result: unknown = {
      success: true,
      hostname: "store.example",
      action: "catalogue",
    };
    const io = vi.fn<typeof fetch>(async () => Response.json(result));
    const verifier = turnstile("server-secret", "https://store.example", io);
    expect(
      await verifier.verify("proof", "catalogue", new AbortController().signal),
    ).toBe(true);
    expect(io.mock.calls[0]![0]).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    );
    expect(JSON.parse(String(io.mock.calls[0]![1]!.body))).toEqual({
      secret: "server-secret",
      response: "proof",
    });
    for (result of [
      { success: false },
      { success: true, hostname: "foreign.example", action: "catalogue" },
      { success: true, hostname: "store.example", action: "logos" },
      { success: true },
    ])
      expect(
        await verifier.verify(
          "proof",
          "catalogue",
          new AbortController().signal,
        ),
      ).toBe(false);
  });
  it("rejects oversized or cancelled upstream bodies without retries", async () => {
    const oversized = vi.fn<typeof fetch>(
      async () => new Response("x".repeat(8193)),
    );
    expect(
      await turnstile("secret", "https://store.example", oversized).verify(
        "proof",
        "catalogue",
        new AbortController().signal,
      ),
    ).toBe(false);
    expect(oversized).toHaveBeenCalledTimes(1);
    const owned = new AbortController();
    const io = vi.fn<typeof fetch>(async () => {
      owned.abort();
      return Response.json({
        success: true,
        hostname: "store.example",
        action: "catalogue",
      });
    });
    expect(
      await turnstile("secret", "https://store.example", io).verify(
        "proof",
        "catalogue",
        owned.signal,
      ),
    ).toBe(false);
  });
});
