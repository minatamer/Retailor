import { afterEach, expect, it, vi } from "vitest";
import { environment, file } from "../../../test/workspace";
import { restoreProjection, serializeProjection } from "./projection";
import { developmentDraft } from "../catalogue/development-fixture";
const environments: ReturnType<typeof environment>[] = [];
afterEach(() => environments.splice(0).forEach((env) => env.dispose()));
function setup() {
  const env = environment();
  environments.push(env);
  return env;
}
it("persists cover order, restores old default-compatible projections, and clears links on reset", async () => {
  const env = setup(),
    first = await env.open();
  await first.photos.add([file("front"), file("back"), file("side")]);
  const ids = first.getSnapshot().state.selectedIds;
  first.photos.link([ids[1]!, ids[0]!]);
  const saved = first.getSnapshot().state;
  const oldChoices = JSON.parse(serializeProjection(saved, env.clock()));
  delete oldChoices.autoLinkPhotos;
  expect(restoreProjection(oldChoices, env.clock(), true).autoLinkPhotos).toBe(
    false,
  );
  expect(saved.photoLinks).toEqual([[ids[1], ids[0]]]);
  const legacy = JSON.parse(serializeProjection(saved, env.clock()));
  delete legacy.photoLinks;
  delete legacy.photoLinksInitialized;
  expect(restoreProjection(legacy, env.clock(), true).photoLinks).toEqual([]);
  expect(
    restoreProjection(legacy, env.clock(), true).photoLinksInitialized,
  ).toBe(false);
  for (const photoLinks of [
    [[ids[0], ids[0]]],
    [[ids[0], "missing"]],
    [
      [ids[0], ids[1]],
      [ids[1], ids[2]],
    ],
  ])
    expect(() =>
      restoreProjection({ ...saved, photoLinks }, env.clock(), true),
    ).toThrow();
  first.dispose();
  const restored = await env.open();
  expect(restored.photos.getSnapshot().links).toEqual(saved.photoLinks);
  await restored.draftCatalogue();
  expect(restored.getSnapshot().state.draft!.items).toHaveLength(2);
  expect(
    restored
      .getSnapshot()
      .state.draft!.items.find((item) => item.product.imageIds.length === 2)!
      .product.imageIds,
  ).toEqual([ids[1], ids[0]]);
  await restored.reset();
  expect(restored.getSnapshot().state.photoLinks).toEqual([]);
  expect(restored.photos.getSnapshot().links).toEqual([]);
});
it("fences a late processing response after linking changes and never silently runs it again", async () => {
  const env = setup();
  let finish!: () => void, signal!: AbortSignal;
  const interpret = vi.fn<typeof env.processor.interpret>(
    (input) =>
      new Promise((resolve) => {
        signal = input.signal;
        finish = () =>
          resolve(
            developmentDraft(
              input.photos,
              input.operationId,
              input.inputRevision,
              env.id,
            ),
          );
      }),
  );
  const controller = await env.open({
    processor: { mode: "development-fixture", interpret },
  });
  await controller.photos.add([file("front"), file("back")]);
  const pending = controller.draftCatalogue(),
    ids = controller.getSnapshot().state.selectedIds;
  controller.photos.link(ids);
  finish();
  await pending;
  expect(signal.aborted).toBe(true);
  expect(controller.getSnapshot().state.stage).toBe("choose");
  expect(controller.getSnapshot().state.draft).toBeNull();
  expect(interpret).toHaveBeenCalledTimes(1);
});
it("same-ID replacement updates the saved byte witness and revision", async () => {
  const env = setup(),
    controller = await env.open();
  await controller.photos.add([file("front"), file("back")]);
  const before = controller.getSnapshot().state;
  controller.photos.link(before.selectedIds);
  await controller.photos.add([file("replacement")], before.selectedIds[0]);
  const current = controller.getSnapshot().state;
  expect(current.selectedIds).toEqual(before.selectedIds);
  expect(current.photos[0]!.source.hash).not.toBe(
    before.photos[0]!.source.hash,
  );
  expect(current.inputRevision).toBeGreaterThan(before.inputRevision);
  expect(current.photoLinks).toEqual([before.selectedIds]);
});
