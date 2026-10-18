/// <reference path="../bun-test.d.ts" />
import { expect, test } from "bun:test";
import { validateEntryItems, validateReceptionQuantity } from "./stockEntryValidation";

test("réception minimum 1, entière et sans dépasser le reste à recevoir", () => {
  expect(() => validateReceptionQuantity(0, 5)).toThrow();
  expect(() => validateReceptionQuantity(1.5, 5)).toThrow();
  expect(() => validateReceptionQuantity(6, 5)).toThrow();
  expect(() => validateReceptionQuantity(2, 5)).not.toThrow();
  expect(() => validateReceptionQuantity(5, 5)).not.toThrow();
});

test("entrée manuelle : article requis, quantité positive et prix réel positif ou nul", () => {
  expect(() => validateEntryItems([])).toThrow();
  expect(() => validateEntryItems([{ article_id: "", quantity: 1, unit_price: 12.5 }])).toThrow();
  expect(() => validateEntryItems([{ article_id: "article", quantity: -1, unit_price: 12.5 }])).toThrow();
  expect(() => validateEntryItems([{ article_id: "article", quantity: 2, unit_price: -1 }])).toThrow();
  expect(() => validateEntryItems([{ article_id: "article", quantity: 2, unit_price: 12.5 }])).not.toThrow();
  expect(() => validateEntryItems([{ article_id: "article", quantity: 2, unit_price: 0 }])).not.toThrow();
});