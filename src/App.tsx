import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import GlobalErrorBoundary from "@/components/GlobalErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load pages
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Articles = lazy(() => import("./pages/Articles"));
const Revisions = lazy(() => import("./pages/Revisions"));
const Fournisseurs = lazy(() => import("./pages/Fournisseurs"));
const Commandes = lazy(() => import("./pages/Commandes"));
const Entrees = lazy(() => import("./pages/Entrees"));
const Sorties = lazy(() => import("./pages/Sorties"));
const Users = lazy(() => import("./pages/Users"));
const Categories = lazy(() => import("./pages/Categories"));
const Vehicules = lazy(() => import("./pages/Vehicules"));
const Parametres = lazy(() => import("./pages/Parametres"));
const Alertes = lazy(() => import("./pages/Alertes"));
const Inventaire = lazy(() => import("./pages/Inventaire"));
const Rapports = lazy(() => import("./pages/Rapports"));
const RolesPermissions = lazy(() => import("./pages/RolesPermissions"));
const Emplacements = lazy(() => import("./pages/Emplacements"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const JournalAudit = lazy(() => import("./pages/JournalAudit"));
const NotFound = lazy(() => import("./pages/NotFound"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen w-full">
    <div className="space-y-4 w-full max-w-md px-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);

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
              <Suspense fallback={<LoadingFallback />}>
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
              </Suspense>
            </GlobalErrorBoundary>
          </BrowserRouter>
        </div>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
