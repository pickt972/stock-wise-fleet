import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Download, ArrowLeft } from "lucide-react";

interface CompanySetting {
  company_name: string;
  company_address: string;
  company_siret: string;
  company_phone: string;
  company_email: string;
  company_logo_url?: string;
}

interface PurchaseOrderPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: () => void;
  commande: {
    id: string;
    numero_commande: string;
    fournisseur: string;
    email_fournisseur?: string;
    date_creation: string;
    total_ht: number;
    total_ttc: number;
    tva_taux: number;
    notes?: string;
  };
  items: Array<{
    designation: string;
    reference?: string;
    quantite_commandee: number;
    prix_unitaire: number;
    total_ligne: number;
  }>;
}

export const PurchaseOrderPreview = ({ 
  isOpen, 
  onClose, 
  onSend, 
  commande, 
  items 
}: PurchaseOrderPreviewProps) => {
  const [companySettings, setCompanySettings] = useState<CompanySetting | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchCompanySettings = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("company_settings")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (error) throw error;
        setCompanySettings(data);
      } catch (error) {
        console.error("Erreur lors du chargement des paramètres:", error);
      }
    };

    if (isOpen) {
      fetchCompanySettings();
    }
  }, [user, isOpen]);

  const generatePurchaseOrderHTML = () => {
    const companyInfo = companySettings || {
      company_name: "Votre Entreprise",
      company_address: "Adresse non configurée",
      company_siret: "SIRET non configuré",
      company_phone: "Téléphone non configuré",
      company_email: "Email non configuré"
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Bon de Commande ${commande.numero_commande}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .company-info { text-align: left; }
          .company-name { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 5px; }
          .company-details { font-size: 12px; color: #666; line-height: 1.4; }
          .title { font-size: 24px; font-weight: bold; color: #333; text-align: right; }
          .order-info { margin-bottom: 30px; }
          .info-section { margin-bottom: 20px; }
          .info-label { font-weight: bold; color: #555; }
          .supplier-info { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .total-row { background-color: #f9f9f9; font-weight: bold; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            ${companyInfo.company_logo_url ? `<img src="${companyInfo.company_logo_url}" alt="Logo" style="max-height: 60px; margin-bottom: 10px;">` : ''}
            <div class="company-name">${companyInfo.company_name}</div>
            <div class="company-details">
              ${companyInfo.company_address.replace(/\n/g, '<br>')}<br>
              SIRET: ${companyInfo.company_siret}<br>
              Tél: ${companyInfo.company_phone}<br>
              Email: ${companyInfo.company_email}
            </div>
          </div>
          <div>
            <div class="title">BON DE COMMANDE</div>
            <div style="margin-top: 10px; text-align: right;">
              <span class="info-label">N° :</span> ${commande.numero_commande}
            </div>
          </div>
        </div>
        
        <div class="supplier-info">
          <div class="info-label">Fournisseur :</div>
          <div style="margin-top: 5px;">${commande.fournisseur}</div>
          ${commande.email_fournisseur ? `<div>Email: ${commande.email_fournisseur}</div>` : ''}
        </div>
        
        <div class="order-info">
          <div><span class="info-label">Date de commande :</span> ${new Date(commande.date_creation).toLocaleDateString('fr-FR')}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Désignation</th>
              <th>Référence</th>
              <th class="text-center">Quantité</th>
              <th class="text-right">Prix unitaire (€)</th>
              <th class="text-right">Total (€)</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.designation}</td>
                <td>${item.reference || '-'}</td>
                <td class="text-center">${item.quantite_commandee}</td>
                <td class="text-right">${item.prix_unitaire.toFixed(2)}</td>
                <td class="text-right">${item.total_ligne.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="4" class="text-right">Total HT</td>
              <td class="text-right">${commande.total_ht.toFixed(2)} €</td>
            </tr>
            <tr class="total-row">
              <td colspan="4" class="text-right">TVA (${commande.tva_taux}%)</td>
              <td class="text-right">${(commande.total_ttc - commande.total_ht).toFixed(2)} €</td>
            </tr>
            <tr class="total-row">
              <td colspan="4" class="text-right">Total TTC</td>
              <td class="text-right">${commande.total_ttc.toFixed(2)} €</td>
            </tr>
          </tfoot>
        </table>
        
        ${commande.notes ? `
          <div class="info-section">
            <div class="info-label">Notes :</div>
            <div style="margin-top: 5px;">${commande.notes}</div>
          </div>
        ` : ''}
        
        <div class="footer">
          <p>Merci de bien vouloir confirmer la réception de cette commande et nous indiquer le délai de livraison.</p>
          <p>Cordialement,<br>${companyInfo.company_name}</p>
        </div>
      </body>
      </html>
    `;
  };

  const downloadPDF = () => {
    const html = generatePurchaseOrderHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bon-commande-${commande.numero_commande}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Téléchargement réussi",
      description: "Le bon de commande a été téléchargé.",
    });
  };

  if (!companySettings) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configuration requise</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vous devez d'abord configurer les informations de votre entreprise dans les paramètres pour générer des bons de commande.
            </p>
            
            <div className="flex gap-2">
              <Button onClick={onClose} variant="outline" className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aperçu du bon de commande {commande.numero_commande}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Aperçu du bon de commande */}
          <div 
            className="border rounded-lg p-4 bg-white"
            dangerouslySetInnerHTML={{ __html: generatePurchaseOrderHTML() }}
          />
          
          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={onClose} variant="outline" className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            
            <Button onClick={downloadPDF} variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </Button>
            
            <Button 
              onClick={onSend} 
              className="flex-1"
              disabled={!commande?.email_fournisseur}
            >
              <Mail className="w-4 h-4 mr-2" />
              Envoyer par email
            </Button>
          </div>
          
          {!commande?.email_fournisseur && (
            <p className="text-sm text-muted-foreground text-center">
              L'email du fournisseur n'est pas renseigné pour l'envoi automatique.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};