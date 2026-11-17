import React from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";

interface ImprovisedBadgeProps {
  className?: string;
}

export const ImprovisedBadge: React.FC<ImprovisedBadgeProps> = ({ className }) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-[#FFF3C4] text-[#232D6B] border border-[#F2B705] text-xs font-body font-semibold tracking-wide select-none",
        className
      )}
      title="Réunion convoquée moins de 24 h à l’avance ou sans ordre du jour validé au démarrage."
    >
      <Zap className="w-3.5 h-3.5 fill-current" />
      <span>{copy.meetings.improvisedBadge}</span>
    </span>
  );
};
