import { useState, useCallback } from "react";
import { Package, BarChart3, Settings, AlertTriangle, RotateCcw, ScanLine, Search, PlusCircle, PackageX, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
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
        <div className="max-w-lg mx-auto">
          <QuickStockAction article={foundArticle} onBack={handleReset} onComplete={handleReset} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-6">
        {/* Large title iOS */}
        <div className="space-y-1 pt-1">
          <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight leading-tight">
            {profile?.first_name ? `Bonjour, ${profile.first_name} 👋` : "Stock-Wise Fleet"}
          </h1>
          <p className="text-[14px] text-muted-foreground">Scannez un article pour commencer</p>
        </div>

        {/* BIG SCAN BUTTON iOS */}
        <div className="flex flex-col items-center gap-3 py-2">
          <button
            onClick={() => setShowScanner(true)}
            className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-primary text-primary-foreground shadow-elegant hover:shadow-glow active:scale-95 transition-all duration-200 flex items-center justify-center group"
            aria-label="Scanner un article"
          >
            <span className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping opacity-30 pointer-events-none" />
            <span className="absolute inset-[-6px] rounded-full border border-primary/20 pointer-events-none" />
            <ScanLine className="h-12 w-12 sm:h-14 sm:w-14 group-hover:scale-110 transition-transform duration-200" />
          </button>
          <span className="text-[13px] font-medium text-muted-foreground">Touchez pour scanner</span>
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
            className="flex-1"
          />
          <Button
            onClick={() => searchArticle(searchQuery)}
            disabled={isSearching || !searchQuery.trim()}
            size="icon"
            aria-label="Rechercher"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>

        {isSearching && (
          <p className="text-center text-sm text-muted-foreground animate-pulse">Recherche en cours...</p>
        )}

        {notFoundCode && !isSearching && (
          <Card className="border-l-4 border-l-warning animate-in fade-in slide-in-from-bottom-2 duration-200">
            <CardContent className="pt-5 pb-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-warning/15 text-warning flex items-center justify-center flex-shrink-0">
                  <PackageX className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Article introuvable</p>
                  <p className="text-[13px] text-muted-foreground">
                    Code : <span className="font-mono">{notFoundCode}</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="bg-success hover:bg-success/90 text-success-foreground"
                  onClick={() =>
                    navigate(`/articles/new?code_barre=${encodeURIComponent(notFoundCode)}&returnTo=/dashboard`)
                  }
                >
                  <PlusCircle className="h-5 w-5 mr-1.5" />
                  Créer
                </Button>
                <Button variant="outline" onClick={() => setNotFoundCode(null)}>
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPIs iOS-style */}
        <div className="grid grid-cols-3 gap-3">
          <div onClick={() => navigate("/articles")} className="cursor-pointer">
            <KPICard
              icon={<Package className="h-5 w-5" />}
              value={isLoading ? "..." : stats.totalArticles}
              label="Articles"
              tone="primary"
              index={0}
            />
          </div>
          <div onClick={() => navigate("/alertes")} className="cursor-pointer">
            <KPICard
              icon={<AlertTriangle className="h-5 w-5" />}
              value={isLoading ? "..." : stats.activeAlerts}
              label="Alertes"
              tone="destructive"
              index={1}
            />
          </div>
          <div onClick={() => navigate("/historique")} className="cursor-pointer">
            <KPICard
              icon={<RotateCcw className="h-5 w-5" />}
              value={lastUpdate}
              label="Mise à jour"
              tone="muted"
              index={2}
            />
          </div>
        </div>

        {/* Quick nav iOS-style */}
        <div className="grid grid-cols-3 gap-3">
          <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => navigate("/articles")}>
            <Package className="h-5 w-5" />
            <span className="text-[12px] font-medium">Articles</span>
          </Button>
          <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => navigate("/entrees")}>
            <ArrowDownToLine className="h-5 w-5" />
            <span className="text-[12px] font-medium">Entrées</span>
          </Button>
          <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => navigate("/sorties")}>
            <ArrowUpFromLine className="h-5 w-5" />
            <span className="text-[12px] font-medium">Sorties</span>
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
