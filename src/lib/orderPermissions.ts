export type OrderRole = 'admin' | 'chef_agence' | 'magasinier' | null | undefined;
export type OrderStatus = 'brouillon' | 'envoye' | 'confirme' | 'recu_partiel' | 'recu_complet' | 'annule' | string;

const VALIDATED: OrderStatus[] = ['confirme', 'envoye'];
const RECEIVABLE: OrderStatus[] = ['confirme', 'envoye', 'recu_partiel'];

/** UI mirror of the database rules; the database enforces the same matrix. */
export function orderPermissions(role: OrderRole, status: OrderStatus, isOwner: boolean) {
  const admin = role === 'admin';
  const chef = role === 'chef_agence';
  const staff = admin || chef || role === 'magasinier';
  const draft = status === 'brouillon';
  return {
    canEdit: admin ? status !== 'annule' && status !== 'recu_complet' : draft && (chef || (staff && isOwner)),
    canDelete: admin || (draft && (chef || (staff && isOwner))),
    canValidate: admin || chef,
    canCancel: (admin || chef) && VALIDATED.includes(status),
    canReceive: staff && RECEIVABLE.includes(status),
  };
}
