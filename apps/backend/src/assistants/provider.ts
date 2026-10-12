import type { PreparedAssistantContext } from "./context.js";
export interface AssistantToolOutput {
  id: string;
  result: string;
}
export type AssistantStep =
  | {
      kind: "tools";
      calls: { id: string; name: unknown; arguments: unknown }[];
    }
  | { kind: "reply"; reply: unknown };
export interface AssistantInvestigation {
  next(
    outputs: readonly AssistantToolOutput[],
    finalOnly: boolean,
    signal: AbortSignal,
    dispatch: () => void,
    usage: (value: { input: number; output: number }) => void,
  ): Promise<AssistantStep>;
}
/** A single bounded turn owns its transient provider history; nothing is stored between turns. */
export interface AssistantProvider {
  begin(context: PreparedAssistantContext): AssistantInvestigation;
}
