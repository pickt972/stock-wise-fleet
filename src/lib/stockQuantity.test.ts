import { describe, expect, test } from "bun:test";
import { stockQuantityState, stepStockQuantity } from "./stockQuantity";

describe("stock quantity controls", () => {
  test("minimum is 1 and minus is disabled at 1", () => {
    expect(stockQuantityState(1).decreaseDisabled).toBe(true);
    expect(stepStockQuantity(1, -1)).toBe(1);
    expect(stepStockQuantity(2, -1)).toBe(1);
  });
  test("plus stops at available stock", () => {
    expect(stepStockQuantity(4, 1, 5)).toBe(5);
    expect(stockQuantityState(5, 5).increaseDisabled).toBe(true);
    expect(stepStockQuantity(5, 1, 5)).toBe(5);
    expect(stockQuantityState(1, 0).increaseDisabled).toBe(true);
  });
  test("direct quantities over stock are warned, never clamped", () => {
    expect(stockQuantityState(6, 5).exceedsStock).toBe(true);
    expect(stockQuantityState(5, 5).exceedsStock).toBe(false);
    expect(stepStockQuantity(6, -1, 5)).toBe(5);
  });
  test("entries are not limited by current stock", () => {
    expect(stepStockQuantity(20, 1)).toBe(21);
    expect(stockQuantityState(20).increaseDisabled).toBe(false);
    expect(stockQuantityState(20).exceedsStock).toBe(false);
  });
});