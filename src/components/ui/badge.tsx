import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badge SaaS premium :
 * - variants pleins (default, success, warning, destructive)
 * - variants "soft" (fond très clair, texte coloré) — préférés pour statuts dans tableaux
 * - variant "dot" rendu via un point coloré inline (utiliser <BadgeDot tone="success">…</BadgeDot>)
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 h-[22px] text-[11px] font-semibold tracking-tight transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        success: "border-transparent bg-success text-success-foreground",
        warning: "border-transparent bg-warning text-warning-foreground",
        outline: "text-foreground border-border bg-transparent",

        // Soft tinted (style Linear/Stripe) — recommandé pour tableaux
        soft: "border-transparent bg-muted text-foreground",
        "soft-primary": "border-transparent bg-primary/10 text-primary",
        "soft-success": "border-transparent bg-success/12 text-success",
        "soft-warning": "border-transparent bg-warning/15 text-[hsl(28_90%_38%)] dark:text-warning",
        "soft-destructive": "border-transparent bg-destructive/12 text-destructive",
        "soft-accent": "border-transparent bg-accent/12 text-accent",

        // Backwards-compat (anciens noms utilisés dans le code)
        "tinted-primary": "border-transparent bg-primary/10 text-primary",
        "tinted-success": "border-transparent bg-success/12 text-success",
        "tinted-warning": "border-transparent bg-warning/15 text-[hsl(28_90%_38%)] dark:text-warning",
        "tinted-destructive": "border-transparent bg-destructive/12 text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  /** Affiche un point coloré devant le texte (statut SaaS premium) */
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  // Couleur du point dérivée du variant pour cohérence
  const dotClass =
    variant === "success" || variant === "soft-success" || variant === "tinted-success"
      ? "bg-success"
      : variant === "warning" || variant === "soft-warning" || variant === "tinted-warning"
      ? "bg-warning"
      : variant === "destructive" || variant === "soft-destructive" || variant === "tinted-destructive"
      ? "bg-destructive"
      : variant === "soft-accent"
      ? "bg-accent"
      : "bg-primary";

  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", dotClass)} aria-hidden />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
