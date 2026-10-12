import { describe, expect, it } from "vitest";
import {
  AssistantActionSchema,
  parseAssistantAction,
  AssistantToolNameSchema,
  ModelAssistantReplySchema,
} from "./assistant.js";
const action = {
  schemaVersion: 1,
  action: "assistant",
  mode: "live",
  role: "owner",
  workspaceId: "workspace",
  operationId: "turn",
  scenarioId: "story",
  dataRevision: 3,
  createdAt: "2026-10-12T12:00:00.000Z",
  expiresAt: "2026-10-12T14:00:00.000Z",
  disclosureVersion: "tailor-context-v1",
  digest: "a".repeat(64),
};
describe("bounded assistant trust shapes", () => {
  it("binds a small canonical role/context action and rejects expanded lifetime or foreign fields", () => {
    expect(parseAssistantAction(action).role).toBe("owner");
    expect(() =>
      parseAssistantAction({
        ...action,
        expiresAt: "2026-10-12T14:01:00.000Z",
      }),
    ).toThrow();
    expect(
      AssistantActionSchema.safeParse({ ...action, callback: "run" }).success,
    ).toBe(false);
    expect(AssistantToolNameSchema.safeParse("execute_shell").success).toBe(
      false,
    );
  });
  it("rejects executable/foreign proposal fields and excessive reply/reference count", () => {
    const reply = {
      text: "Inspect the actual source.",
      references: [],
      claims: [],
      navigation: null,
      proposal: null,
    };
    expect(ModelAssistantReplySchema.parse(reply).text).toBe(reply.text);
    expect(
      ModelAssistantReplySchema.safeParse({ ...reply, text: "x".repeat(4001) })
        .success,
    ).toBe(false);
    expect(
      ModelAssistantReplySchema.safeParse({
        ...reply,
        references: Array.from({ length: 9 }, () => ({
          kind: "product",
          productId: "product",
        })),
      }).success,
    ).toBe(false);
    expect(
      ModelAssistantReplySchema.safeParse({
        ...reply,
        navigation: {
          kind: "open-product",
          productId: "product",
          url: "https://unregistered.invalid",
        },
      }).success,
    ).toBe(false);
    expect(
      ModelAssistantReplySchema.safeParse({
        ...reply,
        proposal: { kind: "bag", variantId: "option", quantity: 6 },
      }).success,
    ).toBe(false);
  });
});
