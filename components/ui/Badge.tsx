import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "primary" | "accent" | "success" | "alert" | "yellow" | "yellow-soft" | "green" | "green-soft";
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
    // Jaune soleil avec texte bleu marine
    accent: "bg-[#FFF3C4] text-[#232D6B] border border-[#F2B705] font-semibold",
    yellow: "bg-[#F2B705] text-[#232D6B] border-[1.5px] border-[#232D6B] font-bold",
    "yellow-soft": "bg-[#FFF3C4] text-[#232D6B] border border-[#F2B705] font-semibold",
    // Vert succès
    success: "bg-[#187A4C] text-white font-medium",
    green: "bg-[#187A4C] text-white font-medium",
    "green-soft": "bg-[#E1F3E8] text-[#0F4D30] border border-[#2DB36B]/30 font-semibold",
    // Remplacement du rouge par le jaune avec bordure marine
    alert: "bg-[#F2B705] text-[#232D6B] border-[1.5px] border-[#232D6B] font-bold",
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
