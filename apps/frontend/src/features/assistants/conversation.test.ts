import { afterEach, describe, expect, it, vi } from "vitest";
import { environment, file } from "../../../test/workspace";
import { assistantFence } from "@retailor/contracts/assistant";
import type {
  AssistantPayload,
  AssistantResult,
} from "@retailor/contracts/assistant";
import { replyCurrent } from "./conversation";
import { currentAssistantContext } from "./context";
import { tourPlacement } from "./tour-layout";
import { SESSION_KEY } from "../session/projection";
const environments: ReturnType<typeof environment>[] = [];
afterEach(() => environments.splice(0).forEach((e) => e.dispose()));
function env() {
  const e = environment();
  environments.push(e);
  return e;
}
function reply(
  p: AssistantPayload,
  options: Partial<AssistantResult["reply"]> = {},
): AssistantResult {
  return {
    schemaVersion: 1,
    mode: p.mode,
    operationId: p.operationId,
    role: p.context.role,
    fence: assistantFence(p.context),
    sensitivity: {
      currency: p.context.role === "shopper",
      scope: p.context.role === "owner",
      design: p.context.role === "creator",
      filters: false,
    },
    reply: {
      text: "Here is the current view.",
      references: [],
      claims: [],
      navigation: null,
      proposal: null,
      ...options,
    },
  };
}
async function prepared(
  e: ReturnType<typeof environment>,
  request: (
    payload: AssistantPayload,
    signal: AbortSignal,
  ) => Promise<AssistantResult>,
) {
  const c = await e.open({ assistantRequest: request });
  await c.photos.add([file("jeans"), file("shirt")]);
  await c.draftCatalogue();
  c.publish();
  return c;
}
describe("one session owns scoped Tailor conversation", () => {
  it("applies current shopping filters immediately, keeps local shortcuts free and restores finalized text inertly", async () => {
    const e = env(),
      request = vi.fn(async (p: AssistantPayload) =>
        reply(p, {
          navigation: {
            kind: "filter",
            query: "",
            category: p.context.graph.products[0]!.category,
            minimum: null,
            maximum: 8000,
          },
        }),
      ),
      c = await prepared(e, request);
    c.tailorShortcut("summary");
    const graph = c.getSnapshot().state.graph;
    expect(request).not.toHaveBeenCalled();
    expect(c.getSnapshot().state.graph).toBe(graph);
    c.useCurrentLook();
    c.keepWordmark();
    c.acceptDesign();
    c.assistantInput("Show matching clothing");
    await c.sendAssistant();
    expect(c.getSnapshot().state.browse).toMatchObject({
      page: "collection",
      filters: {
        category: graph.products[0]!.category,
        maxPrice: 8000,
        available: true,
      },
    });
    const message = c.getSnapshot().state.conversation.at(-1)!;
    expect(c.currentAssistantMessage(message.id)).not.toBeNull();
    expect(c.getSnapshot().assistantBusy).toBe(false);
    const restored = await e.open({ assistantRequest: request });
    expect(
      restored.getSnapshot().state.conversation.every((m) => m.restored),
    ).toBe(true);
    expect(restored.currentAssistantMessage(message.id)).toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
    c.browse({
      filters: {
        ...c.getSnapshot().state.browse.filters,
        category: null,
        maxPrice: null,
        available: false,
      },
    });
    expect(c.getSnapshot().state.browse.filters.maxPrice).toBeNull();
  });
  it("rejects changed financial scopes and cancels reset work without replay or late mutation", async () => {
    const e = env();
    let resolve!: (r: AssistantResult) => void,
      input!: AssistantPayload,
      signal!: AbortSignal;
    const request = vi.fn((p: AssistantPayload, s: AbortSignal) => {
        input = p;
        signal = s;
        return new Promise<AssistantResult>((r) => {
          resolve = r;
        });
      }),
      c = await prepared(e, request);
    c.useCurrentLook();
    c.keepWordmark();
    c.acceptDesign();
    c.go("dashboard");
    c.assistantInput("Summarize this period");
    const first = c.sendAssistant();
    c.setDashboardPeriod("7days");
    resolve(reply(input));
    await first;
    expect(
      c
        .getSnapshot()
        .state.conversation.filter((m) => m.author === "assistant"),
    ).toHaveLength(0);
    expect(c.getSnapshot().assistantNotice).toContain("earlier view");
    c.assistantInput("Try again");
    const second = c.sendAssistant();
    const old = reply(input);
    const encoded = e.storage.getItem(SESSION_KEY)!;
    expect(JSON.parse(encoded).pendingProvider).toBe("assistant");
    await c.reset();
    expect(signal.aborted).toBe(true);
    resolve(old);
    await second;
    expect(c.getSnapshot().state.conversation).toEqual([]);
    expect(c.getSnapshot().assistantBusy).toBe(false);
    expect(c.getSnapshot().state.stage).toBe("choose");
    e.storage.setItem(SESSION_KEY, encoded);
    const recovered = await e.open({ assistantRequest: request });
    expect(recovered.getSnapshot().notice).toContain(
      "provider outcome may be unknown",
    );
    expect(recovered.getSnapshot().assistantBusy).toBe(false);
    expect(
      recovered
        .getSnapshot()
        .state.conversation.every((message) => message.restored),
    ).toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("protects dirty authored drafts, bounds combined history and fences only relevant presentation changes", async () => {
    const e = env(),
      request = vi.fn(async (p: AssistantPayload) =>
        reply(p, {
          proposal: {
            kind: "operation",
            operation: "createProduct",
            targetId: null,
            prefill: { title: "Suggestion", category: "jeans", note: null },
          },
        }),
      ),
      c = await prepared(e, request);
    c.useCurrentLook();
    c.keepWordmark();
    c.acceptDesign();
    c.go("dashboard");
    c.assistantInput("Prepare a product");
    await c.sendAssistant();
    const m = c.getSnapshot().state.conversation.at(-1)!;
    c.openOwnerOperation("createProduct");
    c.editOwnerField("title", "Human draft");
    const form = c.getSnapshot().ownerForm;
    c.prepareAssistantProposal(m.id);
    expect(c.getSnapshot().ownerForm).toBe(form);
    expect(c.getSnapshot().assistantNotice).toContain("has edits");
    for (let i = 0; i < 45; i++) c.tailorShortcut("help");
    expect(c.getSnapshot().state.conversation).toHaveLength(40);
    expect(request).toHaveBeenCalledTimes(1);
    const state = c.getSnapshot().state,
      euroState = {
        ...state,
        currency: {
          selected: "EUR" as const,
          acceptedSnapshot: {
            schemaVersion: 1 as const,
            snapshotId: "quote",
            base: "USD" as const,
            quote: "EUR" as const,
            rateDecimal: "0.9",
            rateDate: new Date(e.clock()).toISOString().slice(0, 10),
            fetchedAt: new Date(e.clock()).toISOString(),
            sourceId: "development-fixture" as const,
          },
        },
      },
      context = currentAssistantContext(state, c.photos.availableIds()),
      result = reply({
        schemaVersion: 1,
        mode: "fake",
        operationId: "op",
        prompt: "hi",
        history: [],
        context,
      });
    expect(
      currentAssistantContext(euroState, c.photos.availableIds()).currency
        .currency,
    ).toBe("USD");
    expect(
      currentAssistantContext(
        { ...euroState, stage: "storefront" },
        c.photos.availableIds(),
      ).currency.currency,
    ).toBe("EUR");
    result.sensitivity.design = false;
    expect(
      replyCurrent(result, {
        ...context,
        design: { ...context.design, theme: "cobalt" },
      }),
    ).toBe(true);
    expect(
      replyCurrent(result, {
        ...context,
        graph: { ...context.graph, revision: context.graph.revision + 1 },
      }),
    ).toBe(false);
    const shopper = { ...context, role: "shopper" as const },
      shop = {
        ...result,
        role: "shopper" as const,
        fence: assistantFence(shopper),
        sensitivity: { ...result.sensitivity, currency: true },
      };
    expect(replyCurrent(shop, { ...shopper, query: "new query" })).toBe(true);
    expect(
      replyCurrent(
        { ...shop, sensitivity: { ...shop.sensitivity, filters: true } },
        { ...shopper, query: "new query" },
      ),
    ).toBe(false);
  });
  it("keeps the tour card in small and keyboard-sized visible viewports", () => {
    for (const viewport of [
      { width: 320, height: 430, top: 0, left: 0 },
      { width: 375, height: 240, top: 100, left: 0 },
      { width: 1440, height: 900, top: 0, left: 0 },
    ]) {
      const card = tourPlacement(
        { top: 100, bottom: 400, left: -20, right: 600 },
        viewport,
        190,
      );
      expect(card.left).toBeGreaterThanOrEqual(viewport.left + 16);
      expect(card.left + card.width).toBeLessThanOrEqual(
        viewport.left + viewport.width - 16,
      );
      expect(card.top).toBeGreaterThanOrEqual(viewport.top + 16);
      expect(card.top + 190).toBeLessThanOrEqual(
        viewport.top + viewport.height - 16,
      );
    }
  });
});
