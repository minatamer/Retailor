"use client";
import { Workspace } from "./workspace";
import { developmentDraft } from "../catalogue/development-fixture";
import type { CatalogueProcessor } from "../session/controller";
const processor: CatalogueProcessor = {
  mode: "development-fixture",
  async interpret(input) {
    input.signal.throwIfAborted();
    return developmentDraft(
      input.photos,
      input.operationId,
      input.inputRevision,
      () => crypto.randomUUID(),
    );
  },
};
/** This component is selected only by the explicit server development composition. */
export function DevelopmentWorkspace() {
  return <Workspace fixtureAllowed processor={processor} />;
}
