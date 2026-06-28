import { useState, useCallback, useRef } from "react";
import { Package, AlertTriangle, ScanLine, Search, PlusCircle, PackageX, ArrowLeftRight, Wrench, ArrowUpFromLine, ArrowDownToLine, PackageCheck } from "lucide-react";
import { KPICard } from "@/components/ui/kpi-card";
import { useRealTimeStats } from "@/hooks/useRealTimeStats";
import { useAlerts } from "@/hooks/useAlerts";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { BarcodeScanner } from "@/components/scanner/BarcodeScanner";
import { QuickStockAction } from "@/components/stock/QuickStockAction";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import DashboardLayout from "./DashboardLayout";
import { cn } from "@/lib/utils";

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

const QUICK_ACTIONS = (navigate: ReturnType<typeof useNavigate>, totalAlerts: number, isMagasinier: boolean) => [
  {
    label: "Entrée stock",
    sub: "Réceptionner",
    icon: <ArrowDownToLine className="h-4 w-4" />,
    iconBg: "bg-success/10",
    iconColor: "text-success",
    onClick: () => navigate("/entrees"),
    show: true,
  },
  {
    label: "Sortie stock",
    sub: "Consommation",
    icon: <ArrowUpFromLine className="h-4 w-4" />,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    onClick: () => navigate("/sorties"),
    show: true,
  },
  {
    label: "Révisions",
    sub: "Véhicule",
    icon: <Wrench className="h-4 w-4" />,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    onClick: () => navigate("/revisions"),
    show: true,
  },
  {
    label: "Alertes",
    sub: totalAlerts > 0 ? `${totalAlerts} rupture${totalAlerts > 1 ? "s" : ""}` : "Tout OK",
    icon: <AlertTriangle className="h-4 w-4" />,
    iconBg: totalAlerts > 0 ? "bg-destructive/10" : "bg-success/10",
    iconColor: totalAlerts > 0 ? "text-destructive" : "text-success",
    badge: totalAlerts > 0 ? totalAlerts : undefined,
    onClick: () => navigate("/alertes"),
    show: true,
  },
  {
    label: "Réceptions",
    sub: "Livraisons",
    icon: <PackageCheck className="h-4 w-4" />,
    iconBg: "bg-accent/10",
    iconColor: "text-accent",
    onClick: () => navigate("/receptions"),
    show: isMagasinier,
  },
  {
    label: "Articles",
    sub: "Catalogue",
    icon: <Package className="h-4 w-4" />,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    onClick: () => navigate("/articles"),
    show: !isMagasinier,
  },
];

export default function Dashboard() {
  const { stats, isLoading } = useRealTimeStats();
  const { totalAlerts } = useAlerts();
  const { profile } = useAuth();
  const { isMagasinier } = useRoleAccess();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [foundArticle, setFoundArticle] = useState<Article | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchArticle = useCallback(async (query: string, fromScan = false) => {
    if (!query.trim()) {
      setSearchResults([]);
      setNotFoundCode(null);
      return;
    }
    const q = query.trim();

    setIsSearching(true);
    setNotFoundCode(null);
    setSearchResults([]);
    try {
      if (fromScan) {
        // Scan : recherche exacte code-barres d'abord
        const numeric = q.replace(/\D/g, "");
        const scanQ = numeric.length >= 8 ? numeric : q;
        const { data: byBarcode } = await supabase
          .from("articles").select("*").eq("code_barre", scanQ).maybeSingle();
        if (byBarcode) { setFoundArticle(byBarcode); return; }
        const { data: byRef } = await supabase
          .from("articles").select("*").eq("reference", scanQ).maybeSingle();
        if (byRef) { setFoundArticle(byRef); return; }
        setNotFoundCode(scanQ);
        return;
      }

      // Recherche live : désignation + référence + marque + code-barres
      const { data } = await supabase
        .from("articles")
        .select("*")
        .is("archived_at", null)
        .or(
          `designation.ilike.%${q}%,reference.ilike.%${q}%,marque.ilike.%${q}%,code_barre.ilike.%${q}%`
        )
        .order("designation", { ascending: true })
        .limit(8);

      if (data && data.length > 0) {
        setSearchResults(data as Article[]);
      } else {
        setNotFoundCode(q);
      }
    } catch {
      toast({ title: "Erreur de recherche", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  }, [toast]);

  // Debounce au fil de la saisie
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setFoundArticle(null);
    setNotFoundCode(null);
    setSearchResults([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) return;
    debounceRef.current = setTimeout(() => {
      searchArticle(value);
    }, 300);
  }, [searchArticle]);

  const handleScanResult = useCallback((code: string) => {
    setShowScanner(false);
    setSearchQuery(code);
    setSearchResults([]);
    searchArticle(code, true);
  }, [searchArticle]);

  const handleReset = useCallback(() => {
    setFoundArticle(null);
    setNotFoundCode(null);
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  if (foundArticle) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto space-y-3">
          {/* Lien vers la fiche complète */}
          <button
            onClick={() => navigate(`/articles/${foundArticle.id}`)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/60 hover:bg-muted transition-colors text-left"
          >
            <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground flex-1 truncate">
              Voir la fiche complète de <strong className="text-foreground">{foundArticle.designation}</strong>
            </span>
            <span className="text-xs text-primary font-medium flex-shrink-0">Ouvrir →</span>
          </button>
          <QuickStockAction article={foundArticle} onBack={handleReset} onComplete={handleReset} />
        </div>
      </DashboardLayout>
    );
  }

  const quickActions = QUICK_ACTIONS(navigate, totalAlerts, isMagasinier()).filter(a => a.show);

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-5 pb-4">

        {/* Greeting */}
        <div className="pt-1">
          <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight leading-tight">
            {profile?.first_name ? (
              <>Bonjour, <span className="gradient-text">{profile.first_name}</span> 👋</>
            ) : (
              <span className="gradient-text">StockAuto Fleet</span>
            )}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Que voulez-vous faire ?</p>
        </div>

        {/* SCAN PILL — glassmorphism orange */}
        <button
          onClick={() => setShowScanner(true)}
          aria-label="Scanner un article"
          className={cn(
            "w-full rounded-2xl p-4 flex items-center gap-3 text-left",
            "bg-gradient-to-r from-primary to-[hsl(20_95%_50%)]",
            "shadow-[0_8px_32px_-4px_hsl(25_95%_53%/0.4)]",
            "animate-glow-pulse",
            "active:scale-[0.98] transition-transform duration-150",
          )}
        >
          <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <ScanLine className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-white leading-tight">Scanner un article</p>
            <p className="text-[12px] text-white/75 mt-0.5">Entrée · Sortie · Identifier</p>
          </div>
          <div className="bg-white/20 rounded-lg px-2 py-1 flex-shrink-0">
            <span className="text-[10px] font-bold text-white tracking-wide">SCAN</span>
          </div>
        </button>

        {/* Live search */}
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Référence, désignation, marque..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { handleReset(); }
                }}
                className="pl-9 pr-4"
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  onClick={handleReset}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Effacer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Résultats live */}
          {(isSearching || searchResults.length > 0) && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
              {isSearching ? (
                <div className="px-4 py-3 text-sm text-muted-foreground animate-pulse">
                  Recherche en cours...
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {searchResults.map((article) => {
                    const isRupture = article.stock === 0;
                    const isFaible = article.stock > 0 && article.stock <= article.stock_min;
                    return (
                      <button
                        key={article.id}
                        onClick={() => {
                          setFoundArticle(article);
                          setSearchResults([]);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                          isRupture ? "bg-destructive/10 text-destructive" :
                          isFaible  ? "bg-warning/10 text-warning" :
                                      "bg-success/10 text-success"
                        }`}>
                          {article.stock}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{article.designation}</p>
                          <p className="text-xs text-muted-foreground truncate">{article.marque} · {article.reference}</p>
                        </div>
                        <span className="text-xs text-primary flex-shrink-0">Sélectionner →</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

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
                  onClick={() => navigate(`/articles/new?code_barre=${encodeURIComponent(notFoundCode!)}&returnTo=/dashboard`)}
                >
                  <PlusCircle className="h-4 w-4 mr-1.5" />
                  Créer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/articles?q=${encodeURIComponent(notFoundCode!)}`)}
                >
                  <Search className="h-4 w-4 mr-1.5" />
                  Rechercher
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setNotFoundCode(null)}>
                Annuler
              </Button>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards — live dot + spring animation */}
        <div className="grid grid-cols-3 gap-3">
          <div onClick={() => navigate("/articles")} className="cursor-pointer">
            <KPICard
              icon={<Package className="h-4 w-4" />}
              value={isLoading ? "—" : stats.totalArticles}
              label="Articles"
              tone="primary"
              index={0}
              live
            />
          </div>
          <div onClick={() => navigate("/alertes")} className="cursor-pointer">
            <KPICard
              icon={<AlertTriangle className="h-4 w-4" />}
              value={isLoading ? "—" : stats.activeAlerts}
              label="Alertes"
              tone="destructive"
              index={1}
              live={stats.activeAlerts > 0}
            />
          </div>
          <div onClick={() => navigate("/historique")} className="cursor-pointer">
            <KPICard
              icon={<ArrowLeftRight className="h-4 w-4" />}
              value={isLoading ? "—" : stats.todayMovements}
              label="Aujourd'hui"
              tone="accent"
              index={2}
              live
            />
          </div>
        </div>

        {/* Quick action cards */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
            Actions rapides
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {quickActions.map((action, i) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className={cn(
                  "relative flex items-center gap-3 p-3 rounded-2xl text-left",
                  "bg-card border border-border/60",
                  "hover:shadow-medium hover:-translate-y-0.5 active:scale-[0.98]",
                  "transition-all duration-200",
                  "opacity-0 [animation-fill-mode:forwards]",
                  "[animation-name:kpi-spring] [animation-duration:500ms]",
                  "[animation-timing-function:cubic-bezier(0.34,1.56,0.64,1)]",
                )}
                style={{ animationDelay: `${(i + 3) * 70}ms` }}
              >
                <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0", action.iconBg, action.iconColor)}>
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground leading-tight">{action.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{action.sub}</p>
                </div>
                {action.badge !== undefined && (
                  <span className="absolute top-2 right-2 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {action.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
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
