import { describe, expect, it, vi } from "vitest";
import { ThemeSchema, DEFAULT_THEME } from "@retailor/contracts/design";
import { AssistantToolArgumentsSchema } from "@retailor/contracts/assistant";
import {
  assistantFixture,
  ASSISTANT_NOW,
} from "../../test/assistant-fixture.js";
import { prepareAssistantContext } from "./context.js";
import { executeAssistantTool } from "./tools.js";
import { investigateAssistant } from "./service.js";
import { fixtureAssistant } from "./fake.js";
const args = () =>
  AssistantToolArgumentsSchema.parse(
    Object.fromEntries(
      Object.keys(AssistantToolArgumentsSchema.shape).map((key) => [key, null]),
    ),
  );
const cases = [
  ["Use Navy / Lime", "navy"],
  ["Use Ink / Paper", "ink"],
  ["Try Cobalt / Cloud", "cobalt"],
  ["Switch to Oxblood / Blush", "oxblood"],
  ["Choose Pine / Sand", "pine"],
] as const;
describe("finite restored merchant tones", () => {
  for (const role of ["creator", "owner"] as const) {
    it.each(cases)(
      `${role} proposes a single inert palette: %s`,
      async (prompt, theme) => {
        const payload = assistantFixture(role);
        payload.prompt = prompt;
        const before = JSON.stringify(payload.context),
          dispatch = vi.fn();
        const result = await investigateAssistant(
          payload,
          fixtureAssistant(),
          new AbortController().signal,
          { dispatch, recordUsage: vi.fn() },
          ASSISTANT_NOW,
        );
        expect(result.reply.proposal).toEqual({
          kind: "design",
          template: null,
          pageTemplates: null,
          theme,
          typography: null,
        });
        expect(JSON.stringify(payload.context)).toBe(before);
        expect(dispatch).not.toHaveBeenCalled();
      },
    );
  }
  it("discovers bounded current tone metadata/default and rejects shopper/arbitrary theme authority", () => {
    const prepared = prepareAssistantContext(
      assistantFixture("creator"),
      ASSISTANT_NOW,
    );
    const result = executeAssistantTool(prepared, "getDesignPresets", args());
    expect(result.data).toMatchObject({
      themes: ThemeSchema.options,
      defaultTheme: DEFAULT_THEME,
      themeDirections: {
        navy: "deep navy with vivid lime accents",
        ink: "quiet confidence",
        cobalt: "fresh expressive clarity",
        oxblood: "warm editorial character",
        pine: "grounded considered simplicity",
      },
    });
    for (const theme of ThemeSchema.options)
      expect(
        executeAssistantTool(prepared, "previewStoreDesign", {
          ...args(),
          theme,
        }).proposal,
      ).toMatchObject({ theme });
    expect(() =>
      executeAssistantTool(prepared, "previewStoreDesign", {
        ...args(),
        theme: "custom",
      }),
    ).toThrow();
    const shopper = prepareAssistantContext(
      assistantFixture("shopper"),
      ASSISTANT_NOW,
    );
    expect(() =>
      executeAssistantTool(shopper, "previewStoreDesign", {
        ...args(),
        theme: "navy",
      }),
    ).toThrow();
  });
  it("does not choose a theme for negative, conflicting or unsupported requests", async () => {
    const payload = assistantFixture("creator");
    for (const prompt of [
      "Do not use Pine",
      "Use Cobalt and Navy",
      "Use custom purple theme",
      "Use Ink or Blush",
    ]) {
      payload.prompt = prompt;
      const result = await investigateAssistant(
        payload,
        fixtureAssistant(),
        new AbortController().signal,
        { dispatch: vi.fn(), recordUsage: vi.fn() },
        ASSISTANT_NOW,
      );
      expect(result.reply.proposal).toBeNull();
    }
  });
});
