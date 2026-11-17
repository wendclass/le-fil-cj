"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  User,
  Calendar,
  Check,
  Play,
  ArrowLeft,
  ExternalLink,
  Target,
  FileCheck2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DueDateBadge } from "@/components/ui/DueDateBadge";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";
import { formatOuagaDate } from "@/lib/date";
import type { Profile, Task, Decision, Priority, task_status_type } from "@/types/database";

interface TaskDetailViewProps {
  profile: Profile;
  initialTask: Task;
  assignee: Profile | null;
  decision: Decision | null;
  priority: Priority | null;
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({
  profile,
  initialTask,
  assignee,
  decision,
  priority,
}) => {
  const { showToast } = useToast();
  const isPlanner = profile.role === "planner";
  const [task, setTask] = useState<Task>(initialTask);
  const [isUpdating, setIsUpdating] = useState(false);

  const isMine = task.assignee_id === profile.id;
  const canModify = isMine || isPlanner;

  const handleUpdateStatus = async (newStatus: task_status_type) => {
    if (!canModify) {
      showToast("Tu ne peux modifier que le statut de tes propres tâches.", "error");
      return;
    }

    try {
      setIsUpdating(true);
      const supabase = createClient();

      const { data, error } = await supabase.rpc("update_task_status", {
        p_task_id: task.id,
        p_status: newStatus,
      });

      if (error) {
        showToast(error.message, "error");
        setIsUpdating(false);
        return;
      }

      setTask((prev) => ({
        ...prev,
        status: newStatus,
        completed_at: data.completed_at,
        completed_on_time: data.completed_on_time,
      }));
      setIsUpdating(false);
      showToast(copy.tasks.toastTaskUpdated, "success");
    } catch {
      showToast(copy.app.errorGeneric, "error");
      setIsUpdating(false);
    }
  };

  const assigneeName = assignee
    ? assignee.full_name || assignee.email
    : copy.tasks.formerMemberNotice;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      {/* Bouton retour */}
      <div className="flex items-center gap-3">
        <Link
          href="/taches"
          className="p-2 rounded-full hover:bg-surface-muted text-text-muted hover:text-text transition-colors touch-target-min"
          aria-label="Retour au tableau des tâches"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-accent font-display">
            Tâche #{task.id.slice(0, 8)}
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary tracking-tight">
            Détail de la tâche
          </h1>
        </div>
      </div>

      <Card className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge
            variant={
              task.status === "done"
                ? "success"
                : task.status === "doing"
                ? "primary"
                : "neutral"
            }
          >
            {task.status === "done"
              ? "Terminé"
              : task.status === "doing"
              ? "En cours"
              : "À faire"}
          </Badge>

          <DueDateBadge dueDate={task.due_date} />
        </div>

        {/* Titre et description */}
        <div className="space-y-2">
          <h2 className="font-display font-bold text-xl sm:text-2xl text-text leading-snug">
            {task.title}
          </h2>
          {task.description && (
            <p className="font-body text-base text-text-muted leading-relaxed">
              {task.description}
            </p>
          )}
        </div>

        {/* Détails : Responsable, Priorité, Décision */}
        <div className="border-t border-border pt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between py-1.5 border-b border-border/60">
            <span className="text-text-muted flex items-center gap-1.5">
              <User className="w-4 h-4 text-primary" />
              Responsable
            </span>
            <span className="font-semibold text-text">{assigneeName}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-border/60">
            <span className="text-text-muted flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" />
              Échéance
            </span>
            <span className="font-semibold text-text tabular-nums">
              {formatOuagaDate(task.due_date)}
            </span>
          </div>

          {task.completed_at && (
            <div className="flex items-center justify-between py-1.5 border-b border-border/60">
              <span className="text-text-muted flex items-center gap-1.5">
                <Check className="w-4 h-4 text-success" />
                Terminée le
              </span>
              <span className="font-semibold text-text tabular-nums">
                {formatOuagaDate(task.completed_at)}{" "}
                {task.completed_on_time ? "(dans les délais)" : "(en retard)"}
              </span>
            </div>
          )}

          {priority && (
            <div className="p-3.5 rounded-md bg-[#F7E7C4]/40 border border-accent/40 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold uppercase text-[#232D6B]">
                  Priorité du mois liée
                </span>
                <span className="font-display font-semibold text-sm text-[#232D6B] block">
                  {priority.title}
                </span>
              </div>
              <Target className="w-5 h-5 text-accent shrink-0" />
            </div>
          )}

          {decision && (
            <div className="p-3.5 rounded-md bg-surface-muted border border-border flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold uppercase text-primary">
                  Issue de la décision
                </span>
                <span className="text-xs text-text block line-clamp-1">
                  {decision.text}
                </span>
              </div>
              <Link href={`/decisions/${decision.id}`}>
                <Button variant="secondary" className="text-xs min-h-[34px] py-1 px-3">
                  Voir la décision
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Boutons d'action pour le responsable ou planificateur */}
        {canModify && (
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            {task.status === "todo" && (
              <Button
                variant="primary"
                onClick={() => handleUpdateStatus("doing")}
                isLoading={isUpdating}
              >
                <Play className="w-4 h-4 mr-1.5" />
                <span>{copy.tasks.startTaskButton}</span>
              </Button>
            )}

            {task.status === "doing" && (
              <Button
                variant="primary"
                onClick={() => handleUpdateStatus("done")}
                isLoading={isUpdating}
              >
                <Check className="w-4 h-4 mr-1.5" />
                <span>{copy.tasks.markDoneButton}</span>
              </Button>
            )}

            {task.status === "done" && (
              <Button
                variant="secondary"
                onClick={() => handleUpdateStatus("doing")}
                isLoading={isUpdating}
                className="text-xs"
              >
                Rouvrir la tâche
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
