# Exact USD/EUR display

RTL-009 provides one dated display projection over canonical integer USD cents. Product inputs, stock costs, orders/refunds and owner facts stay USD. There is no second price catalogue, rate editor, third currency, geolocation or bank/payment API.

## Verified source and wire shape

Reviewed [Frankfurter v2 documentation](https://frankfurter.dev/) and the [ECB reference-rate page](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html) on 12 October 2026. Frankfurter supports a provider-specific single-pair route; the default blended feed is not used. ECB working-day publication explains the latest 9 October date observed that morning.

The fixed destination is `https://api.frankfurter.dev/v2/providers/ecb/rate/usd/eur`. Direct verification at 08:24:25 UTC returned HTTP 200, JSON MIME, 63 bytes and exactly `{date,base,quote,rate}`. The implemented bounded adapter was then exercised at 09:30:29 UTC: source `frankfurter-ecb-v2`, USD→EUR, date 2026-10-09, decimal 0.89238. A second call used the cache with the same snapshot ID and only one upstream request. See [actual source evidence](../validation/evidence/RTL-009/source-verification.json). This is time-stamped evidence, not a hardcoded current rate or a fixture guarantee.

## Strict snapshot and exact numbers

`FxSnapshot` carries schema version, application-assigned stable content ID, fixed pair, decimal, rate date, retrieval timestamp and source ID. The source is ECB via Frankfurter or the explicitly declared development fixture. Unknown fields/pairs, invalid dates and zero/negative/unsafe/exponent rates are rejected.

The decimal has at most eighteen fractional digits and is positive and less than 1000. The backend preserves the original numeric JSON lexeme through Node 24’s reviver context. It never derives the authoritative decimal by stringifying a rounded binary Number. `parseRate` normalizes trailing zeros and reduces exact BigInt numerator/denominator.

Conversion multiplies integer USD cents by the rational, then rounds once: `floor((2 × absoluteProduct + denominator) / (2 × denominator))`. Negative half cents round away from zero; rounded zero has no negative sign. Canonical conversion inputs are bounded to ±1,000,000,000 cents; displayed values are bounded to ±1,000,000,000,000 cents. English formatting divides exact integer cents, rather than formatting floating-point major amounts.

`projectComponents` verifies a unique bounded component basis summing to the canonical total. It converts the total once. A line with a unit/quantity basis uses the rounded displayed unit × quantity; other signed components convert individually. An explicit `roundingAdjustment` reconciles these rows exactly to the converted total. The checkout must show a nonzero adjustment. This avoids an invisible cent change or a row whose shown quantity multiplication contradicts its total. Discount/delivery/tax and negative display values use the same rule.

## Runtime and transport

The backend factory is inert until a deliberate GET. `CurrencyService` has one public-data cache (15 minutes), one shared refresh, a five-second deadline and a fifteen-second failure cooldown. A source that ignores abort retains its occupied slot until it actually settles; late results cannot populate the cache. Failures do not choose a live fallback or start retry timers.

The provider performs exactly one fixed GET, disallows redirects, sends only Accept JSON, streams at most 8 KiB and validates MIME/status/pair/date/decimal. No visitor graph, prompt, identity, cookie, URL parameter or API key goes upstream. GET `/v1/currency/usd-eur` rejects query/body overrides. The relative fixed bridge enforces the 8-KiB schema envelope; the browser reader independently enforces that bound.

Currency composition is separate from vision/admission/paid switches. A no-key live runtime still has the unpaid FX adapter. Development uses a dated deterministic 0.9 quote labelled **Demo quote · Development fixture**. Fixture evidence is never reported as actual ECB pricing. Source failures map to stable public errors, with the product message: “Euro pricing is unavailable right now; prices are shown in USD.”

## One accepted display preference

The sole session controller owns `{selected,acceptedSnapshot}`. Default USD/null. EUR selection fetches once; loading keeps USD usable. The accepted quote survives USD/EUR toggles, perspective changes and eligible refresh, so it never silently reprices a bag. A new workspace may accept a newer quote. One owned abort/deadline and currency generation fence reject reset, expiry, cancellation and late results; no pending request serializes.

Freshness uses UTC calendar dates: a rate may be at most seven days old, may not be future dated and may not have a future retrieval timestamp. The existing session heartbeat and action validation recheck it. An expired or invalid stored quote falls back to USD with a visible notice and appropriate cleared bounds, preserving a valid catalogue/graph. It does not clear the process cache or unrelated storage.

`CurrencyScope` exposes only the current USD or accepted EUR context. Prepared `OrderDisplay` metadata references a real placed order, is immutable once recorded and preserves its historic scope. Restore validates order references and count; historic snapshots remain renderable even after they cease to qualify for new EUR display. RTL-010 owns the actual bag/confirmation connection to this prepared metadata and projection.

## Store, filters and Tailor

All current home/cards/detail renderers use `formatDisplay`. Filters compare the actual rounded displayed **variant unit** price with inclusive bounds. They do not invert a budget to USD or compare a formatted string. Applied bound chips format already-displayed cents without converting them twice. Sort uses the same displayed projection.

Changing currency explicitly clears monetary bounds with a notice while preserving other filters and source amounts. A monetary filter/budget carries its expected display scope; a stale EUR action is rejected rather than treated as USD. The filter form’s key includes currency/snapshot identity. Tailor’s native Explore up to $80/€80 action uses the same scope and real filtering; RTL-013 later adds grounded typed budget parsing through that port.

The storefront picker gives USD/EUR, a readable dated detail dialog and 44px targets. Date formatting is UTC so a rate date cannot shift in another local timezone. Owner metrics/forms remain USD; design previews can show the visitor’s accepted storefront currency without rewriting records.

## Evidence and follow-on integration

[RTL-009 validation](../validation/RTL-009.md) records exact arithmetic tests, bounded provider/cache/bridge tests, session races/recovery and actual browser observations. Current UI probes use a clearly disclosed development quote. Actual free source/adapter evidence is separate. RTL-010 must use the same component projection, show any rounding adjustment and record the placement scope; its actual bag/confirmation UI evidence is collected there. RTL-013 connects typed € budgets, and RTL-019/020/022 retain broader device/live/release acceptance.
