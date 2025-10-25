import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { Camera, Minus, ClipboardList, ShoppingCart, CheckSquare, Plus } from "lucide-react";
import DashboardLayout from "./DashboardLayout";

export default function Operations() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <PageHeader title="Opérations" showBackButton />
        
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">
          {/* Consulter avec scan */}
          <ActionButton
            variant="primary"
            size="xxl"
            className="w-full"
            icon={<Camera className="h-6 w-6" />}
            onClick={() => navigate('/scanner', { state: { mode: 'CONSULTER' } })}
          >
            Consulter (scan)
          </ActionButton>

          {/* Sortie stock avec scan */}
          <ActionButton
            variant="warning"
            size="xxl"
            className="w-full"
            icon={<Minus className="h-6 w-6" />}
            onClick={() => navigate('/scanner', { state: { mode: 'SORTIE' } })}
          >
            Sortie stock (scan)
          </ActionButton>

          {/* Inventaire avec scan */}
          <ActionButton
            variant="primary"
            size="xxl"
            className="w-full"
            icon={<ClipboardList className="h-6 w-6" />}
            onClick={() => navigate('/scanner', { state: { mode: 'INVENTAIRE' } })}
          >
            Inventaire (scan)
          </ActionButton>

          {/* Commande avec scan */}
          <ActionButton
            variant="success"
            size="xxl"
            className="w-full"
            icon={<ShoppingCart className="h-6 w-6" />}
            onClick={() => navigate('/scanner', { state: { mode: 'COMMANDE' } })}
          >
            Commande (scan)
          </ActionButton>

          {/* Révision avec scan */}
          <ActionButton
            variant="primary"
            size="xxl"
            className="w-full"
            icon={<CheckSquare className="h-6 w-6" />}
            onClick={() => navigate('/scanner', { state: { mode: 'REVISION' } })}
          >
            Révision (scan)
          </ActionButton>

          {/* Ajouter manuel (sans scan) */}
          <ActionButton
            variant="secondary"
            size="xxl"
            className="w-full"
            icon={<Plus className="h-6 w-6" />}
            onClick={() => navigate('/entrees')}
          >
            Ajouter manuel
          </ActionButton>
        </div>
      </div>
    </DashboardLayout>
  );
}
