import { afterEach, expect, it } from "vitest";
import { heroPhotoIds } from "@retailor/contracts/design";
import type { HeroSlot } from "@retailor/contracts/design";
import { assistantFence } from "@retailor/contracts/assistant";
import { environment, file, decode } from "../../../test/workspace";
import { PhotoController } from "../photos/controller";
import { SESSION_KEY, restoreProjection } from "./projection";

const environments: ReturnType<typeof environment>[] = [];
afterEach(() => environments.splice(0).forEach((env) => env.dispose()));
async function prepared() {
  const env = environment();
  environments.push(env);
  const controller = await env.open();
  await controller.photos.add([file("first"), file("second"), file("third")]);
  await controller.draftCatalogue();
  controller.publish();
  controller.design({
    ...controller.getSnapshot().state.previewDesign,
    template: "pulse",
  });
  return { env, controller };
}
it("keeps ordered hero choices, hidden Studio slot, dirty protection and restored owner Apply/Cancel without changing commerce", async () => {
  const { env, controller } = await prepared();
  const before = controller.getSnapshot().state,
    ids = before.photos.map((photo) => photo.id);
  controller.heroInput(0, ids[2]!);
  controller.heroInput(1, ids[0]!);
  controller.heroInput(2, ids[1]!);
  const expected = [ids[2], ids[0], ids[1]];
  expect(heroPhotoIds(controller.getSnapshot().state.previewDesign)).toEqual(
    expected,
  );
  controller.brandInput({ additionalHeroPhotoIds: [null, null] }, "suggestion");
  expect(heroPhotoIds(controller.getSnapshot().state.previewDesign)).toEqual(
    expected,
  );
  controller.design({
    ...controller.getSnapshot().state.previewDesign,
    template: "studio",
  });
  controller.heroInput(2, null);
  expect(heroPhotoIds(controller.getSnapshot().state.previewDesign)).toEqual(
    expected,
  );
  controller.design({
    ...controller.getSnapshot().state.previewDesign,
    template: "gallery",
  });
  controller.useCurrentLook();
  controller.keepWordmark();
  controller.acceptDesign();
  const restored = await env.open();
  expect(heroPhotoIds(restored.getSnapshot().state.acceptedDesign)).toEqual(
    expected,
  );
  restored.go("dashboard");
  restored.beginOwnerDesign();
  restored.heroInput(1, ids[2]!);
  expect(heroPhotoIds(restored.getSnapshot().state.previewDesign)).toEqual([
    null,
    ids[2],
    ids[1],
  ]);
  restored.cancelDesign();
  expect(heroPhotoIds(restored.getSnapshot().state.previewDesign)).toEqual(
    expected,
  );
  restored.beginOwnerDesign();
  restored.heroInput(2, null);
  restored.applyOwnerDesign();
  expect(heroPhotoIds(restored.getSnapshot().state.acceptedDesign)).toEqual([
    ids[2],
    ids[0],
    null,
  ]);
  expect(restored.getSnapshot().state.graph).toEqual(before.graph);
  expect(restored.getSnapshot().state.inputRevision).toBe(before.inputRevision);
  expect(restored.getSnapshot().state.selectedIds).toEqual(before.selectedIds);
});
it("uses every hero position in the design fence and rejects unavailable or out-of-range choices", async () => {
  const { controller } = await prepared();
  const before = controller.getSnapshot().state.previewDesign;
  controller.heroInput(1, "unavailable");
  controller.heroInput(3 as HeroSlot, null);
  expect(controller.getSnapshot().state.previewDesign).toBe(before);
  const first = assistantFence(controller.assistantContext());
  controller.heroInput(2, controller.getSnapshot().state.photos[0]!.id);
  const second = assistantFence(controller.assistantContext());
  expect(second.designKey).not.toBe(first.designKey);
  expect(second.photoKey).toBe(first.photoKey);
  expect(second.dataRevision).toBe(first.dataRevision);
});
it("uploads to the chosen position outside recognition and retains all selected bytes through restore/reset", async () => {
  const { env, controller } = await prepared();
  const before = controller.getSnapshot().state;
  await controller.uploadHero(file("hero-two"), 1);
  await controller.uploadHero(file("hero-three"), 2);
  const after = controller.getSnapshot().state,
    selected = heroPhotoIds(after.previewDesign);
  expect(selected[0]).toBeNull();
  expect(selected[1]).not.toBeNull();
  expect(selected[2]).not.toBeNull();
  expect(selected[1]).not.toBe(selected[2]);
  expect(after.selectedIds).toEqual(before.selectedIds);
  expect(after.inputRevision).toBe(before.inputRevision);
  expect(after.draft).toBe(before.draft);
  expect(after.graph).toBe(before.graph);
  await controller.photos.remove(selected[1]!);
  await controller.photos.remove(selected[2]!);
  expect(controller.photos.availableIds().has(selected[1]!)).toBe(true);
  expect(controller.photos.availableIds().has(selected[2]!)).toBe(true);
  const restored = await env.open();
  expect(heroPhotoIds(restored.getSnapshot().state.previewDesign)).toEqual(
    selected,
  );
  expect(
    selected
      .filter(Boolean)
      .every((id) => restored.photos.availableIds().has(id!)),
  ).toBe(true);
  await restored.reset();
  expect(heroPhotoIds(restored.getSnapshot().state.previewDesign)).toEqual([
    null,
    null,
    null,
  ]);
  expect(restored.getSnapshot().heroBusy).toBe(false);
});
it("ignores a late third-position upload after a newer manual hero choice", async () => {
  const { env, controller } = await prepared();
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
  const pending = delayed.uploadHero(file("late-third"), 2);
  const chosen = delayed.getSnapshot().state.photos[0]!.id;
  delayed.heroInput(2, chosen);
  release();
  await pending;
  expect(heroPhotoIds(delayed.getSnapshot().state.previewDesign)[2]).toBe(
    chosen,
  );
  expect(delayed.getSnapshot().heroBusy).toBe(false);
});
it("restores an old singular hero and brand draft without requiring new saved fields", async () => {
  const { env, controller } = await prepared();
  const id = controller.getSnapshot().state.photos[0]!.id;
  controller.heroInput(0, id);
  const saved = JSON.parse(env.storage.getItem(SESSION_KEY)!);
  delete saved.previewDesign.additionalHeroPhotoIds;
  delete saved.acceptedDesign.additionalHeroPhotoIds;
  delete saved.setup.brandDraft.additionalHeroPhotoIds;
  delete saved.setup.brandDirty.additionalHeroPhotoIds;
  env.storage.setItem(SESSION_KEY, JSON.stringify(saved));
  controller.dispose();
  const restored = await env.open();
  expect(heroPhotoIds(restored.getSnapshot().state.previewDesign)).toEqual([
    id,
    null,
    null,
  ]);
  expect(
    restored.getSnapshot().state.setup.brandDraft?.additionalHeroPhotoIds,
  ).toEqual([null, null]);
});
it("rejects unknown saved hero identities without weakening normal photo recovery", async () => {
  const { env, controller } = await prepared();
  const saved = JSON.parse(env.storage.getItem(SESSION_KEY)!);
  saved.previewDesign.additionalHeroPhotoIds = ["foreign_photo", null];
  expect(() => restoreProjection(saved, env.clock(), true)).toThrow(
    "Saved photo identities",
  );
  expect(heroPhotoIds(controller.getSnapshot().state.previewDesign)).toEqual([
    null,
    null,
    null,
  ]);
  controller.design({
    ...controller.getSnapshot().state.previewDesign,
    template: "studio",
  });
  const count = controller.getSnapshot().state.photos.length;
  await controller.uploadHero(file("hidden-third"), 2);
  expect(controller.getSnapshot().state.photos).toHaveLength(count);
  expect(controller.getSnapshot().heroBusy).toBe(false);
});
