import { useState } from "react";
import { Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { BarcodeScanner } from "./scanner/BarcodeScanner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SearchWithScannerProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onScan?: (scannedValue: string) => void;
  onArticleNotFound?: (barcode: string) => void;
  returnTo?: string;
  disabled?: boolean;
  className?: string;
}

export const SearchWithScanner = ({
  placeholder = "Chercher...",
  value,
  onChange,
  onScan,
  onArticleNotFound,
  returnTo,
  disabled = false,
  className = ""
}: SearchWithScannerProps) => {
  const [showScanner, setShowScanner] = useState(false);
  const [showNotFoundDialog, setShowNotFoundDialog] = useState(false);
  const [scannedNotFoundCode, setScannedNotFoundCode] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const handleScanSuccess = async (scannedCode: string) => {
    setShowScanner(false);
    
    // Rechercher l'article dans la base de données
    try {
      const { data: articles, error } = await supabase
        .from('articles')
        .select('id, reference, designation, code_barre')
        .or(`reference.ilike.%${scannedCode}%,code_barre.eq.${scannedCode}`);
      
      if (error) throw error;
      
      if (articles && articles.length > 0) {
        // Article trouvé
        const article = articles[0];
        onChange(article.id);
        
        toast({
          title: "✅ Article trouvé",
          description: article.designation,
        });
        
        if (onScan) {
          onScan(scannedCode);
        }
      } else {
        // Article non trouvé
        setScannedNotFoundCode(scannedCode);
        
        if (onArticleNotFound) {
          onArticleNotFound(scannedCode);
        }
        
        setShowNotFoundDialog(true);
      }
    } catch (error) {
      console.error('Erreur lors de la recherche de l\'article:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de rechercher l'article",
        variant: "destructive",
      });
    }
  };
  
  const handleCreateArticle = () => {
    setShowNotFoundDialog(false);
    const currentPath = returnTo || window.location.pathname;
    navigate(`/entrees?sku=${encodeURIComponent(scannedNotFoundCode)}&returnTo=${encodeURIComponent(currentPath)}`);
  };
  
  return (
    <>
      <div className={`flex gap-2 w-full ${className}`}>
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="flex-1 h-11 border-2"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowScanner(true)}
          disabled={disabled}
          className="w-11 h-11 border-2 hover:bg-blue-50"
          title="Scanner article"
        >
          <Camera className="w-5 h-5" />
        </Button>
      </div>
      
      <BarcodeScanner
        isOpen={showScanner}
        onScanResult={handleScanSuccess}
        onClose={() => setShowScanner(false)}
      />
      
      {/* Dialog Article Non Trouvé */}
      <AlertDialog open={showNotFoundDialog} onOpenChange={setShowNotFoundDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>📦 Article non trouvé</AlertDialogTitle>
            <AlertDialogDescription>
              Aucun article avec le code: <strong>{scannedNotFoundCode}</strong>
              <br/><br/>
              Voulez-vous créer cet article?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateArticle}>
              ➕ Créer article
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
