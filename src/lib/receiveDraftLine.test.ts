/// <reference path="../bun-test.d.ts" />
import { expect, test } from "bun:test";
import { receptionStatus } from "./receiveDraftLine";

test("toutes les lignes reçues → Reçue", () => {
  expect(receptionStatus([{ quantite_commandee: 2, quantite_recue: 2 }, { quantite_commandee: 1, quantite_recue: 1 }])).toBe("recu_complet");
});

test("une ligne reçue, une en attente → Partiellement reçue", () => {
  expect(receptionStatus([{ quantite_commandee: 2, quantite_recue: 2 }, { quantite_commandee: 1, quantite_recue: 0 }])).toBe("recu_partiel");
});
