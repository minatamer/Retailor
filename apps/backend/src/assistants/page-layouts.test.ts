import { describe, expect, it, vi } from "vitest";
import { AssistantToolArgumentsSchema } from "@retailor/contracts/assistant";
import {
  assistantFixture,
  ASSISTANT_NOW,
} from "../../test/assistant-fixture.js";
import { prepareAssistantContext, modelProjection } from "./context.js";
import { executeAssistantTool } from "./tools.js";
import { proposalValid } from "./grounding.js";
import { investigateAssistant } from "./service.js";
import { fixtureAssistant } from "./fake.js";

const mixed = {
  home: "studio",
  collection: "pulse",
  product: "gallery",
} as const;
const args = () =>
  AssistantToolArgumentsSchema.parse(
    Object.fromEntries(
      Object.keys(AssistantToolArgumentsSchema.shape).map((key) => [key, null]),
    ),
  );
describe("bounded optional page-layout proposals", () => {
  it.each(["creator", "owner"] as const)(
    "allows %s to preview a strict map without changing their graph/design",
    (role) => {
      const payload = assistantFixture(role),
        before = JSON.stringify(payload),
        prepared = prepareAssistantContext(payload, ASSISTANT_NOW);
      const result = executeAssistantTool(prepared, "previewStoreDesign", {
        ...args(),
        pageTemplates: mixed,
      });
      expect(result.proposal).toEqual({
        kind: "design",
        template: null,
        pageTemplates: mixed,
        theme: null,
        typography: null,
      });
      expect(proposalValid(prepared, result.proposal!)).toBe(true);
      expect(modelProjection(prepared).design).toEqual(payload.context.design);
      expect(JSON.stringify(payload)).toBe(before);
    },
  );
  it("rejects shoppers and foreign/partial mapping arguments", () => {
    const shopper = prepareAssistantContext(
      assistantFixture("shopper"),
      ASSISTANT_NOW,
    );
    expect(() =>
      executeAssistantTool(shopper, "previewStoreDesign", {
        ...args(),
        pageTemplates: mixed,
      }),
    ).toThrow();
    expect(
      proposalValid(shopper, {
        kind: "design",
        template: null,
        pageTemplates: mixed,
        theme: null,
        typography: null,
      }),
    ).toBe(false);
    const creator = prepareAssistantContext(
      assistantFixture("creator"),
      ASSISTANT_NOW,
    );
    for (const pageTemplates of [
      { home: "studio" },
      { ...mixed, product: "unknown" },
      { ...mixed, script: "run" },
    ])
      expect(() =>
        executeAssistantTool(creator, "previewStoreDesign", {
          ...args(),
          pageTemplates,
        }),
      ).toThrow();
    expect(() =>
      executeAssistantTool(creator, "getDesignPresets", {
        ...args(),
        pageTemplates: mixed,
      }),
    ).toThrow();
  });
  it.each([
    "Studio home, Pulse collection, Gallery product",
    "home Studio collection Pulse product Gallery",
  ])("simulates a complete inert combination: %s", async (prompt) => {
    const payload = assistantFixture("creator");
    payload.prompt = prompt;
    const before = JSON.stringify(payload.context.graph),
      dispatch = vi.fn();
    const result = await investigateAssistant(
      payload,
      fixtureAssistant(),
      new AbortController().signal,
      { dispatch, recordUsage: vi.fn() },
      ASSISTANT_NOW,
    );
    expect(result.reply.proposal).toMatchObject({
      kind: "design",
      pageTemplates: mixed,
    });
    expect(dispatch).not.toHaveBeenCalled();
    expect(JSON.stringify(payload.context.graph)).toBe(before);
  });
  it("preserves other page assignments in a one-page request and supports the whole-store reset", async () => {
    const payload = assistantFixture("owner");
    payload.context.design.pageTemplates = mixed;
    payload.prompt = "Use Pulse for the product page";
    const run = () =>
      investigateAssistant(
        payload,
        fixtureAssistant(),
        new AbortController().signal,
        { dispatch: vi.fn(), recordUsage: vi.fn() },
        ASSISTANT_NOW,
      );
    expect((await run()).reply.proposal).toMatchObject({
      pageTemplates: { ...mixed, product: "pulse" },
    });
    payload.prompt = "Use Gallery for all pages";
    expect((await run()).reply.proposal).toMatchObject({
      template: "gallery",
      pageTemplates: null,
    });
    for (const prompt of [
      "Studio home and Gallery home",
      "Do not use Gallery for the product page",
      "Gallery for home and product",
      "Mix layouts",
    ]) {
      payload.prompt = prompt;
      expect((await run()).reply.proposal).toBeNull();
    }
  });
});
