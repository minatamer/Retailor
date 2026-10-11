import { it, expect } from "vitest";
import {
  inspectBoundary,
  inspectWorkspace,
} from "../scripts/boundary-rules.mjs";
it("allows pure public exports and rejects source/env escapes", () => {
  expect(
    inspectBoundary(
      "packages/commerce/src/money.ts",
      'import {IdSchema} from "@retailor/contracts/core";',
    ),
  ).toEqual([]);
  expect(
    inspectBoundary(
      "packages/contracts/src/bad.ts",
      'import x from "node:fs"; process.env.KEY;',
    ).length,
  ).toBeGreaterThan(0);
  expect(
    inspectBoundary(
      "packages/commerce/src/bad.ts",
      'import x from "../../../apps/backend/src/config/config.js";',
    ).length,
  ).toBeGreaterThan(0);
});
it("rejects client server access, app coupling and computed imports", () => {
  for (const source of [
    '"use client"; import x from "../server/backend.server";',
    '"use client"; import("node:crypto");',
    'import x from "../../../backend/src/server.ts";',
    "import(target);",
  ])
    expect(
      inspectBoundary("apps/frontend/src/features/bad.tsx", source).length,
    ).toBeGreaterThan(0);
});
it("distinguishes ordinary workflow property names from private global references", () => {
  expect(
    inspectBoundary(
      "apps/frontend/src/features/workflow.ts",
      "const stages={process: []}; controller.process(); class Workflow { process() {} }",
    ),
  ).toEqual([]);
  for (const source of [
    "process.env.KEY",
    "process?.env.KEY",
    "globalThis.process.env.KEY",
    'globalThis["process"].env.KEY',
    "const {env}=process",
  ])
    expect(
      inspectBoundary("apps/frontend/src/features/workflow.ts", source).length,
    ).toBeGreaterThan(0);
});

it("rejects transitive private imports and legacy bare Node imports", () => {
  const sources = new Map([
    [
      "apps/frontend/src/features/client.tsx",
      '"use client"; import {x} from "./intermediate";',
    ],
    [
      "apps/frontend/src/features/intermediate.ts",
      'export {x} from "../server/private.server";',
    ],
    ["apps/frontend/src/server/private.server.ts", "export const x=1;"],
  ]);
  expect(
    inspectWorkspace(sources).some((f) => f.file.endsWith("intermediate.ts")),
  ).toBe(true);
  expect(
    inspectBoundary("apps/frontend/src/features/bad.ts", 'import x from "fs";')
      .length,
  ).toBeGreaterThan(0);
  expect(
    inspectBoundary(
      "packages/commerce/src/bad.ts",
      'import x from "../../../scripts/env.js";',
    ).length,
  ).toBeGreaterThan(0);
});
