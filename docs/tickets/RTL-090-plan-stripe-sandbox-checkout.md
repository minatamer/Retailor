# RTL-090 — explore a Stripe sandbox checkout

Status: **Research and plan documented; application implementation deferred.**

15 October 2026. Owner requests research only into a real-feeling Stripe sandbox checkout: show the visitor's chosen store name, selected clothes with size/colour/quantity and pictures, take a simulated payment on Stripe, and return to Retailor. Demonstrate the developer's payment-integration ability. Import only this checkout topic from the referenced Upwork MCP chat; exclude every other idea from that chat.

The owner reports a `STRIPE_API_KEY` in `.env.local` for possible later implementation. This request does not authorize reading/using it, creating sandbox objects, changing application/configuration, publishing photos, registering webhooks or performing live/paid actions. Earlier RTL-089 commit approval does not stage this new planning packet.

## Planning acceptance

- Check the referenced chat and official Stripe sources independently; give a clear feasibility verdict with actual limitations.
- Establish per-session store branding, dynamic cart/options/photos, test payment and success/cancel behavior.
- Treat visitors' own uploaded clothing/photos as mandatory in the first complete integration. Plan temporary delivery of their actual selected variant pictures; sample-only success or sample-picture substitution cannot satisfy acceptance.
- Inspect current checkout/session/photo/money boundaries and propose a focused implementation allocation and validation path.
- Distinguish verified documentation/source facts from untested account, UI, key, photo-hosting and payment assumptions. Keep the existing local order simulation unchanged.

## Outcome and references

Feasible using hosted sandbox Checkout. The proposed first slice demonstrates gateway creation and server-verified return, with no automatic local order/stock mutation. Photo hosting, external return recovery and exact monetary mapping are the main integration work; reliable fulfilment would require a larger future scope.

- [Research and proposed implementation plan](../engineering/STRIPE-SANDBOX-CHECKOUT-PLAN.md).
- [Documentation allocation](../commit-plans/RTL-090.md), [actual planning validation](../validation/RTL-090.md).
- Current [shopping behavior](../engineering/SHOPPING.md), [security boundaries](../engineering/SECURITY.md), [RTL-023 security dispositions](../audits/RTL-023-SECURITY.md) and [quality ownership decisions](../audits/RTL-023-CODE-QUALITY.md).

Implementation remains deferred under the owner's research-only instruction. No Stripe connectivity, account readiness, hosted checkout quality or production payment capability is claimed.
