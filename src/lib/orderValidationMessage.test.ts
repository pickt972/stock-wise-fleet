import { test, expect } from "bun:test";
import { validationMessage } from "./orderValidationMessage";

test("fournisseur avec email envoyé → 'validée et envoyée à <email>'", () => {
  expect(validationMessage("CMD-2026-0042", "sent", "autobam@example.com")).toBe(
    "✅ Commande CMD-2026-0042 validée et envoyée à autobam@example.com",
  );
});

test("fournisseur sans email → 'pensez à envoyer le bon de commande'", () => {
  expect(validationMessage("CMD-2026-0042", "no-email")).toBe(
    "✅ Commande CMD-2026-0042 validée — pensez à envoyer le bon de commande",
  );
});

test("envoi automatique impossible → message distinct, sans promettre l'envoi", () => {
  expect(validationMessage("CMD-2026-0042", "send-failed", "autobam@example.com")).toBe(
    "✅ Commande CMD-2026-0042 validée — envoi automatique impossible, pensez à envoyer le bon de commande",
  );
});
