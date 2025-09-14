import DashboardLayout from "./DashboardLayout";
import { CategoriesManagement } from "@/components/categories/CategoriesManagement";

export default function Categories() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Catégories</h1>
          <p className="text-muted-foreground">Gérez les catégories d'articles</p>
        </div>
        
        <CategoriesManagement />
      </div>
    </DashboardLayout>
  );
}