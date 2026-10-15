import type { PendingCheckout } from "@retailor/contracts/checkout";
import type { Projection } from "../session/projection";
import { bagWitness } from "@retailor/commerce/shopping";
import { selectedScope } from "../currency/display";

export function checkoutCurrent(
  pending: PendingCheckout,
  state: Projection,
  photos: ReadonlySet<string>,
  now: number,
) {
  return (
    pending.workspaceId === state.graph.workspaceId &&
    pending.scenarioId === state.graph.scenarioId &&
    pending.revision === state.graph.revision &&
    Date.parse(pending.expiresAt) > now &&
    Date.parse(state.graph.expiresAt) > now &&
    pending.witness === bagWitness(state.graph, photos) &&
    JSON.stringify(pending.scope) ===
      JSON.stringify(selectedScope(state.currency)) &&
    pending.brand.name === state.acceptedDesign.name &&
    pending.brand.theme === state.acceptedDesign.theme
  );
}
