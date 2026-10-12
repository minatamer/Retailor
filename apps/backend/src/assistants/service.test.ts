import { describe, expect, it, vi } from "vitest";
import { investigateAssistant } from "./service.js";
import { fixtureAssistant } from "./fake.js";
import type { AssistantProvider, AssistantStep } from "./provider.js";
import {
  assistantFixture,
  ASSISTANT_NOW,
} from "../../test/assistant-fixture.js";
import { AssistantToolArgumentsSchema } from "@retailor/contracts/assistant";
import { generateScenario } from "@retailor/commerce/scenarios";
import { allActivityScope } from "@retailor/commerce/facts";
const args = AssistantToolArgumentsSchema.parse(
  Object.fromEntries(
    Object.keys(AssistantToolArgumentsSchema.shape).map((key) => [key, null]),
  ),
);
const final: AssistantStep = {
  kind: "reply",
  reply: {
    text: "Current evidence is ready.",
    references: [],
    claims: [],
    navigation: null,
    proposal: null,
  },
};
function provider(steps: AssistantStep[], next = vi.fn()) {
  const port: AssistantProvider = {
    begin() {
      return {
        async next(_outputs, _finalOnly, signal, dispatch, usage) {
          signal.throwIfAborted();
          next(_outputs, _finalOnly);
          dispatch();
          usage({ input: 100, output: 50 });
          return steps.shift()!;
        },
      };
    },
  };
  return { port, next };
}
describe("finite foreground investigation", () => {
  it("can investigate the four headlines of a real generated story within its tool envelope", async () => {
    const input = assistantFixture();
    input.context.graph = generateScenario(input.context.graph, "healthy", {
      scenarioId: "healthy",
      now: ASSISTANT_NOW,
      availablePhotoIds: new Set(["photo"]),
    }).graph;
    input.context.scope = allActivityScope(input.context.graph);
    const p = provider([
      {
        kind: "tools",
        calls: [
          {
            id: "metrics",
            name: "getMetricFacts",
            arguments: {
              ...args,
              factIds: [
                "net_sales",
                "included_orders",
                "aov",
                "operating_result",
              ],
            },
          },
        ],
      },
      final,
    ]);
    expect(
      (
        await investigateAssistant(
          input,
          p.port,
          new AbortController().signal,
          { dispatch: vi.fn(), recordUsage: vi.fn() },
          ASSISTANT_NOW,
        )
      ).reply.text,
    ).toBe("Current evidence is ready.");
  });
  it("enforces aggregate tool/request bounds with one economic dispatch and combined usage", async () => {
    const call = (id: string) => ({
      id,
      name: "getDesignPresets",
      arguments: args,
    });
    const p = provider([
      { kind: "tools", calls: [call("a"), call("b")] },
      { kind: "tools", calls: [call("c"), call("d")] },
      final,
    ]);
    const accounting = { dispatch: vi.fn(), recordUsage: vi.fn() };
    await investigateAssistant(
      assistantFixture(),
      p.port,
      new AbortController().signal,
      accounting,
      ASSISTANT_NOW,
    );
    expect(p.next).toHaveBeenCalledTimes(3);
    expect(p.next.mock.calls[2]![1]).toBe(true);
    expect(accounting.dispatch).toHaveBeenCalledTimes(1);
    expect(accounting.recordUsage).toHaveBeenCalledWith({
      input: 300,
      output: 150,
    });
    const tooMany = provider([
      {
        kind: "tools",
        calls: Array.from({ length: 5 }, (_, i) => call(String(i))),
      },
    ]);
    await expect(
      investigateAssistant(
        assistantFixture(),
        tooMany.port,
        new AbortController().signal,
        accounting,
        ASSISTANT_NOW,
      ),
    ).rejects.toThrow("UPSTREAM_FAILED");
    expect(tooMany.next).toHaveBeenCalledTimes(1);
    const thirdTool = provider([
      { kind: "tools", calls: [call("a")] },
      { kind: "tools", calls: [call("b")] },
      { kind: "tools", calls: [call("c")] },
    ]);
    await expect(
      investigateAssistant(
        assistantFixture(),
        thirdTool.port,
        new AbortController().signal,
        accounting,
        ASSISTANT_NOW,
      ),
    ).rejects.toThrow("UPSTREAM_FAILED");
    expect(thirdTool.next).toHaveBeenCalledTimes(3);
  });
  it("aborts owned work at the total deadline, ignores late accounting and never selects another provider", async () => {
    vi.useFakeTimers();
    try {
      const accounting = { dispatch: vi.fn(), recordUsage: vi.fn() },
        next = vi.fn(() => new Promise<AssistantStep>(() => {}));
      const port: AssistantProvider = {
        begin() {
          return { next };
        },
      };
      const result = investigateAssistant(
        assistantFixture(),
        port,
        new AbortController().signal,
        accounting,
        ASSISTANT_NOW,
      );
      const assertion = expect(result).rejects.toThrow("DEADLINE");
      await vi.advanceTimersByTimeAsync(60000);
      await assertion;
      expect(next).toHaveBeenCalledTimes(1);
      expect(accounting.dispatch).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
  it("keeps development filters and unknown material grounded in current facts", async () => {
    const context = assistantFixture("shopper"),
      accounting = { dispatch: vi.fn(), recordUsage: vi.fn() };
    context.prompt = "Show jeans under $60";
    const reply = await investigateAssistant(
      context,
      fixtureAssistant(),
      new AbortController().signal,
      accounting,
      ASSISTANT_NOW,
    );
    expect(reply.reply.navigation).toEqual({
      kind: "filter",
      category: "jeans",
      query: "",
      minimum: null,
      maximum: 6000,
    });
    expect(reply.reply.references).toContainEqual({
      kind: "product",
      productId: "jeans",
    });
    context.prompt = "Are these cotton jeans?";
    expect(
      (
        await investigateAssistant(
          context,
          fixtureAssistant(),
          new AbortController().signal,
          accounting,
          ASSISTANT_NOW,
        )
      ).reply.text,
    ).toContain("unknown");
    context.prompt = "Show jeans under €80";
    const euro = await investigateAssistant(
      context,
      fixtureAssistant(),
      new AbortController().signal,
      accounting,
      ASSISTANT_NOW,
    );
    expect(euro.reply.navigation).toBeNull();
    expect(euro.reply.text).toContain("choose EUR");
    expect(accounting.dispatch).not.toHaveBeenCalled();
  });
});
