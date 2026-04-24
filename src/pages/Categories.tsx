import DashboardLayout from "./DashboardLayout";
import { CategoriesManagement } from "@/components/categories/CategoriesManagement";

export default function Categories() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Catégories & Sous-catégories
          </h1>
          <p className="text-muted-foreground">
            Glissez-déposez pour réorganiser ou imbriquer une sous-catégorie dans une autre catégorie.
          </p>
        </div>

        <CategoriesManagement />
      </div>
    </DashboardLayout>
  );
}
