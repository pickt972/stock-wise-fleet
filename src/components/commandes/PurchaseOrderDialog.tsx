import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Download, Settings, Eye } from "lucide-react";
import { EmailOrderDialog } from "./EmailOrderDialog";
import { PurchaseOrderPreview } from "./PurchaseOrderPreview";

interface PurchaseOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEmailSent?: () => void;
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

export const PurchaseOrderDialog = ({ isOpen, onClose, onEmailSent, commande, items }: PurchaseOrderDialogProps) => {
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  // Pré-remplir les informations de l'utilisateur connecté
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Récupérer l'email depuis mail_settings
          const { data: mailSettings } = await supabase
            .from("mail_settings")
            .select("smtp_username")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .maybeSingle();
          
          if (mailSettings?.smtp_username) {
            setSenderEmail(mailSettings.smtp_username);
          }
          
          // Récupérer le profil pour obtenir le nom
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name, username")
            .eq("id", user.id)
            .maybeSingle();
          
          if (profile) {
            const fullName = [profile.first_name, profile.last_name]
              .filter(Boolean)
              .join(" ") || profile.username || "";
            setSenderName(fullName);
          }
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des informations utilisateur:", error);
      }
    };

    if (isOpen) {
      fetchUserInfo();
    }
  }, [isOpen]);

  const generatePurchaseOrderHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Bon de Commande ${commande.numero_commande}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; color: #333; }
          .info-section { margin-bottom: 20px; }
          .info-label { font-weight: bold; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .total-row { background-color: #f9f9f9; font-weight: bold; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">BON DE COMMANDE</div>
          <div style="margin-top: 10px;">
            <span class="info-label">N° :</span> ${commande.numero_commande}
          </div>
        </div>
        
        <div class="info-section">
          <div><span class="info-label">Fournisseur :</span> ${commande.fournisseur}</div>
          <div><span class="info-label">Date :</span> ${new Date(commande.date_creation).toLocaleDateString('fr-FR')}</div>
          <div><span class="info-label">Expéditeur :</span> ${senderName} (${senderEmail})</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Désignation</th>
              <th>Référence</th>
              <th>Quantité</th>
              <th>Prix unitaire (€)</th>
              <th>Total (€)</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.designation}</td>
                <td>${item.reference || '-'}</td>
                <td>${item.quantite_commandee}</td>
                <td>${item.prix_unitaire.toFixed(2)}</td>
                <td>${item.total_ligne.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="4">Total HT</td>
              <td>${commande.total_ht.toFixed(2)} €</td>
            </tr>
            <tr class="total-row">
              <td colspan="4">TVA (${commande.tva_taux}%)</td>
              <td>${(commande.total_ttc - commande.total_ht).toFixed(2)} €</td>
            </tr>
            <tr class="total-row">
              <td colspan="4">Total TTC</td>
              <td>${commande.total_ttc.toFixed(2)} €</td>
            </tr>
          </tfoot>
        </table>
        
        ${commande.notes ? `
          <div class="info-section">
            <div class="info-label">Notes :</div>
            <div>${commande.notes}</div>
          </div>
        ` : ''}
        
        <div class="footer">
          <p>Merci de bien vouloir confirmer la réception de cette commande.</p>
          <p>Cordialement,<br>${senderName}</p>
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

  const sendEmail = async () => {
    if (!senderName || !senderEmail) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir vos informations d'expéditeur.",
        variant: "destructive",
      });
      return;
    }

    if (!commande?.email_fournisseur) {
      toast({
        title: "Erreur",
        description: "L'email du fournisseur n'est pas renseigné.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Récupérer les paramètres de l'entreprise et de messagerie
      const { data: user } = await supabase.auth.getUser();
      let companySettings = null;
      let mailSettingId = null;
      
      if (user?.user) {
        const { data: settings } = await supabase
          .from("company_settings")
          .select("*")
          .eq("user_id", user.user.id)
          .eq("is_active", true)
          .maybeSingle();
        
        companySettings = settings;

        // Récupérer le compte email actif
        const { data: mailSetting } = await supabase
          .from("mail_settings")
          .select("id")
          .eq("user_id", user.user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (!mailSetting) {
          throw new Error("Aucun compte email configuré. Veuillez configurer un compte dans Paramètres.");
        }

        mailSettingId = mailSetting.id;
      }

      const { data, error } = await supabase.functions.invoke('send-purchase-order', {
        body: {
          commande,
          items,
          sender: {
            name: senderName,
            email: senderEmail,
          },
          companySettings,
          mailSettingId,
        },
      });

      if (error) throw error;

      // Mettre à jour le statut de la commande à "envoyée"
      const { error: updateError } = await supabase
        .from("commandes")
        .update({ 
          status: "envoye",
          date_envoi: new Date().toISOString()
        })
        .eq("id", commande.id);

      if (updateError) {
        console.error("Erreur lors de la mise à jour du statut:", updateError);
      }

      toast({
        title: "Email envoyé",
        description: `Le bon de commande a été envoyé à ${commande?.email_fournisseur}`,
      });
      
      onClose();
      onEmailSent?.();
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'envoi de l'email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bon de Commande {commande?.numero_commande || 'N/A'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="senderName">Votre nom</Label>
            <Input
              id="senderName"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Nom de l'expéditeur"
            />
          </div>
          
          <div>
            <Label htmlFor="senderEmail">Votre email</Label>
            <Input
              id="senderEmail"
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="email@exemple.com"
            />
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Fournisseur :</strong> {commande?.fournisseur || 'Non renseigné'}</p>
            <p><strong>Email :</strong> {commande?.email_fournisseur || "Non renseigné"}</p>
            <p><strong>Total :</strong> {(commande?.total_ttc || 0).toFixed(2)} €</p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => setShowPreview(true)}
              variant="outline"
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-2" />
              Aperçu
            </Button>
            
            <Button
              onClick={sendEmail}
              disabled={isLoading || !commande?.email_fournisseur}
              className="flex-1"
            >
              <Mail className="w-4 h-4 mr-2" />
              {isLoading ? "Envoi..." : "Envoyer"}
            </Button>

            <Button
              onClick={() => setShowEmailDialog(true)}
              variant="outline"
              className="flex-1"
            >
              <Settings className="w-4 h-4 mr-2" />
              Email perso
            </Button>
          </div>
        </div>

        <PurchaseOrderPreview
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          onSend={() => {
            setShowPreview(false);
            sendEmail();
          }}
          commande={commande}
          items={items}
        />

        <EmailOrderDialog
          isOpen={showEmailDialog}
          onClose={() => setShowEmailDialog(false)}
          commande={commande}
          items={items}
        />
      </DialogContent>
    </Dialog>
  );
};