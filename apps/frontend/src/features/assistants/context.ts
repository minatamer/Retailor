import type { AssistantContext } from "@retailor/contracts/assistant";
import type { Projection } from "../session/projection";
import { dashboardScope } from "../dashboard/model";
import { selectedScope } from "../currency/display";
import { USD_SCOPE } from "@retailor/contracts/currency";
import { designConfirmed } from "./setup";
export const roleOf = (state: Projection) =>
  state.stage === "style"
    ? ("creator" as const)
    : state.stage === "dashboard"
      ? ("owner" as const)
      : ("shopper" as const);
export function currentAssistantContext(
  state: Projection,
  available: ReadonlySet<string>,
) {
  const filter = state.browse.filters,
    role = roleOf(state),
    scope = dashboardScope(state.graph, state.dashboard.period),
    selection =
      role === "owner"
        ? (state.dashboard.target ?? state.dashboard.pinned)
        : null;
  const day =
    selection?.kind === "day" &&
    Date.parse(`${selection.day}T00:00:00.000Z`) < Date.parse(scope.to) &&
    Date.parse(`${selection.day}T00:00:00.000Z`) + 86400000 >
      Date.parse(scope.from)
      ? selection.day
      : null;
  return {
    role,
    graph: state.graph,
    scope,
    currency: role === "owner" ? USD_SCOPE : selectedScope(state.currency),
    design:
      state.stage === "style" || state.designEditing
        ? state.previewDesign
        : state.acceptedDesign,
    availablePhotoIds: state.graph.photos
      .filter((p) => available.has(p.id))
      .map((p) => p.id),
    query: filter.search,
    categories: filter.category ? [filter.category] : [],
    minimum: filter.minPrice,
    maximum: filter.maxPrice,
    selectedProductId:
      role === "owner"
        ? selection?.kind === "product"
          ? selection.productId
          : null
        : state.browse.productId,
    selectedFactId:
      selection && "factId" in selection
        ? (selection.factId ?? state.dashboard.series)
        : selection?.kind === "day"
          ? state.dashboard.series
          : null,
    selectedDay: day,
    designConfirmed:
      state.hasAcceptedLook ||
      designConfirmed(state.setup, state.previewDesign),
  } satisfies AssistantContext;
}
