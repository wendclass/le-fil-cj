"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CheckSquare,
  Calendar,
  Clock,
  CheckCircle2,
  Check,
  AlertCircle,
  User,
  Users,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DueDateBadge } from "@/components/ui/DueDateBadge";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";
import { formatOuagaDate, formatOuagaDateTime, formatValidationRemaining } from "@/lib/date";
import type { Profile, Decision, Task, DecisionValidation, Meeting } from "@/types/database";

interface DecisionDetailViewProps {
  profile: Profile;
  initialDecision: Decision;
  meeting: Meeting | null;
  tasks: Task[];
  validations: DecisionValidation[];
  allProfiles: Profile[];
}

export const DecisionDetailView: React.FC<DecisionDetailViewProps> = ({
  profile,
  initialDecision,
  meeting,
  tasks,
  validations,
  allProfiles,
}) => {
  const { showToast } = useToast();
  const isPlanner = profile.role === "planner";

  const [decision, setDecision] = useState<Decision>(initialDecision);
  const [localValidations, setLocalValidations] = useState<DecisionValidation[]>(validations);
  const [isValidating, setIsValidating] = useState(false);
  const [validatedSuccess, setValidatedSuccess] = useState(false);

  // Vérifier si l'utilisateur connecté a déjà validé
  const myValidation = localValidations.find((v) => v.user_id === profile.id);
  const hasValidated = Boolean(myValidation);

  // Calcul du délai
  const remainingText = formatValidationRemaining(decision.validation_deadline);
  const isDeadlineExpired = remainingText === "Délai dépassé";

  // Membres ayant validé vs non validé
  const validatedUserIds = new Set(localValidations.map((v) => v.user_id));
  const validatedProfiles = allProfiles.filter((p) => validatedUserIds.has(p.id));
  const unvalidatedProfiles = allProfiles.filter((p) => !validatedUserIds.has(p.id));

  // Valider la décision (idempotent, confirmation avec coche animée de 300 ms)
  const handleValidate = async () => {
    if (hasValidated || isValidating) return;

    try {
      setIsValidating(true);
      const supabase = createClient();
      const nowIso = new Date().toISOString();

      const { error } = await supabase.from("decision_validations").upsert(
        {
          decision_id: decision.id,
          user_id: profile.id,
          validated_at: nowIso,
        },
        { onConflict: "decision_id,user_id" }
      );

      if (error) {
        showToast(error.message, "error");
        setIsValidating(false);
        return;
      }

      setValidatedSuccess(true);
      setTimeout(() => {
        setLocalValidations((prev) => [
          ...prev,
          { decision_id: decision.id, user_id: profile.id, validated_at: nowIso },
        ]);
        setIsValidating(false);
        setValidatedSuccess(false);
        showToast("Décision validée.", "success");
      }, 300);
    } catch {
      showToast(copy.app.errorGeneric, "error");
      setIsValidating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      {/* Bouton retour */}
      <div className="flex items-center gap-3">
        <Link
          href="/decisions"
          className="p-2 rounded-full hover:bg-surface-muted text-text-muted hover:text-text transition-colors touch-target-min"
          aria-label="Retour au registre des décisions"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-accent font-display">
            Décision #{decision.id.slice(0, 8)}
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary tracking-tight">
            Détail de la décision
          </h1>
        </div>
      </div>

      {/* Carte principale de la décision */}
      <Card className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="primary">
            Publiée le {decision.published_at ? formatOuagaDate(decision.published_at) : "Récemment"}
          </Badge>

          {hasValidated ? (
            <Badge variant="success">
              <Check className="w-3.5 h-3.5 mr-1" />
              {copy.decisions.validatedByUser(
                myValidation ? formatOuagaDateTime(myValidation.validated_at) : ""
              )}
            </Badge>
          ) : isDeadlineExpired ? (
            <Badge variant="alert">{copy.decisions.deadlineExpiredBadge}</Badge>
          ) : (
            <Badge variant="accent">{remainingText}</Badge>
          )}
        </div>

        {/* Texte complet */}
        <div className="space-y-2">
          <p className="font-display font-bold text-xl sm:text-2xl text-text leading-snug">
            {decision.text}
          </p>
        </div>

        {/* Réunion d'origine */}
        {meeting && (
          <div className="p-4 rounded-md bg-surface-muted border border-border flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-text-muted block">
                Adoptée lors de la réunion
              </span>
              <span className="font-semibold text-sm text-text">
                {meeting.title}
              </span>
            </div>
            <Link href={`/reunions/${meeting.id}`}>
              <Button variant="secondary" className="text-xs min-h-[36px] py-1 px-3">
                <span>Voir la séance</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        )}

        {/* Bouton unique de validation pour membre (pas de contestation) */}
        {!hasValidated && (
          <div className="pt-2 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-text-muted">
              Valide que tu as pris connaissance de cette décision.
            </p>

            <Button
              variant="primary"
              onClick={handleValidate}
              isLoading={isValidating}
              className={`min-h-[48px] px-8 text-base transition-transform duration-300 ${
                validatedSuccess ? "scale-105 bg-success text-white" : ""
              }`}
            >
              {validatedSuccess ? (
                <Check className="w-5 h-5 text-white" />
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1.5" />
                  <span>{copy.decisions.validateButton}</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* Étiquette après deadline si non validée par tous */}
        {isDeadlineExpired && unvalidatedProfiles.length > 0 && (
          <div className="p-3.5 rounded-md bg-alert/10 border border-alert/30 text-alert text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {copy.decisions.unvalidatedByCount(unvalidatedProfiles.length)}
            </span>
          </div>
        )}
      </Card>

      {/* Tâches associées à cette décision */}
      {tasks.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display font-bold text-lg text-primary">
            {copy.decisions.linkedTasks} ({tasks.length})
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tasks.map((task) => (
              <Link key={task.id} href={`/taches/${task.id}`}>
                <Card className="p-4 hover:border-primary/40 space-y-2">
                  <span className="font-semibold text-sm text-text block line-clamp-2">
                    {task.title}
                  </span>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <DueDateBadge dueDate={task.due_date} />
                    <Badge variant={task.status === "done" ? "success" : "neutral"}>
                      {task.status === "done" ? "Terminé" : task.status === "doing" ? "En cours" : "À faire"}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Suivi nominatif des validations pour les PLANIFICATEURS */}
      {isPlanner && (
        <section className="space-y-4 pt-4 border-t border-border">
          <h2 className="font-display font-bold text-xl text-primary">
            Suivi des validations des membres ({localValidations.length}/{allProfiles.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ont validé */}
            <Card className="p-5 space-y-3">
              <h3 className="font-display font-bold text-sm text-success flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{copy.decisions.validatedListTitle} ({validatedProfiles.length})</span>
              </h3>

              {validatedProfiles.length === 0 ? (
                <p className="text-xs text-text-muted italic">Aucun membre pour le moment.</p>
              ) : (
                <div className="space-y-2">
                  {validatedProfiles.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-md bg-surface-muted border border-border flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-text">{p.full_name || p.email}</span>
                      <span className="text-[11px] text-text-muted">
                        {p.role === "planner" ? "Planificateur" : "Membre"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* N'ont pas encore validé */}
            <Card className="p-5 space-y-3">
              <h3 className="font-display font-bold text-sm text-alert flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>{copy.decisions.notValidatedListTitle} ({unvalidatedProfiles.length})</span>
              </h3>

              {unvalidatedProfiles.length === 0 ? (
                <p className="text-xs text-text-muted italic">Tous les membres ont validé !</p>
              ) : (
                <div className="space-y-2">
                  {unvalidatedProfiles.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-md bg-alert/5 border border-alert/20 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-text">{p.full_name || p.email}</span>
                      <span className="text-[11px] text-text-muted">
                        {p.role === "planner" ? "Planificateur" : "Membre"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </section>
      )}
    </div>
  );
};
