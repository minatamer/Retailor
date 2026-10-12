import { FX_LIMITS } from "@retailor/contracts/currency";
import type { FxSnapshot } from "@retailor/contracts/currency";
import { validateSnapshot } from "@retailor/commerce/currency";
import { OperationFailure } from "../security/errors.js";
import type { CurrencyProvider } from "./provider.js";
/** One bounded public-data cache; no visitor identity, keys, graph or admission grant. */
export class CurrencyService {
  private cached: { quote: FxSnapshot; at: number } | undefined;
  private pending: Promise<FxSnapshot> | undefined;
  private upstreamActive = false;
  private failureUntil = 0;
  constructor(
    private readonly provider: CurrencyProvider,
    private readonly fixtureAllowed = false,
    private readonly clock = Date.now,
  ) {}
  async quote(): Promise<FxSnapshot> {
    const now = this.clock();
    if (this.cached && now - this.cached.at < FX_LIMITS.cacheMs) {
      try {
        return validateSnapshot(this.cached.quote, now, this.fixtureAllowed);
      } catch {
        this.cached = undefined;
      }
    }
    if (this.pending) return this.pending;
    if (now < this.failureUntil || this.upstreamActive)
      throw new OperationFailure("UNAVAILABLE", 503);
    const pending = this.refresh();
    this.pending = pending;
    try {
      return await pending;
    } finally {
      if (this.pending === pending) this.pending = undefined;
    }
  }
  private async refresh() {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new OperationFailure("DEADLINE", 504));
      }, FX_LIMITS.timeoutMs);
    });
    this.upstreamActive = true;
    const providerCall = Promise.resolve().then(() =>
      this.provider(controller.signal),
    );
    // A non-cooperating injected port retains its slot until actually settled; no late cache write.
    void providerCall.then(
      () => {
        this.upstreamActive = false;
      },
      () => {
        this.upstreamActive = false;
      },
    );
    try {
      const quote = validateSnapshot(
        await Promise.race([providerCall, deadline]),
        this.clock(),
        this.fixtureAllowed,
      );
      const accepted = Object.freeze(quote);
      this.cached = { quote: accepted, at: this.clock() };
      return accepted;
    } catch (error) {
      this.failureUntil = this.clock() + FX_LIMITS.failureMs;
      throw error instanceof OperationFailure
        ? error
        : new OperationFailure("UNAVAILABLE", 503);
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
}
