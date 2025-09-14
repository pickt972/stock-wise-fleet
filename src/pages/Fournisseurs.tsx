import { FournisseursManagement } from "@/components/fournisseurs/FournisseursManagement";
import DashboardLayout from "./DashboardLayout";

export default function Fournisseurs() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <FournisseursManagement />
      </div>
    </DashboardLayout>
  );
}