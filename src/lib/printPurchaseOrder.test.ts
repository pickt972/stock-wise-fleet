/// <reference path="../bun-test.d.ts" />
import { expect, test } from "bun:test";
import { purchaseOrderTotal } from "./printPurchaseOrder";

test("total estimé = somme quantité × prix, lignes libres sans prix à 0", () => {
  expect(purchaseOrderTotal([
    { designation: "Batterie 60Ah", quantite_commandee: 2, prix_unitaire: 80 },
    { designation: "Batterie 60Ah Bosch", quantite_commandee: 3, prix_unitaire: 0, is_draft: true },
  ])).toBe(160);
});
