import { builtinModules } from "node:module";
import ts from "typescript";
import path from "node:path";
export function inspectBoundary(filename, text, clientGraph = false) {
  const file = filename.replaceAll("\\", "/");
  const ast = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const findings = [];
  const pure = file.startsWith("packages/");
  const contracts = file.startsWith("packages/contracts/");
  const frontend = file.startsWith("apps/frontend/src/");
  const client =
    clientGraph ||
    ast.statements.some(
      (node) =>
        ts.isExpressionStatement(node) &&
        ts.isStringLiteral(node.expression) &&
        node.expression.text === "use client",
    );
  const server =
    file.includes("/server/") ||
    file.endsWith(".server.ts") ||
    file.includes("/app/api/");
  const report = (node, message) =>
    findings.push({
      file,
      line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1,
      message,
    });
  function check(node, value) {
    const nodeImport =
      value.startsWith("node:") || builtinModules.includes(value);
    const resolved = value.startsWith(".")
      ? path.posix.normalize(path.posix.join(path.posix.dirname(file), value))
      : value;
    if (
      pure &&
      (nodeImport ||
        (!value.startsWith(".") &&
          !(contracts
            ? value === "zod"
            : value.startsWith("@retailor/contracts/"))))
    )
      report(
        node,
        "Pure packages may import only their approved public dependencies",
      );
    if (
      contracts &&
      (resolved.startsWith("apps/") ||
        resolved.startsWith("packages/commerce/"))
    )
      report(node, "Contracts cannot import apps or commerce");
    if (
      pure &&
      value.startsWith(".") &&
      !resolved.startsWith(
        contracts ? "packages/contracts/src/" : "packages/commerce/src/",
      )
    )
      report(
        node,
        "Pure relative imports must stay in their owning package source",
      );
    if (pure && resolved.startsWith("apps/"))
      report(node, "Packages cannot import app source");
    if (
      (file.startsWith("apps/backend/") &&
        resolved.startsWith("apps/frontend/")) ||
      (frontend && resolved.startsWith("apps/backend/"))
    )
      report(node, "Apps cannot import another app");
    if (
      client &&
      (resolved.includes("/server/") ||
        value.endsWith(".server") ||
        value.endsWith(".server.ts") ||
        nodeImport ||
        ["server-only", "google-auth-library", "openai"].includes(value))
    )
      report(node, "Client code cannot import server or provider modules");
    if (frontend && !server && nodeImport)
      report(node, "Browser-safe feature modules cannot import Node");
    if (
      value.includes("packages/") &&
      value.includes("/src/") &&
      file.startsWith("apps/")
    )
      report(node, "Use shared package public exports");
    if (
      /providers\/.*(?:live|openai)/u.test(file) &&
      resolved.includes("/demo/")
    )
      report(node, "Live providers cannot load development fixtures");
  }
  function visit(node) {
    const forbidden = pure
      ? ["process", "Buffer", "fetch", "localStorage", "sessionStorage"]
      : frontend && !server
        ? ["process", "Buffer"]
        : [];
    const parent = node.parent;
    const globalReceiver = (expression) =>
      ts.isIdentifier(expression) &&
      ["globalThis", "window", "self"].includes(expression.text);
    const propertyName =
      parent &&
      ((ts.isPropertyAccessExpression(parent) &&
        parent.name === node &&
        !globalReceiver(parent.expression)) ||
        ((ts.isPropertyAssignment(parent) ||
          ts.isMethodDeclaration(parent) ||
          ts.isPropertySignature(parent)) &&
          parent.name === node));
    if (
      ts.isElementAccessExpression(node) &&
      globalReceiver(node.expression) &&
      node.argumentExpression &&
      ts.isStringLiteral(node.argumentExpression) &&
      forbidden.includes(node.argumentExpression.text)
    )
      report(
        node,
        pure
          ? "Pure packages cannot access environment, network or browser storage"
          : "Private environment belongs in server-only modules",
      );
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      check(node, node.moduleSpecifier.text);
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const arg = node.arguments[0];
      if (arg && ts.isStringLiteral(arg)) check(node, arg.text);
      else report(node, "Dynamic imports require a literal reviewed target");
    }
    if (
      ts.isIdentifier(node) &&
      !propertyName &&
      ["process", "Buffer", "fetch", "localStorage", "sessionStorage"].includes(
        node.text,
      ) &&
      pure
    )
      report(
        node,
        "Pure packages cannot access environment, network or browser storage",
      );
    if (
      ts.isIdentifier(node) &&
      !propertyName &&
      ["process", "Buffer"].includes(node.text) &&
      frontend &&
      !server
    )
      report(node, "Private environment belongs in server-only modules");
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return findings;
}

export function inspectWorkspace(sources) {
  const normalized = new Map(
    [...sources].map(([file, text]) => [file.replaceAll("\\", "/"), text]),
  );
  const clients = new Set();
  const pending = [];
  for (const [file, text] of normalized) {
    const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    if (
      ast.statements.some(
        (n) =>
          ts.isExpressionStatement(n) &&
          ts.isStringLiteral(n.expression) &&
          n.expression.text === "use client",
      )
    ) {
      clients.add(file);
      pending.push(file);
    }
  }
  while (pending.length) {
    const file = pending.pop();
    const text = normalized.get(file);
    for (const imported of ts.preProcessFile(text, true, true).importedFiles) {
      if (!imported.fileName.startsWith(".")) continue;
      const base = path.posix.normalize(
        path.posix.join(path.posix.dirname(file), imported.fileName),
      );
      const withoutJs = base.replace(/\.js$/u, "");
      const target = [
        base,
        `${withoutJs}.ts`,
        `${withoutJs}.tsx`,
        `${base}/index.ts`,
        `${base}/index.tsx`,
      ].find((candidate) => normalized.has(candidate));
      if (target && !clients.has(target)) {
        clients.add(target);
        pending.push(target);
      }
    }
  }
  return [...normalized].flatMap(([file, text]) =>
    inspectBoundary(file, text, clients.has(file)),
  );
}
