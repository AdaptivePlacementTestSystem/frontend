/* eslint-disable @typescript-eslint/no-require-imports -- Node.js CommonJS scripts. */
/* Prevent new manual response types at calls to the shared HTTP client. */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const baseline = JSON.parse(fs.readFileSync("scripts/api-type-debt.json", "utf8"));
const seen = {};
const violations = [];
function visitDirectory(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filename = path.join(dir, entry.name);
    if (entry.isDirectory()) visitDirectory(filename);
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts")) checkFile(filename);
  }
}
function checkFile(filename) {
  const source = ts.createSourceFile(
    filename,
    fs.readFileSync(filename, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const aliases = new Map(
    source.statements.filter(ts.isTypeAliasDeclaration).map((node) => [node.name.text, node.type]),
  );
  const schemaImported = source.statements.some(
    (node) =>
      ts.isImportDeclaration(node) &&
      /(?:^|\/)schema$/.test(node.moduleSpecifier.text) &&
      node.importClause?.namedBindings &&
      ts.isNamedImports(node.importClause.namedBindings) &&
      node.importClause.namedBindings.elements.some(
        (element) =>
          (element.propertyName?.text || element.name.text) === "paths" &&
          element.name.text === "paths",
      ),
  );
  function usesSchema(node, visited = new Set()) {
    if (ts.isParenthesizedTypeNode(node)) return usesSchema(node.type, visited);
    if (ts.isIndexedAccessTypeNode(node)) return usesSchema(node.objectType, visited);
    if (ts.isUnionTypeNode(node)) {
      const real = node.types.filter(
        (type) =>
          type.kind !== ts.SyntaxKind.UndefinedKeyword && type.kind !== ts.SyntaxKind.NullKeyword,
      );
      return real.length === 1 && usesSchema(real[0], visited);
    }
    if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
      const name = node.typeName.text;
      if (name === "paths" && schemaImported) return true;
      if (aliases.has(name) && !visited.has(name))
        return usesSchema(aliases.get(name), new Set(visited).add(name));
    }
    return false;
  }
  function scan(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      ["apiRequest", "apiUpload"].includes(node.expression.text)
    ) {
      const arg = node.typeArguments?.[0];
      if (!arg || !usesSchema(arg)) {
        const key = `${filename.replaceAll("\\", "/")}|${node.expression.text}|${arg?.getText(source) || "(inferred)"}`;
        seen[key] = (seen[key] || 0) + 1;
        if (seen[key] > (baseline[key] || 0)) violations.push(key);
      }
    }
    ts.forEachChild(node, scan);
  }
  scan(source);
}
visitDirectory("src");
if (violations.length) {
  console.error(
    "New untyped or hand-written API response type(s):\n" +
      violations.map((v) => `- ${v}`).join("\n"),
  );
  console.error(
    "Use a response type derived from paths in the generated schema, or review and record an explicit debt exception.",
  );
  process.exitCode = 1;
} else {
  console.log(
    `API type check passed; ${Object.values(seen).reduce((a, b) => a + b, 0)} existing manual-type calls remain in the debt baseline.`,
  );
}
