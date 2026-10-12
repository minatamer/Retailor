import { parseCatalogueAction } from "@retailor/contracts/recognition";
import type { CatalogueAction } from "@retailor/contracts/recognition";
import { parseAssistantAction } from "@retailor/contracts/assistant";
import type { AssistantAction } from "@retailor/contracts/assistant";
export type PaidAction = CatalogueAction | AssistantAction;
export function parsePaidAction(input: unknown): PaidAction {
  return input &&
    typeof input === "object" &&
    "action" in input &&
    input.action === "assistant"
    ? parseAssistantAction(input)
    : parseCatalogueAction(input);
}
