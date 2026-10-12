export type ValidationOutcome = "sent" | "send-failed" | "no-email";

/** Message unique affiché après « Valider et envoyer » (toast, jamais un PDF ouvert). */
export function validationMessage(numero: string, outcome: ValidationOutcome, email = "") {
  const ref = numero ? ` ${numero}` : "";
  if (outcome === "sent") return `✅ Commande${ref} validée et envoyée à ${email}`;
  if (outcome === "send-failed")
    return `✅ Commande${ref} validée — envoi automatique impossible, pensez à envoyer le bon de commande`;
  return `✅ Commande${ref} validée — pensez à envoyer le bon de commande`;
}
