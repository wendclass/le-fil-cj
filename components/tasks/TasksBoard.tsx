"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  Clock,
  Plus,
  Filter,
  Check,
  Play,
  Calendar,
  AlertCircle,
  FileCheck2,
  User,
  Target,
} from "lucide-react";
import { PatternBand } from "@/components/ui/PatternBand";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { DueDateBadge } from "@/components/ui/DueDateBadge";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";
import { formatOuagaDate } from "@/lib/date";
import type { Profile, Task, Priority, Decision, task_status_type } from "@/types/database";

interface TaskWithAssignee extends Task {
  assignee?: Profile;
}

interface TasksBoardProps {
  profile: Profile;
  initialTasks: TaskWithAssignee[];
  allProfiles: Profile[];
  activePriority: Priority | null;
  decisions: Decision[];
}

export const TasksBoard: React.FC<TasksBoardProps> = ({
  profile,
  initialTasks,
  allProfiles,
  activePriority,
  decisions,
}) => {
  const { showToast } = useToast();
  const isPlanner = profile.role === "planner";

  const [tasks, setTasks] = useState<TaskWithAssignee[]>(initialTasks);
  // Vue par défaut : "Mes tâches" pour membre, "Toutes" pour planificateur
  const [scopeTab, setScopeTab] = useState<"mine" | "all">(isPlanner ? "all" : "mine");
  // Onglet mobile
  const [mobileStatusTab, setMobileStatusTab] = useState<task_status_type>("todo");
  // Filtre par responsable pour planificateur
  const [filterAssignee, setFilterAssignee] = useState<string>("all");

  // Modale création tâche
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState<string>(profile.id);
  const [selectedDueDate, setSelectedDueDate] = useState<string>("");
  const [selectedDecisionId, setSelectedDecisionId] = useState<string>("");
  const [isPriorityChecked, setIsPriorityChecked] = useState<boolean>(Boolean(activePriority));
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Filtrer les tâches selon le scope (Mes tâches ou Toutes) et l'assignataire sélectionné
  const scopedTasks = tasks.filter((t) => {
    if (scopeTab === "mine" && t.assignee_id !== profile.id) return false;
    if (scopeTab === "all" && filterAssignee !== "all" && t.assignee_id !== filterAssignee)
      return false;
    return true;
  });

  const todoTasks = scopedTasks.filter((t) => t.status === "todo");
  const doingTasks = scopedTasks.filter((t) => t.status === "doing");
  const doneTasks = scopedTasks.filter((t) => t.status === "done");

  // Déplacement de tâche / changement de statut via update_task_status
  const handleUpdateStatus = async (taskId: string, newStatus: task_status_type) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    // Règle d'autorisation : seul le responsable ou un planificateur peut modifier
    if (targetTask.assignee_id !== profile.id && !isPlanner) {
      showToast("Tu ne peux modifier que le statut de tes propres tâches.", "error");
      return;
    }

    // Mise à jour optimiste
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("update_task_status", {
        p_task_id: taskId,
        p_status: newStatus,
      });

      if (error) {
        showToast(error.message, "error");
        // Revert optimiste
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: targetTask.status } : t))
        );
        return;
      }

      showToast(copy.tasks.toastTaskUpdated, "success");
    } catch {
      showToast(copy.app.errorGeneric, "error");
    }
  };

  // Drag and drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string, taskAssigneeId: string) => {
    if (taskAssigneeId !== profile.id && !isPlanner) {
      e.preventDefault();
      return;
    }
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: task_status_type) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (taskId) {
      handleUpdateStatus(taskId, targetStatus);
    }
    setDraggedTaskId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Création d'une nouvelle tâche par le planificateur
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!taskTitle.trim()) {
      setCreateError("Le titre de la tâche est obligatoire.");
      return;
    }

    if (!selectedAssignee) {
      setCreateError("Veuillez sélectionner un responsable.");
      return;
    }

    if (!selectedDueDate) {
      setCreateError(copy.tasks.dueDateLabel);
      return;
    }

    // Vérifier que l'échéance est dans le futur
    const todayStr = new Date().toISOString().split("T")[0];
    if (selectedDueDate < todayStr) {
      setCreateError(copy.tasks.futureDateError);
      return;
    }

    try {
      setIsCreating(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title: taskTitle.trim(),
          description: taskDesc.trim() || null,
          assignee_id: selectedAssignee,
          due_date: selectedDueDate,
          decision_id: selectedDecisionId || null,
          priority_id: isPriorityChecked && activePriority ? activePriority.id : null,
          status: "todo",
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) {
        setCreateError(error.message);
        setIsCreating(false);
        return;
      }

      const assigneeProfile = allProfiles.find((p) => p.id === selectedAssignee);
      const newTask = { ...(data as Task), assignee: assigneeProfile };

      // Notification instantanée pour le responsable
      fetch("/api/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "task_assigned",
          data: {
            id: data.id,
            title: data.title,
            assigneeId: data.assignee_id,
            dueDateStr: formatOuagaDate(data.due_date),
          },
        }),
      }).catch((err) => console.warn("Erreur broadcast task :", err));

      setTasks((prev) => [newTask, ...prev]);
      setShowCreateModal(false);
      setTaskTitle("");
      setTaskDesc("");
      setSelectedDueDate("");
      setSelectedDecisionId("");
      setIsCreating(false);
      showToast("Tâche créée avec succès.", "success");
    } catch {
      setCreateError(copy.app.errorGeneric);
      setIsCreating(false);
    }
  };

  // Rendu d'une carte de tâche
  const renderTaskCard = (task: TaskWithAssignee) => {
    const isMine = task.assignee_id === profile.id;
    const canMove = isMine || isPlanner;
    const assigneeName = task.assignee
      ? task.assignee.full_name || task.assignee.email
      : copy.tasks.formerMemberNotice;

    return (
      <div
        key={task.id}
        draggable={canMove}
        onDragStart={(e) => handleDragStart(e, task.id, task.assignee_id)}
        className={`p-4 rounded-md bg-white border border-border shadow-1 space-y-3 transition-all ${
          canMove ? "cursor-grab active:cursor-grabbing hover:border-primary/40 hover:-translate-y-0.5" : "cursor-default"
        }`}
      >
        <div className="space-y-1.5">
          <Link
            href={`/taches/${task.id}`}
            className="font-display font-semibold text-sm text-text hover:underline block leading-snug"
          >
            {task.title}
          </Link>
          {task.description && (
            <p className="text-xs text-text-muted line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
          <DueDateBadge dueDate={task.due_date} />

          {task.priority_id && (
            <Badge variant="accent" className="text-[10px] py-0 px-2">
              <Target className="w-3 h-3 mr-1" />
              {copy.tasks.priorityBadge}
            </Badge>
          )}
        </div>

        {/* Responsable & Actions rapides mobiles */}
        <div className="flex items-center justify-between gap-2 pt-1 text-xs text-text-muted">
          <span className="truncate flex items-center gap-1 font-medium text-text">
            <User className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span className="truncate">{assigneeName}</span>
          </span>

          {/* Boutons d'action rapides */}
          {canMove && (
            <div className="flex items-center gap-1 shrink-0">
              {task.status === "todo" && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(task.id, "doing")}
                  className="px-2 py-1 rounded-pill bg-surface-muted hover:bg-primary/10 text-primary font-semibold text-[11px] touch-target-min flex items-center gap-1"
                  title="Démarrer la tâche"
                >
                  <Play className="w-3 h-3" />
                  <span>{copy.tasks.startTaskButton}</span>
                </button>
              )}
              {task.status === "doing" && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(task.id, "done")}
                  className="px-2 py-1 rounded-pill bg-success/15 hover:bg-success/25 text-success font-semibold text-[11px] touch-target-min flex items-center gap-1"
                  title="Terminer la tâche"
                >
                  <Check className="w-3 h-3" />
                  <span>{copy.tasks.markDoneButton}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary tracking-tight">
            {copy.tasks.title}
          </h1>
          <p className="font-body text-base text-text-muted mt-1">
            {copy.tasks.subtitle}
          </p>
        </div>

        {isPlanner && (
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>{copy.tasks.newTaskButton}</span>
          </Button>
        )}
      </div>

      {/* Barre de filtres (Mes tâches / Toutes + sélection responsable pour planificateur) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-md bg-white border border-border shadow-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScopeTab("mine")}
            className={`px-4 py-2 rounded-pill text-xs font-semibold transition-all touch-target-min ${
              scopeTab === "mine"
                ? "bg-primary text-white shadow-1"
                : "bg-surface-muted text-text hover:bg-surface-muted/80"
            }`}
          >
            {copy.tasks.tabMyTasks} ({tasks.filter((t) => t.assignee_id === profile.id).length})
          </button>

          <button
            type="button"
            onClick={() => setScopeTab("all")}
            className={`px-4 py-2 rounded-pill text-xs font-semibold transition-all touch-target-min ${
              scopeTab === "all"
                ? "bg-primary text-white shadow-1"
                : "bg-surface-muted text-text hover:bg-surface-muted/80"
            }`}
          >
            {copy.tasks.tabAllTasks} ({tasks.length})
          </button>
        </div>

        {/* Filtre planificateur par responsable */}
        {isPlanner && scopeTab === "all" && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-text-muted" />
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="min-h-[38px] px-3 py-1 bg-surface-muted text-text text-xs rounded-pill border border-border focus-visible:outline-none"
            >
              <option value="all">Tous les responsables</option>
              {allProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.email}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* VUE MOBILE : Onglets segmentés sans drag and drop */}
      <div className="block md:hidden space-y-4">
        <div className="grid grid-cols-3 gap-1 p-1 bg-surface-muted rounded-pill border border-border">
          <button
            type="button"
            onClick={() => setMobileStatusTab("todo")}
            className={`py-2 px-1 text-xs font-semibold rounded-pill transition-all touch-target-min ${
              mobileStatusTab === "todo" ? "bg-white text-primary shadow-1" : "text-text-muted"
            }`}
          >
            {copy.tasks.colTodo} ({todoTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileStatusTab("doing")}
            className={`py-2 px-1 text-xs font-semibold rounded-pill transition-all touch-target-min ${
              mobileStatusTab === "doing" ? "bg-white text-primary shadow-1" : "text-text-muted"
            }`}
          >
            {copy.tasks.colDoing} ({doingTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileStatusTab("done")}
            className={`py-2 px-1 text-xs font-semibold rounded-pill transition-all touch-target-min ${
              mobileStatusTab === "done" ? "bg-white text-primary shadow-1" : "text-text-muted"
            }`}
          >
            {copy.tasks.colDone} ({doneTasks.length})
          </button>
        </div>

        <div className="space-y-3">
          {(mobileStatusTab === "todo" ? todoTasks : mobileStatusTab === "doing" ? doingTasks : doneTasks)
            .length === 0 ? (
            <Card className="py-8 text-center bg-surface-muted/50 border-dashed">
              <p className="text-sm text-text-muted">{copy.tasks.emptyColumn}</p>
            </Card>
          ) : (
            (mobileStatusTab === "todo" ? todoTasks : mobileStatusTab === "doing" ? doingTasks : doneTasks).map(
              renderTaskCard
            )
          )}
        </div>
      </div>

      {/* VUE DESKTOP : 3 Colonnes Kanban avec Drag and Drop */}
      <div className="hidden md:grid grid-cols-3 gap-5 items-start">
        {/* Colonne À faire */}
        <div
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "todo")}
          className="space-y-3 p-4 rounded-md bg-surface-muted/50 border border-border min-h-[420px]"
        >
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h2 className="font-display font-bold text-sm uppercase text-text tracking-wide">
              {copy.tasks.colTodo}
            </h2>
            <Badge variant="neutral" className="tabular-nums">
              {todoTasks.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {todoTasks.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-8 italic">
                {copy.tasks.emptyColumn}
              </p>
            ) : (
              todoTasks.map(renderTaskCard)
            )}
          </div>
        </div>

        {/* Colonne En cours */}
        <div
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "doing")}
          className="space-y-3 p-4 rounded-md bg-surface-muted/50 border border-border min-h-[420px]"
        >
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h2 className="font-display font-bold text-sm uppercase text-primary tracking-wide">
              {copy.tasks.colDoing}
            </h2>
            <Badge variant="primary" className="tabular-nums">
              {doingTasks.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {doingTasks.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-8 italic">
                {copy.tasks.emptyColumn}
              </p>
            ) : (
              doingTasks.map(renderTaskCard)
            )}
          </div>
        </div>

        {/* Colonne Terminé */}
        <div
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "done")}
          className="space-y-3 p-4 rounded-md bg-surface-muted/50 border border-border min-h-[420px]"
        >
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h2 className="font-display font-bold text-sm uppercase text-success tracking-wide">
              {copy.tasks.colDone}
            </h2>
            <Badge variant="success" className="tabular-nums">
              {doneTasks.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {doneTasks.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-8 italic">
                {copy.tasks.emptyColumn}
              </p>
            ) : (
              doneTasks.map(renderTaskCard)
            )}
          </div>
        </div>
      </div>

      {/* Modal Création de Tâche (Planificateurs) */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in-up"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-lg border border-border shadow-2 max-w-lg w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="create-task-title"
          >
            <div className="border-b border-border pb-3">
              <h3 id="create-task-title" className="font-display font-bold text-xl text-primary">
                {copy.tasks.createModalTitle}
              </h3>
            </div>

            {createError && (
              <div className="p-3 bg-alert/10 border border-alert/30 text-alert rounded-sm text-xs font-semibold">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="t-title" className="block text-sm font-medium text-text">
                  {copy.tasks.titleLabel} *
                </label>
                <Input
                  id="t-title"
                  type="text"
                  required
                  placeholder={copy.tasks.titlePlaceholder}
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="t-desc" className="block text-sm font-medium text-text">
                  {copy.tasks.descLabel}
                </label>
                <textarea
                  id="t-desc"
                  rows={2}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full p-2.5 bg-white text-text text-sm rounded-sm border-[1.5px] border-border focus-visible:outline-none focus-visible:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="t-assignee" className="block text-sm font-medium text-text">
                    {copy.tasks.assigneeLabel} *
                  </label>
                  <select
                    id="t-assignee"
                    required
                    value={selectedAssignee}
                    onChange={(e) => setSelectedAssignee(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 bg-white text-text rounded-sm border-[1.5px] border-border text-sm focus-visible:outline-none"
                  >
                    {allProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || p.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="t-due" className="block text-sm font-medium text-text">
                    {copy.tasks.dueDateLabel} *
                  </label>
                  <Input
                    id="t-due"
                    type="date"
                    required
                    value={selectedDueDate}
                    onChange={(e) => setSelectedDueDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Décision liée (facultatif) */}
              {decisions.length > 0 && (
                <div className="space-y-1.5">
                  <label htmlFor="t-dec" className="block text-sm font-medium text-text">
                    {copy.tasks.linkedDecisionLabel}
                  </label>
                  <select
                    id="t-dec"
                    value={selectedDecisionId}
                    onChange={(e) => setSelectedDecisionId(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 bg-white text-text rounded-sm border-[1.5px] border-border text-sm focus-visible:outline-none"
                  >
                    <option value="">Aucune décision liée</option>
                    {decisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.text.slice(0, 70)}...
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Contribue à la priorité du mois (cochée par défaut si priorité active) */}
              {activePriority && (
                <label className="flex items-center gap-2.5 cursor-pointer pt-1 select-none">
                  <input
                    type="checkbox"
                    checked={isPriorityChecked}
                    onChange={(e) => setIsPriorityChecked(e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-xs font-semibold text-text">
                    {copy.tasks.priorityCheckbox} ({activePriority.title})
                  </span>
                </label>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="primary" isLoading={isCreating}>
                  {copy.tasks.submitButton}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
