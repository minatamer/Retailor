import { describe, expect, it } from "vitest";
import { environment, file } from "../../../test/workspace";
import { generateScenario } from "@retailor/commerce/scenarios";
import { exactSum } from "@retailor/commerce/allocation";
import { emptyGraph, parseGraph } from "@retailor/commerce/graph";
import { dashboardRecord } from "./state";
import {
  dashboardModel,
  dashboardScope,
  resolveDashboardTarget,
  factDisplay,
} from "./model";

describe("bounded current dashboard observations", () => {
  it("shares immutable period projections without colliding on matching ids/revisions", () => {
    const graph = emptyGraph({
      workspaceId: "cache",
      scenarioId: "cache",
      createdAt: "2026-10-12T12:00:00.000Z",
    });
    const week = dashboardModel(graph, "7days"),
      month = dashboardModel(graph, "28days"),
      all = dashboardModel(graph, "all");
    expect(dashboardModel(graph, "7days")).toBe(week);
    expect(dashboardModel(graph, "28days")).toBe(month);
    expect(dashboardModel(graph, "all")).toBe(all);
    expect(week).not.toBe(month);
    expect(Object.isFrozen(all)).toBe(true);
    expect(Object.isFrozen(all.days)).toBe(true);
    expect(() => {
      all.days.pop();
    }).toThrow();
    const other = parseGraph({
      ...graph,
      anchorAt: "2026-10-11T00:00:00.000Z",
    });
    expect(other.revision).toBe(graph.revision);
    expect(dashboardModel(other, "all").scope.from).toBe(other.anchorAt);
    expect(dashboardModel(other, "all")).not.toBe(all);
    expect(dashboardModel(graph, "all").scope.from).toBe(graph.anchorAt);
  });
  it("rechecks changed caller-owned graphs and refuses periods outside the finite controls", () => {
    const input = structuredClone(
      emptyGraph({
        workspaceId: "raw",
        scenarioId: "raw",
        createdAt: "2026-10-12T12:00:00.000Z",
      }),
    );
    const before = dashboardModel(input, "all");
    input.anchorAt = "2026-10-11T00:00:00.000Z";
    const after = dashboardModel(input, "all");
    expect(after.scope.from).toBe(input.anchorAt);
    expect(before.scope.from).not.toBe(after.scope.from);
    expect(() => dashboardModel(input, JSON.parse('"outside"'))).toThrow();
    input.expiresAt = input.createdAt;
    expect(() => dashboardModel(input, "all")).toThrow();
  });
  it("reconciles daily event values with their whole period and safely resolves scope/identity changes", async () => {
    const env = environment();
    try {
      const controller = await env.open({ scenarioFactory: generateScenario });
      await controller.photos.add([file("shirt"), file("jeans")]);
      await controller.draftCatalogue();
      controller.publish();
      const graph = controller.getSnapshot().state.graph;
      const order = graph.orders[0]!;
      expect(
        dashboardRecord(graph, `line:${order.lines[0]!.id}`),
      ).toMatchObject({
        kind: "line",
        orderId: order.id,
        origin: order.origin,
        placedAt: order.placedAt,
      });
      const model = dashboardModel(graph, "all");
      expect(model.days.length).toBeLessThanOrEqual(32);
      expect(exactSum(model.days.map((d) => d.sales.numerator))).toBe(
        model.registry.find((f) => f.factId === "net_sales")!.numerator,
      );
      expect(exactSum(model.days.map((d) => d.result.numerator))).toBe(
        model.registry.find((f) => f.factId === "operating_result")!.numerator,
      );
      const oldDay = model.days[0]!.day;
      expect(
        resolveDashboardTarget(
          model,
          { kind: "day", day: oldDay },
          "net_sales",
        ),
      ).not.toBeNull();
      expect(
        resolveDashboardTarget(
          dashboardModel(graph, "7days"),
          { kind: "day", day: oldDay },
          "net_sales",
        ),
      ).toBeNull();
      expect(
        resolveDashboardTarget(
          model,
          { kind: "product", productId: "unavailable" },
          "net_sales",
        ),
      ).toBeNull();
      const scope = dashboardScope(graph, "7days");
      expect(dashboardModel(graph, "7days").comparison.registry).not.toBeNull();
      expect(
        dashboardModel(graph, "28days").comparison.registry,
      ).not.toBeNull();
      expect(Date.parse(scope.to) - Date.parse(scope.from)).toBe(
        7 * 86_400_000,
      );
      expect(
        model.registry.every(
          (f) =>
            f.revision === graph.revision && f.scenarioId === graph.scenarioId,
        ),
      ).toBe(true);
    } finally {
      env.dispose();
    }
  });
  it("covers all90 simulated days with bounded contiguous intervals and exact totals", async () => {
    const env = environment();
    try {
      const controller = await env.open({ scenarioFactory: generateScenario });
      await controller.photos.add([file("shirt"), file("jeans")]);
      await controller.draftCatalogue();
      controller.publish();
      const graph = controller.getSnapshot().state.graph;
      const all = dashboardModel(graph, "all");
      const recent = dashboardModel(graph, "28days");
      expect(all.bucketDays).toBe(3);
      expect(recent.bucketDays).toBe(1);
      expect(dashboardModel(graph, "7days").bucketDays).toBe(1);
      expect(all.days.length).toBeLessThanOrEqual(32);
      expect(all.days[0]!.sales.scope.from).toBe(all.scope.from);
      expect(all.days.at(-1)!.sales.scope.to).toBe(all.scope.to);
      all.days.forEach((day, index) => {
        if (index)
          expect(day.sales.scope.from).toBe(
            all.days[index - 1]!.sales.scope.to,
          );
        expect(
          Date.parse(day.sales.scope.to) - Date.parse(day.sales.scope.from),
        ).toBeLessThanOrEqual(3 * 86_400_000);
      });
      expect(exactSum(all.days.map((day) => day.sales.numerator))).toBe(
        all.registry.find((f) => f.factId === "net_sales")!.value,
      );
      expect(exactSum(all.days.map((day) => day.result.numerator))).toBe(
        all.registry.find((f) => f.factId === "operating_result")!.value,
      );
      expect(
        all.registry.find((f) => f.factId === "net_sales")!.value,
      ).toBeGreaterThan(
        recent.registry.find((f) => f.factId === "net_sales")!.value!,
      );
      expect(
        all.registry.find((f) => f.factId === "included_orders")!.value,
      ).toBeGreaterThan(
        recent.registry.find((f) => f.factId === "included_orders")!.value!,
      );
      const observation = resolveDashboardTarget(
        all,
        { kind: "day", day: all.days[0]!.day },
        "net_sales",
      );
      expect(observation!.fact.scope).toEqual(all.days[0]!.sales.scope);
      expect(observation!.label).toContain("Period starting");
    } finally {
      env.dispose();
    }
  });
  it("preserves owned scope/selection through presentation changes and refresh, while fencing replacement identity", async () => {
    const env = environment();
    try {
      const controller = await env.open({ scenarioFactory: generateScenario });
      await controller.photos.add([file("shirt"), file("jeans")]);
      await controller.draftCatalogue();
      controller.publish();
      controller.useCurrentLook();
      controller.keepWordmark();
      controller.acceptDesign();
      controller.continueFromConnection();
      controller.go("dashboard");
      controller.setDashboardPeriod("7days");
      controller.setDashboardSeries("operating_result");
      controller.openDashboardEvidence({ kind: "metric", factId: "net_sales" });
      const orderId = controller.getSnapshot().state.graph.orders[0]!.id;
      controller.openDashboardSource(`order:${orderId}`);
      expect(controller.getSnapshot().state.dashboard.source).toBe(
        `order:${orderId}`,
      );
      controller.openDashboardSource("https://unregistered.invalid/");
      expect(controller.getSnapshot().state.dashboard.source).toBe(
        `order:${orderId}`,
      );
      controller.ownerNavigate("orders");
      controller.ownerNavigate("overview");
      expect(controller.getSnapshot().state.dashboard.period).toBe("7days");
      controller.dispose();
      const restored = await env.open({ scenarioFactory: generateScenario });
      expect(restored.getSnapshot().state.dashboard).toMatchObject({
        period: "7days",
        series: "operating_result",
        source: `order:${orderId}`,
      });
      restored.prepareScenario("loss");
      restored.confirmScenario(restored.getSnapshot().scenarioReview!);
      expect(restored.getSnapshot().state.dashboard).toMatchObject({
        period: "7days",
        series: "operating_result",
        target: null,
        pinned: null,
        source: null,
      });
      const model = dashboardModel(restored.getSnapshot().state.graph, "7days");
      expect(
        model.registry.every(
          (f) => f.scenarioId === restored.getSnapshot().state.graph.scenarioId,
        ),
      ).toBe(true);
    } finally {
      env.dispose();
    }
  });
  it("recomputes a selected figure after a posted expense and keeps large aggregate amounts exact", async () => {
    const env = environment();
    try {
      const controller = await env.open({ scenarioFactory: generateScenario });
      await controller.photos.add([file("shirt"), file("jeans")]);
      await controller.draftCatalogue();
      controller.publish();
      controller.useCurrentLook();
      controller.keepWordmark();
      controller.acceptDesign();
      controller.continueFromConnection();
      controller.go("dashboard");
      controller.setDashboardPeriod("all");
      const target = { kind: "metric", factId: "operating_result" } as const;
      controller.openDashboardEvidence(target);
      const before = resolveDashboardTarget(
        dashboardModel(controller.getSnapshot().state.graph, "all"),
        target,
        "net_sales",
      )!.fact;
      controller.openOwnerOperation("saveExpenseDraft");
      const draftId = controller.getSnapshot().ownerForm!.targetId;
      controller.editOwnerField("amount", "10.00");
      controller.editOwnerField("note", "Demo operating expense");
      controller.reviewOwnerOperation();
      controller.confirmOwnerOperation(controller.getSnapshot().ownerReview!);
      controller.openOwnerOperation("postExpense", draftId);
      controller.reviewOwnerOperation();
      controller.confirmOwnerOperation(controller.getSnapshot().ownerReview!);
      const after = resolveDashboardTarget(
        dashboardModel(controller.getSnapshot().state.graph, "all"),
        target,
        "net_sales",
      )!.fact;
      expect(after.value).toBe(before.value! - 1000);
      expect(after.revision).toBeGreaterThan(before.revision);
      for (const p of controller.getSnapshot().state.graph.products) {
        controller.openOwnerOperation("updateProduct", p.id);
        controller.editOwnerRows(
          "variants",
          controller
            .getSnapshot()
            .ownerForm!.variants.map((v) => ({ ...v, price: "999999.99" })),
        );
        controller.reviewOwnerOperation();
        controller.confirmOwnerOperation(controller.getSnapshot().ownerReview!);
      }
      controller.prepareScenario("healthy");
      controller.confirmScenario(controller.getSnapshot().scenarioReview!);
      const model = dashboardModel(controller.getSnapshot().state.graph, "all"),
        sales = model.registry.find((f) => f.factId === "net_sales")!;
      expect(sales.value).toBeGreaterThan(1_000_000_000);
      expect(factDisplay(sales)).toMatch(/^\$[\d,]+\.\d{2}$/);
      expect(exactSum(model.days.map((d) => d.sales.numerator))).toBe(
        sales.numerator,
      );
    } finally {
      env.dispose();
    }
  });
  it("distinguishes an empty recorded period from unavailable ratios and missing history", () => {
    const graph = emptyGraph({
      workspaceId: "empty",
      scenarioId: "empty",
      createdAt: "2026-10-12T12:00:00.000Z",
    });
    const all = dashboardModel(graph, "all");
    expect(all.registry.find((f) => f.factId === "net_sales")!.value).toBe(0);
    expect(factDisplay(all.registry.find((f) => f.factId === "aov")!)).toBe(
      "Unavailable",
    );
    expect(all.products).toEqual([]);
    expect(all.inventory).toEqual([]);
    expect(
      dashboardModel(graph, "28days").registry.find(
        (f) => f.factId === "net_sales",
      )!.value,
    ).toBeNull();
  });
});
