import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { environment } from "../../../test/workspace";
import { SAMPLE } from "../photos/sample";
import { developmentDraft } from "../catalogue/development-fixture";
import { stockOf } from "@retailor/commerce/selectors";
import { openOwnerForm, ownerIntent } from "../operations/state";
import { bagEntries } from "../bag/quote";
const environments: ReturnType<typeof environment>[] = [];
afterEach(() => environments.splice(0).forEach((env) => env.dispose()));
function sourceFiles() {
  return ["F01", "F16", "F19"].map((name) => {
    const asset = SAMPLE.assets.find((row) => row.id === name)!;
    return {
      name: name + ".webp",
      blob: new Blob(
        [
          readFileSync(
            new URL(`../../../public${asset.path}`, import.meta.url),
          ),
        ],
        { type: asset.image.mime },
      ),
    };
  });
}
async function setup() {
  const env = environment();
  environments.push(env);
  const controller = await env.open();
  await controller.photos.add(sourceFiles());
  return { env, controller };
}
describe("automatic grouping within the existing session and commerce authority", () => {
  it("restores default-on automatic groups and retains manual separation across a deliberate rebuild", async () => {
    const { env, controller } = await setup();
    expect(controller.getSnapshot().state.autoLinkPhotos).toBe(true);
    await controller.draftCatalogue();
    const item = controller.getSnapshot().state.draft!.items[0]!;
    expect(item.product.variants).toHaveLength(6);
    const black = item.product.colourPhotos!.find(
      (row) => row.colour === "Black",
    )!.photoIds[0]!;
    controller.split(item.product.id, black);
    expect(controller.getSnapshot().state.autoLinkPhotos).toBe(false);
    const revision = controller.getSnapshot().state.inputRevision;
    controller.dispose();
    const restored = await env.open();
    expect(restored.photos.getSnapshot().autoLink).toBe(false);
    expect(restored.getSnapshot().state.inputRevision).toBe(revision);
    restored.go("choose");
    await restored.draftCatalogue();
    const items = restored.getSnapshot().state.draft!.items;
    expect(items).toHaveLength(2);
    expect(
      items.find((row) => row.product.imageIds.includes(black))!.product
        .imageIds,
    ).toEqual([black]);
    await restored.reset();
    expect(restored.getSnapshot().state.autoLinkPhotos).toBe(true);
    expect(restored.photos.getSnapshot().autoLink).toBe(true);
  });
  it("fences a late model-shaped result when the automatic-link input preference changes", async () => {
    const env = environment();
    environments.push(env);
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
    await controller.photos.add(sourceFiles());
    const pending = controller.draftCatalogue();
    controller.photos.setAutoLink(false);
    expect(signal.aborted).toBe(true);
    finish();
    await pending;
    expect(controller.getSnapshot().state.stage).toBe("choose");
    expect(controller.getSnapshot().state.draft).toBeNull();
    expect(interpret).toHaveBeenCalledTimes(1);
  });
  it("places the selected black size once without reducing blue stock and preserves colour mapping through owner editing", async () => {
    const { env, controller } = await setup();
    await controller.draftCatalogue();
    controller.publish();
    controller.useCurrentLook();
    controller.keepWordmark();
    controller.acceptDesign();
    const product = controller.getSnapshot().state.graph.products[0]!;
    const black = product.variants.find(
      (variant) => variant.colour === "Black" && variant.size === "30/30",
    )!;
    const blue = product.variants.find(
      (variant) => variant.colour === "Blue" && variant.size === "30/30",
    )!;
    const originalBlack = stockOf(
        controller.getSnapshot().state.graph,
        black.id,
      ),
      originalBlue = stockOf(controller.getSnapshot().state.graph, blue.id);
    controller.addToBag(product.id, black.id, 2);
    const blackPhoto = product.colourPhotos!.find(
      (row) => row.colour === "Black",
    )!.photoIds[0];
    expect(
      bagEntries(
        controller.getSnapshot().state.graph,
        controller.photos.availableIds(),
      )[0]!.photoId,
    ).toBe(blackPhoto);
    controller.reviewBag();
    const review = controller.getSnapshot().checkoutReview!;
    const orderId = controller.placeReviewed(review)!;
    expect(orderId).toBeTruthy();
    const graph = controller.getSnapshot().state.graph;
    expect(
      graph.orders.find((order) => order.id === orderId)!.lines[0]!.variantId,
    ).toBe(black.id);
    expect(
      graph.orders.find((order) => order.id === orderId)!.lines[0]!.photoId,
    ).toBe(blackPhoto);
    expect(stockOf(graph, black.id)).toBe(originalBlack - 2);
    expect(stockOf(graph, blue.id)).toBe(originalBlue);
    controller.placeReviewed(review);
    expect(controller.getSnapshot().state.graph).toBe(graph);
    const form = openOwnerForm(graph, "updateProduct", product.id, env.id);
    form.variants = form.variants.map((variant) => ({
      ...variant,
      colour: variant.colour === "Black" ? "Charcoal" : variant.colour,
    }));
    const intent = ownerIntent(form, graph);
    if (intent.type !== "updateProduct") throw new Error("Wrong owner intent");
    expect(
      intent.payload.colourPhotos!.find((row) => row.colour === "Charcoal")!
        .photoIds,
    ).toEqual(
      product.colourPhotos!.find((row) => row.colour === "Black")!.photoIds,
    );
    expect(intent.payload.variants.map((variant) => variant.price)).toEqual(
      product.variants.map((variant) => variant.price),
    );
  });
});
