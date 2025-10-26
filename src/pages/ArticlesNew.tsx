import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CreateArticleDialog } from "@/components/articles/CreateArticleDialog";
import DashboardLayout from "./DashboardLayout";

export default function ArticlesNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference') || "";
  const returnTo = searchParams.get('returnTo') || "/articles";
  const [dialogOpen, setDialogOpen] = useState(true);

  useEffect(() => {
    // Ouvrir le dialog automatiquement au chargement
    setDialogOpen(true);
  }, []);

  const handleArticleCreated = () => {
    // Rediriger vers la page d'origine après création
    navigate(returnTo);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      // Si l'utilisateur ferme le dialog sans créer, retourner aussi
      navigate(returnTo);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <CreateArticleDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          defaultReference={reference}
          onArticleCreated={handleArticleCreated}
        />
      </div>
    </DashboardLayout>
  );
}
