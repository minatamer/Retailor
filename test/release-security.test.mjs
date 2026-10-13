import { expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import {
  evaluateSecurityPolicy,
  unverifiedSecurityPolicy,
} from "../scripts/release/security-policy.mjs";

const now = Date.parse("2026-10-13T18:00:00Z");
const source = { fingerprint: "a".repeat(64), dirty: false };
const packaged = {
  source: { fingerprint: source.fingerprint },
  images: {
    frontend: { id: `sha256:${"b".repeat(64)}` },
    backend: { id: `sha256:${"c".repeat(64)}` },
  },
};
function observed() {
  return {
    ...unverifiedSecurityPolicy(),
    scope: "public",
    verifiedAt: new Date(now).toISOString(),
    evidenceReference: "operator-review.json",
    candidate: {
      fingerprint: source.fingerprint,
      frontendImage: packaged.images.frontend.id,
      backendImage: packaged.images.backend.id,
    },
    paidDisabledVerified: true,
    ingress: {
      edgeRulesVerified: true,
      originSealEnabled: true,
      allOriginUrlsRejected: true,
      normalFlowVerified: true,
      evidenceReference: "origin-review.json",
    },
  };
}

it("default policy and matching Linux sources never approve public or paid exposure", async () => {
  const example = JSON.parse(
    await readFile(
      new URL("../scripts/release/security.example.json", import.meta.url),
      "utf8",
    ),
  );
  expect(example).toEqual(unverifiedSecurityPolicy());
  const result = evaluateSecurityPolicy(example, source, packaged, now);
  expect(result.publicSecurityReady).toBe(false);
  expect(result.paidSecurityReady).toBe(false);
  expect(result.publicationAuthorized).toBe(false);
  expect(result.networkRequests).toBe(0);
  expect(result.blockingConditions.length).toBeGreaterThan(0);
});

it("public paid-off policy requires exact fresh evidence and every origin/normal-flow check", () => {
  const policy = observed();
  expect(
    evaluateSecurityPolicy(policy, source, packaged, now).publicSecurityReady,
  ).toBe(true);
  for (const value of [
    {
      ...policy,
      candidate: { ...policy.candidate, fingerprint: "d".repeat(64) },
    },
    {
      ...policy,
      candidate: {
        ...policy.candidate,
        frontendImage: packaged.images.backend.id,
      },
    },
    { ...policy, candidate: { ...policy.candidate, backendImage: "" } },
    { ...policy, verifiedAt: new Date(now + 1).toISOString() },
    {
      ...policy,
      verifiedAt: new Date(now - 72 * 60 * 60 * 1000 - 1).toISOString(),
    },
    { ...policy, paidDisabledVerified: false },
    { ...policy, evidenceReference: "" },
  ])
    expect(
      evaluateSecurityPolicy(value, source, packaged, now).publicSecurityReady,
    ).toBe(false);
  for (const key of Object.keys(policy.ingress)) {
    const value = {
      ...policy,
      ingress: {
        ...policy.ingress,
        [key]: key === "evidenceReference" ? "" : false,
      },
    };
    expect(
      evaluateSecurityPolicy(value, source, packaged, now).publicSecurityReady,
    ).toBe(false);
  }
  expect(
    evaluateSecurityPolicy(policy, { ...source, dirty: true }, packaged, now)
      .publicSecurityReady,
  ).toBe(false);
  expect(
    evaluateSecurityPolicy(
      policy,
      source,
      { ...packaged, source: { fingerprint: "e".repeat(64) } },
      now,
    ).publicSecurityReady,
  ).toBe(false);
});

it("process limits or acknowledgement cannot substitute for actual external refusal/overlap/cost evidence", () => {
  const policy = {
    ...observed(),
    paid: "external-cutoff",
    account: {
      cutoffRefusalVerified: true,
      overlapAndResetVerified: true,
      outstandingUsageBounded: true,
      evidenceReference: "account-review.json",
    },
  };
  const accepted = evaluateSecurityPolicy(policy, source, packaged, now);
  expect(accepted.paidSecurityReady).toBe(true);
  expect(accepted.publicSecurityReady).toBe(true);
  expect(accepted.publicationAuthorized).toBe(false);
  for (const key of Object.keys(policy.account)) {
    const value = {
      ...policy,
      account: {
        ...policy.account,
        [key]: key === "evidenceReference" ? "" : false,
      },
    };
    expect(
      evaluateSecurityPolicy(value, source, packaged, now).paidSecurityReady,
    ).toBe(false);
    expect(
      evaluateSecurityPolicy(value, source, packaged, now).publicSecurityReady,
    ).toBe(false);
  }
  const restricted = {
    ...policy,
    scope: "restricted",
    ingress: unverifiedSecurityPolicy().ingress,
  };
  expect(
    evaluateSecurityPolicy(restricted, source, packaged, now).paidSecurityReady,
  ).toBe(false);
  expect(
    evaluateSecurityPolicy(
      { ...restricted, restrictedAudienceVerified: true },
      source,
      packaged,
      now,
    ).paidSecurityReady,
  ).toBe(true);
  expect(
    evaluateSecurityPolicy(
      { ...restricted, restrictedAudienceVerified: true },
      source,
      packaged,
      now,
    ).publicSecurityReady,
  ).toBe(false);
});

it("rejects secret-bearing, unbounded, unknown or malformed policy fields without echoing them", () => {
  for (const policy of [
    { ...observed(), OPENAI_API_KEY: "PRIVATE_MARKER" },
    { ...observed(), evidenceReference: "PRIVATE_MARKER".repeat(50) },
    { ...observed(), paid: "budget-alert" },
    {
      ...observed(),
      candidate: { ...observed().candidate, frontendImage: "latest" },
    },
  ])
    expect(() => evaluateSecurityPolicy(policy, source, packaged, now)).toThrow(
      "Invalid release security evidence",
    );
});
