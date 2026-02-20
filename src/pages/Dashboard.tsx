import { useState, useCallback } from "react";
import { Package, FileText, BarChart3, Settings, AlertTriangle, RotateCcw, ScanLine, Search, PlusCircle, PackageX } from "lucide-react";
import { KPICard } from "@/components/ui/kpi-card";
import { useRealTimeStats } from "@/hooks/useRealTimeStats";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { BarcodeScanner } from "@/components/scanner/BarcodeScanner";
import { QuickStockAction } from "@/components/stock/QuickStockAction";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "./DashboardLayout";

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

export default function Dashboard() {
  const { stats, isLoading } = useRealTimeStats();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [foundArticle, setFoundArticle] = useState<Article | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);

  const searchArticle = useCallback(async (query: string) => {
    if (!query.trim()) return;
    const raw = query.trim();
    const numeric = raw.replace(/\D/g, "");
    const q = numeric.length >= 8 ? numeric : raw;

    setIsSearching(true);
    setNotFoundCode(null);
    try {
      // Exact match
      const { data } = await supabase
        .from("articles")
        .select("*")
        .or(`reference.eq.${q},code_barre.eq.${q}`)
        .maybeSingle();

      if (data) {
        setFoundArticle(data);
        return;
      }

      // Partial match
      const likeKey = q.length > 8 ? q.slice(0, -1) : q;
      const { data: partials } = await supabase
        .from("articles")
        .select("*")
        .or(`reference.ilike.%${likeKey}%,code_barre.ilike.%${likeKey}%,designation.ilike.%${likeKey}%`)
        .limit(1);

      if (partials && partials.length > 0) {
        setFoundArticle(partials[0]);
      } else {
        setNotFoundCode(q);
      }
    } catch {
      toast({ title: "Erreur de recherche", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  }, [toast]);

  const handleScanResult = useCallback((code: string) => {
    setShowScanner(false);
    setSearchQuery(code);
    searchArticle(code);
  }, [searchArticle]);

  const handleReset = useCallback(() => {
    setFoundArticle(null);
    setNotFoundCode(null);
    setSearchQuery("");
  }, []);

  const lastUpdate = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  // If article found → show quick stock action
  if (foundArticle) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto px-4 py-6">
          <QuickStockAction
            article={foundArticle}
            onBack={handleReset}
            onComplete={handleReset}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">
            {profile?.first_name ? `Bonjour, ${profile.first_name} 👋` : 'Stock-Wise Fleet'}
          </h1>
          <p className="text-sm text-muted-foreground">Scannez un article pour commencer</p>
        </div>

        {/* BIG SCAN BUTTON */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => setShowScanner(true)}
            className="relative w-36 h-36 rounded-full bg-primary text-primary-foreground shadow-[0_8px_30px_-4px_hsl(var(--primary)/0.5)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.6)] active:scale-95 transition-all duration-200 flex items-center justify-center group"
          >
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping opacity-40 pointer-events-none" />
            <span className="absolute inset-[-6px] rounded-full border border-primary/20 pointer-events-none" />
            <ScanLine className="h-14 w-14 group-hover:scale-110 transition-transform duration-200" />
          </button>
          <span className="text-sm font-medium text-muted-foreground">Scanner un article</span>
        </div>

        {/* Manual search */}
        <div className="flex gap-2">
          <Input
            placeholder="Référence, code-barre ou désignation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isSearching) searchArticle(searchQuery);
            }}
            className="flex-1 h-12"
          />
          <Button
            onClick={() => searchArticle(searchQuery)}
            disabled={isSearching || !searchQuery.trim()}
            size="icon"
            className="h-12 w-12"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>

        {isSearching && (
          <p className="text-center text-sm text-muted-foreground animate-pulse">Recherche en cours...</p>
        )}

        {/* Not found → propose creation */}
        {notFoundCode && !isSearching && (
          <Card className="border-l-4 border-l-warning animate-in fade-in slide-in-from-bottom-2 duration-200">
            <CardContent className="pt-5 pb-4 space-y-3">
              <div className="flex items-center gap-3">
                <PackageX className="h-8 w-8 text-warning flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">Article introuvable</p>
                  <p className="text-sm text-muted-foreground">Code : <span className="font-mono">{notFoundCode}</span></p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="h-12 bg-success hover:bg-success/90 text-success-foreground"
                  onClick={() => navigate(`/articles/new?code_barre=${encodeURIComponent(notFoundCode)}&returnTo=/dashboard`)}
                >
                  <PlusCircle className="h-5 w-5 mr-2" />
                  Créer l'article
                </Button>
                <Button
                  variant="outline"
                  className="h-12"
                  onClick={() => setNotFoundCode(null)}
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div onClick={() => navigate("/articles")} className="cursor-pointer">
            <KPICard
              icon={<Package className="h-5 w-5" />}
              value={isLoading ? "..." : stats.totalArticles}
              label="Articles"
              className="hover:bg-muted/60 transition-colors"
            />
          </div>
          <div onClick={() => navigate("/alertes")} className="cursor-pointer">
            <KPICard
              icon={<AlertTriangle className="h-5 w-5" />}
              value={isLoading ? "..." : stats.activeAlerts}
              label="Alertes"
              className="hover:bg-destructive/10 transition-colors"
            />
          </div>
          <div onClick={() => navigate("/historique")} className="cursor-pointer">
            <KPICard
              icon={<RotateCcw className="h-5 w-5" />}
              value={lastUpdate}
              label="Mise à jour"
              className="hover:bg-muted/60 transition-colors"
            />
          </div>
        </div>

        {/* Quick nav */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-14 flex-col gap-1" onClick={() => navigate("/articles")}>
            <FileText className="h-5 w-5" />
            <span className="text-xs">Stocks</span>
          </Button>
          <Button variant="outline" className="h-14 flex-col gap-1" onClick={() => navigate("/historique")}>
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs">Historique</span>
          </Button>
          <Button variant="outline" className="h-14 flex-col gap-1" onClick={() => navigate("/entrees")}>
            <Package className="h-5 w-5" />
            <span className="text-xs">Entrées</span>
          </Button>
          <Button variant="outline" className="h-14 flex-col gap-1" onClick={() => navigate("/parametres")}>
            <Settings className="h-5 w-5" />
            <span className="text-xs">Paramètres</span>
          </Button>
        </div>
      </div>

      <BarcodeScanner
        isOpen={showScanner}
        onScanResult={handleScanResult}
        onClose={() => setShowScanner(false)}
      />
    </DashboardLayout>
  );
}
