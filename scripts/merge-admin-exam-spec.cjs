/* eslint-disable @typescript-eslint/no-require-imports -- this standalone script runs as CommonJS */
const fs = require("node:fs");
const crypto = require("node:crypto");
const input = process.argv[2];
if (!input) throw new Error("Truyền đường dẫn openapi-admin-exam.json được sinh từ backend");
const raw = fs.readFileSync(input);
const patch = JSON.parse(raw.toString("utf8"));
const base = JSON.parse(fs.readFileSync("openapi.json", "utf8"));
for (const [path, methods] of Object.entries(patch.paths)) {
  base.paths[path] = { ...base.paths[path], ...methods };
}
for (const [name, schema] of Object.entries(patch.components.schemas ?? {})) {
  if (name !== "AdminExamHttpError")
    throw new Error(`Unexpected schema ${name}; refusing to overwrite the baseline`);
  base.components.schemas[name] = schema;
}
base["x-admin-exam-contract-sha256"] = crypto.createHash("sha256").update(raw).digest("hex");
fs.writeFileSync("openapi.json", JSON.stringify(base, null, 2) + "\n");
