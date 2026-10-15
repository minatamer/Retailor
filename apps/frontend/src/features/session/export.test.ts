import { afterEach, expect, it, vi } from "vitest";
import { DemoExportSchema, EXPORT_LIMITS } from "@retailor/contracts/export";
import { generateScenario } from "@retailor/commerce/scenarios";
import { environment, file } from "../../../test/workspace";
import { buildExport } from "./export";
import { ReportDownload } from "./download";
import { heroPhotoIds } from "@retailor/contracts/design";

const environments: ReturnType<typeof environment>[] = [];
afterEach(() => {
  environments.splice(0).forEach((env) => env.dispose());
  vi.useRealTimers();
});
async function collection() {
  const env = environment();
  environments.push(env);
  const controller = await env.open({ scenarioFactory: generateScenario });
  await controller.photos.add([file("one"), file("two")]);
  await controller.draftCatalogue();
  controller.publish();
  controller.useCurrentLook();
  controller.keepWordmark();
  controller.acceptDesign();
  return { env, controller };
}
it("exports all accepted hero metadata with the legacy first photo and no preview or image bytes", async () => {
  const { env, controller } = await collection();
  controller.go("dashboard");
  controller.beginOwnerDesign();
  const state = controller.getSnapshot().state;
  controller.design({ ...state.previewDesign, template: "pulse" });
  controller.heroInput(0, state.photos[0]!.id);
  controller.heroInput(1, state.photos[1]!.id);
  await controller.uploadHero(file("third-hero"), 2);
  controller.applyOwnerDesign();
  const accepted = controller.getSnapshot().state.acceptedDesign;
  const result = buildExport(controller.getSnapshot().state, env.clock(), true);
  const report = DemoExportSchema.parse(JSON.parse(result.json));
  expect(report.heroPhotos.map((photo) => photo.id)).toEqual(
    heroPhotoIds(accepted),
  );
  expect(report.heroPhoto?.id).toBe(accepted.heroPhotoId);
  expect(result.bytes).toBeLessThan(EXPORT_LIMITS.bytes);
  expect(result.json).not.toMatch(/blob:|data:image/u);
  expect(() =>
    DemoExportSchema.parse({
      ...report,
      heroPhotos: [...report.heroPhotos, report.heroPhotos[0]],
    }),
  ).toThrow();
});
it("exports finalized exact records and scoped facts while excluding chat, drafts, replay and preview design", async () => {
  const { env, controller } = await collection();
  controller.go("dashboard");
  controller.setDashboardPeriod("all");
  controller.beginOwnerDesign();
  const state = controller.getSnapshot().state;
  controller.design({ ...state.previewDesign, name: "Unaccepted preview" });
  const result = buildExport(controller.getSnapshot().state, env.clock(), true),
    report = DemoExportSchema.parse(JSON.parse(result.json));
  expect(result.filename).toBe("retailor-demo-v1-2026-10-11.json");
  expect(result.bytes).toBe(new TextEncoder().encode(result.json).length);
  expect(result.bytes).toBeLessThan(EXPORT_LIMITS.bytes);
  expect(report.acceptedDesign?.name).toBe(state.acceptedDesign.name);
  expect(report.records.orders).toEqual(state.graph.orders);
  expect(report.scenario?.preset).toBe("healthy");
  expect(report.report.scope.from).toBe(state.graph.anchorAt);
  expect(
    report.report.facts.find((f) => f.factId === "gross_sales")?.value,
  ).toBe(state.graph.orders.reduce((sum, order) => sum + order.gross, 0));
  expect(report.records.products[0]?.attributes).toEqual(
    state.graph.products[0]?.attributes,
  );
  expect(report.catalogueReview?.items[0]?.copyOrigin).toBe(
    state.draft?.items[0]?.copyOrigin,
  );
  expect(Object.keys(report.records)).not.toEqual(
    expect.arrayContaining(["bag", "receipts", "orderDrafts", "expenseDrafts"]),
  );
  expect(result.json).not.toMatch(
    /"(?:conversation|grant|data|token|identity|undo|preparedLogo|previewDesign|pendingProvider)"\s*:|blob:|data:image/iu,
  );
  expect(() =>
    DemoExportSchema.parse({ ...report, conversation: [] }),
  ).toThrow();
  expect(() =>
    DemoExportSchema.parse({
      ...report,
      records: { ...report.records, receipts: [] },
    }),
  ).toThrow();
});
it("preserves dated EUR metadata and historic confirmation scopes without converting USD records", async () => {
  const { env, controller } = await collection();
  const state = controller.getSnapshot().state,
    snapshot = {
      schemaVersion: 1 as const,
      snapshotId: "fx_1",
      base: "USD" as const,
      quote: "EUR" as const,
      rateDecimal: "0.875",
      rateDate: "2026-10-11",
      fetchedAt: new Date(env.clock()).toISOString(),
      sourceId: "development-fixture" as const,
    };
  const report = DemoExportSchema.parse(
    JSON.parse(
      buildExport(
        { ...state, currency: { selected: "EUR", acceptedSnapshot: snapshot } },
        env.clock(),
        true,
      ).json,
    ),
  );
  expect(report.currency.acceptedSnapshot).toEqual(snapshot);
  expect(report.moneyAuthority).toBe("USD integer cents");
  expect(report.records.orders[0]?.gross).toBe(state.graph.orders[0]?.gross);
  expect(() => buildExport(state, env.clock(), false)).toThrow();
  env.advance(7_200_000);
  expect(() => buildExport(state, env.clock(), true)).toThrow();
});
it("releases its one download URL after replacement, timer, reset and failed native dispatch", () => {
  vi.useFakeTimers();
  let sequence = 0;
  const blobs: Blob[] = [],
    revoke = vi.fn(),
    save = vi.fn(),
    resource = new ReportDownload({
      create: (blob) => {
        blobs.push(blob);
        return `blob:${++sequence}`;
      },
      revoke,
      save,
    });
  resource.save('{"first":1}', "retailor-demo-v1-2026-10-11.json");
  expect(blobs[0]?.type).toBe("application/json");
  resource.save('{"second":2}', "retailor-demo-v1-2026-10-11.json");
  expect(revoke).toHaveBeenCalledWith("blob:1");
  expect(vi.getTimerCount()).toBe(1);
  vi.advanceTimersByTime(1500);
  expect(revoke).toHaveBeenCalledWith("blob:2");
  resource.save("{}", "report.json");
  resource.clear();
  resource.clear();
  expect(revoke).toHaveBeenCalledTimes(3);
  expect(vi.getTimerCount()).toBe(0);
  save.mockImplementationOnce(() => {
    throw new Error("Blocked download");
  });
  expect(() => resource.save("{}", "report.json")).toThrow("Blocked download");
  expect(revoke).toHaveBeenCalledWith("blob:4");
  expect(vi.getTimerCount()).toBe(0);
});
it("connects export ownership to reset/dispose and refuses expired download dispatch", async () => {
  const env = environment();
  environments.push(env);
  const save = vi.fn(),
    revoke = vi.fn(),
    controller = await env.open({
      download: { create: () => "blob:export", revoke, save },
    });
  await controller.photos.add([file("one")]);
  await controller.draftCatalogue();
  controller.publish();
  controller.exportReport();
  expect(save).toHaveBeenCalledOnce();
  await controller.reset();
  expect(revoke).toHaveBeenCalledWith("blob:export");
  await controller.photos.add([file("two")]);
  await controller.draftCatalogue();
  controller.publish();
  env.advance(7_200_000);
  controller.exportReport();
  expect(save).toHaveBeenCalledOnce();
});
