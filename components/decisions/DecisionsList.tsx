"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckSquare, Clock, Calendar, Check, AlertCircle, ChevronRight, Users } from "lucide-react";
import { PatternBand } from "@/components/ui/PatternBand";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { copy } from "@/lib/copy";
import { formatOuagaDate, formatValidationRemaining } from "@/lib/date";
import type { Profile, Decision } from "@/types/database";

interface DecisionWithMeta extends Decision {
  total_members: number;
  validated_count: number;
  user_has_validated: boolean;
  meeting_title?: string;
}

interface DecisionsListProps {
  profile: Profile;
  initialDecisions: DecisionWithMeta[];
  defaultTab?: "to_validate" | "all" | "unvalidated";
}

export const DecisionsList: React.FC<DecisionsListProps> = ({
  profile,
  initialDecisions,
  defaultTab,
}) => {
  const isPlanner = profile.role === "planner";
  // Les planificateurs voient par défaut "Non validées"
  const initialSelectedTab = defaultTab || (isPlanner ? "unvalidated" : "to_validate");
  const [tab, setTab] = useState<"to_validate" | "all" | "unvalidated">(initialSelectedTab);

  // Filtres
  const toValidateDecisions = initialDecisions.filter(
    (d) => !d.user_has_validated
  );
  const unvalidatedDecisions = initialDecisions.filter(
    (d) => d.validated_count < d.total_members
  );

  const displayedList =
    tab === "to_validate"
      ? toValidateDecisions
      : tab === "unvalidated"
      ? unvalidatedDecisions
      : initialDecisions;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary tracking-tight">
          {copy.decisions.title}
        </h1>
        <p className="font-body text-base text-text-muted mt-1">
          {copy.decisions.subtitle}
        </p>
      </div>

      {/* Onglets */}
      <div className="flex border-b border-border gap-2 overflow-x-auto" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "to_validate"}
          onClick={() => setTab("to_validate")}
          className={`py-3 px-4 font-display font-semibold text-sm border-b-2 transition-colors touch-target-min whitespace-nowrap ${
            tab === "to_validate"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          {copy.decisions.tabToValidate}
          <span className="ml-2 text-xs font-normal tabular-nums">
            ({toValidateDecisions.length})
          </span>
        </button>

        {isPlanner && (
          <button
            type="button"
            role="tab"
            aria-selected={tab === "unvalidated"}
            onClick={() => setTab("unvalidated")}
            className={`py-3 px-4 font-display font-semibold text-sm border-b-2 transition-colors touch-target-min whitespace-nowrap ${
              tab === "unvalidated"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {copy.decisions.tabUnvalidated}
            <span className="ml-2 text-xs font-normal tabular-nums">
              ({unvalidatedDecisions.length})
            </span>
          </button>
        )}

        <button
          type="button"
          role="tab"
          aria-selected={tab === "all"}
          onClick={() => setTab("all")}
          className={`py-3 px-4 font-display font-semibold text-sm border-b-2 transition-colors touch-target-min whitespace-nowrap ${
            tab === "all"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          {copy.decisions.tabAll}
          <span className="ml-2 text-xs font-normal tabular-nums">
            ({initialDecisions.length})
          </span>
        </button>
      </div>

      {/* Liste des cartes */}
      {displayedList.length === 0 ? (
        <Card className="text-center py-12 px-6 space-y-4 overflow-hidden relative border-dashed">
          <PatternBand height={36} opacity={0.1} />
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto">
            <CheckSquare className="w-6 h-6" />
          </div>
          <p className="text-sm text-text-muted max-w-sm mx-auto">
            {tab === "to_validate"
              ? copy.decisions.emptyToValidate
              : tab === "unvalidated"
              ? copy.decisions.emptyUnvalidated
              : copy.decisions.emptyAll}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {displayedList.map((decision) => {
            const percent =
              decision.total_members > 0
                ? Math.round((decision.validated_count / decision.total_members) * 100)
                : 0;

            const remainingText = formatValidationRemaining(decision.validation_deadline);
            const isDeadlineExpired = remainingText === "Délai dépassé";

            return (
              <Link
                key={decision.id}
                href={`/decisions/${decision.id}`}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
              >
                <Card className="p-5 hover:border-primary/40 transition-all space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <h2 className="font-display font-bold text-base sm:text-lg text-primary leading-snug">
                        {decision.text}
                      </h2>
                      {decision.meeting_title && (
                        <span className="text-xs text-text-muted flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Réunion : {decision.meeting_title}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {decision.user_has_validated ? (
                        <Badge variant="success">
                          <Check className="w-3 h-3 mr-1" />
                          Validé par toi
                        </Badge>
                      ) : isDeadlineExpired ? (
                        <Badge variant="alert">{copy.decisions.deadlineExpiredBadge}</Badge>
                      ) : (
                        <Badge variant="accent">{remainingText}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Barre d'avancement des validations */}
                  <div className="space-y-1.5 pt-2 border-t border-border">
                    <div className="flex items-center justify-between text-xs text-text-muted">
                      <span>
                        {copy.decisions.validationProgress(
                          decision.validated_count,
                          decision.total_members
                        )}
                      </span>
                      <span className="font-semibold tabular-nums text-primary">{percent} %</span>
                    </div>

                    <div className="w-full h-2 rounded-pill bg-surface-muted overflow-hidden border border-border">
                      <div
                        className="h-full bg-success rounded-pill transition-all duration-base"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
