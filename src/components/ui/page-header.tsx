import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  children?: React.ReactNode;
  /** Variant iOS large title (titre 34pt sous la nav) */
  variant?: "default" | "large";
  className?: string;
}

/**
 * En-tête de page style iOS :
 * - "default" : barre fine sticky avec back, titre central, action droite
 * - "large" : large title (34pt) iOS sous la nav, idéal pour pages d'index
 */
export function PageHeader({
  title,
  subtitle,
  showBackButton = false,
  onBack,
  children,
  variant = "default",
  className,
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  if (variant === "large") {
    return (
      <div className={cn("mb-4", className)}>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          {showBackButton && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-0.5 -ml-1 text-primary text-[15px] font-medium active:opacity-60 transition-opacity"
              aria-label="Retour"
            >
              <ChevronLeft className="h-5 w-5" />
              Retour
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">{children}</div>
        </div>
        <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="text-[14px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 mb-4 min-h-[44px]", className)}>
      {showBackButton && (
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-0.5 -ml-1 text-primary text-[15px] font-medium active:opacity-60 transition-opacity"
          aria-label="Retour"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="hidden sm:inline">Retour</span>
        </button>
      )}
      <h1 className="text-[20px] sm:text-[22px] font-semibold text-foreground flex-1 min-w-0 truncate tracking-tight">
        {title}
      </h1>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
