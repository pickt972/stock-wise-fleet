import { describe, expect, test } from "bun:test";
import { inventoryPlaceLabel, isUuidLike, parseOptionalNumber } from "./newInventoryArticle";

describe("parseOptionalNumber", () => {
  test("vide → null", () => expect(parseOptionalNumber(" ")).toBeNull());
  test("virgule acceptée", () => expect(parseOptionalNumber("12,5")).toBe(12.5));
  test("négatif refusé", () => expect(parseOptionalNumber("-1")).toBeNaN());
});

describe("inventoryPlaceLabel", () => {
  test("périmètre complet", () => expect(inventoryPlaceLabel("all", undefined)).toBe("Inventaire complet"));
  test("nom du lieu", () => expect(inventoryPlaceLabel("location", "Carrère")).toBe("Carrère"));
  test("jamais d'UUID", () => {
    expect(inventoryPlaceLabel("location", "6e4e94e6-62c8-4e03-bd07-2c0000000000")).toBe("Inventaire complet");
    expect(isUuidLike("6e4e94e6-62c8-4e03-bd07-2c0000000000")).toBe(true);
  });
});
