import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === 'SIGNED_IN') {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signIn = async () => {
    if (!username || !password) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Construire directement l'email à partir du nom d'utilisateur (en minuscules)
      const email = `${username.trim().toLowerCase()}@stock-wise.local`;
      console.log("Connexion avec email dérivé:", email);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Erreur de connexion",
          description: "Nom d'utilisateur ou mot de passe incorrect.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Connexion réussie",
          description: "Bienvenue dans StockAuto !",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo et titre */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-white p-2 rounded-xl shadow-elegant">
              <img src={logo} alt="StockAuto Logo" className="h-12 w-12" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">StockAuto</h1>
          <p className="text-muted-foreground">Gestion de stock pour location automobile</p>
        </div>

        <Card className="shadow-elegant border-border/50">
          <CardHeader className="text-center">
            <CardTitle>Connexion</CardTitle>
            <CardDescription>
              Connectez-vous avec votre nom d'utilisateur
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Nom d'utilisateur</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Entrez votre nom d'utilisateur"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  onKeyDown={(e) => e.key === 'Enter' && signIn()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  onKeyDown={(e) => e.key === 'Enter' && signIn()}
                />
              </div>
              <Button 
                onClick={signIn} 
                className="w-full bg-gradient-primary hover:opacity-90"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Se connecter
              </Button>
            </div>

            {typeof window !== 'undefined' && window.location.search.includes('init=1') && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const res = await fetch('/functions/v1/seed-users', { method: 'POST' });
                      const json = await res.json();
                      if (!res.ok) throw new Error(json.error || 'Erreur inconnue');
                      toast({ title: 'Comptes initialisés', description: 'Réessayez la connexion.' });
                    } catch (e: any) {
                      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
                    }
                  }}
                >
                  Initialiser les comptes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
          <div className="space-y-2">
            <p className="font-semibold">Comptes disponibles :</p>
            <div className="space-y-1 text-xs">
              <p><strong>admin</strong> / administrateur (Administrateur)</p>
              <p><strong>alvin</strong> / alvin123 (Magasinier)</p>
              <p><strong>julie</strong> / julie123 (Magasinier)</p>
              <p><strong>sherman</strong> / sherman123 (Magasinier)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}