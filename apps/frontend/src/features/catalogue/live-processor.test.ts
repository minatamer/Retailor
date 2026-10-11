import { describe, it, expect, vi } from "vitest";
import { action } from "../../../../../test/fixtures/recognition.js";
import { liveProcessor } from "./live-processor";
import { publicError } from "@retailor/contracts/api";
function input() {
  const value = action();
  return {
    ...value,
    signal: new AbortController().signal,
    derivatives: new Map([
      ["source", new Blob([new Uint8Array(1000)], { type: "image/jpeg" })],
    ]),
    step: vi.fn(),
  };
}
function liveConfig() {
  return {
    schemaVersion: 1,
    mode: "live",
    paidEnabled: true,
    admissionSiteKey: "public-site-key",
    vision: { available: true, reason: "ready" },
    tailor: { available: false, reason: "not-implemented" },
    logos: { available: false, reason: "not-implemented" },
    eur: { available: false, reason: "not-implemented" },
  };
}
function draft(value: ReturnType<typeof input>) {
  return {
    schemaVersion: 1,
    operationId: value.operationId,
    inputRevision: value.inputRevision,
    mode: "live",
    photos: value.photos,
    items: [],
    dispositions: [
      {
        photoId: "source",
        kind: "rejected",
        reason: "Outside clothing scope.",
      },
    ],
    corrections: [],
  };
}
describe("deliberate shared sample/upload live pipeline", () => {
  it("does no admission on unavailable fake capability and returns an honest error", async () => {
    const io = vi.fn<typeof fetch>(async () =>
      Response.json({
        ...liveConfig(),
        mode: "fake",
        paidEnabled: false,
        admissionSiteKey: null,
      }),
    );
    const proof = vi.fn(async () => "proof"),
      processor = liveProcessor(proof, io);
    expect(io).not.toHaveBeenCalled();
    await expect(processor.interpret(input())).rejects.toThrow("unavailable");
    expect(io).toHaveBeenCalledTimes(1);
    expect(proof).not.toHaveBeenCalled();
  });
  it("binds one request and transfers only the owned derivative with manifest first", async () => {
    const value = input();
    const io = vi.fn<typeof fetch>(async (url, request) => {
      if (url === "/api/retailor/v1/config") return Response.json(liveConfig());
      if (url === "/api/retailor/v1/admission") {
        const body = JSON.parse(String(request!.body));
        expect(body.action).toMatchObject({
          workspaceId: value.workspaceId,
          operationId: value.operationId,
          inputRevision: 0,
          disclosureVersion: "catalogue-previews-v1",
          photos: value.photos,
        });
        expect(body.challengeProof).toBe("proof");
        return Response.json({
          schemaVersion: 1,
          operationId: value.operationId,
          grant: "bound-grant",
          expiresAt: new Date(Date.now() + 120000).toISOString(),
        });
      }
      expect(url).toBe("/api/retailor/v1/catalogue/interpret");
      const form = request!.body as FormData;
      expect([...form.keys()]).toEqual(["manifest", "source"]);
      expect((form.get("source") as Blob).size).toBe(1000);
      expect(JSON.parse(String(form.get("manifest"))).grant).toBe(
        "bound-grant",
      );
      return Response.json({
        schemaVersion: 1,
        workspaceId: value.workspaceId,
        operationId: value.operationId,
        inputRevision: 0,
        mode: "live",
        draft: draft(value),
      });
    });
    expect(
      (await liveProcessor(async () => "proof", io).interpret(value)).photos,
    ).toEqual(value.photos);
    expect(io).toHaveBeenCalledTimes(3);
    expect(value.step.mock.calls.map((call) => call[0])).toEqual([
      "Approving this request",
      "Drafting products",
      "Validating catalogue",
    ]);
  });
  it("rejects stale or failed result without a fallback or automatic second attempt", async () => {
    for (const error of [false, true]) {
      const value = input();
      const io = vi.fn<typeof fetch>(async (url) =>
        url === "/api/retailor/v1/config"
          ? Response.json(liveConfig())
          : url === "/api/retailor/v1/admission"
            ? Response.json({
                schemaVersion: 1,
                operationId: value.operationId,
                grant: "grant",
                expiresAt: new Date(Date.now() + 120000).toISOString(),
              })
            : error
              ? Response.json(publicError("DEADLINE", "request_test"), {
                  status: 504,
                })
              : Response.json({
                  schemaVersion: 1,
                  workspaceId: "foreign",
                  operationId: value.operationId,
                  inputRevision: 0,
                  mode: "live",
                  draft: draft(value),
                }),
      );
      await expect(
        liveProcessor(async () => "proof", io).interpret(value),
      ).rejects.toThrow();
      expect(io).toHaveBeenCalledTimes(3);
    }
  });
  it("cancels before admission when the owned challenge is aborted", async () => {
    const value = input(),
      owner = new AbortController();
    value.signal = owner.signal;
    const io = vi.fn<typeof fetch>(async () => Response.json(liveConfig()));
    await expect(
      liveProcessor(async () => {
        owner.abort();
        return "proof";
      }, io).interpret(value),
    ).rejects.toThrow();
    expect(io).toHaveBeenCalledTimes(1);
  });
});
