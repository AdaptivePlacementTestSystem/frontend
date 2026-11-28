import { describe, expect, it } from "vitest";
import { isAllowedProxyPath } from "@/lib/api/proxy-policy";

describe("đường dẫn proxy lô câu hỏi", () => {
  it("cho phép danh sách, chi tiết và chặn đường dẫn ngoài phạm vi", () => {
    expect(isAllowedProxyPath(["item-batches"])).toBe(true);
    expect(isAllowedProxyPath(["item-batches", "2c2db1b1-9670-4e3c-a126-a6825f84ca56"])).toBe(true);
    expect(isAllowedProxyPath(["item-batches", ".."])).toBe(false);
    expect(isAllowedProxyPath(["item-batches", "x", "assign"])).toBe(true);
    for (const operation of ["upload", "grid", "save", "template"])
      expect(isAllowedProxyPath(["item-batches", "import", operation])).toBe(true);
    expect(isAllowedProxyPath(["item-batches", "import", "grid", "a".repeat(64)])).toBe(true);
    expect(isAllowedProxyPath(["item-batches", "import", "grid", "../other"])).toBe(false);
  });
});
