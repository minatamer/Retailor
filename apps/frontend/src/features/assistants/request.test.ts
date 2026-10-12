import { afterEach, describe, expect, it, vi } from "vitest";
import { environment } from "../../../test/workspace";
import { assistantRequester } from "./request";
import { currentAssistantContext } from "./context";
import { assistantFence } from "@retailor/contracts/assistant";
import type { AssistantPayload } from "@retailor/contracts/assistant";
import { publicError } from "@retailor/contracts/api";
const environments: ReturnType<typeof environment>[] = [];
afterEach(() => environments.splice(0).forEach((e) => e.dispose()));
const config = {
  schemaVersion: 1,
  mode: "fake",
  paidEnabled: false,
  admissionSiteKey: null,
  vision: { available: false, reason: "paid-disabled" },
  tailor: { available: true, reason: "fixture" },
  logos: { available: false, reason: "paid-disabled" },
  eur: { available: true, reason: "fixture" },
};
async function payload(): Promise<AssistantPayload> {
  const e = environment();
  environments.push(e);
  const c = await e.open();
  return {
    schemaVersion: 1,
    mode: "fake",
    operationId: "turn",
    prompt: "Help",
    history: [],
    context: currentAssistantContext(
      c.getSnapshot().state,
      c.photos.availableIds(),
    ),
  };
}
describe("deliberate fixed-route assistant request", () => {
  it("validates exact result identity and sends no photos, grants or challenge in fake mode", async () => {
    const p = await payload(),
      io = vi.fn<typeof fetch>(async (url) =>
        String(url).endsWith("config")
          ? Response.json(config)
          : Response.json({
              schemaVersion: 1,
              mode: "fake",
              role: "shopper",
              operationId: "turn",
              fence: assistantFence(p.context),
              sensitivity: {
                currency: true,
                scope: false,
                design: false,
                filters: false,
              },
              reply: {
                text: "Current context.",
                references: [],
                claims: [],
                navigation: null,
                proposal: null,
              },
            }),
      ),
      proof = vi.fn();
    expect(
      (await assistantRequester(proof, io)(p, new AbortController().signal))
        .mode,
    ).toBe("fake");
    expect(proof).not.toHaveBeenCalled();
    expect(io).toHaveBeenCalledTimes(2);
    expect(io.mock.calls[1]![0]).toBe("/api/retailor/v1/assistant/shopper");
    const body = JSON.parse(String(io.mock.calls[1]![1]?.body));
    expect(body.action).toBeNull();
    expect(body.grant).toBeNull();
    expect(body.payload.context.availablePhotoIds).toEqual([]);
    expect(io.mock.calls[1]![1]).toMatchObject({
      redirect: "error",
      cache: "no-store",
      credentials: "same-origin",
    });
  });
  it("keeps live paid-off unavailable and preserves bounded errors without automatic retry", async () => {
    const p = await payload();
    p.mode = "live";
    const io = vi.fn<typeof fetch>(async () =>
        Response.json({
          ...config,
          mode: "live",
          tailor: { available: false, reason: "paid-disabled" },
        }),
      ),
      proof = vi.fn();
    await expect(
      assistantRequester(proof, io)(p, new AbortController().signal),
    ).rejects.toThrow("unavailable");
    expect(io).toHaveBeenCalledTimes(1);
    expect(proof).not.toHaveBeenCalled();
    p.mode = "fake";
    for (const response of [
      Response.json(publicError("UPSTREAM_FAILED", "req"), { status: 502 }),
      new Response("x".repeat(65537)),
    ]) {
      const failed = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(Response.json(config))
        .mockResolvedValueOnce(response);
      await expect(
        assistantRequester(undefined, failed)(p, new AbortController().signal),
      ).rejects.toThrow();
      expect(failed).toHaveBeenCalledTimes(2);
    }
  });
});
