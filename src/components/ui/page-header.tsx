import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ActionButton } from "./action-button";

interface PageHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
  children?: React.ReactNode;
}

export function PageHeader({ title, showBackButton = false, onBack, children }: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="border-b border-border bg-card sticky top-0 z-10 shadow-soft">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <ActionButton
              variant="outline"
              size="lg"
              icon={<ArrowLeft className="h-5 w-5" />}
              onClick={handleBack}
              className="flex-shrink-0"
            />
          )}
          <h1 className="text-2xl font-semibold text-foreground flex-1 min-w-0 truncate">
            {title}
          </h1>
          {children}
        </div>
      </div>
    </div>
  );
}
