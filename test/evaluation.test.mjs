import { describe, expect, it, vi } from "vitest";
import { inspectAssets } from "../scripts/evaluate/assets.mjs";
import { evaluationPlan } from "../scripts/evaluate/plan.mjs";
import { runFixture } from "../scripts/evaluate/fixture.mjs";
import { validateEvidence } from "../scripts/evaluate/evidence.mjs";
import { executeEvaluation } from "../scripts/evaluate/run.mjs";
const candidate = "a".repeat(40);
describe("bounded release evaluation preparation", () => {
  it("rejects paid execution without reading credentials or dispatching a transport", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    expect(await executeEvaluation(["--live"])).toMatchObject({
      execution: "paid-run-rejected",
      paidRequests: 0,
      liveAcceptance: "pending",
    });
    expect(fetcher).not.toHaveBeenCalled();
    await expect(executeEvaluation(["--fixture", "--live"])).rejects.toThrow();
  });
  it("freezes actual assets and exercises production gates without paid or external requests", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    const { inputs, publicRecord } = await inspectAssets();
    expect(publicRecord.photos).toHaveLength(19);
    expect(publicRecord.fonts).toHaveLength(5);
    expect(publicRecord.photoBytes).toBe(1824828);
    const plan = evaluationPlan(candidate, publicRecord);
    expect(plan).toMatchObject({
      paidAuthorized: false,
      maximum: {
        catalogueBatches: 2,
        assistantTurns: 7,
        logoBatches: 1,
        providerRequests: 24,
      },
    });
    expect(plan.cost.measuredMicroUsd).toBeNull();
    const result = await runFixture(candidate, inputs);
    expect(result.verdict).toBe("fixture-only-pass");
    expect(result.nativeCataloguePortCalls).toBe(1);
    expect(result.paidRequests).toBe(0);
    expect(result.controlledOperatingResultMinor).toBe(-10000);
    expect(
      result.rows.find((row) => row.caseId === "catalogue_sample"),
    ).toMatchObject({ inputCount: 19, outputCount: 19, httpStatus: 200 });
    expect(
      result.rows.find((row) => row.caseId === "catalogue_changed_bytes"),
    ).toMatchObject({ httpStatus: 400, errorCategory: "INVALID_INPUT" });
    expect(fetcher).not.toHaveBeenCalled();
    for (const row of result.rows) {
      expect(validateEvidence(JSON.stringify(row))).toEqual(row);
      expect(row.usage).toBeNull();
      expect(row.measuredCostMicroUsd).toBeNull();
      for (const key of [
        "prompt",
        "reply",
        "graph",
        "grant",
        "cookie",
        "apiKey",
        "providerOutput",
        "filename",
        "data",
      ])
        expect(Object.hasOwn(row, key)).toBe(false);
    }
  }, 30000);
  it("rejects raw content, forged identifiers and oversized operator records", () => {
    const row = {
      schemaVersion: 1,
      candidate,
      caseId: "shopper_category",
      execution: "owner-recorded-live",
      recordedAt: "2026-10-13T13:00:00.000Z",
      outcome: "unknown",
      durationMs: 20,
      requestIds: [],
      httpStatus: 200,
      providerRequests: 1,
      inputCount: 0,
      outputCount: 0,
      usage: null,
      measuredCostMicroUsd: null,
      errorCategory: "none",
    };
    expect(validateEvidence(JSON.stringify(row))).toEqual(row);
    expect(() =>
      validateEvidence(JSON.stringify({ ...row, prompt: "private content" })),
    ).toThrow();
    expect(() =>
      validateEvidence(
        JSON.stringify({ ...row, requestIds: ["sk-private-credential"] }),
      ),
    ).toThrow();
    expect(() => validateEvidence(" ".repeat(16385))).toThrow();
  });
});
