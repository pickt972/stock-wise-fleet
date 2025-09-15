import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Articles from "./pages/Articles";
import Fournisseurs from "./pages/Fournisseurs";
import Commandes from "./pages/Commandes";
import Entrees from "./pages/Entrees";
import Sorties from "./pages/Sorties";
import Auth from "./pages/Auth";
import Users from "./pages/Users";
import Categories from "./pages/Categories";
import Vehicules from "./pages/Vehicules";
import Parametres from "./pages/Parametres";
import Alertes from "./pages/Alertes";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
