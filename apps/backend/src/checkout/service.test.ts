import { describe, expect, it, vi } from "vitest";
import { checkoutFixture, CHECKOUT_NOW } from "../../test/checkout-fixture.js";
import { CheckoutService } from "./service.js";
import type { CheckoutPayment, StripeSession } from "./provider.js";
import type { CheckoutImages } from "./storage.js";
import type { prepareProviderImages } from "../catalogue/sanitize.js";

function setup() {
  const input = checkoutFixture();
  const session: StripeSession = {
    id: "cs_test_example",
    livemode: false,
    status: "open",
    payment_status: "unpaid",
    amount_total: input.expectedTotal,
    currency: "usd",
    url: "https://checkout.stripe.com/c/pay/cs_test_example",
  };
  const payment: CheckoutPayment = {
    create: vi.fn(async () => ({ ...session })),
    get: vi.fn(async () => ({ ...session })),
    expire: vi.fn(async () => ({
      ...session,
      status: "expired" as const,
      url: null,
    })),
  };
  const images: CheckoutImages = {
    put: vi.fn(async () => "https://storage.googleapis.com/private/signed"),
    remove: vi.fn(async () => {}),
  };
  const sanitize = vi.fn<typeof prepareProviderImages>(
    async (_manifest, files) => new Map(files),
  );
  const service = new CheckoutService(
    payment,
    images,
    true,
    () => CHECKOUT_NOW,
    sanitize,
  );
  service.identity("visitor");
  return {
    input,
    session,
    payment,
    images,
    sanitize,
    service,
    signal: new AbortController().signal,
  };
}
describe("bounded sandbox attempt authority", () => {
  it("binds actual photo/options and exact amounts, deduplicates create and verifies complete once", async () => {
    const x = setup(),
      before = JSON.stringify(x.input.graph);
    const first = await x.service.start("visitor", x.input, x.signal);
    expect(first.status).toBe("open");
    expect(await x.service.start("visitor", x.input, x.signal)).toEqual(first);
    expect(x.payment.create).toHaveBeenCalledTimes(1);
    expect(x.images.put).toHaveBeenCalledWith(
      x.input.attemptId,
      "photo",
      expect.any(Uint8Array),
      expect.any(Number),
      x.signal,
    );
    await expect(
      x.service.start("other", x.input, x.signal),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    x.session.status = "complete";
    x.session.payment_status = "paid";
    x.session.url = null;
    expect(
      (await x.service.status("visitor", x.input.attemptId, false, x.signal))
        .status,
    ).toBe("complete");
    expect(
      (await x.service.status("visitor", x.input.attemptId, false, x.signal))
        .status,
    ).toBe("complete");
    expect(x.payment.get).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(x.input.graph)).toBe(before);
  });
  it("rejects amount and photo tampering before any upload", async () => {
    const x = setup();
    x.input.expectedTotal++;
    await expect(
      x.service.start("visitor", x.input, x.signal),
    ).rejects.toMatchObject({ code: "STALE" });
    x.input.expectedTotal--;
    x.input.photos[0]!.image.hash = "d".repeat(64);
    await expect(
      x.service.start("visitor", x.input, x.signal),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(x.images.put).not.toHaveBeenCalled();
    expect(x.payment.create).not.toHaveBeenCalled();
  });
  it("cleans failed image preparation and never creates payment without a full image set", async () => {
    const x = setup();
    vi.mocked(x.images.put).mockRejectedValueOnce(
      new Error("private upstream detail"),
    );
    await expect(
      x.service.start("visitor", x.input, x.signal),
    ).rejects.toThrow();
    expect(x.payment.create).not.toHaveBeenCalled();
    expect(x.images.remove).toHaveBeenCalledWith(x.input.attemptId, ["photo"]);
  });
  it("cancels an open session and removes exactly its photos", async () => {
    const x = setup();
    await x.service.start("visitor", x.input, x.signal);
    expect(
      (await x.service.status("visitor", x.input.attemptId, true, x.signal))
        .status,
    ).toBe("cancelled");
    expect(x.images.remove).toHaveBeenCalledWith(x.input.attemptId, ["photo"]);
  });
  it("does not accept a different total or foreign session as paid", async () => {
    const x = setup();
    await x.service.start("visitor", x.input, x.signal);
    x.session.amount_total++;
    await expect(
      x.service.status("visitor", x.input.attemptId, false, x.signal),
    ).rejects.toMatchObject({ code: "UPSTREAM_FAILED" });
  });
  it("caps deliberate attempts independently of attacker-selected workspace labels", async () => {
    const x = setup();
    for (let n = 0; n < 4; n++)
      await x.service.start(
        "visitor",
        { ...x.input, attemptId: `attempt_${n}` },
        x.signal,
      );
    await expect(
      x.service.start(
        "visitor",
        { ...x.input, attemptId: "attempt_5" },
        x.signal,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(x.payment.create).toHaveBeenCalledTimes(4);
  });
  it("holds the start lease and expires a late-created session after cancellation", async () => {
    const x = setup(),
      owner = new AbortController();
    let finish!: (value: StripeSession) => void;
    vi.mocked(x.payment.create).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const pending = x.service.start("visitor", x.input, owner.signal);
    await vi.waitFor(() => expect(x.payment.create).toHaveBeenCalledTimes(1));
    await expect(
      x.service.start(
        "visitor",
        { ...x.input, attemptId: "another" },
        x.signal,
      ),
    ).rejects.toMatchObject({ code: "BUSY" });
    owner.abort();
    finish(x.session);
    await expect(pending).rejects.toThrow();
    expect(x.payment.expire).toHaveBeenCalledTimes(1);
    expect(x.images.remove).toHaveBeenCalledTimes(1);
  });
});
