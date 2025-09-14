import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Mail } from "lucide-react";

interface MailSetting {
  id: string;
  name: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  use_tls: boolean;
}

interface EmailOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  commande: any;
  items: any[];
}

export function EmailOrderDialog({ isOpen, onClose, commande, items }: EmailOrderDialogProps) {
  const [mailSettings, setMailSettings] = useState<MailSetting[]>([]);
  const [selectedMailSetting, setSelectedMailSetting] = useState<string>("");
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      fetchMailSettings();
      // Pré-remplir l'email du fournisseur si disponible
      if (commande?.email_fournisseur) {
        setEmailTo(commande.email_fournisseur);
      }
      // Pré-remplir le sujet
      setEmailSubject(`Bon de commande ${commande?.numero_commande || ""}`);
      // Générer le contenu de l'email
      generateEmailBody();
    }
  }, [isOpen, commande]);

  const fetchMailSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("mail_settings")
        .select("id, name, smtp_host, smtp_port, smtp_username, use_tls")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) throw error;
      setMailSettings(data || []);
      
      if (data && data.length > 0) {
        setSelectedMailSetting(data[0].id);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des paramètres mail:", error);
    }
  };

  const generateEmailBody = () => {
    if (!commande || !items) return;

    const totalHT = items.reduce((sum, item) => sum + (item.total_ligne || 0), 0);
    const totalTTC = totalHT * (1 + (commande.tva_taux || 20) / 100);

    const body = `Bonjour,

Veuillez trouver ci-dessous notre bon de commande :

Numéro de commande : ${commande.numero_commande}
Date : ${new Date(commande.date_creation).toLocaleDateString('fr-FR')}

Articles commandés :
${items.map(item => 
  `- ${item.designation} (Réf: ${item.reference || 'N/A'}) - Quantité: ${item.quantite_commandee} - Prix unitaire: ${item.prix_unitaire}€ - Total: ${item.total_ligne}€`
).join('\n')}

Total HT : ${totalHT.toFixed(2)}€
TVA (${commande.tva_taux}%) : ${((totalTTC - totalHT)).toFixed(2)}€
Total TTC : ${totalTTC.toFixed(2)}€

${commande.notes ? `Notes : ${commande.notes}` : ''}

Cordialement.`;

    setEmailBody(body);
  };

  const sendEmail = async () => {
    if (!selectedMailSetting || !emailTo || !emailSubject || !emailBody) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-custom-email', {
        body: {
          mailSettingId: selectedMailSetting,
          to: emailTo,
          subject: emailSubject,
          body: emailBody,
          commandeId: commande.id
        }
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Email envoyé avec succès",
      });
      onClose();
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Envoyer le bon de commande par email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {mailSettings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Aucun compte de messagerie configuré.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Rendez-vous dans les paramètres pour configurer votre messagerie.
              </p>
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="mail-setting">Compte de messagerie</Label>
                <Select value={selectedMailSetting} onValueChange={setSelectedMailSetting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un compte" />
                  </SelectTrigger>
                  <SelectContent>
                    {mailSettings.map((setting) => (
                      <SelectItem key={setting.id} value={setting.id}>
                        {setting.name} ({setting.smtp_username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="email-to">Destinataire *</Label>
                <Input
                  id="email-to"
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="email@fournisseur.com"
                />
              </div>

              <div>
                <Label htmlFor="email-subject">Sujet *</Label>
                <Input
                  id="email-subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Sujet de l'email"
                />
              </div>

              <div>
                <Label htmlFor="email-body">Message *</Label>
                <Textarea
                  id="email-body"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Contenu de l'email"
                  rows={10}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={sendEmail} disabled={isLoading} className="flex-1">
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Envoyer l'email
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Annuler
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}