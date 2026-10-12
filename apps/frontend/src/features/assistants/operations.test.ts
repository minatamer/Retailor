import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  AssistantPayload,
  AssistantProposal,
  AssistantResult,
} from "@retailor/contracts/assistant";
import { assistantFence } from "@retailor/contracts/assistant";
import { environment, file } from "../../../test/workspace";
const environments: ReturnType<typeof environment>[] = [];
afterEach(() => {
  environments.splice(0).forEach((e) => e.dispose());
  vi.useRealTimers();
});
async function setup(proposal: AssistantProposal) {
  const env = environment();
  environments.push(env);
  const request = vi.fn(
    async (p: AssistantPayload): Promise<AssistantResult> => ({
      schemaVersion: 1,
      mode: "fake",
      operationId: p.operationId,
      role: "owner",
      fence: assistantFence(p.context),
      sensitivity: {
        scope: true,
        design: false,
        currency: false,
        filters: false,
      },
      reply: {
        text: "Prepare a real draft.",
        references: [],
        claims: [],
        navigation: null,
        proposal,
      },
    }),
  );
  const controller = await env.open({ assistantRequest: request });
  await controller.photos.add([file("jeans"), file("shirt")]);
  await controller.draftCatalogue();
  controller.publish();
  controller.useCurrentLook();
  controller.keepWordmark();
  controller.acceptDesign();
  controller.go("dashboard");
  controller.assistantInput("Prepare this operation");
  await controller.sendAssistant();
  const message = controller.getSnapshot().state.conversation.at(-1)!;
  return { env, controller, request, message };
}
const create: AssistantProposal = {
  kind: "operation",
  operation: "createProduct",
  targetId: null,
  prefill: { title: "Black denim jacket", category: "jackets", note: null },
};
describe("one inline draft with interruptible choreography", () => {
  it("reports the current upload rejection instead of a previous selection-cancel notice", async () => {
    const { controller: c, message } = await setup(create);
    c.prepareAssistantProposal(message.id);
    await c.uploadOwnerPhoto(file(""));
    expect(c.getSnapshot().ownerForm!.photoIds).toHaveLength(0);
    expect(c.getSnapshot().ownerNotice).toContain(
      "Each photo must be at most 4 MiB",
    );
    expect(c.getSnapshot().ownerPhotoBusy).toBe(false);
    c.reviewOwnerOperation();
    expect(c.getSnapshot().ownerReview).toBeNull();
  });
  it("preserves touched fields during animated fill, moves the same draft, requires photos and applies once without inference", async () => {
    const { controller: c, request, message } = await setup(create);
    vi.useFakeTimers();
    c.prepareAssistantProposal(message.id);
    const id = c.getSnapshot().ownerForm!.id;
    c.editOwnerField("title", "My jacket");
    // Even an unchanged human selection is protected from the later category suggestion.
    c.editOwnerField("category", "other-clothing");
    await vi.advanceTimersByTimeAsync(1300);
    expect(c.getSnapshot().ownerForm!.fields).toMatchObject({
      title: "My jacket",
      category: "other-clothing",
    });
    expect(c.getSnapshot().ownerFilling).toBeNull();
    c.moveOwnerForm("dashboard");
    expect(c.getSnapshot().ownerForm!.id).toBe(id);
    c.moveOwnerForm("tailor");
    expect(c.getSnapshot().ownerSurface).toBe("tailor");
    c.reviewOwnerOperation();
    expect(c.getSnapshot().ownerReview).toBeNull();
    await c.uploadOwnerPhoto(file("new-clothing"));
    c.reviewOwnerOperation();
    const review = c.getSnapshot().ownerReview!;
    expect(review).not.toBeNull();
    c.confirmOwnerOperation(review);
    const graph = c.getSnapshot().state.graph;
    c.confirmOwnerOperation(review);
    expect(c.getSnapshot().state.graph).toBe(graph);
    expect(graph.products.filter((p) => p.title === "My jacket")).toHaveLength(
      1,
    );
    expect(request).toHaveBeenCalledTimes(1);
    expect(c.getSnapshot().ownerResult?.receiptId).toBe(
      graph.receipts.at(-1)!.id,
    );
  });
  it("cancels fill on navigation, cancels reviews on editing and restores completed text without executable drafts", async () => {
    const { controller: c, env, message } = await setup(create);
    vi.useFakeTimers();
    c.prepareAssistantProposal(message.id);
    const formId = c.getSnapshot().ownerForm!.id;
    await vi.advanceTimersByTimeAsync(170);
    expect(c.getSnapshot().ownerFilling).toBe("title");
    c.go("storefront");
    await vi.advanceTimersByTimeAsync(1400);
    expect(c.getSnapshot().ownerForm!.fields.title).toBe("");
    expect(c.getSnapshot().ownerFilling).toBeNull();
    c.go("dashboard");
    expect(c.getSnapshot().ownerForm!.id).toBe(formId);
    c.editOwnerField("title", "Confirmed jacket");
    await c.uploadOwnerPhoto(file("photo"));
    c.reviewOwnerOperation();
    const old = c.getSnapshot().ownerReview!;
    c.editOwnerField("title", "Changed jacket");
    c.confirmOwnerOperation(old);
    expect(
      c
        .getSnapshot()
        .state.graph.products.some((p) => p.title === "Confirmed jacket"),
    ).toBe(false);
    c.dispose();
    const restored = await env.open();
    expect(restored.getSnapshot().ownerForm).toBeNull();
    expect(restored.getSnapshot().state.conversation.at(-1)!.restored).toBe(
      true,
    );
    restored.prepareAssistantProposal(message.id);
    expect(restored.getSnapshot().ownerForm).toBeNull();
  });
  it("rejects expired proposals and unlisted target choices without replacing a human draft", async () => {
    const {
      controller: c,
      env,
      message,
    } = await setup({
      kind: "operation-choices",
      operation: "removeProduct",
      targetIds: ["invented"],
      moreMatches: false,
      prefill: { title: null, category: null, note: null },
    });
    c.prepareAssistantProposal(message.id, "different");
    expect(c.getSnapshot().ownerForm).toBeNull();
    c.openOwnerOperation("saveExpenseDraft");
    c.editOwnerField("note", "Keep my draft");
    const form = c.getSnapshot().ownerForm;
    c.prepareAssistantProposal(message.id, "invented");
    expect(c.getSnapshot().ownerForm).toBe(form);
    c.closeOwnerOperation();
    env.advance(120_000);
    c.prepareAssistantProposal(message.id, "invented");
    expect(c.getSnapshot().ownerForm).toBeNull();
    expect(c.getSnapshot().assistantNotice).toContain("expired");
  });
  it("rejects an expired exact review and clears owned work on reset", async () => {
    const { controller: c, env, message } = await setup(create);
    vi.useFakeTimers();
    c.prepareAssistantProposal(message.id);
    await vi.advanceTimersByTimeAsync(1300);
    await c.uploadOwnerPhoto(file("fresh"));
    c.reviewOwnerOperation();
    const review = c.getSnapshot().ownerReview!;
    env.advance(120_000);
    c.confirmOwnerOperation(review);
    expect(
      c
        .getSnapshot()
        .state.graph.products.some((p) => p.title === "Black denim jacket"),
    ).toBe(false);
    await c.reset();
    await vi.advanceTimersByTimeAsync(1500);
    expect(c.getSnapshot().ownerForm).toBeNull();
    expect(c.getSnapshot().ownerResult).toBeNull();
    expect(c.getSnapshot().ownerFilling).toBeNull();
  });
});
