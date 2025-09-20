import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function SecurityAuditAlert() {
  const { userRole } = useAuth();

  if (userRole !== 'admin') return null;

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800">Alerte Sécurité</AlertTitle>
      <AlertDescription className="text-orange-700">
        <strong>Action requise :</strong> La protection anti-fuite de mots de passe est désactivée. 
        Activez-la dans les paramètres Supabase Auth pour renforcer la sécurité.
        <br />
        <a 
          href="https://supabase.com/dashboard/project/besoyrwozpzzhtxliyqz/auth/providers" 
          target="_blank" 
          rel="noopener noreferrer"
          className="underline hover:text-orange-800"
        >
          → Configurer la sécurité des mots de passe
        </a>
      </AlertDescription>
    </Alert>
  );
}