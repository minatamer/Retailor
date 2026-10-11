import { readdir, readFile } from "node:fs/promises";
import { inspectWorkspace } from "./boundary-rules.mjs";
async function files(root) {
  const entries = await readdir(root, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(`${root}/${entry.name}`)
          : /\.(?:ts|tsx)$/u.test(entry.name) &&
              !entry.name.endsWith(".test.ts")
            ? [`${root}/${entry.name}`]
            : [],
      ),
    )
  ).flat();
}
const all = (
  await Promise.all(
    [
      "packages/contracts/src",
      "packages/commerce/src",
      "apps/frontend/src",
      "apps/backend/src",
    ].map(files),
  )
).flat();
const sources = new Map(
  await Promise.all(
    all.map(async (file) => [file, await readFile(file, "utf8")]),
  ),
);
const findings = inspectWorkspace(sources);
for (const finding of findings)
  console.error(`${finding.file}:${finding.line} ${finding.message}`);
if (findings.length) process.exitCode = 1;
else console.log(`Workspace boundaries passed (${all.length} modules).`);
