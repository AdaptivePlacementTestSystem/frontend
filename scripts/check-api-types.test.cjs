/* eslint-disable @typescript-eslint/no-require-imports -- Node.js CommonJS scripts. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function run(source) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "apt-api-types-"));
  try {
    fs.mkdirSync(path.join(root, "src"));
    fs.mkdirSync(path.join(root, "scripts"));
    fs.writeFileSync(path.join(root, "scripts/api-type-debt.json"), "{}");
    fs.writeFileSync(path.join(root, "src/example.ts"), source);
    return spawnSync(process.execPath, [path.join(__dirname, "check-api-types.cjs")], {
      cwd: root,
      encoding: "utf8",
    });
  } finally {
    fs.unlinkSync(path.join(root, "src/example.ts"));
    fs.unlinkSync(path.join(root, "scripts/api-type-debt.json"));
    fs.rmdirSync(path.join(root, "src"));
    fs.rmdirSync(path.join(root, "scripts"));
    fs.rmdirSync(root);
  }
}
test("accepts response type derived from generated paths", () => {
  const result = run(
    'import type { paths } from "./schema"; type R = paths["/x"]["get"]; apiRequest<R>("/x")',
  );
  assert.equal(result.status, 0, result.stderr);
});
test("rejects new handwritten and inferred response types", () => {
  assert.equal(run('apiRequest<{ id: string }>("/x")').status, 1);
  assert.equal(run('apiRequest("/x")').status, 1);
});
test("does not accept a union mixing schema and handwritten fields", () => {
  assert.equal(
    run(
      'import type { paths } from "./schema"; type R = paths["/x"] | { fake: true }; apiRequest<R>("/x")',
    ).status,
    1,
  );
});
