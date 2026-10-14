import { afterEach, describe, expect, it } from "vitest";
import {
  assistantFence,
  AssistantResultSchema,
} from "@retailor/contracts/assistant";
import type { AssistantProposal } from "@retailor/contracts/assistant";
import { withPageTemplates } from "@retailor/contracts/design";
import { environment, file } from "../../../test/workspace";
import { currentAssistantContext } from "../assistants/context";
import { replyCurrent } from "../assistants/conversation";
import { designConfirmed } from "../assistants/setup";
import {
  recoverDesignPresets,
  restoreProjection,
  SESSION_KEY,
} from "./projection";

const environments: ReturnType<typeof environment>[] = [];
afterEach(() => environments.splice(0).forEach((env) => env.dispose()));
const mixed = {
  home: "studio",
  collection: "pulse",
  product: "gallery",
} as const;
async function setup(proposal?: () => AssistantProposal) {
  const env = environment();
  environments.push(env);
  const controller = await env.open({
    assistantRequest: async (payload) =>
      AssistantResultSchema.parse({
        schemaVersion: 1,
        mode: "fake",
        operationId: payload.operationId,
        role: payload.context.role,
        fence: assistantFence(payload.context),
        reply: {
          text: "Preview these choices.",
          references: [],
          claims: [],
          navigation: null,
          proposal: proposal?.() ?? null,
        },
        sensitivity: {
          currency: false,
          scope: false,
          filters: false,
          design: true,
        },
      }),
  });
  await controller.photos.add([file("one"), file("two")]);
  await controller.draftCatalogue();
  controller.publish();
  return { env, controller };
}
describe("one persistent accepted and preview page assignment", () => {
  it("requires fresh confirmation after a page-only change and restores the exact accepted mix", async () => {
    const { env, controller } = await setup();
    const graph = controller.getSnapshot().state.graph;
    controller.useCurrentLook();
    controller.keepWordmark();
    controller.design(
      withPageTemplates(controller.getSnapshot().state.previewDesign, mixed),
    );
    expect(
      designConfirmed(
        controller.getSnapshot().state.setup,
        controller.getSnapshot().state.previewDesign,
      ),
    ).toBe(false);
    controller.acceptDesign();
    expect(controller.getSnapshot().state.stage).toBe("style");
    controller.useCurrentLook();
    controller.keepWordmark();
    controller.acceptDesign();
    expect(controller.getSnapshot().state.acceptedDesign.pageTemplates).toEqual(
      mixed,
    );
    expect(controller.getSnapshot().state.graph).toBe(graph);
    controller.dispose();
    const restored = await env.open();
    expect(restored.getSnapshot().state.acceptedDesign.pageTemplates).toEqual(
      mixed,
    );
    expect(
      designConfirmed(
        restored.getSnapshot().state.setup,
        restored.getSnapshot().state.previewDesign,
      ),
    ).toBe(true);
    expect(restored.getSnapshot().state.stage).toBe("storefront");
  });
  it("keeps owner cancel/apply separate and preserves products, bag and filters", async () => {
    const { controller } = await setup();
    controller.useCurrentLook();
    controller.keepWordmark();
    controller.acceptDesign();
    const product = controller.getSnapshot().state.graph.products[0]!;
    controller.addToBag(product.id, product.variants[0]!.id, 1);
    controller.closeBag();
    controller.browse({
      filters: {
        ...controller.getSnapshot().state.browse.filters,
        category: "jeans",
      },
    });
    const graph = controller.getSnapshot().state.graph,
      filters = controller.getSnapshot().state.browse.filters;
    controller.go("dashboard");
    controller.beginOwnerDesign();
    controller.design(
      withPageTemplates(controller.getSnapshot().state.previewDesign, mixed),
    );
    controller.cancelDesign();
    expect(
      controller.getSnapshot().state.previewDesign.pageTemplates,
    ).toBeUndefined();
    controller.beginOwnerDesign();
    controller.design(
      withPageTemplates(controller.getSnapshot().state.previewDesign, mixed),
    );
    controller.applyOwnerDesign();
    expect(controller.getSnapshot().state.acceptedDesign.pageTemplates).toEqual(
      mixed,
    );
    expect(controller.getSnapshot().state.graph).toBe(graph);
    expect(controller.getSnapshot().state.browse.filters).toEqual(filters);
    controller.beginOwnerDesign();
    controller.design(
      withPageTemplates(controller.getSnapshot().state.previewDesign, {
        ...mixed,
        product: "pulse",
      }),
    );
    controller.cancelDesign();
    expect(controller.getSnapshot().state.setup.pageTemplates).toEqual(mixed);
    expect(
      designConfirmed(
        controller.getSnapshot().state.setup,
        controller.getSnapshot().state.previewDesign,
      ),
    ).toBe(true);
  });
  it("makes page-only changes stale even when the base family and commerce graph are unchanged", async () => {
    const { controller } = await setup();
    const before = currentAssistantContext(
      controller.getSnapshot().state,
      controller.photos.availableIds(),
    );
    const result = AssistantResultSchema.parse({
      schemaVersion: 1,
      mode: "fake",
      operationId: "proposal",
      role: "creator",
      fence: assistantFence(before),
      reply: {
        text: "Try this look.",
        references: [],
        claims: [],
        navigation: null,
        proposal: {
          kind: "design",
          template: "pulse",
          theme: null,
          typography: null,
        },
      },
      sensitivity: {
        currency: false,
        scope: false,
        filters: false,
        design: true,
      },
    });
    expect(replyCurrent(result, before)).toBe(true);
    controller.design(
      withPageTemplates(controller.getSnapshot().state.previewDesign, mixed),
    );
    const after = currentAssistantContext(
      controller.getSnapshot().state,
      controller.photos.availableIds(),
    );
    expect(after.design.template).toBe(before.design.template);
    expect(after.graph).toBe(before.graph);
    expect(replyCurrent(result, after)).toBe(false);
  });
  it("previews mapping proposals only on click, preserves them on palette-only proposals and resets them on a whole-family proposal", async () => {
    let proposal: AssistantProposal = {
      kind: "design",
      template: null,
      pageTemplates: mixed,
      theme: null,
      typography: null,
    };
    const { controller } = await setup(() => proposal);
    const request = async () => {
      controller.assistantInput("Try a look");
      await controller.sendAssistant();
      const message = controller.getSnapshot().state.conversation.at(-1)!;
      controller.prepareAssistantProposal(message.id);
    };
    controller.assistantInput("Mix layouts");
    await controller.sendAssistant();
    expect(
      controller.getSnapshot().state.previewDesign.pageTemplates,
    ).toBeUndefined();
    controller.prepareAssistantProposal(
      controller.getSnapshot().state.conversation.at(-1)!.id,
    );
    expect(controller.getSnapshot().state.previewDesign.pageTemplates).toEqual(
      mixed,
    );
    proposal = {
      kind: "design",
      template: null,
      theme: "cobalt",
      typography: null,
    };
    await request();
    expect(controller.getSnapshot().state.previewDesign.pageTemplates).toEqual(
      mixed,
    );
    proposal = {
      kind: "design",
      template: "gallery",
      theme: null,
      typography: null,
    };
    await request();
    expect(
      controller.getSnapshot().state.previewDesign.pageTemplates,
    ).toBeUndefined();
    expect(controller.getSnapshot().state.previewDesign.template).toBe(
      "gallery",
    );
  });
  it("repairs obsolete finite page IDs but continues rejecting malformed/unknown page objects", async () => {
    const { env, controller } = await setup();
    const saved = JSON.parse(env.storage.getItem(SESSION_KEY)!);
    saved.previewDesign.pageTemplates = {
      home: "studio",
      collection: "retired",
      product: "gallery",
    };
    const repaired = recoverDesignPresets(saved);
    const state = restoreProjection(repaired.input, env.clock(), true);
    expect(state.previewDesign.pageTemplates).toEqual({
      ...mixed,
      collection: "studio",
    });
    expect(state.setup.template).toBeNull();
    expect(state.graph).toEqual(controller.getSnapshot().state.graph);
    saved.previewDesign.pageTemplates = { ...mixed, checkout: "studio" };
    expect(() => restoreProjection(saved, env.clock(), true)).toThrow();
  });
});
