import { afterEach, describe, expect, it } from "vitest";
import { environment, file } from "../../../test/workspace";
import { SESSION_KEY } from "../session/projection";
import { TOUR_STEPS } from "./tour-targets";
import {
  sameTourRect,
  sameTourLocation,
  tourPanels,
  tourSpotlight,
  tourTargetVisible,
} from "./tour-layout";
const environments: ReturnType<typeof environment>[] = [];
afterEach(() => environments.splice(0).forEach((env) => env.dispose()));
async function prepared() {
  const env = environment();
  environments.push(env);
  const controller = await env.open();
  await controller.photos.add([file("one"), file("two")]);
  await controller.draftCatalogue();
  controller.publish();
  return { env, controller };
}
describe("session-owned demo orientation", () => {
  it("offers the welcome without navigating and only visits the initial step on Start", async () => {
    const { controller: c } = await prepared();
    c.finishTour();
    c.browse({ page: "collection" });
    const graph = c.getSnapshot().state.graph;
    c.startTour();
    expect(c.getSnapshot().state.browse.page).toBe("collection");
    c.finishTour();
    expect(c.getSnapshot().tour).toBeNull();
    expect(c.getSnapshot().state.browse.page).toBe("collection");
    c.startTour();
    c.tourStep(0);
    expect(c.getSnapshot().state.browse.page).toBe("home");
    expect(c.getSnapshot().state.graph).toBe(graph);
    c.finishTour();
    c.useCurrentLook();
    c.keepWordmark();
    c.acceptDesign();
    c.finishTour();
    c.go("dashboard");
    c.ownerNavigate("expenses");
    c.startTour();
    expect(c.getSnapshot().state.ownerView).toBe("expenses");
    c.tourStep(0);
    expect(c.getSnapshot().state.ownerView).toBe("overview");
  });
  it("starts only on first preview, visits all pages without changing the catalogue, and replays deliberately", async () => {
    const { env, controller: c } = await prepared();
    expect(c.getSnapshot().tour).toEqual({ role: "creator", index: 0 });
    const graph = c.getSnapshot().state.graph,
      design = c.getSnapshot().state.previewDesign;
    for (let index = 0; index < TOUR_STEPS.creator.length; index++) {
      c.tourStep(index);
      const step = TOUR_STEPS.creator[index]!;
      if (step.page) expect(c.getSnapshot().state.browse.page).toBe(step.page);
      expect(c.getSnapshot().state.graph).toBe(graph);
      expect(c.getSnapshot().state.previewDesign).toBe(design);
    }
    c.tourStep(999);
    expect(c.getSnapshot().tour?.index).toBe(7);
    c.finishTour();
    expect(c.getSnapshot().state.setup.expanded).toBe(true);
    c.dispose();
    const restored = await env.open();
    expect(restored.getSnapshot().tour).toBeNull();
    expect(restored.getSnapshot().state.tourSeen.preview).toBe(true);
    restored.go("catalogue");
    restored.publish();
    expect(restored.getSnapshot().tour).toBeNull();
    restored.startTour();
    expect(restored.getSnapshot().tour?.index).toBe(0);
    restored.tourStep(3);
    expect(restored.getSnapshot().state.browse.productId).not.toBeNull();
    restored.tourStep(2);
    expect(restored.getSnapshot().state.browse.page).toBe("collection");
  });
  it("continues at actual store controls once, preserves reset confirmation, and rearms for a fresh demo", async () => {
    const { env, controller: c } = await prepared();
    c.finishTour();
    c.useCurrentLook();
    c.keepWordmark();
    c.acceptDesign();
    expect(c.getSnapshot().tour).toEqual({
      role: "shopper",
      index: 4,
      from: 4,
    });
    c.tourStep(3);
    expect(c.getSnapshot().tour?.index).toBe(4);
    expect(c.getSnapshot().state.tourSeen).toEqual({
      preview: true,
      storefront: true,
    });
    c.finishTour();
    c.go("dashboard");
    c.startTour();
    expect(c.getSnapshot().tour?.role).toBe("owner");
    c.go("storefront");
    expect(c.getSnapshot().tour).toBeNull();
    c.go("style");
    c.acceptDesign();
    expect(c.getSnapshot().tour).toBeNull();
    c.askReset();
    c.closeDialog();
    expect(c.getSnapshot().state.tourSeen.storefront).toBe(true);
    c.dispose();
    const restored = await env.open();
    expect(restored.getSnapshot().tour).toBeNull();
    await restored.reset();
    expect(restored.getSnapshot().state.tourSeen).toEqual({
      preview: false,
      storefront: false,
    });
    restored.startTour();
    expect(restored.getSnapshot().tour).toBeNull();
    await restored.photos.add([file("new")]);
    await restored.draftCatalogue();
    restored.publish();
    expect(restored.getSnapshot().tour?.role).toBe("creator");
    env.advance(7_200_001);
    restored.tourStep(2);
    expect(restored.getSnapshot().tour).toBeNull();
  });
  it("restores legacy saves with bounded defaults and no surprise replay", async () => {
    const { env, controller } = await prepared();
    controller.finishTour();
    controller.dispose();
    const saved = JSON.parse(env.storage.getItem(SESSION_KEY)!);
    delete saved.tourSeen;
    env.storage.setItem(SESSION_KEY, JSON.stringify(saved));
    const restored = await env.open();
    expect(restored.getSnapshot().tour).toBeNull();
    expect(restored.getSnapshot().state.tourSeen).toEqual({
      preview: false,
      storefront: false,
    });
  });
});
describe("spotlight geometry", () => {
  it("keeps a presentation only when both the card and sharp target stay at the same location", () => {
    const previous = {
      rect: { top: 20, left: 50, width: 200, height: 44 },
      card: { top: 80, left: 50, width: 348, height: 280 },
    };
    expect(sameTourLocation(previous, structuredClone(previous))).toBe(true);
    expect(
      sameTourLocation(previous, {
        ...previous,
        card: { ...previous.card, top: 81 },
      }),
    ).toBe(false);
    expect(
      sameTourLocation(previous, {
        ...previous,
        rect: { ...previous.rect, left: 51 },
      }),
    ).toBe(false);
    expect(
      sameTourLocation(previous, {
        ...previous,
        card: { ...previous.card, height: 300 },
      }),
    ).toBe(false);
    expect(sameTourLocation(previous, { ...previous, rect: null })).toBe(false);
  });
  it("requires the whole small target to arrive, handles oversized sections and visible keyboard offsets", () => {
    const viewport = { width: 390, height: 500, top: 100, left: 0 };
    expect(
      tourTargetVisible(
        { top: 500, bottom: 640, left: 20, right: 370 },
        viewport,
      ),
    ).toBe(false);
    expect(
      tourTargetVisible(
        { top: 450, bottom: 590, left: 20, right: 370 },
        viewport,
      ),
    ).toBe(true);
    expect(
      tourTargetVisible(
        { top: -50, bottom: 800, left: 20, right: 370 },
        viewport,
      ),
    ).toBe(true);
    expect(
      tourTargetVisible(
        { top: 80, bottom: 590, left: 380, right: 450 },
        viewport,
      ),
    ).toBe(false);
    expect(
      sameTourRect(
        { top: 10, bottom: 30, left: 10, right: 30 },
        { top: 11, bottom: 31, left: 10, right: 30 },
      ),
    ).toBe(false);
  });
  it("covers exactly the outside area, never the selected rectangle, and fully masks movement", () => {
    const viewport = { width: 390, height: 844, top: 0, left: 0 };
    const hole = tourSpotlight(
      { top: 100, left: 20, bottom: 200, right: 370 },
      viewport,
    );
    const panels = tourPanels(hole, viewport);
    expect(
      panels.reduce((sum, panel) => sum + panel.width * panel.height, 0) +
        hole.width * hole.height,
    ).toBe(viewport.width * viewport.height);
    for (const p of panels)
      expect(
        p.width === 0 ||
          p.height === 0 ||
          p.left + p.width <= hole.left ||
          p.left >= hole.left + hole.width ||
          p.top + p.height <= hole.top ||
          p.top >= hole.top + hole.height,
      ).toBe(true);
    expect(tourPanels(null, viewport)).toEqual([
      { top: 0, left: 0, width: 390, height: 844 },
    ]);
  });
});
