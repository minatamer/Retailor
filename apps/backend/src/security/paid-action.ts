import { parseCatalogueAction } from "@retailor/contracts/recognition";
import type { CatalogueAction } from "@retailor/contracts/recognition";
import { parseAssistantAction } from "@retailor/contracts/assistant";
import type { AssistantAction } from "@retailor/contracts/assistant";
import { parseLogoAction } from "@retailor/contracts/brand";
import type { LogoAction } from "@retailor/contracts/brand";
export type PaidAction = CatalogueAction | AssistantAction | LogoAction;
export function parsePaidAction(input: unknown): PaidAction {
  if (
    input &&
    typeof input === "object" &&
    "action" in input &&
    input.action === "logos"
  )
    return parseLogoAction(input);
  return input &&
    typeof input === "object" &&
    "action" in input &&
    input.action === "assistant"
    ? parseAssistantAction(input)
    : parseCatalogueAction(input);
}
