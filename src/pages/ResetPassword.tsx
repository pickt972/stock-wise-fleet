import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, CheckCircle } from "lucide-react";
import logo from "@/assets/logo.png";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      toast({ title: "Lien invalide", description: "Ce lien de réinitialisation est invalide ou expiré.", variant: "destructive" });
    }
  }, [toast]);

  const handleReset = async () => {
    if (!password || password.length < 6) {
      toast({ title: "Mot de passe trop court", description: "Minimum 6 caractères.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccess(true);
      toast({ title: "Mot de passe mis à jour", description: "Vous pouvez maintenant vous connecter." });
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le mot de passe.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="bg-card p-4 rounded-2xl shadow-elegant border border-border/50">
              <img src={logo} alt="StockAuto" className="h-16 w-16" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">StockAuto</h1>
        </div>

        <Card className="shadow-medium border-border/50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg">Nouveau mot de passe</CardTitle>
            <CardDescription>Choisissez un nouveau mot de passe sécurisé</CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center space-y-4">
                <div className="bg-success-light text-success rounded-lg p-4">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">Mot de passe modifié !</p>
                </div>
                <Button className="w-full h-12" onClick={() => navigate("/auth")}>
                  Se connecter
                </Button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleReset(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nouveau mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                    <PasswordInput
                      placeholder="Minimum 6 caractères"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="pl-10 h-12"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                    <PasswordInput
                      placeholder="Confirmez votre mot de passe"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      className="pl-10 h-12"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Mettre à jour
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
