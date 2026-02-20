import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import logo from "@/assets/logo.png";

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate("/dashboard");
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === "SIGNED_IN") navigate("/dashboard");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const signIn = async () => {
    if (!email.trim() || !password) {
      toast({ title: "Champs requis", description: "Veuillez remplir l'email et le mot de passe.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      // Si pas de @, ajouter le domaine par défaut
      const finalEmail = email.includes("@") ? email.trim().toLowerCase() : `${email.trim().toLowerCase()}@stock-wise.local`;

      const { error } = await supabase.auth.signInWithPassword({ email: finalEmail, password });

      if (error) {
        toast({ title: "Échec de connexion", description: "Identifiant ou mot de passe incorrect.", variant: "destructive" });
      } else {
        toast({ title: "Bienvenue !", description: "Connexion réussie." });
        navigate("/dashboard", { replace: true });
      }
    } catch {
      toast({ title: "Erreur", description: "Une erreur inattendue s'est produite.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast({ title: "Email requis", description: "Saisissez votre adresse email pour recevoir le lien.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const finalEmail = email.includes("@") ? email.trim().toLowerCase() : `${email.trim().toLowerCase()}@stock-wise.local`;

      const { error } = await supabase.auth.resetPasswordForEmail(finalEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setResetSent(true);
      toast({ title: "Email envoyé", description: "Vérifiez votre boîte mail pour réinitialiser votre mot de passe." });
    } catch {
      toast({ title: "Erreur", description: "Impossible d'envoyer l'email de réinitialisation.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Changer le thème</span>
      </Button>
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="bg-card p-4 rounded-2xl shadow-elegant border border-border/50">
              <img src={logo} alt="StockAuto" className="h-16 w-16" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">StockAuto</h1>
            <p className="text-sm text-muted-foreground">Gestion de stock automobile</p>
          </div>
        </div>

        <Card className="shadow-medium border-border/50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg">
              {isForgotPassword ? "Mot de passe oublié" : "Connexion"}
            </CardTitle>
            <CardDescription>
              {isForgotPassword
                ? "Saisissez votre email pour recevoir un lien de réinitialisation"
                : "Identifiez-vous pour accéder à l'application"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resetSent ? (
              <div className="text-center space-y-4">
                <div className="bg-success-light text-success rounded-lg p-4">
                  <Mail className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">Email envoyé !</p>
                  <p className="text-sm mt-1">Consultez votre boîte mail et suivez le lien.</p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => { setResetSent(false); setIsForgotPassword(false); }}>
                  Retour à la connexion
                </Button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  isForgotPassword ? handleForgotPassword() : signIn();
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="email">Email ou identifiant</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="text"
                      placeholder="exemple@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="pl-10 h-12"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {!isForgotPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <PasswordInput
                        id="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        className="pl-10 h-12"
                        autoComplete="current-password"
                      />
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isForgotPassword ? "Envoyer le lien" : "Se connecter"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(!isForgotPassword); setResetSent(false); }}
                    className="text-sm text-primary hover:underline"
                  >
                    {isForgotPassword ? "Retour à la connexion" : "Mot de passe oublié ?"}
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
