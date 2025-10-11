import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import GlobalErrorBoundary from "@/components/GlobalErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Articles from "./pages/Articles";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <div className="w-full overflow-x-hidden">
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <GlobalErrorBoundary>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
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
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
            </GlobalErrorBoundary>
          </BrowserRouter>
        </div>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
