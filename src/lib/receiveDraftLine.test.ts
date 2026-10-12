/// <reference path="../bun-test.d.ts" />
import { expect, test } from "bun:test";
import { receptionStatus, lineStatus } from "./receiveDraftLine";

test("toutes les lignes reçues → Reçue", () => {
  expect(receptionStatus([{ quantite_commandee: 2, quantite_recue: 2 }, { quantite_commandee: 1, quantite_recue: 1 }])).toBe("recu_complet");
});

test("filtres reçus, batteries en attente → commande Partiellement reçue", () => {
  expect(receptionStatus([{ quantite_commandee: 3, quantite_recue: 3 }, { quantite_commandee: 5, quantite_recue: 0 }])).toBe("recu_partiel");
});

test("statut de ligne : 0 reçu = En attente, 2/5 = Partielle, 5/5 = Reçue", () => {
  expect(lineStatus({ quantite_commandee: 5, quantite_recue: 0 })).toBe("attente");
  expect(lineStatus({ quantite_commandee: 5, quantite_recue: 2 })).toBe("partiel");
  expect(lineStatus({ quantite_commandee: 5, quantite_recue: 5 })).toBe("recue");
});
