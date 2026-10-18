/// <reference path="../bun-test.d.ts" />
import { expect, test } from "bun:test";
import { parseSimpleEntryPrice } from "./simpleEntryInput";

test("entrée simple : le prix optionnel vide vaut zéro", () => {
  expect(parseSimpleEntryPrice(" ")).toBe(0);
});

test("entrée simple : conserve le prix unitaire saisi avec une virgule", () => {
  expect(parseSimpleEntryPrice("12,50")).toBe(12.5);
  expect(parseSimpleEntryPrice("12.50")).toBe(12.5);
});

test("entrée simple : un prix invalide n’est pas silencieusement remplacé par zéro", () => {
  expect(() => parseSimpleEntryPrice("abc")).toThrow("Prix unitaire invalide");
  expect(() => parseSimpleEntryPrice("12abc")).toThrow("Prix unitaire invalide");
  expect(() => parseSimpleEntryPrice("-1")).toThrow("Prix unitaire invalide");
  expect(() => parseSimpleEntryPrice("Infinity")).toThrow("Prix unitaire invalide");
});