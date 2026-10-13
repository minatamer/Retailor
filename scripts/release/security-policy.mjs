import { createRequire } from "node:module";
const { z } = createRequire(
  new URL("../../apps/backend/package.json", import.meta.url),
)("zod");
const hash = z
  .string()
  .max(64)
  .refine((value) => value === "" || /^[a-f0-9]{64}$/u.test(value));
const image = z
  .string()
  .max(71)
  .refine((value) => value === "" || /^sha256:[a-f0-9]{64}$/u.test(value));
const reference = z
  .string()
  .max(128)
  .regex(/^(?:[a-zA-Z0-9][a-zA-Z0-9._-]{0,127})?$/u);
export const SecurityPolicySchema = z.strictObject({
  schemaVersion: z.literal(1),
  scope: z.enum(["restricted", "public"]),
  paid: z.enum(["off", "external-cutoff"]),
  candidate: z.strictObject({
    fingerprint: hash,
    frontendImage: image,
    backendImage: image,
  }),
  verifiedAt: z.iso.datetime().nullable(),
  evidenceReference: reference,
  paidDisabledVerified: z.boolean(),
  restrictedAudienceVerified: z.boolean(),
  account: z.strictObject({
    cutoffRefusalVerified: z.boolean(),
    overlapAndResetVerified: z.boolean(),
    outstandingUsageBounded: z.boolean(),
    evidenceReference: reference,
  }),
  ingress: z.strictObject({
    edgeRulesVerified: z.boolean(),
    originSealEnabled: z.boolean(),
    allOriginUrlsRejected: z.boolean(),
    normalFlowVerified: z.boolean(),
    evidenceReference: reference,
  }),
});
export function unverifiedSecurityPolicy() {
  return {
    schemaVersion: 1,
    scope: "restricted",
    paid: "off",
    candidate: { fingerprint: "", frontendImage: "", backendImage: "" },
    verifiedAt: null,
    evidenceReference: "",
    paidDisabledVerified: false,
    restrictedAudienceVerified: false,
    account: {
      cutoffRefusalVerified: false,
      overlapAndResetVerified: false,
      outstandingUsageBounded: false,
      evidenceReference: "",
    },
    ingress: {
      edgeRulesVerified: false,
      originSealEnabled: false,
      allOriginUrlsRejected: false,
      normalFlowVerified: false,
      evidenceReference: "",
    },
  };
}

/** Validates owner evidence metadata only; never claims to meter provider costs or deploy. */
export function evaluateSecurityPolicy(
  input,
  source,
  packaged,
  now = Date.now(),
) {
  const parsed = SecurityPolicySchema.safeParse(input);
  if (!parsed.success || !Number.isSafeInteger(now))
    throw new Error("Invalid release security evidence");
  const policy = parsed.data;
  const matchesCandidate =
    !!policy.candidate.fingerprint &&
    !!policy.candidate.frontendImage &&
    !!policy.candidate.backendImage &&
    policy.candidate.fingerprint === source.fingerprint &&
    source.fingerprint === packaged.source.fingerprint &&
    policy.candidate.frontendImage === packaged.images.frontend.id &&
    policy.candidate.backendImage === packaged.images.backend.id;
  const at = policy.verifiedAt ? Date.parse(policy.verifiedAt) : NaN;
  const evidenceFresh =
    Number.isFinite(at) && at <= now && now - at <= 72 * 60 * 60 * 1000;
  const evidenceReady =
    matchesCandidate &&
    evidenceFresh &&
    !!policy.evidenceReference &&
    !source.dirty;
  const ingressVerified = Object.entries(policy.ingress).every(
    ([, value]) => !!value,
  );
  const accountVerified = Object.entries(policy.account).every(
    ([, value]) => !!value,
  );
  const paidSecurityReady =
    evidenceReady &&
    policy.paid === "external-cutoff" &&
    accountVerified &&
    (policy.scope === "public"
      ? ingressVerified
      : policy.restrictedAudienceVerified);
  const publicSecurityReady =
    evidenceReady &&
    policy.scope === "public" &&
    ingressVerified &&
    (policy.paid === "off" ? policy.paidDisabledVerified : paidSecurityReady);
  const blockingConditions = [];
  if (!matchesCandidate)
    blockingConditions.push(
      "Security evidence must name this fingerprint and both immutable Linux images",
    );
  if (!evidenceFresh || !policy.evidenceReference)
    blockingConditions.push(
      "Dated operator evidence within 72 hours is required; metadata is not independent verification",
    );
  if (source.dirty)
    blockingConditions.push(
      "Commit the settled application candidate before external acceptance",
    );
  if (policy.scope !== "public")
    blockingConditions.push(
      "Audience remains restricted; public sharing has not been accepted",
    );
  if (!ingressVerified)
    blockingConditions.push(
      "Verify edge limits, enabled origin seal, every primary/tag/alias bypass denial and normal delivery",
    );
  if (policy.paid === "off" && !policy.paidDisabledVerified)
    blockingConditions.push(
      "Verify paid-off capability on the actual candidate; local flags are not hosted proof",
    );
  if (policy.paid === "external-cutoff" && !accountVerified)
    blockingConditions.push(
      "Verify actual external cost refusal, restart/overlap scope and outstanding usage; alerts/process limits are insufficient",
    );
  if (
    policy.scope === "restricted" &&
    policy.paid === "external-cutoff" &&
    !policy.restrictedAudienceVerified
  )
    blockingConditions.push(
      "Verify the restricted audience before a private paid demonstration",
    );
  return {
    scope: policy.scope,
    paid: policy.paid,
    matchesCandidate,
    evidenceFresh,
    publicSecurityReady,
    paidSecurityReady,
    blockingConditions,
    publicationAuthorized: false,
    networkRequests: 0,
    paidRequests: 0,
  };
}
