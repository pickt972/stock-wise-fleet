import { useSearchParams } from "react-router-dom";
import { ArticleCreationWizard } from "@/components/articles/ArticleCreationWizard";
import DashboardLayout from "./DashboardLayout";

export default function ArticlesNew() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference") || "";
  const codeBarre = searchParams.get("code_barre") || "";
  const returnTo = searchParams.get("returnTo") || "/articles";

  return (
    <DashboardLayout>
      <ArticleCreationWizard
        defaultReference={reference}
        defaultCodeBarre={codeBarre}
        returnTo={returnTo}
      />
    </DashboardLayout>
  );
}
