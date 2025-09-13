import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Car, Package, TrendingUp, Users } from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/dashboard");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: Package,
      title: "Gestion des stocks",
      description: "Suivi précis des pièces détachées, huiles, pneus et batteries"
    },
    {
      icon: TrendingUp,
      title: "Analyses avancées",
      description: "Rapports de consommation et optimisation des coûts"
    },
    {
      icon: Users,
      title: "Multi-utilisateurs",
      description: "Gestion des rôles : Admin, Chef d'agence, Magasinier"
    },
    {
      icon: Car,
      title: "Spécialisé automobile",
      description: "Conçu spécifiquement pour la location automobile"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-16 pb-24">
        <div className="text-center space-y-8">
          {/* Logo et titre principal */}
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-2xl shadow-elegant">
                <img src={logo} alt="StockAuto Logo" className="h-12 w-12" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-foreground">
              Stock<span className="text-primary">Auto</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Solution complète de gestion des stocks pour votre entreprise de location automobile
            </p>
          </div>

          {/* CTA Principal */}
          <div className="space-y-4">
            <Button 
              size="lg" 
              className="bg-gradient-primary hover:opacity-90 text-lg px-8 py-3"
              onClick={() => navigate("/auth")}
            >
              Commencer maintenant
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-sm text-muted-foreground">
              Créez votre compte ou connectez-vous
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 pb-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Pourquoi choisir StockAuto ?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Une solution moderne et intuitive pour optimiser la gestion de vos stocks
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="shadow-soft hover:shadow-medium transition-shadow border-border/50">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; 2025 StockAuto. Solution de gestion des stocks automobile.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}