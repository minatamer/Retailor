import { expect, it, vi } from "vitest";
import { APIError, APIConnectionTimeoutError } from "openai";
import { providerFailure } from "./failure.js";
import { publicError } from "@retailor/contracts/api";
import { openAiCatalogue } from "../catalogue/provider.js";
import { openAiAssistant } from "./assistant.js";
import { prepareAssistantContext } from "../assistants/context.js";
import {
  assistantFixture,
  ASSISTANT_NOW,
} from "../../test/assistant-fixture.js";
import { action } from "../../../../test/fixtures/recognition.js";

it("distinguishes operator quota/auth/configuration from temporary rate and deadline without raw content", () => {
  const signal = new AbortController().signal;
  for (const [status, code, expected] of [
    [401, "invalid_api_key", "OPERATOR_REQUIRED"],
    [403, "permission_denied", "OPERATOR_REQUIRED"],
    [404, "model_not_found", "OPERATOR_REQUIRED"],
    [429, "credit_balance_exhausted", "OPERATOR_REQUIRED"],
    [429, "project_spend_limit_exceeded", "OPERATOR_REQUIRED"],
    [429, "organization_spend_limit_exceeded", "OPERATOR_REQUIRED"],
    [429, "organization_usage_limit_exceeded", "OPERATOR_REQUIRED"],
    [429, "rate_limit_exceeded", "BUSY"],
    [500, "server_error", "UPSTREAM_FAILED"],
  ] as const) {
    const result = providerFailure(
      APIError.generate(
        status,
        { error: { code, message: "private_sentinel" } },
        "private_sentinel",
        new Headers(),
      ),
      signal,
    );
    expect(result.code).toBe(expected);
    expect(JSON.stringify(publicError(result.code, "req_test"))).not.toContain(
      "private_sentinel",
    );
    if (expected === "OPERATOR_REQUIRED")
      expect(publicError(result.code, "req_test").error.retry).toBe("never");
  }
  expect(
    providerFailure(
      new APIConnectionTimeoutError({ message: "private_sentinel" }),
      signal,
    ).code,
  ).toBe("DEADLINE");
});

it("normalizes real SDK-shaped failures at both remaining AI ports without retrying", async () => {
  for (const status of [401, 429]) {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json(
        {
          error: {
            code: status === 401 ? "invalid_api_key" : "insufficient_quota",
            type:
              status === 401 ? "invalid_request_error" : "insufficient_quota",
            message: "private_sentinel",
          },
        },
        { status },
      ),
    );
    const signal = new AbortController().signal;
    const calls = [
      () =>
        openAiCatalogue("injected-key", fetcher).interpret(
          action(),
          new Map([["source", new Uint8Array([1])]]),
          signal,
        ),
      () =>
        openAiAssistant("injected-key", fetcher)
          .begin(
            prepareAssistantContext(assistantFixture("shopper"), ASSISTANT_NOW),
          )
          .next(
            [],
            true,
            signal,
            () => undefined,
            () => undefined,
          ),
    ];
    for (const call of calls) {
      fetcher.mockClear();
      await expect(call()).rejects.toMatchObject({
        code: "OPERATOR_REQUIRED",
        message: "OPERATOR_REQUIRED",
      });
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  }
});
