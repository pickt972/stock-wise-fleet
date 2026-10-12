interface POItem { designation: string; reference?: string; quantite_commandee: number; prix_unitaire: number; is_draft?: boolean; precision_note?: string | null; vehicule_label?: string | null }

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export const purchaseOrderTotal = (items: POItem[]) => items.reduce((s, i) => s + (i.quantite_commandee || 0) * (i.prix_unitaire || 0), 0);

/** Opens a printable purchase order (print → "Enregistrer en PDF" available). */
export function printPurchaseOrder({ numero, fournisseur, items, date = new Date() }: { numero?: string; fournisseur: string; items: POItem[]; date?: Date }) {
  const priced = items.some((i) => i.prix_unitaire > 0);
  const rows = items.map((i) => `<tr><td>${esc(i.designation)}${i.reference && !i.is_draft ? `<br><small>Réf : ${esc(i.reference)}</small>` : ""}${i.precision_note ? `<br><small>${esc(i.precision_note)}</small>` : ""}${i.vehicule_label ? `<br><small>Véhicule : ${esc(i.vehicule_label)}</small>` : ""}</td><td class="r">${i.quantite_commandee}</td>${priced ? `<td class="r">${i.prix_unitaire ? eur(i.prix_unitaire) : "—"}</td><td class="r">${i.prix_unitaire ? eur(i.prix_unitaire * i.quantite_commandee) : "—"}</td>` : ""}</tr>`).join("");
  const units = items.reduce((n, i) => n + (i.quantite_commandee || 0), 0);
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Bon de commande ${esc(numero || "")}</title>
<style>body{font-family:system-ui,sans-serif;margin:32px;color:#111}h1{margin:0;font-size:24px;letter-spacing:.04em}.head{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left;font-size:14px}th{background:#f3f3f3}.r{text-align:right}.tot{font-weight:700;font-size:16px}small{color:#666}</style></head><body>
<div class="head"><div><h1>ALOELOCATION</h1><div>Bon de commande</div></div><div class="r">${numero ? `N° ${esc(numero)}<br>` : ""}Date : ${date.toLocaleDateString("fr-FR")}</div></div>
<div><strong>Fournisseur :</strong> ${esc(fournisseur)}</div>
<table><thead><tr><th>Article</th><th class="r">Qté</th>${priced ? `<th class="r">P.U. estimé</th><th class="r">Total</th>` : ""}</tr></thead><tbody>${rows}</tbody>
<tfoot><tr>${priced ? `<td colspan="3" class="r tot">Total estimé HT</td><td class="r tot">${eur(purchaseOrderTotal(items))}</td>` : `<td class="r tot">Total unités</td><td class="r tot">${units}</td>`}</tr></tfoot></table>
<script>window.onload=()=>{window.print()}</script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(html); w.document.close();
  return true;
}
