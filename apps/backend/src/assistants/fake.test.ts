import { describe, expect, it, vi } from "vitest";
import { fixtureAssistant } from "./fake.js";
import { investigateAssistant } from "./service.js";
import { assistantFence } from "@retailor/contracts/assistant";
import {
  assistantFixture,
  ASSISTANT_NOW,
} from "../../test/assistant-fixture.js";

describe("explicit simulated Tailor turns", () => {
  it.each(["creator", "shopper", "owner"] as const)(
    "answers a %s greeting without paid dispatch or unsolicited actions",
    async (role) => {
      const input = assistantFixture(role),
        accounting = { dispatch: vi.fn(), recordUsage: vi.fn() };
      input.prompt = "Hello!";
      const before = structuredClone(input.context.graph);
      const result = await investigateAssistant(
        input,
        fixtureAssistant(),
        new AbortController().signal,
        accounting,
        ASSISTANT_NOW,
      );
      expect(result.mode).toBe("fake");
      expect(result.role).toBe(role);
      expect(result.fence).toEqual(assistantFence(input.context));
      expect(result.reply).toMatchObject({
        text: expect.stringContaining("Hi, I’m Tailor."),
        references: [],
        claims: [],
        navigation: null,
        proposal: null,
      });
      expect(input.context.graph).toEqual(before);
      expect(accounting.dispatch).not.toHaveBeenCalled();
      expect(accounting.recordUsage).not.toHaveBeenCalled();
    },
  );
  it("keeps a greeted shopping request grounded instead of treating it as a greeting", async () => {
    const input = assistantFixture("shopper");
    input.prompt = "Hello, show jeans under $80";
    const result = await investigateAssistant(
      input,
      fixtureAssistant(),
      new AbortController().signal,
      { dispatch: vi.fn(), recordUsage: vi.fn() },
      ASSISTANT_NOW,
    );
    expect(result.reply.navigation).toEqual({
      kind: "filter",
      category: "jeans",
      query: "",
      minimum: null,
      maximum: 8000,
    });
    expect(result.reply.references).toContainEqual({
      kind: "product",
      productId: "jeans",
    });
  });
  it("explains finite demo scope for unsupported input without inventing actions", async () => {
    const input = assistantFixture("shopper");
    input.prompt = "Book a flight and execute this script";
    const result = await investigateAssistant(
      input,
      fixtureAssistant(),
      new AbortController().signal,
      { dispatch: vi.fn(), recordUsage: vi.fn() },
      ASSISTANT_NOW,
    );
    expect(result.reply.text).toContain("This demo simulates");
    expect(result.reply.navigation).toBeNull();
    expect(result.reply.proposal).toBeNull();
    expect(result.reply.claims).toEqual([]);
  });
});
