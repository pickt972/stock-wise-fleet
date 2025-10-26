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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    REVISION: ['Excellent', 'Bon', 'Usé', 'Endommagé', 'Obsolète']
  };

  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [countedQuantity, setCountedQuantity] = useState(0);
  const [condition, setCondition] = useState('');
  const [locationCorrect, setLocationCorrect] = useState<boolean | null>(null);
  const [requiresMaintenance, setRequiresMaintenance] = useState(false);
  const [requiresRemoval, setRequiresRemoval] = useState(false);
  
  // États pour dialog "Article non trouvé"
  const [scannedNotFoundCode, setScannedNotFoundCode] = useState("");
  const [showNotFoundDialog, setShowNotFoundDialog] = useState(false);

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
        // Article non trouvé - afficher dialog pour créer
        setScannedNotFoundCode(scannedCode);
        setShowNotFoundDialog(true);
        setShowScanner(false);
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

  const handleConfirmInventory = async () => {
    if (!scannedArticle || !sessionId) return;

    setIsProcessing(true);
    try {
      const discrepancy = countedQuantity - scannedArticle.stock;

      const { error } = await supabase
        .from('inventaire_items')
        .insert({
          inventaire_id: sessionId,
          article_id: scannedArticle.id,
          stock_theorique: scannedArticle.stock,
          stock_compte: countedQuantity,
          ecart: discrepancy,
          notes: notes || null,
        });

      if (error) throw error;

      const status = discrepancy === 0 ? '✓ Match!' : `⚠️ Écart: ${discrepancy > 0 ? '+' : ''}${discrepancy}`;
      
      toast({
        title: "Article inventorié",
        description: status,
      });

      setInventoryItems([...inventoryItems, {
        article: scannedArticle.designation,
        expected: scannedArticle.stock,
        counted: countedQuantity,
        discrepancy
      }]);

      // Réinitialiser
      setScannedArticle(null);
      setCountedQuantity(0);
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

  const handleConfirmRevision = async () => {
    if (!scannedArticle || !condition) return;

    setIsProcessing(true);
    try {
      // Créer ou récupérer une session d'audit
      if (!sessionId) {
        const { data: auditData, error: auditError } = await supabase
          .from('inventaires')
          .insert({
            location: 'SIEGE' as any,
            status: 'OPEN' as any,
            statut: 'en_cours',
            date_inventaire: new Date().toISOString().split('T')[0],
          })
          .select()
          .single();

        if (auditError) throw auditError;
        setSessionId(auditData.id);
      }

      toast({
        title: "Article révisé",
        description: `État: ${condition}`,
      });

      // Réinitialiser
      setScannedArticle(null);
      setCondition('');
      setLocationCorrect(null);
      setRequiresMaintenance(false);
      setRequiresRemoval(false);
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
      case 'INVENTAIRE':
        handleConfirmInventory();
        break;
      case 'REVISION':
        handleConfirmRevision();
        break;
      default:
        toast({
          title: "Mode non implémenté",
          description: `Mode ${mode} en cours de développement`,
        });
    }
  };

  const startInventorySession = async () => {
    try {
      const { data, error } = await supabase
        .from('inventaires')
        .insert({
          location: 'SIEGE' as any,
          status: 'OPEN' as any,
          statut: 'en_cours',
          date_inventaire: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;
      
      setSessionId(data.id);
      toast({
        title: "Session démarrée",
        description: `Inventaire #${data.id.slice(0, 8)}`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
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

  const handleCreateArticle = () => {
    setShowNotFoundDialog(false);
    const currentPath = window.location.pathname;
    navigate(`/articles/new?reference=${encodeURIComponent(scannedNotFoundCode)}&returnTo=${encodeURIComponent(currentPath)}`);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <PageHeader title={getTitleByMode()} showBackButton />
        
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Subtitle */}
          <p className="text-sm text-muted-foreground text-center">{getSubtitle()}</p>

          {/* Session info pour INVENTAIRE */}
          {mode === 'INVENTAIRE' && !sessionId && (
            <Card className="bg-muted">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">Démarrer une session d'inventaire</p>
                <ActionButton
                  variant="primary"
                  size="lg"
                  onClick={startInventorySession}
                >
                  Démarrer session
                </ActionButton>
              </CardContent>
            </Card>
          )}

          {mode === 'INVENTAIRE' && sessionId && (
            <Card className="bg-primary/5 border-primary">
              <CardContent className="p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Session:</span>
                  <Badge className="bg-primary text-primary-foreground">#{sessionId.slice(0, 8)}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Articles scannés:</span>
                  <span className="font-semibold">{inventoryItems.length}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bouton Scanner */}
          {!scannedArticle && (mode !== 'INVENTAIRE' || sessionId) && (
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

                {mode === 'INVENTAIRE' && (
                  <>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Quantité en BD: <span className="font-semibold text-foreground">{scannedArticle.stock} unités</span></p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Quantité comptée:</Label>
                      <div className="flex items-center gap-2">
                        <ActionButton
                          variant="secondary"
                          size="lg"
                          icon={<Minus className="h-4 w-4" />}
                          onClick={() => setCountedQuantity(Math.max(0, countedQuantity - 1))}
                        />
                        <Input
                          type="number"
                          value={countedQuantity}
                          onChange={(e) => setCountedQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                          className="text-center text-lg font-semibold h-11 border-2"
                        />
                        <ActionButton
                          variant="secondary"
                          size="lg"
                          icon={<Plus className="h-4 w-4" />}
                          onClick={() => setCountedQuantity(countedQuantity + 1)}
                        />
                      </div>
                    </div>

                    {countedQuantity !== scannedArticle.stock && (
                      <div className="p-3 bg-warning/10 border border-warning rounded-lg">
                        <p className="text-sm font-semibold text-warning">
                          ⚠️ Écart: {countedQuantity - scannedArticle.stock > 0 ? '+' : ''}{countedQuantity - scannedArticle.stock}
                        </p>
                      </div>
                    )}

                    {countedQuantity === scannedArticle.stock && countedQuantity > 0 && (
                      <div className="p-3 bg-success/10 border border-success rounded-lg">
                        <p className="text-sm font-semibold text-success">
                          ✓ Match! Continuer inventaire
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Notes discrepancy (si écart):</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Raison de l'écart..."
                        className="min-h-[60px] border-2"
                      />
                    </div>
                  </>
                )}

                {mode === 'REVISION' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">État général:</Label>
                      <Select value={condition} onValueChange={setCondition}>
                        <SelectTrigger className="h-11 border-2">
                          <SelectValue placeholder="Sélectionner un état" />
                        </SelectTrigger>
                        <SelectContent>
                          {motifsMap.REVISION.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Emplacement correct?</Label>
                      <div className="flex gap-3">
                        <ActionButton
                          variant={locationCorrect === true ? "success" : "secondary"}
                          size="lg"
                          className="flex-1"
                          onClick={() => setLocationCorrect(true)}
                        >
                          Oui
                        </ActionButton>
                        <ActionButton
                          variant={locationCorrect === false ? "warning" : "secondary"}
                          size="lg"
                          className="flex-1"
                          onClick={() => setLocationCorrect(false)}
                        >
                          Non
                        </ActionButton>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="maintenance"
                          checked={requiresMaintenance}
                          onChange={(e) => setRequiresMaintenance(e.target.checked)}
                          className="h-4 w-4 rounded border-2"
                        />
                        <Label htmlFor="maintenance" className="text-sm cursor-pointer">
                          ☑️ Demande maintenance
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="removal"
                          checked={requiresRemoval}
                          onChange={(e) => setRequiresRemoval(e.target.checked)}
                          className="h-4 w-4 rounded border-2"
                        />
                        <Label htmlFor="removal" className="text-sm cursor-pointer">
                          ☑️ À retirer du stock
                        </Label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Notes:</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Observations..."
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
                    disabled={
                      isProcessing || 
                      (mode === 'SORTIE' && !motif) ||
                      (mode === 'REVISION' && !condition)
                    }
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
                      setCountedQuantity(0);
                      setCondition('');
                      setLocationCorrect(null);
                      setRequiresMaintenance(false);
                      setRequiresRemoval(false);
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

          {/* Dialog Article Non Trouvé */}
          <AlertDialog open={showNotFoundDialog} onOpenChange={setShowNotFoundDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>📦 Article non trouvé</AlertDialogTitle>
                <AlertDialogDescription>
                  Aucun article avec le code: <strong>{scannedNotFoundCode}</strong>
                  <br/><br/>
                  Voulez-vous créer cet article?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleCreateArticle}>
                  ➕ Créer article
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </DashboardLayout>
  );
}
