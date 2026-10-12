import { describe, expect, test } from "bun:test";
import { canDropCategory, dropIntentAt, edgeScrollSpeed } from "./categoryDropRules";

const items = [
  { id: "root", parent_id: null }, { id: "other", parent_id: null },
  { id: "child", parent_id: "root" }, { id: "leaf", parent_id: null },
  { id: "second", parent_id: "root" },
];
describe("Category drop rules", () => {
  test("top 30% reorders before", () => { expect(dropIntentAt(129, 100, 100)).toBe("before"); });
  test("central 40% nests", () => { expect(dropIntentAt(130, 100, 100)).toBe("nest"); expect(dropIntentAt(169, 100, 100)).toBe("nest"); });
  test("bottom 30% reorders after", () => { expect(dropIntentAt(170, 100, 100)).toBe("after"); });
  test("subcategory cannot nest into subcategory", () => { expect(canDropCategory(items, "child", "second", "nest")).toBe(false); });
  test("root with children cannot nest and create a third level", () => { expect(canDropCategory(items, "root", "other", "nest")).toBe(false); });
  test("leaf category can nest into root with children at the same level", () => { expect(canDropCategory(items, "leaf", "root", "nest")).toBe(true); });
  test("subcategory can move to another root", () => { expect(canDropCategory(items, "child", "other", "nest")).toBe(true); });
  test("reordering cannot create a third level", () => { expect(canDropCategory(items, "root", "child", "after")).toBe(false); });
  test("cycles and self-drops are rejected", () => { expect(canDropCategory(items, "root", "child", "nest")).toBe(false); expect(canDropCategory(items, "root", "root", "before")).toBe(false); });
  test("auto scroll activates only inside the 80px edge", () => { expect(edgeScrollSpeed(180, 100, 500)).toBe(0); expect(edgeScrollSpeed(179, 100, 500)).toBeLessThan(0); expect(edgeScrollSpeed(421, 100, 500)).toBeGreaterThan(0); expect(edgeScrollSpeed(99, 100, 500)).toBe(0); });
});