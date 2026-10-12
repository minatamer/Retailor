import {
  ASSISTANT_LIMITS,
  AssistantResultSchema,
} from "@retailor/contracts/assistant";
import { prepareAssistantContext } from "./context.js";
import { groundReply } from "./grounding.js";
import { executeAssistantTool } from "./tools.js";
import type { AssistantProvider, AssistantToolOutput } from "./provider.js";
import { deny, OperationFailure } from "../security/errors.js";
export interface AssistantAccounting {
  dispatch(): void;
  recordUsage(value: { input: number; output: number }): void;
}
/** One foreground turn; no persistent model thread, autonomous follow-up or retry. */
export async function investigateAssistant(
  input: unknown,
  provider: AssistantProvider,
  signal: AbortSignal,
  accounting: AssistantAccounting,
  now = new Date().toISOString(),
) {
  const prepared = prepareAssistantContext(input, now),
    owner = new AbortController();
  const timer = setTimeout(() => owner.abort(), ASSISTANT_LIMITS.deadlineMs),
    owned = AbortSignal.any([signal, owner.signal]);
  let dispatched = false,
    closed = false,
    requests = 0,
    usageCount = 0,
    inputTokens = 0,
    outputTokens = 0,
    tools = 0;
  const ids = new Set<string>();
  const aborted = new Promise<never>((_resolve, reject) => {
    const abort = () => reject(new OperationFailure("DEADLINE", 504));
    owned.addEventListener("abort", abort, { once: true });
    if (owned.aborted) abort();
  });
  // Provider construction can fail before the first race observes cancellation.
  void aborted.catch(() => undefined);
  try {
    owned.throwIfAborted();
    const turn = provider.begin(prepared);
    let outputs: AssistantToolOutput[] = [];
    for (let index = 0; index < ASSISTANT_LIMITS.modelRequests; index++) {
      const step = await Promise.race([
        aborted,
        turn.next(
          outputs,
          index === ASSISTANT_LIMITS.modelRequests - 1 ||
            tools >= ASSISTANT_LIMITS.tools,
          owned,
          () => {
            if (closed || owned.aborted) return deny("DEADLINE", 504);
            if (!dispatched) {
              accounting.dispatch();
              dispatched = true;
            }
            requests++;
            if (requests > ASSISTANT_LIMITS.modelRequests)
              return deny("UPSTREAM_FAILED", 502);
          },
          (usage) => {
            if (
              closed ||
              !Number.isSafeInteger(usage.input) ||
              !Number.isSafeInteger(usage.output) ||
              usage.input < 0 ||
              usage.input > ASSISTANT_LIMITS.inputTokens ||
              usage.output < 0 ||
              usage.output > ASSISTANT_LIMITS.outputTokens ||
              usageCount >= requests
            )
              return deny("UPSTREAM_FAILED", 502);
            usageCount++;
            inputTokens += usage.input;
            outputTokens += usage.output;
          },
        ),
      ]);
      owned.throwIfAborted();
      if (step.kind === "reply") {
        const grounded = groundReply(prepared, step.reply);
        return AssistantResultSchema.parse({
          schemaVersion: 1,
          mode: prepared.payload.mode,
          role: prepared.payload.context.role,
          operationId: prepared.payload.operationId,
          fence: prepared.fence,
          ...grounded,
        });
      }
      if (
        index === ASSISTANT_LIMITS.modelRequests - 1 ||
        !step.calls.length ||
        tools + step.calls.length > ASSISTANT_LIMITS.tools
      )
        return deny("UPSTREAM_FAILED", 502);
      outputs = [];
      for (const call of step.calls) {
        if (
          typeof call.id !== "string" ||
          !call.id.length ||
          call.id.length > 100 ||
          ids.has(call.id)
        )
          return deny("UPSTREAM_FAILED", 502);
        ids.add(call.id);
        tools++;
        const result = JSON.stringify(
          executeAssistantTool(prepared, call.name, call.arguments),
        );
        if (Buffer.byteLength(result) > 4000) return deny("TOO_LARGE", 413);
        outputs.push({ id: call.id, result });
      }
    }
    return deny("UPSTREAM_FAILED", 502);
  } catch (error) {
    if (owned.aborted) return deny("DEADLINE", 504);
    if (error instanceof OperationFailure) throw error;
    return deny("UPSTREAM_FAILED", 502);
  } finally {
    closed = true;
    if (dispatched && usageCount === requests && usageCount > 0)
      accounting.recordUsage({ input: inputTokens, output: outputTokens });
    clearTimeout(timer);
    owner.abort();
  }
}
