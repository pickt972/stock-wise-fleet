import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useAutoLogout } from "@/hooks/useAutoLogout";
import { ThemeProvider } from "next-themes";
import ProtectedRoute from "@/components/ProtectedRoute";
import GlobalErrorBoundary from "@/components/GlobalErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Articles from "./pages/Articles";
import ArticleDetail from "./pages/ArticleDetail";
import ArticlesNew from "./pages/ArticlesNew";
import Operations from "./pages/Operations";
import ScannerHub from "./pages/ScannerHub";
import HistoriqueMouvements from "./pages/HistoriqueMouvements";
import Revisions from "./pages/Revisions";
import Fournisseurs from "./pages/Fournisseurs";
import Commandes from "./pages/Commandes";
import Entrees from "./pages/Entrees";
import Sorties from "./pages/Sorties";
import Users from "./pages/Users";
import Categories from "./pages/Categories";
import Vehicules from "./pages/Vehicules";
import Parametres from "./pages/Parametres";
import Alertes from "./pages/Alertes";
import Inventaire from "./pages/Inventaire";
import Rapports from "./pages/Rapports";
import RolesPermissions from "./pages/RolesPermissions";
import Emplacements from "./pages/Emplacements";
import AuditLogs from "./pages/AuditLogs";
import JournalAudit from "./pages/JournalAudit";
import ArticleHistory from "./pages/ArticleHistory";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  useAutoLogout();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <AuthProvider>
          <div className="w-full overflow-x-hidden">
            <Toaster />
            <Sonner />
          <BrowserRouter>
            <AppContent />
            <GlobalErrorBoundary>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/articles" element={
                    <ProtectedRoute>
                      <Articles />
                    </ProtectedRoute>
                  } />
                  <Route path="/articles/new" element={
                    <ProtectedRoute>
                      <ArticlesNew />
                    </ProtectedRoute>
                  } />
                  <Route path="/articles/:id" element={
                    <ProtectedRoute>
                      <ArticleDetail />
                    </ProtectedRoute>
                  } />
                  <Route path="/operations" element={
                    <ProtectedRoute>
                      <Operations />
                    </ProtectedRoute>
                  } />
                  <Route path="/scanner" element={
                    <ProtectedRoute>
                      <ScannerHub />
                    </ProtectedRoute>
                  } />
                  <Route path="/historique" element={
                    <ProtectedRoute>
                      <HistoriqueMouvements />
                    </ProtectedRoute>
                  } />
              <Route path="/revisions" element={
                <ProtectedRoute>
                  <Revisions />
                </ProtectedRoute>
              } />
              <Route path="/fournisseurs" element={
                <ProtectedRoute>
                  <Fournisseurs />
                </ProtectedRoute>
              } />
              <Route path="/commandes" element={
                <ProtectedRoute>
                  <Commandes />
                </ProtectedRoute>
              } />
              <Route path="/entrees" element={
                <ProtectedRoute>
                  <Entrees />
                </ProtectedRoute>
              } />
              <Route path="/sorties" element={
                <ProtectedRoute>
                  <Sorties />
                </ProtectedRoute>
              } />
              <Route path="/users" element={
                <ProtectedRoute>
                  <Users />
                </ProtectedRoute>
              } />
              <Route path="/categories" element={
                <ProtectedRoute>
                  <Categories />
                </ProtectedRoute>
              } />
              <Route path="/vehicules" element={
                <ProtectedRoute>
                  <Vehicules />
                </ProtectedRoute>
              } />
              <Route path="/parametres" element={
                <ProtectedRoute>
                  <Parametres />
                </ProtectedRoute>
              } />
              <Route path="/alertes" element={
                <ProtectedRoute>
                  <Alertes />
                </ProtectedRoute>
              } />
              <Route path="/inventaire" element={
                <ProtectedRoute>
                  <Inventaire />
                </ProtectedRoute>
              } />
              <Route path="/rapports" element={
                <ProtectedRoute>
                  <Rapports />
                </ProtectedRoute>
              } />
              <Route path="/emplacements" element={
                <ProtectedRoute>
                  <Emplacements />
                </ProtectedRoute>
              } />
              <Route path="/roles-permissions" element={
                <ProtectedRoute>
                  <RolesPermissions />
                </ProtectedRoute>
              } />
              <Route path="/audit-logs" element={
                <ProtectedRoute>
                  <AuditLogs />
                </ProtectedRoute>
              } />
              <Route path="/journal-audit" element={
                <ProtectedRoute>
                  <JournalAudit />
                </ProtectedRoute>
              } />
              <Route path="/historique-articles" element={
                <ProtectedRoute>
                  <ArticleHistory />
                </ProtectedRoute>
              } />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
            </GlobalErrorBoundary>
          </BrowserRouter>
        </div>
      </AuthProvider>
    </TooltipProvider>
  </ThemeProvider>
  </QueryClientProvider>
);

export default App;
