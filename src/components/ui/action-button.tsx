import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const actionButtonVariants = cva(
  "inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-lg font-semibold transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-medium hover:shadow-large",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-medium hover:shadow-large",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-medium hover:shadow-large",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-soft hover:shadow-medium",
        outline: "border-2 border-border bg-background hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        xxl: "h-14 px-6 text-lg", // 56px hauteur
        xl: "h-12 px-6 text-base", // 48px hauteur
        lg: "h-11 px-5 text-base", // 44px hauteur
        default: "h-10 px-4 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "xxl",
    },
  },
);

export interface ActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof actionButtonVariants> {
  asChild?: boolean;
  icon?: React.ReactNode;
}

const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ className, variant, size, asChild = false, icon, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(actionButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {icon && <span className="flex-shrink-0 w-6 h-6">{icon}</span>}
        {children}
      </Comp>
    );
  },
);
ActionButton.displayName = "ActionButton";

export { ActionButton, actionButtonVariants };
