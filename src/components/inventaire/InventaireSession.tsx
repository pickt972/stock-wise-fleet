import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, User, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface InventaireSessionProps {
  onSessionCreated: (inventaireId: string) => void;
}

export function InventaireSession({ onSessionCreated }: InventaireSessionProps) {
  const [dateInventaire, setDateInventaire] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const createInventaire = async () => {
    try {
      setIsCreating(true);

      // Vérifier s'il existe déjà un inventaire pour cette date
      const { data: existingInventaire } = await supabase
        .from('inventaires')
        .select('id, statut')
        .eq('date_inventaire', dateInventaire)
        .single();

      if (existingInventaire) {
        if (existingInventaire.statut === 'valide') {
          toast({
            title: "Inventaire déjà validé",
            description: "Un inventaire validé existe déjà pour cette date.",
            variant: "destructive",
          });
          return;
        }

        // Si l'inventaire existe mais n'est pas validé, on peut le reprendre
        toast({
          title: "Reprise d'inventaire",
          description: "Vous allez reprendre l'inventaire existant pour cette date.",
        });
        onSessionCreated(existingInventaire.id);
        return;
      }

      // Créer un nouvel inventaire
      const { data: userResponse } = await supabase.auth.getUser();
      if (!userResponse.user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour créer un inventaire.",
          variant: "destructive",
        });
        return;
      }

      const { data: inventaire, error } = await supabase
        .from('inventaires')
        .insert({
          date_inventaire: dateInventaire,
          location: 'BOIS_ROUGE',
          created_by: userResponse.user.id,
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Copier tous les articles existants dans l'inventaire
      const { data: articles } = await supabase
        .from('articles')
        .select('id, stock, emplacement_id, emplacement');

      if (articles && articles.length > 0) {
        const inventaireItems = articles.map(article => ({
          inventaire_id: inventaire.id,
          article_id: article.id,
          stock_theorique: article.stock,
          emplacement_id: article.emplacement_id,
          emplacement: article.emplacement,
        }));

        const { error: itemsError } = await supabase
          .from('inventaire_items')
          .insert(inventaireItems);

        if (itemsError) throw itemsError;
      }

      toast({
        title: "Inventaire créé",
        description: `Session d'inventaire créée pour le ${format(new Date(dateInventaire), 'dd MMMM yyyy', { locale: fr })}.`,
      });

      onSessionCreated(inventaire.id);
    } catch (error) {
      console.error('Erreur lors de la création de l\'inventaire:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'inventaire.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Nouvelle session d'inventaire
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="date" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date d'inventaire
          </Label>
          <Input
            id="date"
            type="date"
            value={dateInventaire}
            onChange={(e) => setDateInventaire(e.target.value)}
            min={format(new Date(), 'yyyy-MM-dd')}
          />
          <p className="text-sm text-muted-foreground">
            Un seul inventaire par jour est autorisé
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Notes (optionnel)
          </Label>
          <Textarea
            id="notes"
            placeholder="Équipe d'inventaire, conditions particulières..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Début: {format(new Date(), 'HH:mm', { locale: fr })}
          </span>
        </div>

        <Button
          onClick={createInventaire}
          disabled={isCreating}
          className="w-full"
        >
          {isCreating ? "Création..." : "Démarrer l'inventaire"}
        </Button>
      </CardContent>
    </Card>
  );
}