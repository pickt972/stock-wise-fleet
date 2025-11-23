import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard", { replace: true });
      }
    };
    checkUser();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);

    try {
      // L'identifiant peut être un email ou un nom d'utilisateur
      // Si pas d'@, on construit l'email avec le domaine par défaut
      const email = identifier.includes('@') 
        ? identifier 
        : `${identifier.trim().toLowerCase()}@stock-wise.local`;

      const result = await signIn(email, password);
      
      if (result.success) {
        navigate(result.isAdmin ? '/dashboard' : '/dashboard', { replace: true });
      } else {
        setError('Identifiant ou mot de passe incorrect');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError('Identifiant ou mot de passe incorrect');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-white">AL</span>
            </div>
          </div>
          
          <CardTitle className="text-3xl font-bold text-gray-800">
            ALOELOCATION
          </CardTitle>
          <CardDescription className="text-base text-gray-600">
            Suivi des ventes d'assurances
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Identifiant */}
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-sm font-medium">
                Identifiant
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="identifier"
                  type="text"
                  placeholder="Votre identifiant"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-10 h-11 text-base"
                  required
                  disabled={isLoading}
                  autoComplete="username"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500">
                Votre email ou nom d'utilisateur
              </p>
            </div>

            {/* Mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-12 h-11 text-base"
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Message d'erreur */}
            {error && (
              <Alert variant="destructive" className="animate-in fade-in-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Bouton connexion */}
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>

          {/* Aide */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Problème de connexion ?{' '}
              <a
                href="mailto:admin@aloelocation.com"
                className="text-blue-600 hover:underline font-medium"
              >
                Contactez l'administrateur
              </a>
            </p>
          </div>
        </CardContent>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="border-t pt-4">
            <p className="text-center text-xs text-gray-500">
              © 2025 ALOELOCATION - Martinique
            </p>
            <p className="text-center text-xs text-gray-400 mt-1">
              Tous droits réservés
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
