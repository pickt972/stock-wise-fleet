import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarcodeScanner } from "@/components/scanner/BarcodeScanner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "./DashboardLayout";
import { Camera, Plus, Minus } from "lucide-react";

type ScanMode = 'CONSULTER' | 'SORTIE' | 'INVENTAIRE' | 'COMMANDE' | 'REVISION';

interface Article {
  id: string;
  reference: string;
  designation: string;
  marque: string;
  categorie: string;
  stock: number;
  stock_min: number;
  prix_achat: number;
  emplacement: string;
}

export default function ScannerHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [mode, setMode] = useState<ScanMode>('CONSULTER');
  const [showScanner, setShowScanner] = useState(false);
  const [scannedArticle, setScannedArticle] = useState<Article | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [motif, setMotif] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const motifsMap = {
    SORTIE: ['Installation', 'Réparation', 'Maintenance', 'Transfert sortant', 'Autre'],
    INVENTAIRE: [],
    COMMANDE: [],
    REVISION: []
  };

  useEffect(() => {
    // Récupérer le mode depuis l'état de navigation
    if (location.state?.mode) {
      setMode(location.state.mode as ScanMode);
    }
  }, [location.state]);

  const getTitleByMode = () => {
    switch (mode) {
      case 'CONSULTER': return 'Consulter article';
      case 'SORTIE': return 'Retirer du stock';
      case 'INVENTAIRE': return 'Inventaire';
      case 'COMMANDE': return 'Nouvelle commande';
      case 'REVISION': return 'Révision audit';
      default: return 'Scanner';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'SORTIE': return 'Scannez articles à retirer';
      case 'INVENTAIRE': return 'Vérifier stock total';
      case 'COMMANDE': return 'Ajouter articles à commander';
      case 'REVISION': return 'Audit/Contrôle';
      default: return 'Scannez un code-barre';
    }
  };

  const handleScanResult = async (scannedCode: string) => {
    setIsProcessing(true);
    try {
      // Rechercher l'article par code-barre ou référence
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .or(`reference.eq.${scannedCode},code_barre.eq.${scannedCode}`)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setScannedArticle(data);
        setShowScanner(false);
        toast({
          title: "Article détecté",
          description: data.designation,
        });
      } else {
        toast({
          title: "Article non trouvé",
          description: "Code non reconnu",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSortie = async () => {
    if (!scannedArticle) return;

    if (quantity > scannedArticle.stock) {
      toast({
        title: "Stock insuffisant",
        description: `Disponible: ${scannedArticle.stock}`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Mettre à jour le stock
      const { error: updateError } = await supabase.rpc('update_article_stock', {
        article_id: scannedArticle.id,
        quantity_change: -quantity,
      });

      if (updateError) throw updateError;

      // Enregistrer le mouvement
      const { error: moveError } = await supabase
        .from('stock_movements')
        .insert({
          article_id: scannedArticle.id,
          type: 'sortie',
          quantity: quantity,
          motif: motif || 'Scanner',
          user_id: user?.id,
        });

      if (moveError) throw moveError;

      toast({
        title: "Sortie validée",
        description: `${quantity} unité(s) retirée(s)`,
      });

      // Réinitialiser
      setScannedArticle(null);
      setQuantity(1);
      setMotif('');
      setNotes('');
      setShowScanner(true);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAction = () => {
    switch (mode) {
      case 'CONSULTER':
        if (scannedArticle) {
          navigate(`/articles/${scannedArticle.id}`);
        }
        break;
      case 'SORTIE':
        handleConfirmSortie();
        break;
      default:
        toast({
          title: "Mode non implémenté",
          description: `Mode ${mode} en cours de développement`,
        });
    }
  };

  const getStockBadge = (stock: number, stockMin: number) => {
    if (stock === 0) {
      return <Badge variant="destructive">Rupture</Badge>;
    } else if (stock <= stockMin) {
      return <Badge className="bg-warning text-warning-foreground">Stock faible</Badge>;
    }
    return <Badge className="bg-success text-success-foreground">OK</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <PageHeader title={getTitleByMode()} showBackButton />
        
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Subtitle */}
          <p className="text-sm text-muted-foreground text-center">{getSubtitle()}</p>

          {/* Bouton Scanner */}
          {!scannedArticle && (
            <ActionButton
              variant="primary"
              size="xxl"
              className="w-full"
              icon={<Camera className="h-6 w-6" />}
              onClick={() => setShowScanner(true)}
            >
              Ouvrir le scanner
            </ActionButton>
          )}

          {/* Article scanné */}
          {scannedArticle && (
            <Card>
              <CardContent className="p-5 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{scannedArticle.designation}</h3>
                  <p className="text-sm text-muted-foreground">
                    {scannedArticle.marque} - {scannedArticle.categorie}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Stock actuel:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">{scannedArticle.stock} unités</span>
                    {getStockBadge(scannedArticle.stock, scannedArticle.stock_min)}
                  </div>
                </div>

                {mode === 'SORTIE' && (
                  <>
                    {/* Quantité à retirer */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Quantité à retirer:</Label>
                      <div className="flex items-center gap-2">
                        <ActionButton
                          variant="secondary"
                          size="lg"
                          icon={<Minus className="h-4 w-4" />}
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                        />
                        <Input
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="text-center text-lg font-semibold h-11 border-2"
                        />
                        <ActionButton
                          variant="secondary"
                          size="lg"
                          icon={<Plus className="h-4 w-4" />}
                          onClick={() => setQuantity(Math.min(scannedArticle.stock, quantity + 1))}
                          disabled={quantity >= scannedArticle.stock}
                        />
                      </div>
                    </div>

                    {/* Motif retrait */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Motif retrait:</Label>
                      <Select value={motif} onValueChange={setMotif}>
                        <SelectTrigger className="h-11 border-2">
                          <SelectValue placeholder="Sélectionner un motif" />
                        </SelectTrigger>
                        <SelectContent>
                          {motifsMap.SORTIE.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Notes optionnel */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Notes (optionnel):</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Informations complémentaires..."
                        className="min-h-[60px] border-2"
                      />
                    </div>
                  </>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <ActionButton
                    variant="success"
                    size="xl"
                    className="flex-1"
                    onClick={handleConfirmAction}
                    disabled={isProcessing || (mode === 'SORTIE' && !motif)}
                  >
                    {mode === 'CONSULTER' ? 'Voir détails' : '✅ Confirmer'}
                  </ActionButton>
                  <ActionButton
                    variant="secondary"
                    size="xl"
                    className="flex-1"
                    onClick={() => {
                      setScannedArticle(null);
                      setQuantity(1);
                      setMotif('');
                      setNotes('');
                      setShowScanner(true);
                    }}
                    disabled={isProcessing}
                  >
                    📷 Scanner prochain
                  </ActionButton>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scanner Modal */}
          <BarcodeScanner
            isOpen={showScanner}
            onClose={() => setShowScanner(false)}
            onScanResult={handleScanResult}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
