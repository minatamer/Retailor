import { describe, expect, it, vi } from "vitest";
import { mountVerification, type Turnstile } from "./turnstile";

function fixture() {
  let callbacks!: Parameters<Turnstile["render"]>[1];
  const api: Turnstile = {
    render: vi.fn((_container, options) => {
      callbacks = options;
      return "owned-widget";
    }),
    remove: vi.fn(),
  };
  const finish = vi.fn();
  const show = vi.fn();
  const dispose = mountVerification(
    api,
    {} as HTMLElement,
    { siteKey: "public-test-site", action: "assistant", finish },
    show,
  );
  return { api, callbacks, finish, show, dispose };
}

describe("operation-owned verification", () => {
  it("completes automatic verification without opening a dialog", () => {
    const f = fixture();
    expect(f.callbacks.appearance).toBe("interaction-only");
    expect(f.callbacks.retry).toBe("never");
    expect(f.finish).not.toHaveBeenCalled();
    expect(f.show).not.toHaveBeenCalled();
    f.callbacks.callback("fresh-action-token");
    expect(f.finish).toHaveBeenCalledExactlyOnceWith("fresh-action-token");
    f.callbacks["before-interactive-callback"]();
    f.callbacks["error-callback"]();
    expect(f.show).not.toHaveBeenCalled();
    expect(f.finish).toHaveBeenCalledTimes(1);
  });

  it("reveals the actual widget only when interaction is required", () => {
    const f = fixture();
    f.callbacks["before-interactive-callback"]();
    expect(f.show).toHaveBeenCalledOnce();
    expect(f.finish).not.toHaveBeenCalled();
    f.callbacks.callback("verified-token");
    expect(f.finish).toHaveBeenCalledExactlyOnceWith("verified-token");
    f.dispose();
    expect(f.api.remove).toHaveBeenCalledExactlyOnceWith("owned-widget");
  });

  it.each([
    "error-callback",
    "expired-callback",
    "timeout-callback",
    "unsupported-callback",
  ] as const)("fails closed on %s without accepting a later token", (event) => {
    const f = fixture();
    f.callbacks[event]();
    f.callbacks.callback("late-token");
    expect(f.finish).toHaveBeenCalledExactlyOnceWith(undefined);
    expect(f.show).not.toHaveBeenCalled();
    f.dispose();
    expect(f.api.remove).toHaveBeenCalledOnce();
  });

  it("disposes once and ignores all callbacks after cancellation", () => {
    const f = fixture();
    f.dispose();
    f.dispose();
    f.callbacks["before-interactive-callback"]();
    f.callbacks.callback("cancelled-token");
    f.callbacks["error-callback"]();
    expect(f.api.remove).toHaveBeenCalledOnce();
    expect(f.finish).not.toHaveBeenCalled();
    expect(f.show).not.toHaveBeenCalled();
  });

  it("fails closed when the widget cannot render", () => {
    const finish = vi.fn();
    const api: Turnstile = {
      render: () => {
        throw new Error("third-party failure");
      },
      remove: vi.fn(),
    };
    const dispose = mountVerification(
      api,
      {} as HTMLElement,
      { siteKey: "public-test-site", action: "catalogue", finish },
      vi.fn(),
    );
    expect(finish).toHaveBeenCalledExactlyOnceWith(undefined);
    dispose();
    expect(api.remove).not.toHaveBeenCalled();
  });
});
