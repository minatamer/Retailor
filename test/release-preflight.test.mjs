import { describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import {
  InputsSchema,
  httpsOrigin,
  evaluatePreflight,
  inspectionCommands,
  preparePreflight,
  readReleaseJson,
  parseReleaseJson,
} from "../scripts/release/preflight.mjs";
const blank = JSON.parse(
  await readFile(
    new URL("../scripts/release/inputs.example.json", import.meta.url),
    "utf8",
  ),
);
const named = {
  ...blank,
  projectId: "retailor-demo",
  region: "us-central1",
  repository: "retailor",
  frontendService: "retailor-frontend",
  backendService: "retailor-backend",
  frontendServiceAccount:
    "retailor-front@retailor-demo.iam.gserviceaccount.com",
  backendServiceAccount: "retailor-back@retailor-demo.iam.gserviceaccount.com",
  openaiSecret: "retailor-openai",
  openaiSecretVersion: "1",
};
describe("release metadata and verdict", () => {
  it("malformed metadata exposes no input fragment in parser diagnostics", () => {
    let failure;
    try {
      parseReleaseJson("PRIVATE_METADATA_MARKER");
    } catch (error) {
      failure = error;
    }
    expect(failure.message).toBe("Invalid release metadata JSON");
    expect(failure.message).not.toContain("PRIVATE_");
    expect(failure.cause).toBeUndefined();
    expect(parseReleaseJson('{"schemaVersion":1}')).toEqual({
      schemaVersion: 1,
    });
  });
  it("rejects unknown secrets, cross-project resources, mutable images and noncanonical origins", () => {
    for (const value of [
      { ...blank, OPENAI_API_KEY: "private" },
      { ...named, backendService: named.frontendService },
      { ...named, backendServiceAccount: named.frontendServiceAccount },
      {
        ...named,
        backendServiceAccount:
          "retailor-back@unrelated-demo.iam.gserviceaccount.com",
      },
      {
        ...named,
        frontendRegistryImage:
          "us-central1-docker.pkg.dev/retailor-demo/retailor/frontend:latest",
      },
      {
        ...named,
        frontendRegistryImage: `us-central1-docker.pkg.dev/unrelated-demo/retailor/frontend@sha256:${"a".repeat(64)}`,
      },
      { ...named, openaiSecretVersion: "latest" },
      { ...blank, productionOrigin: "https://user:secret@shop.example.com" },
    ])
      expect(InputsSchema.safeParse(value).success).toBe(false);
    for (const value of [
      "http://shop.example.com",
      "https://shop.example.com/",
      "https://127.0.0.1",
      "https://169.254.169.254",
      "https://shop.internal",
      "https://shop.example.com:444",
    ])
      expect(httpsOrigin(value)).toBe(false);
    expect(httpsOrigin("https://shop.example.com")).toBe(true);
  });
  it("never treats a matching fingerprint or supplied resources as publication/live approval", () => {
    const source = {
        fingerprint: "a".repeat(64),
        gitRevision: "b".repeat(40),
        dirty: true,
      },
      packaged = {
        source: { fingerprint: source.fingerprint },
        images: {
          frontend: { id: `sha256:${"c".repeat(64)}` },
          backend: { id: `sha256:${"d".repeat(64)}` },
        },
      };
    const match = evaluatePreflight(source, packaged, named);
    expect(match.candidate.matchesLocalLinuxEvidence).toBe(true);
    expect(match.candidate.dirty).toBe(true);
    expect(match.publicReleaseAccepted).toBe(false);
    expect(match.publicationAuthorized).toBe(false);
    expect(match.paidRequests).toBe(0);
    expect(match.externalGates.length).toBeGreaterThan(0);
    expect(
      evaluatePreflight(
        { ...source, fingerprint: "e".repeat(64) },
        packaged,
        named,
      ).localVerdict,
    ).toBe("source-mismatch");
  });
  it("emits fixed read-only scoped argv without accessing secret versions", () => {
    const commands = inspectionCommands(named);
    expect(commands).toHaveLength(5);
    for (const command of commands) {
      expect(command[0]).toBe("gcloud");
      expect(command).toContain("--project");
      expect(command).toContain("retailor-demo");
      expect(
        command.some((argument) =>
          [
            "deploy",
            "update",
            "access",
            "add-iam-policy-binding",
            "push",
          ].includes(argument),
        ),
      ).toBe(false);
      expect(command.join(" ")).not.toContain("containers.env");
    }
    expect(commands.at(-1)).toContain("describe");
    expect(inspectionCommands(blank)).toEqual([]);
  });
  it("bounds approved metadata before parsing and refuses arbitrary paths", async () => {
    await expect(readReleaseJson("apps/backend/.env.local")).rejects.toThrow(
      "Unsupported",
    );
    await expect(
      readReleaseJson("docs/validation/RTL-021/containers.json", 16),
    ).rejects.toThrow("envelope");
  });
  it("default preflight reads only public local evidence and never loads app env or networks", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("No network"));
    const env = vi.spyOn(process, "loadEnvFile");
    const result = await preparePreflight();
    expect(result.localVerdict).toBe("matches-local-linux-candidate");
    expect(result.missingInputs).toHaveLength(21);
    expect(result.publicReleaseAccepted).toBe(false);
    expect(result.readOnlyInspectionCommands).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
    expect(env).not.toHaveBeenCalled();
  });
});
