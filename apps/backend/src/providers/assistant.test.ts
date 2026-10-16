import { describe, expect, it, vi } from "vitest";
import { openAiAssistant } from "./assistant.js";
import { generateScenario } from "@retailor/commerce/scenarios";
import { allActivityScope } from "@retailor/commerce/facts";
import { AssistantToolArgumentsSchema } from "@retailor/contracts/assistant";
import { investigateAssistant } from "../assistants/service.js";
import { prepareAssistantContext } from "../assistants/context.js";
import {
  assistantFixture,
  ASSISTANT_NOW,
} from "../../test/assistant-fixture.js";
const reply = {
  text: "Here is the current evidence.",
  references: [],
  claims: [],
  navigation: null,
  proposal: null,
};
function response(output: unknown[], status = "completed") {
  return {
    id: "resp_test",
    object: "response",
    created_at: 1,
    status,
    error: null,
    incomplete_details: null,
    output,
    usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
  };
}
const message = (
  text = JSON.stringify({
    text: reply.text,
    references: reply.references,
    claims: reply.claims,
    usePreparedActions: false,
  }),
) => ({
  id: "msg_test",
  type: "message",
  role: "assistant",
  status: "completed",
  content: [{ type: "output_text", annotations: [], text }],
});
interface SchemaNode {
  $ref?: string;
  $defs?: Record<string, SchemaNode>;
  properties: Record<string, SchemaNode>;
  items: SchemaNode;
  anyOf: SchemaNode[];
  const: string;
}
function schemaReference(root: SchemaNode, node: SchemaNode): SchemaNode {
  if (!node.$ref) return node;
  const target = root.$defs?.[node.$ref.split("/").at(-1)!];
  if (!target) throw new Error("Missing provider schema definition");
  return schemaReference(root, target);
}
describe("bounded assistant Responses transport", () => {
  it("rejects an unsolicited tool after a preparation has switched the transport to final-only", async () => {
    const input = assistantFixture("creator");
    const args = Object.fromEntries(
      Object.keys(AssistantToolArgumentsSchema.shape).map((key) => [key, null]),
    );
    const call = (
      id: string,
      name: string,
      fields: Record<string, unknown>,
    ) => ({
      type: "function_call",
      id: `fc_${id}`,
      call_id: id,
      name: "retailor",
      arguments: JSON.stringify({ name, arguments: { ...args, ...fields } }),
    });
    const io = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json(
          response([
            call("preview", "previewStoreDesign", { template: "gallery" }),
          ]),
        ),
      )
      .mockResolvedValueOnce(
        Response.json(response([call("extra", "getDesignPresets", {})])),
      )
      .mockResolvedValueOnce(Response.json(response([message()])));
    await expect(
      investigateAssistant(
        input,
        openAiAssistant("injected-test-key", io),
        new AbortController().signal,
        { dispatch: vi.fn(), recordUsage: vi.fn() },
        ASSISTANT_NOW,
      ),
    ).rejects.toMatchObject({ code: "UPSTREAM_FAILED" });
    expect(io).toHaveBeenCalledTimes(2);
    const lastBody = JSON.parse(String(io.mock.calls[1]![1]?.body));
    expect(lastBody.tools).toEqual([]);
    expect(lastBody.tool_choice).toBe("none");
  });
  it("carries a finite mixed-layout tool through the actual mocked strict transport as a preview-only proposal", async () => {
    const input = assistantFixture("owner");
    input.prompt = "Studio home, Pulse collection, Gallery product";
    const pageTemplates = {
      home: "studio",
      collection: "pulse",
      product: "gallery",
    };
    const args = Object.fromEntries(
      Object.keys(AssistantToolArgumentsSchema.shape).map((key) => [key, null]),
    );
    const io = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json(
          response([
            {
              type: "function_call",
              id: "fc_layout",
              call_id: "layout",
              name: "retailor",
              arguments: JSON.stringify({
                name: "previewStoreDesign",
                arguments: { ...args, pageTemplates },
              }),
            },
          ]),
        ),
      )
      .mockResolvedValueOnce(
        Response.json(
          response([
            message(
              JSON.stringify({
                text: "Preview the page layouts.",
                references: [],
                claims: [],
                usePreparedActions: true,
              }),
            ),
          ]),
        ),
      );
    const before = JSON.stringify(input);
    const result = await investigateAssistant(
      input,
      openAiAssistant("injected-test-key", io),
      new AbortController().signal,
      { dispatch: vi.fn(), recordUsage: vi.fn() },
      ASSISTANT_NOW,
    );
    expect(result.reply.proposal).toMatchObject({
      kind: "design",
      template: null,
      pageTemplates,
    });
    const body = JSON.parse(String(io.mock.calls[0]![1]?.body));
    const argumentSchema = body.tools[0].parameters.properties.arguments;
    expect(argumentSchema.required).toContain("pageTemplates");
    expect(argumentSchema.properties.pageTemplates).not.toHaveProperty(
      "default",
    );
    expect(argumentSchema.properties.pageTemplates.anyOf[0].required).toEqual([
      "home",
      "collection",
      "product",
    ]);
    expect(
      argumentSchema.properties.pageTemplates.anyOf[0].additionalProperties,
    ).toBe(false);
    expect(body.input[0].content).toContain('"design":{');
    expect(
      Buffer.byteLength(String(io.mock.calls[0]![1]?.body)),
    ).toBeLessThanOrEqual(11000);
    expect(JSON.stringify(input)).toBe(before);
  });
  it("accepts acknowledged actions only from validated application tool outputs", async () => {
    const input = assistantFixture("shopper");
    input.context.graph = structuredClone(input.context.graph);
    const source = input.context.graph.products[0]!;
    input.context.graph.products = Array.from({ length: 3 }, (_, index) => ({
      ...source,
      id: index === 0 ? source.id : `jeans_product_${index}_abcdefghijklmnop`,
      title: `Straight jeans ${index}`,
      attributes: (["colour", "closure", "material"] as const).map((name) => ({
        name,
        value: null,
        provenance: "unknown" as const,
        sourceIds: [],
        review: "unknown" as const,
      })),
      variants: Array.from({ length: 3 }, (_, size) => ({
        ...source.variants[0]!,
        id:
          index === 0 && size === 0
            ? source.variants[0]!.id
            : `jeans_variant_${index}_${size}_abcdefghijklmnop`,
        size: `${30 + size * 2}/30`,
        sku: `JEANS-${index}-${size}`,
      })),
    }));
    const before = JSON.stringify(input.context.graph);
    const args = Object.fromEntries(
      Object.keys(AssistantToolArgumentsSchema.shape).map((key) => [key, null]),
    );
    const call = (
      id: string,
      name: string,
      fields: Record<string, unknown>,
    ) => ({
      type: "function_call",
      id: `fc_${id}`,
      call_id: id,
      name: "retailor",
      arguments: JSON.stringify({ name, arguments: { ...args, ...fields } }),
    });
    const io = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json(
          response([
            call("search", "searchCatalogue", {
              category: "jeans",
              maximum: 6000,
            }),
          ]),
        ),
      )
      .mockResolvedValueOnce(
        Response.json(
          response([
            call("filter", "applyCatalogueFilter", {
              category: "jeans",
              maximum: 6000,
            }),
          ]),
        ),
      )
      .mockResolvedValueOnce(
        Response.json(
          response([
            message(
              JSON.stringify({
                text: reply.text,
                references: [],
                claims: [],
                usePreparedActions: true,
              }),
            ),
          ]),
        ),
      );
    const result = await investigateAssistant(
      input,
      openAiAssistant("injected-test-key", io),
      new AbortController().signal,
      { dispatch: vi.fn(), recordUsage: vi.fn() },
      ASSISTANT_NOW,
    ).catch((error: unknown) => {
      throw new Error(
        JSON.stringify({
          failure: error instanceof Error ? error.message : "unknown",
          dispatched: io.mock.calls.length,
          bodyBytes: io.mock.calls.map((call) =>
            Buffer.byteLength(String(call[1]?.body)),
          ),
        }),
      );
    });
    expect(result.reply.navigation).toEqual({
      kind: "filter",
      category: "jeans",
      query: "",
      minimum: null,
      maximum: 6000,
    });
    expect(JSON.stringify(input.context.graph)).toBe(before);
    const finalBody = JSON.parse(String(io.mock.calls[2]![1]?.body));
    const finalProperties = finalBody.text.format.schema.properties;
    const prosePattern = new RegExp(finalProperties.text.pattern, "u");
    expect(
      prosePattern.test("Here are matching pieces within your budget."),
    ).toBe(true);
    for (const unsafe of ["Under $50", "3 jeans", "20%", "<b>Sale</b>"])
      expect(prosePattern.test(unsafe)).toBe(false);
    const finalSchema = finalBody.text.format.schema;
    const references = schemaReference(
      finalSchema,
      schemaReference(finalSchema, finalProperties.references).items,
    );
    const claims = schemaReference(
      finalSchema,
      schemaReference(finalSchema, finalProperties.claims).items,
    );
    expect(references).not.toHaveProperty("oneOf");
    expect(claims).not.toHaveProperty("oneOf");
    expect(references.anyOf).toHaveLength(2);
    expect(claims.properties.kind!.const).toBe("attribute");
    for (const branches of [references.anyOf]) {
      const tags = branches.map((branch) => branch.properties.kind!.const);
      expect(new Set(tags).size).toBe(tags.length);
    }
    const firstBody = JSON.parse(String(io.mock.calls[0]![1]?.body));
    const parameters = firstBody.tools[0].parameters;
    const filterSchema = parameters.properties.arguments;
    const resolve = (schema: SchemaNode) => schemaReference(parameters, schema);
    expect(filterSchema.properties.minimum.anyOf.map(resolve)).toEqual([
      { type: "integer" },
      { type: "null" },
    ]);
    expect(filterSchema.properties.maximum.anyOf.map(resolve)).toEqual(
      filterSchema.properties.minimum.anyOf.map(resolve),
    );
    for (const call of io.mock.calls)
      expect(Buffer.byteLength(String(call[1]?.body))).toBeLessThanOrEqual(
        11000,
      );
    expect([...filterSchema.required].sort()).toEqual(
      Object.keys(filterSchema.properties).sort(),
    );
    expect(finalBody.text.format.schema.properties).not.toHaveProperty(
      "navigation",
    );
    expect(finalBody.text.format.schema.properties).not.toHaveProperty(
      "proposal",
    );
  });
  it("completes a real scoped financial investigation through the actual three-request adapter", async () => {
    const input = assistantFixture();
    input.context.graph = generateScenario(input.context.graph, "healthy", {
      scenarioId: "healthy",
      now: ASSISTANT_NOW,
      availablePhotoIds: new Set(["photo"]),
    }).graph;
    input.context.scope = allActivityScope(input.context.graph);
    input.prompt = "Summarize this operating result";
    const args = Object.fromEntries(
      Object.keys(AssistantToolArgumentsSchema.shape).map((key) => [key, null]),
    );
    const call = (
      id: string,
      name: string,
      fields: Record<string, unknown>,
    ) => ({
      type: "function_call",
      id: `fc_${id}`,
      call_id: id,
      name: "retailor",
      arguments: JSON.stringify({ name, arguments: { ...args, ...fields } }),
    });
    const io = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json(
          response([
            call("metrics", "getMetricFacts", {
              factIds: [
                "net_sales",
                "included_orders",
                "aov",
                "operating_result",
              ],
            }),
          ]),
        ),
      )
      .mockResolvedValueOnce(
        Response.json(response([call("presets", "getDesignPresets", {})])),
      )
      .mockResolvedValueOnce(Response.json(response([message()])));
    expect(
      (
        await investigateAssistant(
          input,
          openAiAssistant("injected-test-key", io),
          new AbortController().signal,
          { dispatch: vi.fn(), recordUsage: vi.fn() },
          ASSISTANT_NOW,
        ).catch(() => {
          throw new Error(
            JSON.stringify({
              dispatched: io.mock.calls.length,
              bodyBytes: io.mock.calls.map((call) =>
                Buffer.byteLength(String(call[1]?.body)),
              ),
            }),
          );
        })
      ).reply.text,
    ).toBe(reply.text);
    expect(io).toHaveBeenCalledTimes(3);
    const ownerFormat = JSON.parse(String(io.mock.calls[2]![1]?.body)).text
      .format;
    expect(
      schemaReference(
        ownerFormat.schema,
        schemaReference(
          ownerFormat.schema,
          ownerFormat.schema.properties.references,
        ).items,
      ).anyOf,
    ).toHaveLength(4);
    expect(
      schemaReference(
        ownerFormat.schema,
        schemaReference(
          ownerFormat.schema,
          ownerFormat.schema.properties.claims,
        ).items,
      ).anyOf,
    ).toHaveLength(2);
  });
  it("sends stateless foreground strict output and replays reasoning with exact call output", async () => {
    const args = {
      query: null,
      category: null,
      minimum: null,
      maximum: null,
      productId: null,
      variantId: null,
      recordKind: null,
      recordId: null,
      factIds: null,
      view: null,
      operation: null,
      quantity: null,
      template: null,
      theme: null,
      typography: null,
      prefill: null,
      scenario: null,
    };
    const io = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json(
          response([
            {
              type: "reasoning",
              id: "reason",
              summary: [],
              encrypted_content: "opaque",
            },
            {
              type: "function_call",
              id: "fc",
              call_id: "call",
              name: "retailor",
              arguments: JSON.stringify({
                name: "getDesignPresets",
                arguments: args,
              }),
            },
          ]),
        ),
      )
      .mockResolvedValueOnce(Response.json(response([message()])));
    const investigation = openAiAssistant("injected-test-key", io).begin(
      prepareAssistantContext(assistantFixture(), ASSISTANT_NOW),
    );
    const dispatch = vi.fn(),
      usage = vi.fn(),
      signal = new AbortController().signal;
    expect(
      (await investigation.next([], false, signal, dispatch, usage)).kind,
    ).toBe("tools");
    expect(
      await investigation.next(
        [{ id: "call", result: "{}" }],
        true,
        signal,
        dispatch,
        usage,
      ),
    ).toEqual({ kind: "reply", reply });
    const bodies = io.mock.calls.map((call) =>
      JSON.parse(String(call[1]?.body)),
    );
    expect(bodies[0]).toMatchObject({
      store: false,
      background: false,
      stream: false,
      max_output_tokens: 1500,
      parallel_tool_calls: false,
    });
    expect(bodies[0].tools[0]).toMatchObject({
      strict: true,
      parameters: { additionalProperties: false },
    });
    expect(bodies[1].input).toEqual(
      expect.arrayContaining([
        { type: "function_call_output", call_id: "call", output: "{}" },
        expect.objectContaining({
          type: "reasoning",
          encrypted_content: "opaque",
        }),
      ]),
    );
    expect(bodies[1].tools).toEqual([]);
    expect(bodies[1].text.format.strict).toBe(true);
    expect(usage).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenCalledTimes(2);
  });
  it("drops whole older messages to preserve the current prompt and never retries malformed/upstream results", async () => {
    const context = assistantFixture();
    context.history = Array.from({ length: 12 }, () => ({
      role: "assistant",
      text: "a".repeat(4000),
    }));
    const io = vi.fn<typeof fetch>(async () =>
        Response.json(response([message()])),
      ),
      dispatch = vi.fn();
    await openAiAssistant("injected-test-key", io)
      .begin(prepareAssistantContext(context, ASSISTANT_NOW))
      .next([], false, new AbortController().signal, dispatch, vi.fn());
    const body = JSON.parse(String(io.mock.calls[0]![1]?.body));
    expect(
      Buffer.byteLength(String(io.mock.calls[0]![1]?.body)),
    ).toBeLessThanOrEqual(11000);
    expect(body.input.length).toBeLessThan(14);
    expect(body.input.at(-1).content).toBe(context.prompt);
    expect(context.history).toHaveLength(12);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(io).toHaveBeenCalledTimes(1);
    for (const output of [
      response([message("{")]),
      response([message()], "incomplete"),
      response([{ type: "web_search_call", id: "foreign" }]),
      response([message("x".repeat(65536))]),
    ]) {
      const failed = vi.fn<typeof fetch>(async () => Response.json(output));
      await expect(
        openAiAssistant("test", failed)
          .begin(prepareAssistantContext(assistantFixture(), ASSISTANT_NOW))
          .next([], false, new AbortController().signal, vi.fn(), vi.fn()),
      ).rejects.toThrow();
      expect(failed).toHaveBeenCalledTimes(1);
    }
    const failed = vi.fn<typeof fetch>(async () =>
      Response.json(
        { error: { message: "private", type: "server_error" } },
        { status: 503 },
      ),
    );
    await expect(
      openAiAssistant("test", failed)
        .begin(prepareAssistantContext(assistantFixture(), ASSISTANT_NOW))
        .next([], false, new AbortController().signal, vi.fn(), vi.fn()),
    ).rejects.toThrow();
    expect(failed).toHaveBeenCalledTimes(1);
  });
});
