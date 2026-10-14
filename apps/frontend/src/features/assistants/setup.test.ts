import { afterEach, describe, expect, it } from "vitest";
import { environment, file, decode } from "../../../test/workspace";
import { PhotoController } from "../photos/controller";
import { SESSION_KEY } from "../session/projection";
import { DEFAULT_THEME, ThemeSchema } from "@retailor/contracts/design";
const environments: ReturnType<typeof environment>[] = [];
afterEach(() => environments.splice(0).forEach((env) => env.dispose()));
async function openStore() {
  const env = environment();
  environments.push(env);
  const controller = await env.open();
  await controller.photos.add([file("one"), file("two")]);
  await controller.draftCatalogue();
  controller.publish();
  return { env, controller, graph: controller.getSnapshot().state.graph };
}
describe("Tailor finite styling and owner authority", () => {
  it("starts and resets on Navy/Lime while preserving every merchant palette, product/option/browse state, owner Cancel and explicit Apply across restore", async () => {
    const { env, controller, graph } = await openStore();
    expect(controller.getSnapshot().state.previewDesign.theme).toBe("navy");
    const product = graph.products[0]!;
    controller.browse({
      page: "product",
      productId: product.id,
      variantId: product.variants[0]!.id,
    });
    const browse = controller.getSnapshot().state.browse;
    for (const theme of ThemeSchema.options) {
      controller.design({
        ...controller.getSnapshot().state.previewDesign,
        theme,
      });
      expect(controller.getSnapshot().state.previewDesign.theme).toBe(theme);
      expect(controller.getSnapshot().state.graph).toBe(graph);
      expect(controller.getSnapshot().state.browse).toEqual(browse);
    }
    controller.useCurrentLook();
    controller.keepWordmark();
    controller.acceptDesign();
    expect(controller.getSnapshot().state.acceptedDesign.theme).toBe("pine");
    controller.go("dashboard");
    controller.beginOwnerDesign();
    controller.design({
      ...controller.getSnapshot().state.previewDesign,
      theme: "navy",
    });
    controller.cancelDesign();
    expect(controller.getSnapshot().state.previewDesign.theme).toBe("pine");
    controller.beginOwnerDesign();
    controller.design({
      ...controller.getSnapshot().state.previewDesign,
      theme: "oxblood",
    });
    controller.applyOwnerDesign();
    controller.dispose();
    const restored = await env.open();
    expect(restored.getSnapshot().state.acceptedDesign.theme).toBe("oxblood");
    expect(restored.getSnapshot().state.previewDesign.theme).toBe("oxblood");
    expect(restored.getSnapshot().state.graph).toEqual(graph);
    expect(restored.getSnapshot().state.browse).toEqual(browse);
    await restored.reset();
    expect(restored.getSnapshot().state.previewDesign.theme).toBe(
      DEFAULT_THEME,
    );
  });
  it("requires explicit theme and type confirmation, and prepares but never restores executable logo work", async () => {
    const { env, controller, graph } = await openStore();
    controller.prepareLogo();
    expect(controller.getSnapshot().preparedLogo).toBeNull();
    controller.stylingStep("typography");
    controller.confirmStyle("typography");
    controller.prepareLogo();
    expect(controller.getSnapshot().preparedLogo).toBeNull();
    controller.stylingStep("theme");
    controller.confirmStyle("theme");
    controller.prepareLogo();
    expect(controller.getSnapshot().preparedLogo?.candidates).toBe(3);
    const restored = await env.open();
    expect(restored.getSnapshot().preparedLogo).toBeNull();
    expect(restored.getSnapshot().state.graph).toEqual(graph);
    expect(restored.getSnapshot().state.setup.theme).toBe(DEFAULT_THEME);
  });
  it("keeps brand confirmation and pending intent when a late suggestion cannot change any dirty field", async () => {
    const { controller } = await openStore();
    controller.useCurrentLook();
    controller.stylingStep("brand");
    const photos = controller.getSnapshot().state.photos;
    controller.brandInput({
      name: "My clothes",
      headline: "My world",
      heroPhotoId: photos[0]!.id,
    });
    controller.confirmStyle("brand");
    controller.prepareLogo();
    const before = controller.getSnapshot();
    controller.brandInput(
      {
        name: "Late suggestion",
        headline: "Late line",
        heroPhotoId: photos[1]!.id,
      },
      "suggestion",
    );
    expect(controller.getSnapshot().state.setup.brandConfirmed).toBe(true);
    expect(controller.getSnapshot().state.previewDesign).toBe(
      before.state.previewDesign,
    );
    expect(controller.getSnapshot().preparedLogo).toBe(before.preparedLogo);
    controller.keepWordmark();
    expect(controller.getSnapshot().state.setup.step).toBe("summary");
  });
  it("finishes without typing using explicit default approval, wordmark and final acceptance", async () => {
    const { controller, graph } = await openStore();
    controller.acceptDesign();
    expect(controller.getSnapshot().state.stage).toBe("style");
    controller.useCurrentLook();
    controller.acceptDesign();
    expect(controller.getSnapshot().state.stage).toBe("style");
    controller.keepWordmark();
    controller.acceptDesign();
    expect(controller.getSnapshot().state.stage).toBe("storefront");
    expect(controller.getSnapshot().state.hasAcceptedLook).toBe(true);
    expect(controller.getSnapshot().state.graph).toBe(graph);
  });
  it("uses latest choices, invalidates changed confirmations and keeps actual product context", async () => {
    const { controller, graph } = await openStore();
    const product = graph.products[0]!;
    controller.browse({
      page: "product",
      productId: product.id,
      variantId: product.variants[0]!.id,
    });
    controller.useCurrentLook();
    for (const theme of ["pine", "oxblood", "cobalt"] as const)
      controller.design({
        ...controller.getSnapshot().state.previewDesign,
        theme,
      });
    expect(controller.getSnapshot().state.previewDesign.theme).toBe("cobalt");
    expect(controller.getSnapshot().state.setup.theme).toBeNull();
    expect(controller.getSnapshot().state.setup.step).toBe("theme");
    controller.prepareLogo();
    expect(controller.getSnapshot().preparedLogo).toBeNull();
    expect(controller.getSnapshot().state.browse.productId).toBe(product.id);
    expect(controller.getSnapshot().state.graph).toBe(graph);
  });
  it("preserves dirty fields through collapse/recovery and protects them from suggestions", async () => {
    const { env, controller } = await openStore();
    controller.stylingStep("brand");
    controller.brandInput({ name: "My clothes", headline: "" });
    controller.brandInput(
      {
        name: "Late suggestion",
        headline: "Overwrite",
        heroPhotoId: controller.getSnapshot().state.photos[1]!.id,
      },
      "suggestion",
    );
    controller.toggleTailor(false);
    const restored = await env.open(),
      draft = restored.getSnapshot().state.setup.brandDraft!;
    expect(draft.name).toBe("My clothes");
    expect(draft.headline).toBe("");
    expect(draft.heroPhotoId).not.toBeNull();
    expect(restored.getSnapshot().state.setup.expanded).toBe(false);
    restored.brandInput({ name: "" });
    restored.confirmStyle("brand");
    expect(restored.getSnapshot().state.setup.brandConfirmed).toBe(false);
    restored.keepBrandDetails();
    expect(restored.getSnapshot().state.previewDesign.name).toBe("My clothes");
  });
  it("gives owner apply/cancel one authority and protects changed previews before navigation", async () => {
    const { env, controller, graph } = await openStore();
    controller.useCurrentLook();
    controller.keepWordmark();
    controller.acceptDesign();
    controller.go("dashboard");
    controller.beginOwnerDesign();
    controller.brandInput({ name: "FORME", headline: "Your next chapter." });
    controller.beginOwnerDesign();
    expect(controller.getSnapshot().state.previewDesign.name).toBe("FORME");
    controller.design({
      ...controller.getSnapshot().state.previewDesign,
      template: "pulse",
      theme: "pine",
    });
    const restored = await env.open();
    expect(restored.getSnapshot().state.designEditing).toBe(true);
    restored.go("storefront");
    expect(restored.getSnapshot().dialog).toBe("leave-design");
    restored.closeDialog();
    restored.applyOwnerDesign();
    expect(restored.getSnapshot().state.acceptedDesign.name).toBe("FORME");
    expect(restored.getSnapshot().state.acceptedDesign.template).toBe("pulse");
    restored.beginOwnerDesign();
    restored.brandInput({ name: "Unsaved" });
    restored.go("storefront");
    restored.discardDesignAndLeave();
    expect(restored.getSnapshot().state.stage).toBe("storefront");
    expect(restored.getSnapshot().state.previewDesign.name).toBe("FORME");
    expect(restored.getSnapshot().state.setup.brandDraft?.name).toBe("FORME");
    expect(restored.getSnapshot().state.graph).toEqual(graph);
    restored.go("dashboard");
    restored.brandInput({ name: "Late suggestion" }, "suggestion");
    expect(restored.getSnapshot().state.previewDesign.name).toBe("FORME");
  });
  it("supplied hero upload does not change recognition inputs or catalogue and resets safely", async () => {
    const { env, controller, graph } = await openStore();
    const before = controller.getSnapshot().state;
    await controller.uploadHero(file("hero"));
    const after = controller.getSnapshot().state;
    expect(after.previewDesign.heroPhotoId).not.toBeNull();
    expect(after.selectedIds).toEqual(before.selectedIds);
    expect(after.inputRevision).toBe(before.inputRevision);
    expect(after.draft).toBe(before.draft);
    expect(after.graph).toBe(graph);
    const restored = await env.open();
    expect(
      restored.photos.availableIds().has(after.previewDesign.heroPhotoId!),
    ).toBe(true);
    expect(restored.getSnapshot().state.previewDesign.heroPhotoId).toBe(
      after.previewDesign.heroPhotoId,
    );
    await restored.reset();
    expect(restored.getSnapshot().state.previewDesign.heroPhotoId).toBeNull();
    expect(restored.getSnapshot().heroBusy).toBe(false);
  });
  it("ignores a late hero result after the visible design changed", async () => {
    const { env, controller } = await openStore();
    controller.dispose();
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const delayed = await env.open({
      photos: (cache, expires) =>
        new PhotoController({
          cache,
          expires,
          clock: env.clock,
          id: env.id,
          urls: { create: () => "blob:hero", revoke: () => {} },
          decode: async (task) => {
            if (!task.existing) await gate;
            return decode(task);
          },
        }),
    });
    const pending = delayed.uploadHero(file("late-hero"));
    delayed.design({
      ...delayed.getSnapshot().state.previewDesign,
      template: "gallery",
    });
    release();
    await pending;
    expect(delayed.getSnapshot().state.previewDesign.heroPhotoId).toBeNull();
    expect(delayed.getSnapshot().state.previewDesign.template).toBe("gallery");
    expect(delayed.getSnapshot().heroBusy).toBe(false);
  });
  it("recovers obsolete finite presets explicitly without discarding valid commerce or accepting the default", async () => {
    const { env, controller, graph } = await openStore();
    const saved = JSON.parse(env.storage.getItem(SESSION_KEY)!);
    saved.previewDesign.theme = "obsolete-palette";
    saved.acceptedDesign.template = "retired-template";
    env.storage.setItem(SESSION_KEY, JSON.stringify(saved));
    controller.dispose();
    const restored = await env.open();
    expect(restored.getSnapshot().state.graph).toEqual(graph);
    expect(restored.getSnapshot().state.previewDesign.theme).toBe(
      DEFAULT_THEME,
    );
    expect(restored.getSnapshot().state.setup.theme).toBeNull();
    expect(restored.getSnapshot().state.hasAcceptedLook).toBe(false);
    expect(restored.getSnapshot().recoveryNotice).toContain(
      "unavailable saved style",
    );
    restored.prepareLogo();
    expect(restored.getSnapshot().preparedLogo).toBeNull();
  });
});
