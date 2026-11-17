import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "primary" | "accent" | "success" | "alert";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "neutral",
  children,
  ...props
}) => {
  const variantStyles = {
    // Fond crème secondaire, texte gris foncé bleuté
    neutral: "bg-surface-muted text-text-muted border border-border",
    // Bleu marine doux
    primary: "bg-primary/10 text-primary border border-primary/20",
    // Ocre panafricain avec texte bleu marine (jamais de blanc sur ocre !)
    accent: "bg-[#F7E7C4] text-[#232D6B] border border-accent/40 font-semibold",
    // Vert succès
    success: "bg-success text-white",
    // Rouge alerte
    alert: "bg-alert text-white",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-body font-semibold tracking-wide transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
