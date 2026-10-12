import { z } from "zod";
import {
  ASSISTANT_LIMITS,
  AssistantRoleSchema,
  AssistantResultSchema,
  assistantFence,
} from "@retailor/contracts/assistant";
import type {
  AssistantContext,
  AssistantResult,
} from "@retailor/contracts/assistant";
import { IdSchema } from "@retailor/contracts/core";
import { TimestampSchema } from "@retailor/contracts/commerce";
export const ChatMessageSchema = z.strictObject({
  id: IdSchema,
  role: AssistantRoleSchema,
  author: z.enum(["user", "assistant"]),
  text: z.string().min(1).max(4000),
  at: TimestampSchema,
  scenarioId: IdSchema,
  result: AssistantResultSchema.nullable(),
  restored: z.boolean().default(false),
});
export const ConversationSchema = z
  .array(ChatMessageSchema)
  .max(ASSISTANT_LIMITS.messages);
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export function appendMessage(
  messages: readonly ChatMessage[],
  message: ChatMessage,
) {
  return ConversationSchema.parse(
    [...messages, message].slice(-ASSISTANT_LIMITS.messages),
  );
}
export function replyCurrent(result: AssistantResult, c: AssistantContext) {
  const f = assistantFence(c),
    old = result.fence,
    s = result.sensitivity;
  return (
    result.role === c.role &&
    f.workspaceId === old.workspaceId &&
    f.scenarioId === old.scenarioId &&
    f.dataRevision === old.dataRevision &&
    f.photoKey === old.photoKey &&
    (!s.currency || f.currencyKey === old.currencyKey) &&
    (!s.scope || f.scopeKey === old.scopeKey) &&
    (!s.design || f.designKey === old.designKey) &&
    (!s.filters || f.filterKey === old.filterKey)
  );
}
