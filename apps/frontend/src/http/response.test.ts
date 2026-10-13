import { describe, expect, it, vi } from "vitest";
import { publicError } from "@retailor/contracts/api";
import { ApiRequestError } from "./api-error";
import { readApiJson } from "./response";

const signal = () => new AbortController().signal;
const encode = (text: string) => new TextEncoder().encode(text);
function segmented(bytes: Uint8Array, status = 200) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
      controller.close();
    },
  });
  return new Response(stream, { status });
}
describe("bounded shared API response ownership", () => {
  it("accepts real one-byte segmentation at the exact cap without retaining a chunk array", async () => {
    const bytes = encode('{"ok":"café"}'),
      response = segmented(bytes);
    expect(await readApiJson(response, bytes.length, signal())).toEqual({
      ok: "café",
    });
    expect(response.body?.locked).toBe(false);
  });
  it("cancels over-cap bodies and releases their lock", async () => {
    const cancel = vi.fn(),
      response = new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encode("12345"));
          },
          cancel,
        }),
      );
    await expect(readApiJson(response, 4, signal())).rejects.toMatchObject({
      code: "UPSTREAM_FAILED",
    });
    expect(cancel).toHaveBeenCalledOnce();
    expect(response.body?.locked).toBe(false);
  });
  it("bounds empty-chunk iteration instead of retaining unbounded zero-byte arrays", async () => {
    const cancel = vi.fn();
    const response = new Response(
      new ReadableStream<Uint8Array>({
        pull(controller) {
          controller.enqueue(new Uint8Array());
        },
        cancel,
      }),
    );
    await expect(readApiJson(response, 16, signal())).rejects.toMatchObject({
      code: "UPSTREAM_FAILED",
    });
    expect(cancel).toHaveBeenCalledOnce();
    expect(response.body?.locked).toBe(false);
  });
  it("aborts stalled bodies, detaches its listener and preserves the caller's cancellation", async () => {
    const owner = new AbortController(),
      cancel = vi.fn(),
      remove = vi.spyOn(owner.signal, "removeEventListener");
    const response = new Response(new ReadableStream<Uint8Array>({ cancel }));
    const result = readApiJson(response, 32, owner.signal);
    owner.abort();
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
    expect(cancel).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(response.body?.locked).toBe(false);
  });
  it("reconstructs only approved error-code copy and preserves operator freeze classification", async () => {
    const payload = publicError("OPERATOR_REQUIRED", "test_request");
    payload.error.message = "PRIVATE_TECHNICAL_DETAILS";
    const response = segmented(encode(JSON.stringify(payload)), 503);
    const result = await readApiJson(response, 8192, signal()).catch(
      (error) => error as unknown,
    );
    expect(result).toBeInstanceOf(ApiRequestError);
    expect(result).toMatchObject({ code: "OPERATOR_REQUIRED" });
    expect(String(result)).not.toContain("PRIVATE");
  });
  it("maps malformed JSON, bodies, public envelopes and stream errors to generic copy", async () => {
    for (const response of [
      new Response(),
      new Response("PRIVATE_JSON"),
      new Response('{"error":"PRIVATE"}', { status: 500 }),
      new Response(
        new ReadableStream({
          start(controller) {
            controller.error(new Error("PRIVATE_STREAM"));
          },
        }),
      ),
    ]) {
      const result = await readApiJson(response, 128, signal()).catch(
        (error) => error as unknown,
      );
      expect(result).toBeInstanceOf(ApiRequestError);
      expect(result).toMatchObject({ code: "UPSTREAM_FAILED" });
      expect(String(result)).not.toContain("PRIVATE");
      expect(response.body?.locked ?? false).toBe(false);
    }
  });
  it("preserves strict FX UTF-8 and the other requesters' replacement decoding", async () => {
    const bytes = Uint8Array.of(34, 255, 34);
    expect(await readApiJson(segmented(bytes), 3, signal())).toBe("�");
    await expect(
      readApiJson(segmented(bytes), 3, signal(), true),
    ).rejects.toMatchObject({ code: "UPSTREAM_FAILED" });
  });
});
