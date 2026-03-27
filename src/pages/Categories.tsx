import { useSearchParams } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import { CategoriesManagement } from "@/components/categories/CategoriesManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Categories() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "categories";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Catégories</h1>
          <p className="text-muted-foreground">Gérez les catégories et sous-catégories d'articles</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })}>
          <TabsList>
            <TabsTrigger value="categories">Catégories</TabsTrigger>
            <TabsTrigger value="sous-categories">Sous-catégories</TabsTrigger>
          </TabsList>
          <TabsContent value="categories">
            <CategoriesManagement filterType="parents" />
          </TabsContent>
          <TabsContent value="sous-categories">
            <CategoriesManagement filterType="children" />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
