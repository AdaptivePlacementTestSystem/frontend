import type { paths } from "../src/lib/api/schema";

type Submit = paths["/api/v1/sessions/{id}/responses"]["post"];
type Body = Submit["requestBody"]["content"]["application/json"];
type Result = Submit["responses"][200]["content"]["application/json"];

const valid: Body = { itemId: "item", response: "A" };
// @ts-expect-error The submitted answer must be one of the documented choices.
const invalid: Body = { itemId: "item", response: "E" };
declare const result: Result;
const shouldStop: boolean = result.shouldStop;
void [valid, invalid, shouldStop];
