"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  Radio,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Users,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  Wifi,
  Calendar,
  Send,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LiveMeetingBadge } from "@/components/ui/LiveMeetingBadge";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";
import type { Profile, Meeting, AgendaItem, Attendance, Decision, Task } from "@/types/database";

interface LiveMeetingModeProps {
  profile: Profile;
  initialMeeting: Meeting;
  initialAgendaItems: AgendaItem[];
  initialAttendance: Attendance[];
  initialDecisions: (Decision & { tasks?: Task[] })[];
  allProfiles: Profile[];
}

export const LiveMeetingMode: React.FC<LiveMeetingModeProps> = ({
  profile,
  initialMeeting,
  initialAgendaItems,
  initialAttendance,
  initialDecisions,
  allProfiles,
}) => {
  const router = useRouter();
  const { showToast } = useToast();

  const [meeting, setMeeting] = useState<Meeting>(initialMeeting);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>(initialAgendaItems);
  const [attendance, setAttendance] = useState<Attendance[]>(initialAttendance);
  const [decisions, setDecisions] = useState<(Decision & { tasks?: Task[] })[]>(initialDecisions);

  // État du minuteur
  const [now, setNow] = useState(Date.now());
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [itemStartTime, setItemStartTime] = useState<number | null>(null);

  // Modale temps écoulé
  const [showOverrunModal, setShowOverrunModal] = useState(false);
  const [extendedMinutes, setExtendedMinutes] = useState(0);

  // Saisie décision en direct
  const [decisionText, setDecisionText] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [isAddingDecision, setIsAddingDecision] = useState(false);

  // Clôture & Revue
  const [isFinishing, setIsFinishing] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(meeting.status === "done");
  const [isPublishing, setIsPublishing] = useState(false);

  // Mode hors-ligne & synchronisation
  const [isOnline, setIsOnline] = useState(true);
  const offlineQueue = useRef<any[]>([]);

  // Recherche membre pour présences
  const [attendanceSearch, setAttendanceSearch] = useState("");

  // Points validés pour le direct
  const validatedItems = agendaItems.filter((i) => i.status === "validated");
  const currentItem = validatedItems[currentItemIndex] || null;

  // Calcul du temps écoulé depuis started_at côté serveur
  const startedAtMs = meeting.started_at ? new Date(meeting.started_at).getTime() : null;
  const totalPlannedMs = (meeting.planned_minutes + extendedMinutes) * 60 * 1000;
  const elapsedMs = startedAtMs ? Math.max(0, now - startedAtMs) : 0;
  const remainingMs = Math.max(0, totalPlannedMs - elapsedMs);
  const isTimeOver = startedAtMs ? remainingMs === 0 : false;
  const elapsedPercent = Math.min(100, Math.round((elapsedMs / totalPlannedMs) * 100));

  // Tics du minuteur toutes les secondes
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Détection du passage à 100% de la durée
  useEffect(() => {
    if (meeting.status === "live" && isTimeOver && !showOverrunModal && !meeting.overrun) {
      setShowOverrunModal(true);
    }
  }, [meeting.status, isTimeOver, showOverrunModal, meeting.overrun]);

  // Initialiser itemStartTime au premier point
  useEffect(() => {
    if (meeting.status === "live" && itemStartTime === null) {
      setItemStartTime(Date.now());
    }
  }, [meeting.status, itemStartTime]);

  // Gestion hors-ligne / en ligne
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Traiter la file locale
      if (offlineQueue.current.length > 0) {
        showToast("Connexion rétablie : synchronisation en cours...", "info");
        const queue = [...offlineQueue.current];
        offlineQueue.current = [];
        const supabase = createClient();
        queue.forEach(async (item) => {
          if (item.type === "decision") {
            await supabase.from("decisions").insert(item.data);
          }
        });
        showToast("Synchronisation terminée.", "success");
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast(copy.meetings.live.offlineWarning, "error");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [showToast]);

  // Supabase Realtime : synchronisation entre planificateurs
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`live-meeting-${meeting.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meetings",
          filter: `id=eq.${meeting.id}`,
        },
        (payload) => {
          setMeeting((prev) => ({ ...prev, ...(payload.new as Meeting) }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "decisions",
          filter: `meeting_id=eq.${meeting.id}`,
        },
        (payload) => {
          setDecisions((prev) => {
            if (prev.some((d) => d.id === payload.new.id)) return prev;
            return [...prev, payload.new as Decision];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
          filter: `meeting_id=eq.${meeting.id}`,
        },
        () => {
          supabase
            .from("attendance")
            .select("*")
            .eq("meeting_id", meeting.id)
            .then(({ data }) => {
              if (data) setAttendance(data as Attendance[]);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meeting.id]);

  // 1. Démarrer la réunion
  const handleStartMeeting = async () => {
    try {
      const supabase = createClient();
      const startTime = new Date().toISOString();

      const { data, error } = await supabase
        .from("meetings")
        .update({
          status: "live",
          started_at: startTime,
        })
        .eq("id", meeting.id)
        .select()
        .single();

      if (error) {
        showToast(error.message, "error");
        return;
      }

      setMeeting(data as Meeting);
      setItemStartTime(Date.now());

      // Notification en direct pour tous les membres
      fetch("/api/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "meeting_live",
          data: {
            id: meeting.id,
            title: meeting.title,
          },
        }),
      }).catch((err) => console.warn("Erreur broadcast live :", err));

      showToast("La réunion est en direct !", "success");
    } catch {
      showToast(copy.app.errorGeneric, "error");
    }
  };

  // 2. Passer au point suivant
  const handleNextItem = async () => {
    if (!currentItem) return;

    const actualSec = itemStartTime ? Math.round((Date.now() - itemStartTime) / 1000) : 0;
    try {
      const supabase = createClient();
      await supabase
        .from("agenda_items")
        .update({ actual_seconds: actualSec })
        .eq("id", currentItem.id);

      setAgendaItems((prev) =>
        prev.map((i) => (i.id === currentItem.id ? { ...i, actual_seconds: actualSec } : i))
      );
    } catch (err) {
      console.warn("Échec sauvegarde durée point :", err);
    }

    if (currentItemIndex < validatedItems.length - 1) {
      setCurrentItemIndex((prev) => prev + 1);
      setItemStartTime(Date.now());
    } else {
      showToast("Dernier point de l’ordre du jour atteint.", "info");
    }
  };

  const handlePrevItem = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex((prev) => prev - 1);
      setItemStartTime(Date.now());
    }
  };

  // 3. Prolonger la réunion de 10 minutes
  const handleExtendMeeting = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("meetings")
        .update({ overrun: true })
        .eq("id", meeting.id);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      setMeeting((prev) => ({ ...prev, overrun: true }));
      setExtendedMinutes((prev) => prev + 10);
      setShowOverrunModal(false);
      showToast("Réunion prolongée de 10 minutes.", "info");
    } catch {
      showToast(copy.app.errorGeneric, "error");
    }
  };

  // 4. Ajouter une décision en direct (+ tâche brouillon si responsable et date)
  const handleAddDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionText.trim()) return;

    const decisionPayload = {
      meeting_id: meeting.id,
      agenda_item_id: currentItem?.id || null,
      text: decisionText.trim(),
      status: "draft" as const,
      created_by: profile.id,
    };

    if (!isOnline) {
      // Stockage local temporaire en file
      offlineQueue.current.push({ type: "decision", data: decisionPayload });
      const localId = `offline-${Date.now()}`;
      setDecisions((prev) => [
        ...prev,
        {
          ...decisionPayload,
          id: localId,
          created_at: new Date().toISOString(),
          published_at: null,
          validation_deadline: null,
        },
      ]);
      setDecisionText("");
      setAssigneeId("");
      setDueDate("");
      showToast("Décision mémorisée localement (hors ligne).", "info");
      return;
    }

    try {
      setIsAddingDecision(true);
      const supabase = createClient();

      const { data: newDec, error: decError } = await supabase
        .from("decisions")
        .insert(decisionPayload)
        .select()
        .single();

      if (decError) {
        showToast(decError.message, "error");
        setIsAddingDecision(false);
        return;
      }

      let createdTask: Task | undefined;
      // Si responsable et date d'échéance sont renseignés, créer la tâche brouillon
      if (assigneeId && dueDate) {
        const { data: newTask, error: taskError } = await supabase
          .from("tasks")
          .insert({
            title: decisionText.trim(),
            decision_id: newDec.id,
            assignee_id: assigneeId,
            due_date: dueDate,
            status: "todo",
            created_by: profile.id,
          })
          .select()
          .single();

        if (!taskError && newTask) {
          createdTask = newTask as Task;
        }
      }

      setDecisions((prev) => [...prev, { ...(newDec as Decision), tasks: createdTask ? [createdTask] : [] }]);
      setDecisionText("");
      setAssigneeId("");
      setDueDate("");
      setIsAddingDecision(false);
      showToast("Décision enregistrée.", "success");
    } catch {
      showToast(copy.app.errorGeneric, "error");
      setIsAddingDecision(false);
    }
  };

  // 5. Basculer la présence d'un membre
  const handleTogglePresent = async (targetUserId: string, currentPresent: boolean) => {
    try {
      const supabase = createClient();
      const newPresent = !currentPresent;

      const { error } = await supabase.from("attendance").upsert(
        {
          meeting_id: meeting.id,
          user_id: targetUserId,
          present: newPresent,
        },
        { onConflict: "meeting_id,user_id" }
      );

      if (error) {
        showToast(error.message, "error");
        return;
      }

      setAttendance((prev) => {
        const existing = prev.find((a) => a.user_id === targetUserId);
        if (existing) {
          return prev.map((a) => (a.user_id === targetUserId ? { ...a, present: newPresent } : a));
        } else {
          return [...prev, { meeting_id: meeting.id, user_id: targetUserId, present: newPresent, rsvp: null }];
        }
      });
    } catch {
      showToast(copy.app.errorGeneric, "error");
    }
  };

  // 6. Marquer tout le monde présent
  const handleMarkAllPresent = async () => {
    try {
      const supabase = createClient();
      const updates = allProfiles.map((p) => ({
        meeting_id: meeting.id,
        user_id: p.id,
        present: true,
      }));

      const { error } = await supabase.from("attendance").upsert(updates, { onConflict: "meeting_id,user_id" });
      if (error) {
        showToast(error.message, "error");
        return;
      }

      setAttendance((prev) => {
        return allProfiles.map((p) => {
          const existing = prev.find((a) => a.user_id === p.id);
          return { meeting_id: meeting.id, user_id: p.id, present: true, rsvp: existing?.rsvp || null };
        });
      });
      showToast("Tous les membres sont marqués présents.", "success");
    } catch {
      showToast(copy.app.errorGeneric, "error");
    }
  };

  // 7. Terminer la réunion
  const handleFinishMeeting = async () => {
    try {
      setIsFinishing(true);
      const supabase = createClient();
      const endTime = new Date().toISOString();

      const { data, error } = await supabase
        .from("meetings")
        .update({
          status: "done",
          ended_at: endTime,
        })
        .eq("id", meeting.id)
        .select()
        .single();

      if (error) {
        showToast(error.message, "error");
        setIsFinishing(false);
        return;
      }

      setMeeting(data as Meeting);
      setIsReviewMode(true);
      setIsFinishing(false);
      showToast("Réunion clôturée. Vérifie les décisions avant publication.", "info");
    } catch {
      showToast(copy.app.errorGeneric, "error");
      setIsFinishing(false);
    }
  };

  // 8. Publier les décisions (Appelle publish_decisions)
  const handlePublishDecisions = async () => {
    try {
      setIsPublishing(true);
      const supabase = createClient();

      const { data, error } = await supabase.rpc("publish_decisions", {
        p_meeting_id: meeting.id,
      });

      if (error) {
        showToast(error.message, "error");
        setIsPublishing(false);
        return;
      }

      // Notification de publication des décisions
      fetch("/api/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "decisions_published",
          data: {
            id: meeting.id,
            title: meeting.title,
            count: data?.published_count || decisions.length,
          },
        }),
      }).catch((err) => console.warn("Erreur broadcast decisions :", err));

      showToast("Décisions publiées avec succès !", "success");
      router.push(`/reunions/${meeting.id}`);
    } catch {
      showToast(copy.app.errorGeneric, "error");
      setIsPublishing(false);
    }
  };

  // Formatage du temps restant
  const remMinutes = Math.floor(remainingMs / 60000);
  const remSeconds = Math.floor((remainingMs % 60000) / 1000);

  // Temps du point courant
  const itemElapsedSec = itemStartTime ? Math.floor((now - itemStartTime) / 1000) : 0;
  const itemAllottedSec = currentItem ? currentItem.allotted_minutes * 60 : 300;
  const itemRemainingSec = itemAllottedSec - itemElapsedSec;
  const isItemOvertime = itemRemainingSec < 0;

  // Filtrage présences
  const filteredProfiles = allProfiles.filter(
    (p) =>
      p.full_name?.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
      p.email.toLowerCase().includes(attendanceSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in-up pb-20">
      {/* Bandeau d'état réseau */}
      {!isOnline && (
        <div className="p-3 bg-alert text-white rounded-md flex items-center gap-2 text-xs font-semibold shadow-2 animate-pulse">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>{copy.meetings.live.offlineWarning}</span>
        </div>
      )}

      {/* En-tête : Titre réunion et statut */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-accent font-display">
              Mode Réunion en Direct
            </span>
            {meeting.status === "live" && <LiveMeetingBadge />}
            {meeting.overrun && <Badge variant="alert">Prolongée</Badge>}
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary">
            {meeting.title}
          </h1>
        </div>

        <Link href={`/reunions/${meeting.id}`}>
          <Button variant="ghost" className="text-xs">
            Quitter le mode direct
          </Button>
        </Link>
      </div>

      {/* ÉCRAN DE DÉMARRAGE SI RÉUNION ENCORE PLANIFIÉE */}
      {meeting.status === "planned" && (
        <Card className="text-center py-12 px-6 space-y-6 shadow-2">
          <div className="w-16 h-16 rounded-full bg-alert/15 text-alert flex items-center justify-center mx-auto">
            <Radio className="w-8 h-8 animate-pulse" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="font-display font-bold text-2xl text-primary">
              Prêt à démarrer la séance ?
            </h2>
            <p className="text-sm text-text-muted">
              Le minuteur de 45 minutes sera calculé à partir de l’heure exacte de démarrage.
            </p>
          </div>

          <Button
            variant="danger"
            onClick={handleStartMeeting}
            className="text-lg py-4 px-8 min-h-[56px] shadow-2"
          >
            <Radio className="w-5 h-5 mr-2" />
            <span>{copy.meetings.live.startMeetingButton}</span>
          </Button>
        </Card>
      )}

      {/* ÉCRAN DE REVUE SI RÉUNION TERMINÉE */}
      {isReviewMode && (
        <Card className="p-6 sm:p-8 space-y-6 bg-white shadow-2">
          <div className="space-y-2 pb-4 border-b border-border">
            <Badge variant="success">Séance terminée</Badge>
            <h2 className="font-display font-bold text-2xl text-primary">
              {copy.meetings.live.reviewTitle}
            </h2>
            <p className="text-sm text-text-muted">
              {copy.meetings.live.publishHelperText}
            </p>
          </div>

          {/* Liste des décisions en brouillon avec leurs tâches */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-base text-text">
              Décisions enregistrées ({decisions.length})
            </h3>

            {decisions.length === 0 ? (
              <p className="text-sm text-text-muted italic">
                Aucune décision n’a été enregistrée pour cette séance.
              </p>
            ) : (
              <div className="space-y-3">
                {decisions.map((dec, i) => (
                  <div
                    key={dec.id}
                    className="p-4 rounded-md bg-surface-muted border border-border space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-display font-bold text-xs text-primary tabular-nums">
                        #{i + 1}
                      </span>
                      <p className="text-sm font-semibold text-text flex-1">
                        {dec.text}
                      </p>
                    </div>

                    {dec.tasks && dec.tasks.length > 0 && (
                      <div className="pl-6 pt-1 text-xs text-text-muted space-y-1">
                        {dec.tasks.map((t) => (
                          <div key={t.id} className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                            <span>Tâche créée : {t.title}</span>
                            <span className="tabular-nums font-medium">Échéance {t.due_date}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-border">
            <Button
              variant="primary"
              onClick={handlePublishDecisions}
              isLoading={isPublishing}
              className="text-base py-3 px-8"
            >
              <Send className="w-4 h-4 mr-2" />
              <span>{copy.meetings.live.publishDecisionsButton}</span>
            </Button>
          </div>
        </Card>
      )}

      {/* MODE EN DIRECT ACTIF */}
      {meeting.status === "live" && (
        <div className="space-y-6">
          {/* Minuteur général géant */}
          <Card
            className={`p-6 sm:p-8 text-center space-y-4 transition-colors ${
              isTimeOver
                ? "bg-alert/10 border-alert text-alert"
                : elapsedPercent >= 80
                ? "bg-[#F7E7C4]/40 border-accent"
                : "bg-white"
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              {copy.meetings.live.timeRemaining} (sur {meeting.planned_minutes + extendedMinutes} min)
            </span>

            {/* Grands chiffres Sora 800 */}
            <div className="font-display font-extrabold text-5xl sm:text-7xl text-primary tabular-nums tracking-tight">
              {String(remMinutes).padStart(2, "0")}:{String(remSeconds).padStart(2, "0")}
            </div>

            {/* Barre de progression arrondie du temps */}
            <div className="max-w-md mx-auto w-full h-3 rounded-pill bg-surface-muted overflow-hidden border border-border">
              <div
                className={`h-full rounded-pill transition-all duration-fast ${
                  isTimeOver ? "bg-alert" : elapsedPercent >= 80 ? "bg-accent" : "bg-primary"
                }`}
                style={{ width: `${Math.min(100, elapsedPercent)}%` }}
              />
            </div>

            {elapsedPercent >= 80 && !isTimeOver && (
              <p className="text-xs font-semibold text-accent">
                {copy.meetings.live.softAlert80}
              </p>
            )}

            {isTimeOver && (
              <div className="pt-2">
                <Button
                  variant="danger"
                  onClick={() => setShowOverrunModal(true)}
                  className="text-xs py-2 px-4"
                >
                  Gérer le dépassement de temps
                </Button>
              </div>
            )}
          </Card>

          {/* Déroulé de l'ordre du jour */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Point actuel en direct */}
            <div className="md:col-span-7 space-y-4">
              <Card className="p-6 space-y-5 border-2 border-primary shadow-2">
                <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs tabular-nums">
                      {currentItemIndex + 1}
                    </span>
                    <span className="text-xs font-bold uppercase text-primary tracking-wide">
                      Point en cours ({currentItemIndex + 1}/{validatedItems.length})
                    </span>
                  </div>

                  <span
                    className={`text-xs font-bold tabular-nums px-2.5 py-1 rounded-pill ${
                      isItemOvertime
                        ? "bg-alert text-white animate-pulse"
                        : "bg-surface-muted text-text"
                    }`}
                  >
                    {isItemOvertime ? "+" : ""}
                    {Math.abs(Math.floor(itemRemainingSec / 60))}:
                    {String(Math.abs(itemRemainingSec % 60)).padStart(2, "0")}
                  </span>
                </div>

                {currentItem ? (
                  <div className="space-y-2">
                    <h2 className="font-display font-extrabold text-xl sm:text-2xl text-text">
                      {currentItem.title}
                    </h2>
                    {currentItem.details && (
                      <p className="text-sm text-text-muted leading-relaxed">
                        {currentItem.details}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted italic">
                    Aucun point validé dans l’ordre du jour.
                  </p>
                )}

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
                  <Button
                    variant="secondary"
                    onClick={handlePrevItem}
                    disabled={currentItemIndex === 0}
                    className="text-xs min-h-[40px] py-1 px-3"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    <span>{copy.meetings.live.prevItemButton}</span>
                  </Button>

                  <Button
                    variant="primary"
                    onClick={handleNextItem}
                    className="text-xs min-h-[40px] py-1 px-4"
                  >
                    <span>{copy.meetings.live.nextItemButton}</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </Card>

              {/* Points suivants grisés */}
              {validatedItems.length > currentItemIndex + 1 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase text-text-muted">
                    Points suivants
                  </span>
                  <div className="space-y-2">
                    {validatedItems.slice(currentItemIndex + 1).map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-md bg-surface-muted/60 border border-border/80 flex items-center justify-between text-xs text-text-muted opacity-80"
                      >
                        <span className="truncate">
                          {currentItemIndex + 2 + idx}. {item.title}
                        </span>
                        <span className="tabular-nums font-medium shrink-0 ml-2">
                          {item.allotted_minutes} min
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Saisie de présences en direct */}
            <div className="md:col-span-5 space-y-4">
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <h3 className="font-display font-bold text-sm text-primary">
                      {copy.meetings.live.attendanceCheckTitle}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    {copy.meetings.live.markAllPresent}
                  </button>
                </div>

                <Input
                  type="search"
                  placeholder="Rechercher un membre..."
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  className="text-xs min-h-[38px] py-1.5"
                />

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {filteredProfiles.map((p) => {
                    const att = attendance.find((a) => a.user_id === p.id);
                    const isPresent = att?.present || false;

                    return (
                      <div
                        key={p.id}
                        onClick={() => handleTogglePresent(p.id, isPresent)}
                        className={`p-2 rounded-sm border cursor-pointer select-none flex items-center justify-between text-xs transition-all ${
                          isPresent
                            ? "bg-success/15 border-success text-success font-semibold"
                            : "bg-surface-muted border-border text-text hover:bg-surface-muted/80"
                        }`}
                      >
                        <span className="truncate">{p.full_name || p.email}</span>
                        <input
                          type="checkbox"
                          checked={isPresent}
                          onChange={() => {}}
                          className="w-4 h-4 accent-success cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>

          {/* Saisie des décisions toujours visible en bas */}
          <Card className="p-5 sm:p-6 space-y-4 bg-white border-primary/30 shadow-2">
            <h3 className="font-display font-bold text-base text-primary">
              Saisie des décisions de la séance
            </h3>

            <form onSubmit={handleAddDecision} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  required
                  placeholder={copy.meetings.live.decisionFieldPlaceholder}
                  value={decisionText}
                  onChange={(e) => setDecisionText(e.target.value)}
                  className="flex-1 min-h-[44px] px-4 py-2.5 bg-white text-text text-base rounded-sm border-[1.5px] border-border focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30"
                />

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isAddingDecision}
                  className="shrink-0 text-sm"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  <span>{copy.meetings.live.addDecisionButton}</span>
                </Button>
              </div>

              {/* Options facultatives de tâche : responsable + échéance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-muted">
                    {copy.meetings.live.assigneeLabel} (pour créer la tâche)
                  </label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full min-h-[38px] px-3 py-1.5 bg-white text-text text-xs rounded-sm border border-border focus-visible:outline-none"
                  >
                    <option value="">Sélectionner un membre...</option>
                    {allProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || p.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-muted">
                    {copy.meetings.live.dueDateLabel}
                  </label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="min-h-[38px] py-1 text-xs"
                  />
                </div>
              </div>
            </form>

            {/* Décisions déjà saisies */}
            {decisions.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-border">
                <span className="text-xs font-bold uppercase text-text-muted">
                  Décisions prises ({decisions.length})
                </span>
                <div className="space-y-2">
                  {decisions.map((dec, i) => (
                    <div
                      key={dec.id}
                      className="p-3 rounded-md bg-surface-muted border border-border flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-text">
                        {i + 1}. {dec.text}
                      </span>
                      {dec.tasks && dec.tasks.length > 0 && (
                        <Badge variant="success" className="text-[10px]">
                          Tâche liée
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Bouton Clôturer la réunion */}
          <div className="pt-4 flex justify-end">
            <Button
              variant="danger"
              onClick={handleFinishMeeting}
              isLoading={isFinishing}
              className="text-base py-3 px-8"
            >
              {copy.meetings.live.finishMeetingButton}
            </Button>
          </div>
        </div>
      )}

      {/* Modal Le temps est écoulé (100% de la durée atteinte) */}
      {showOverrunModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in-up"
          onClick={() => setShowOverrunModal(false)}
        >
          <div
            className="bg-white rounded-lg border-2 border-alert shadow-2 max-w-md w-full p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="overrun-modal-title"
          >
            <div className="flex items-center gap-3 text-alert">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <h3 id="overrun-modal-title" className="font-display font-extrabold text-xl text-alert">
                {copy.meetings.live.timeOverTitle}
              </h3>
            </div>

            <p className="text-sm text-text leading-relaxed">
              {copy.meetings.live.timeOverHelper}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Button
                variant="danger"
                onClick={handleFinishMeeting}
                className="w-full text-sm"
              >
                {copy.meetings.live.closeNowButton}
              </Button>

              <Button
                variant="secondary"
                onClick={handleExtendMeeting}
                className="w-full text-sm"
              >
                {copy.meetings.live.extend10Button}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
