import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Input style iOS :
 * - hauteur 44px (cible tactile HIG)
 * - rounded-xl, fond muted léger pour ressembler aux champs iOS
 * - text-[16px] sur mobile pour éviter le zoom auto Safari
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, autoComplete, ...props }, ref) => {
    // Active l'autocomplétion par défaut sur tous les inputs.
    // Pour les champs sensibles (mots de passe, OTP...), passer explicitement autoComplete="off" ou "new-password".
    const resolvedAutoComplete =
      autoComplete ?? (type === "password" ? "current-password" : "on");
    return (
      <input
        type={type}
        autoComplete={resolvedAutoComplete}
        className={cn(
          "flex h-11 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-[16px] md:text-[15px] ring-offset-background transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground/70",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
