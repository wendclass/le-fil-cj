"use client";

import React, { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatOuagaDate, getDueDateUrgency, getDaysOverdue } from "@/lib/date";

interface DueDateBadgeProps {
  dueDate: string; // YYYY-MM-DD
  className?: string;
}

export const DueDateBadge: React.FC<DueDateBadgeProps> = ({ dueDate, className }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!dueDate) return null;

  // Rendu initial serveur neutre pour éviter toute désynchronisation d'hydratation
  if (!mounted) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill bg-surface-muted text-text-muted border border-border text-xs font-semibold tabular-nums",
          className
        )}
      >
        <Clock className="w-3.5 h-3.5" />
        <span>{formatOuagaDate(dueDate)}</span>
      </span>
    );
  }

  const urgency = getDueDateUrgency(dueDate);

  if (urgency === "overdue") {
    const overdueText = getDaysOverdue(dueDate);
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill bg-[#F2B705] text-[#232D6B] border-[1.5px] border-[#232D6B] text-xs font-bold select-none tabular-nums animate-fade-in-up",
          className
        )}
        title={`Échéance dépassée : ${formatOuagaDate(dueDate)}`}
      >
        <Clock className="w-3.5 h-3.5" />
        <span>En retard ({overdueText || formatOuagaDate(dueDate)})</span>
      </span>
    );
  }

  if (urgency === "urgent") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill bg-[#FFF3C4] text-[#232D6B] border border-[#F2B705] text-xs font-semibold select-none tabular-nums animate-fade-in-up",
          className
        )}
        title={`Échéance proche : ${formatOuagaDate(dueDate)}`}
      >
        <Clock className="w-3.5 h-3.5" />
        <span>Bientôt ({formatOuagaDate(dueDate)})</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill bg-surface-muted text-text-muted border border-border text-xs font-semibold select-none tabular-nums",
        className
      )}
    >
      <Clock className="w-3.5 h-3.5" />
      <span>{formatOuagaDate(dueDate)}</span>
    </span>
  );
};
