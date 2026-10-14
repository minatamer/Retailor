import { createHash } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { environment, file } from "../../../test/workspace";
import { LogoResultSchema, type LogoResult } from "@retailor/contracts/brand";
import type { StoredLogo } from "../photos/cache";
import type { LogoInput, LogoRequester } from "./request";
import { SESSION_KEY } from "../session/projection";
import { ApiRequestError } from "../../http/api-error";
const environments: ReturnType<typeof environment>[] = [];
afterEach(() => environments.splice(0).forEach((env) => env.dispose()));

it("blocks paid retry after operator attention while preserving wordmark/local entry and inert reload", async () => {
  const env = environment();
  environments.push(env);
  const logoRequest = vi.fn<LogoRequester>(
    async (_input, _signal, dispatch) => {
      dispatch();
      throw new ApiRequestError("OPERATOR_REQUIRED");
    },
  );
  const assistantRequest = vi.fn(async () => {
    throw new Error("Must stay undispatched");
  });
  const controller = await env.open({ logoRequest, assistantRequest });
  await controller.photos.add([file("one")]);
  await controller.draftCatalogue();
  controller.publish();
  controller.useCurrentLook();
  const products = JSON.stringify(
    controller.getSnapshot().state.graph.products,
  );
  controller.prepareLogo();
  await controller.generateLogos();
  expect(controller.canAttemptAi()).toBe(false);
  expect(controller.getSnapshot().preparedLogo).toBeNull();
  expect(controller.getSnapshot().logoNotice).toContain("demo owner");
  controller.prepareLogo();
  await controller.generateLogos();
  expect(logoRequest).toHaveBeenCalledOnce();
  controller.keepWordmark();
  controller.acceptDesign();
  expect(controller.getSnapshot().state.stage).toBe("storefront");
  expect(JSON.stringify(controller.getSnapshot().state.graph.products)).toBe(
    products,
  );
  controller.assistantInput("Show me the jeans");
  await controller.sendAssistant();
  expect(assistantRequest).not.toHaveBeenCalled();
  controller.dispose();
  const restored = await env.open({ logoRequest, assistantRequest });
  expect(restored.canAttemptAi()).toBe(true);
  expect(logoRequest).toHaveBeenCalledOnce();
  expect(assistantRequest).not.toHaveBeenCalled();
});

it("does not apply a late operator failure to a replacement workspace", async () => {
  let reject!: (error: Error) => void;
  const { controller, request } = await setup(
    async (_input, _signal, dispatch) => {
      dispatch();
      return await new Promise((_resolve, stop) => {
        reject = stop;
      });
    },
  );
  controller.useCurrentLook();
  controller.prepareLogo();
  const operation = controller.generateLogos();
  await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
  await controller.reset();
  reject(new ApiRequestError("OPERATOR_REQUIRED"));
  await operation;
  expect(controller.canAttemptAi()).toBe(true);
  expect(controller.getSnapshot().logoNotice).toBe("");
});
function result(input: LogoInput, at: string): LogoResult {
  return LogoResultSchema.parse({
    schemaVersion: 1,
    mode: input.mode,
    workspaceId: input.workspaceId,
    operationId: input.operationId,
    context: input.context,
    candidates: [0, 1, 2].map((index) => {
      const bytes = Buffer.from(
        `injected-byte-port-${input.operationId}-${index}`,
      );
      return {
        id: `${input.operationId}_${index}`,
        hash: createHash("sha256").update(bytes).digest("hex"),
        mime: "image/png",
        bytes: bytes.length,
        width: 200,
        height: 80,
        context: input.context,
        generatedAt: at,
        mode: input.mode,
        data: bytes.toString("base64"),
      };
    }),
  });
}
async function setup(requester?: LogoRequester) {
  const env = environment();
  environments.push(env);
  const request = vi.fn<LogoRequester>(
    requester ??
      (async (input, _signal, dispatch) => {
        dispatch();
        return result(input, new Date(env.clock()).toISOString());
      }),
  );
  const verify = vi.fn(async (row: StoredLogo, signal: AbortSignal) => {
    signal.throwIfAborted();
    return row;
  });
  const controller = await env.open({
    logoRequest: request,
    logoVerify: verify,
  });
  await controller.photos.add([file("one")]);
  await controller.draftCatalogue();
  controller.publish();
  return { env, request, verify, controller };
}
it("edits and confirms the logo-step name in the sole draft, restores without dispatch and uses current name/style context", async () => {
  const { env, request, verify, controller } = await setup();
  controller.useCurrentLook();
  const previous = controller.getSnapshot().state;
  controller.logoNameInput("  Sunday Studio  ");
  const edited = controller.getSnapshot().state;
  expect(edited.setup.step).toBe("logo");
  expect(edited.setup.brandConfirmed).toBe(false);
  expect(edited.setup.brandDirty.name).toBe(true);
  expect(edited.previewDesign.name).toBe("Sunday Studio");
  expect(edited.previewDesign.headline).toBe(previous.previewDesign.headline);
  expect(edited.previewDesign.heroPhotoId).toBe(
    previous.previewDesign.heroPhotoId,
  );
  expect(edited.acceptedDesign).toBe(previous.acceptedDesign);
  expect(edited.graph).toBe(previous.graph);
  controller.brandInput({ name: "Late replacement" }, "suggestion");
  expect(controller.getSnapshot().state.setup.brandDraft?.name).toBe(
    "  Sunday Studio  ",
  );
  expect(request).not.toHaveBeenCalled();
  controller.dispose();
  const restored = await env.open({ logoRequest: request, logoVerify: verify });
  expect(restored.getSnapshot().state.setup.step).toBe("logo");
  expect(restored.getSnapshot().state.setup.brandDraft?.name).toBe(
    "  Sunday Studio  ",
  );
  expect(restored.getSnapshot().preparedLogo).toBeNull();
  expect(restored.prepareNamedLogo()).toBe(true);
  expect(request).not.toHaveBeenCalled();
  await restored.generateLogos();
  expect(request).toHaveBeenCalledOnce();
  expect(request.mock.calls[0]![0].context).toMatchObject({
    name: "Sunday Studio",
    theme: edited.previewDesign.theme,
    typography: edited.previewDesign.typography,
  });
  expect(restored.getSnapshot().state.setup.brandConfirmed).toBe(true);
});
it("blocks blank, whitespace, control and oversized names from every logo/proceed path without using the previous preview name", async () => {
  const { request, controller } = await setup();
  controller.useCurrentLook();
  for (const name of ["", "   ", "Bad\u0000name"]) {
    controller.logoNameInput(name);
    expect(controller.getSnapshot().state.setup.step).toBe("logo");
    expect(controller.prepareNamedLogo()).toBe(false);
    controller.prepareLogo();
    await controller.generateLogos();
    controller.keepWordmark();
    controller.keepNamedWordmark();
    controller.acceptDesign();
    expect(controller.getSnapshot().state.stage).toBe("style");
    expect(controller.getSnapshot().state.setup.wordmarkKept).toBe(false);
    expect(controller.getSnapshot().preparedLogo).toBeNull();
  }
  const before = controller.getSnapshot().state.previewDesign;
  controller.logoNameInput("A".repeat(41));
  expect(controller.getSnapshot().state.previewDesign).toBe(before);
  expect(request).not.toHaveBeenCalled();
  controller.logoNameInput("Étude & Co");
  controller.keepNamedWordmark();
  controller.acceptDesign();
  expect(controller.getSnapshot().state.acceptedDesign.name).toBe("Étude & Co");
  expect(controller.getSnapshot().state.stage).toBe("storefront");
});
it("immediately cancels a dispatched logo batch on cleared name and rejects its late old-name output", async () => {
  let finish!: () => void, signal!: AbortSignal;
  const { request, controller } = await setup(
    async (input, owned, dispatch) => {
      signal = owned;
      dispatch();
      return new Promise((resolve) => {
        finish = () => resolve(result(input, input.createdAt));
      });
    },
  );
  controller.useCurrentLook();
  controller.logoNameInput("Sunday Studio");
  controller.prepareNamedLogo();
  const pending = controller.generateLogos();
  await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
  controller.logoNameInput("");
  expect(signal.aborted).toBe(true);
  expect(controller.getSnapshot().logoBusy).toBe(false);
  expect(controller.getSnapshot().preparedLogo).toBeNull();
  finish();
  await pending;
  expect(controller.getSnapshot().state.logos.candidates).toEqual([]);
  expect(controller.getSnapshot().state.logos.batches).toBe(1);
  expect(controller.prepareNamedLogo()).toBe(false);
});
it("renames the working image to its new wordmark while owner Cancel preserves accepted identity and Apply commits only a valid name", async () => {
  const { controller } = await setup();
  controller.useCurrentLook();
  controller.logoNameInput("Sunday");
  controller.prepareNamedLogo();
  await controller.generateLogos();
  const candidate = controller.getSnapshot().state.logos.candidates[0]!.id;
  controller.reviewLogo(candidate, true);
  controller.previewLogo(candidate);
  controller.useLogo(candidate);
  controller.acceptDesign();
  controller.go("dashboard");
  controller.beginOwnerDesign();
  const accepted = controller.getSnapshot().state.acceptedDesign;
  controller.logoNameInput("Atelier");
  expect(controller.getSnapshot().state.previewDesign.logoId).toBeNull();
  expect(controller.getSnapshot().state.previewDesign.name).toBe("Atelier");
  controller.previewLogo(candidate);
  expect(controller.getSnapshot().state.previewDesign.logoId).toBeNull();
  expect(controller.getSnapshot().state.acceptedDesign).toBe(accepted);
  controller.cancelDesign();
  expect(controller.getSnapshot().state.previewDesign).toEqual(accepted);
  controller.beginOwnerDesign();
  controller.logoNameInput(" ");
  controller.applyOwnerDesign();
  expect(controller.getSnapshot().state.designEditing).toBe(true);
  controller.logoNameInput("Atelier");
  controller.applyOwnerDesign();
  expect(controller.getSnapshot().state.acceptedDesign.name).toBe("Atelier");
  expect(controller.getSnapshot().state.acceptedDesign.logoId).toBeNull();
  expect(controller.getSnapshot().state.designEditing).toBe(false);
});
it("offers preparation only after explicit type and colour, requires human review plus preview, restores inertly and falls back if bytes disappear", async () => {
  const { env, request, verify, controller } = await setup();
  controller.prepareLogo();
  await controller.generateLogos();
  expect(request).not.toHaveBeenCalled();
  controller.useCurrentLook();
  controller.prepareLogo();
  expect(request).not.toHaveBeenCalled();
  await controller.generateLogos();
  expect(request).toHaveBeenCalledTimes(1);
  expect(verify).toHaveBeenCalledTimes(3);
  const id = controller.getSnapshot().state.logos.candidates[0]!.id;
  controller.useLogo(id);
  expect(controller.getSnapshot().state.previewDesign.logoId).toBeNull();
  controller.previewLogo(id);
  controller.useLogo(id);
  expect(controller.getSnapshot().state.setup.wordmarkKept).toBe(false);
  controller.reviewLogo(id, true);
  controller.useLogo(id);
  controller.acceptDesign();
  expect(controller.getSnapshot().state.acceptedDesign.logoId).toBe(id);
  controller.go("dashboard");
  controller.beginOwnerDesign();
  expect(controller.getSnapshot().state.ownerView).toBe("design");
  expect(controller.getSnapshot().state.designEditing).toBe(true);
  controller.cancelDesign();
  controller.go("storefront");
  expect(controller.logoUrl(id)).toMatch(/^blob:/u);
  const projection = env.storage.getItem(SESSION_KEY)!;
  expect(projection).not.toContain('"data":');
  expect(projection).not.toContain("blob:");
  controller.dispose();
  const restored = await env.open({ logoRequest: request, logoVerify: verify });
  expect(restored.getSnapshot().state.acceptedDesign.logoId).toBe(id);
  expect(restored.getSnapshot().state.logos.reviewed).toEqual([]);
  expect(request).toHaveBeenCalledTimes(1);
  restored.dispose();
  env.caches.get(restored.getSnapshot().state.graph.workspaceId)!.logos = [];
  const missing = await env.open({ logoRequest: request, logoVerify: verify });
  expect(missing.getSnapshot().state.acceptedDesign.logoId).toBeNull();
  expect(missing.getSnapshot().logoNotice).toContain("unavailable");
  expect(missing.getSnapshot().state.graph.products).toHaveLength(1);
  expect(request).toHaveBeenCalledTimes(1);
});
it("atomically replaces three choices once, bounds retries, and never changes commerce records", async () => {
  const { env, request, controller } = await setup();
  controller.useCurrentLook();
  const graph = controller.getSnapshot().state.graph;
  controller.prepareLogo();
  await controller.generateLogos();
  const first = controller
    .getSnapshot()
    .state.logos.candidates.map((c) => c.id);
  controller.prepareLogo();
  await controller.generateLogos();
  const second = controller
    .getSnapshot()
    .state.logos.candidates.map((c) => c.id);
  expect(second).toHaveLength(3);
  expect(second.every((id) => !first.includes(id))).toBe(true);
  expect(first.every((id) => !controller.logoUrl(id))).toBe(true);
  expect(
    env.caches.get(graph.workspaceId)!.logos.map((row) => row.metadata.id),
  ).toEqual(second);
  controller.prepareLogo();
  await controller.generateLogos();
  expect(request).toHaveBeenCalledTimes(2);
  expect(controller.getSnapshot().state.graph).toBe(graph);
  await controller.reset();
  expect(second.every((id) => !controller.logoUrl(id))).toBe(true);
  expect(controller.getSnapshot().logoNotice).toBe("");
  controller.logoUnavailable(second[0]!);
  expect(controller.getSnapshot().logoNotice).toBe("");
  expect(env.caches.get(graph.workspaceId)!.logos).toEqual([]);
});
it("discards late context after a name/style change and preserves previous choices on a failed set", async () => {
  let pending:
    { input: LogoInput; resolve(value: LogoResult): void } | undefined;
  const { env, request, controller } = await setup(
    (input, _signal, dispatch) => {
      dispatch();
      return new Promise((resolve) => {
        pending = { input, resolve };
      });
    },
  );
  controller.useCurrentLook();
  controller.prepareLogo();
  const operation = controller.generateLogos();
  await vi.waitFor(() => expect(pending).toBeDefined());
  const before = pending!;
  controller.brandInput({ name: "New name" });
  before.resolve(result(before.input, new Date(env.clock()).toISOString()));
  await operation;
  expect(controller.getSnapshot().state.logos.candidates).toEqual([]);
  expect(controller.getSnapshot().logoBusy).toBe(false);
  expect(controller.getSnapshot().logoNotice).toContain("look changed");
  expect(controller.getSnapshot().state.logos.batches).toBe(1);
  controller.useCurrentLook();
  controller.prepareLogo();
  const retry = controller.generateLogos();
  await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  controller.cancelLogos();
  pending!.resolve(result(pending!.input, new Date(env.clock()).toISOString()));
  await retry;
  expect(controller.getSnapshot().state.logos.candidates).toEqual([]);
  expect(controller.getSnapshot().state.logos.batches).toBe(2);
});
it("does not spend a batch before transport dispatch and rejects a foreign result", async () => {
  const { controller } = await setup(async () => {
    throw new Error("Config unavailable");
  });
  controller.useCurrentLook();
  controller.prepareLogo();
  await controller.generateLogos();
  expect(controller.getSnapshot().state.logos.batches).toBe(0);
  expect(
    controller.getSnapshot().state.previewDesign.logoId ?? null,
  ).toBeNull();
});
it("records a pending logo request as inert recovery metadata and fences its late result after reset", async () => {
  let signal!: AbortSignal,
    input!: LogoInput,
    finish!: (value: LogoResult) => void;
  const { env, controller, request, verify } = await setup(
    (next, owned, dispatch) => {
      input = next;
      signal = owned;
      dispatch();
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  );
  controller.useCurrentLook();
  controller.prepareLogo();
  const operation = controller.generateLogos();
  const encoded = env.storage.getItem(SESSION_KEY)!;
  expect(JSON.parse(encoded).pendingProvider).toBe("logos");
  expect(encoded).not.toMatch(/"(?:grant|token|data)"\s*:|blob:/u);
  await controller.reset();
  const identity = controller.getSnapshot().state.graph.workspaceId;
  expect(signal.aborted).toBe(true);
  finish(result(input, new Date(env.clock()).toISOString()));
  await operation;
  expect(controller.getSnapshot().state.graph.workspaceId).toBe(identity);
  expect(controller.getSnapshot().logoNotice).toBe("");
  expect(controller.getSnapshot().state.logos.candidates).toEqual([]);
  env.storage.setItem(SESSION_KEY, encoded);
  const restored = await env.open({ logoRequest: request, logoVerify: verify });
  expect(restored.getSnapshot().notice).toContain(
    "provider outcome may be unknown",
  );
  expect(restored.getSnapshot().state.logos.batches).toBe(1);
  expect(restored.getSnapshot().preparedLogo).toBeNull();
  expect(restored.getSnapshot().logoBusy).toBe(false);
  expect(restored.getSnapshot().state.pendingProvider).toBeNull();
  expect(request).toHaveBeenCalledOnce();
});
