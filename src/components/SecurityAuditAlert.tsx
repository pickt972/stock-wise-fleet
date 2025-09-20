import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function SecurityAuditAlert() {
  const { userRole } = useAuth();
  const [isVisible, setIsVisible] = useState(true);

  if (userRole !== 'admin' || !isVisible) return null;

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800 flex items-center justify-between">
        Information Sécurité
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(false)}
          className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription className="text-orange-700">
        <strong>Information :</strong> La protection anti-fuite de mots de passe est une fonctionnalité avancée 
        qui nécessite un plan Supabase Team ou Enterprise.
        <br />
        <a 
          href="https://supabase.com/pricing" 
          target="_blank" 
          rel="noopener noreferrer"
          className="underline hover:text-orange-800"
        >
          → Voir les plans Supabase
        </a>
      </AlertDescription>
    </Alert>
  );
}