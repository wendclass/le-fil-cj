"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Target,
  Calendar,
  CheckSquare,
  CheckCircle2,
  Clock,
  MapPin,
  Check,
  AlertCircle,
  Plus,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Bell,
  X,
  TrendingUp,
  BarChart3,
  Eye,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { PatternBand } from "@/components/ui/PatternBand";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DueDateBadge } from "@/components/ui/DueDateBadge";
import { ImprovisedBadge } from "@/components/ui/ImprovisedBadge";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";
import {
  formatOuagaDateTime,
  formatCountdown,
  formatValidationRemaining,
  getDaysRemainingInMonth,
} from "@/lib/date";
import type { Profile, Priority, Meeting, Decision, Task, RsvpStatus } from "@/types/database";

interface HomeDashboardProps {
  profile: Profile;
  initialActivePriority: Priority | null;
  initialProposedPriority: (Priority & { has_approved: boolean }) | null;
  initialPriorityProgress: { total: number; done: number };
  initialNextMeeting: (Meeting & { user_rsvp: RsvpStatus | null }) | null;
  initialDecisionsToValidate: Decision[];
  initialMyTasks: Task[];
  unvalidatedDecisionsCount: number;
  miniMetrics?: any;
  plannerWatchlist?: {
    unseenCount: number;
    overdueCount: number;
    draftDecisionsCount: number;
  };
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  profile,
  initialActivePriority,
  initialProposedPriority,
  initialPriorityProgress,
  initialNextMeeting,
  initialDecisionsToValidate,
  initialMyTasks,
  unvalidatedDecisionsCount,
  miniMetrics,
  plannerWatchlist,
}) => {
  const { showToast } = useToast();
  const isPlanner = profile.role === "planner";

  // États locaux
  const [activePriority, setActivePriority] = useState<Priority | null>(initialActivePriority);
  const [proposedPriority, setProposedPriority] = useState<(Priority & { has_approved: boolean }) | null>(
    initialProposedPriority
  );
  const [priorityProgress, setPriorityProgress] = useState(initialPriorityProgress);
  const [nextMeeting, setNextMeeting] = useState(initialNextMeeting);
  const [decisionsToValidate, setDecisionsToValidate] = useState(initialDecisionsToValidate);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [validatedSuccessId, setValidatedSuccessId] = useState<string | null>(null);
  const [rsvpSaving, setRsvpSaving] = useState(false);

  // Modale Priorité
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [priorityTitle, setPriorityTitle] = useState("");
  const [priorityDesc, setPriorityDesc] = useState("");
  const [isSubmittingPriority, setIsSubmittingPriority] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  // Montage côté client pour les dates et comptes à rebours
  const [mounted, setMounted] = useState(false);
  const [showPushBanner, setShowPushBanner] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const dismissedUntil = localStorage.getItem("club_cj_push_banner_dismissed");
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        setShowPushBanner(false);
      } else if (!("Notification" in window) || Notification.permission === "granted") {
        setShowPushBanner(false);
      } else {
        setShowPushBanner(true);
      }
    }
  }, []);

  const handleDismissBanner = () => {
    setShowPushBanner(false);
    if (typeof window !== "undefined") {
      // Masquer pendant 7 jours
      localStorage.setItem(
        "club_cj_push_banner_dismissed",
        String(Date.now() + 7 * 24 * 3600 * 1000)
      );
    }
  };

  const daysRemainingInMonth = mounted ? getDaysRemainingInMonth() : 0;

  // Calcul du pourcentage d'avancement de la priorité
  const progressPercent =
    priorityProgress.total > 0
      ? Math.round((priorityProgress.done / priorityProgress.total) * 100)
      : 0;

  // 1. Proposer une priorité
  const handleProposePriority = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priorityTitle.trim()) return;

    try {
      setIsSubmittingPriority(true);
      const supabase = createClient();

      const today = new Date();
      const firstDayOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

      const { data: newPriority, error } = await supabase
        .from("priorities")
        .insert({
          title: priorityTitle.trim().slice(0, 80),
          description: priorityDesc.trim().slice(0, 300) || null,
          month: firstDayOfMonth,
          status: "proposed",
          proposed_by: profile.id,
        })
        .select()
        .single();

      if (error) {
        showToast(error.message, "error");
        setIsSubmittingPriority(false);
        return;
      }

      // Le créateur approuve directement sa proposition
      await supabase.rpc("approve_priority", { p_priority_id: newPriority.id });

      setProposedPriority({
        ...(newPriority as Priority),
        approvals_count: 1,
        total_planners: 2,
        has_approved: true,
      });

      setShowPriorityModal(false);
      setPriorityTitle("");
      setPriorityDesc("");
      setIsSubmittingPriority(false);
      showToast("Priorité proposée à l’autre planificateur.", "success");
    } catch {
      showToast(copy.app.errorGeneric, "error");
      setIsSubmittingPriority(false);
    }
  };

  // 2. Approuver la priorité proposée
  const handleApprovePriority = async (priorityId: string) => {
    try {
      setIsApproving(true);
      const supabase = createClient();

      const { data, error } = await supabase.rpc("approve_priority", {
        p_priority_id: priorityId,
      });

      if (error) {
        showToast(error.message, "error");
        setIsApproving(false);
        return;
      }

      if (data?.is_active) {
        // Célébration sobre de 600 ms
        setCelebrating(true);
        setTimeout(() => {
          setCelebrating(false);
        }, 600);

        // La priorité devient active
        if (proposedPriority) {
          setActivePriority({
            ...proposedPriority,
            status: "active",
          });
        }
        setProposedPriority(null);
        showToast("Priorité approuvée et désormais active !", "success");
      } else {
        setProposedPriority((prev) =>
          prev
            ? {
                ...prev,
                approvals_count: data.approvals_count,
                total_planners: data.total_planners,
                has_approved: true,
              }
            : null
        );
        showToast("Ton approbation a été enregistrée.", "success");
      }

      setIsApproving(false);
    } catch {
      showToast(copy.app.errorGeneric, "error");
      setIsApproving(false);
    }
  };

  // 3. Répondre RSVP à la prochaine réunion
  const handleRsvp = async (meetingId: string, rsvp: RsvpStatus) => {
    try {
      setRsvpSaving(true);
      const supabase = createClient();

      const { error } = await supabase.from("attendance").upsert(
        {
          meeting_id: meetingId,
          user_id: profile.id,
          rsvp,
        },
        { onConflict: "meeting_id,user_id" }
      );

      if (error) {
        showToast(error.message, "error");
        setRsvpSaving(false);
        return;
      }

      setNextMeeting((prev) => (prev ? { ...prev, user_rsvp: rsvp } : null));
      showToast(copy.home.nextMeeting.rsvpSaved, "success");
      setRsvpSaving(false);
    } catch {
      showToast(copy.app.errorGeneric, "error");
      setRsvpSaving(false);
    }
  };

  // 4. Valider une décision (coche animée 300 ms)
  const handleValidateDecision = async (decisionId: string) => {
    if (validatingId) return;

    try {
      setValidatingId(decisionId);
      const supabase = createClient();

      const { error } = await supabase.from("decision_validations").upsert(
        {
          decision_id: decisionId,
          user_id: profile.id,
          validated_at: new Date().toISOString(),
        },
        { onConflict: "decision_id,user_id" }
      );

      if (error) {
        showToast(error.message, "error");
        setValidatingId(null);
        return;
      }

      // Animation coche 300 ms
      setValidatedSuccessId(decisionId);
      setTimeout(() => {
        setDecisionsToValidate((prev) => prev.filter((d) => d.id !== decisionId));
        setValidatingId(null);
        setValidatedSuccessId(null);
        showToast(copy.home.toValidate.validatedSuccess, "success");
      }, 300);
    } catch {
      showToast(copy.app.errorGeneric, "error");
      setValidatingId(null);
    }
  };

  const firstName = profile.full_name ? profile.full_name.split(" ")[0] : "Membre";

  const todayStr = mounted ? new Date().toISOString().split("T")[0] : "";
  const urgentTasks = initialMyTasks.filter((t) => t.due_date <= todayStr);
  const pendingRsvp = nextMeeting && nextMeeting.user_rsvp === null;
  const hasImmediateActions =
    decisionsToValidate.length > 0 || urgentTasks.length > 0 || pendingRsvp;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Bannière d'activation push (7 jours fermable) */}
      {showPushBanner && (
        <div className="p-4 rounded-md bg-[#232D6B] text-white flex items-center justify-between gap-4 shadow-2 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-white/10 text-white shrink-0">
              <Bell className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                Active les notifications pour ne rien rater
              </p>
              <p className="text-xs text-white/80">
                Reçois les convocations de réunions et les rappels d’échéances.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/parametres">
              <Button
                variant="primary"
                className="text-xs py-1.5 px-3 min-h-[36px] bg-accent text-[#232D6B] hover:bg-[#c99514] font-bold"
              >
                Activer
              </Button>
            </Link>
            <button
              type="button"
              onClick={handleDismissBanner}
              className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 touch-target-min flex items-center justify-center"
              aria-label="Fermer la bannière"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. Bandeau de bienvenue */}
      <section className="bg-white rounded-md border border-border shadow-1 overflow-hidden">
        <PatternBand height={36} opacity={0.12} />
        <div className="p-6 md:p-8 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-accent font-display">
            Tableau de bord
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl md:text-4xl text-primary tracking-tight">
            {copy.home.greeting(firstName)}
          </h1>
          <p className="font-body text-base text-text-muted max-w-xl">
            {copy.app.tagline} Suis les décisions, prépare les réunions et tiens tes engagements.
          </p>
        </div>
      </section>

      {/* Bloc « À faire maintenant » */}
      {hasImmediateActions && (
        <Card className="p-5 border-l-4 border-l-alert space-y-4 shadow-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-alert/15 text-alert">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h2 className="font-display font-bold text-base text-primary">
                À faire maintenant
              </h2>
            </div>
            <span className="text-xs font-semibold text-alert">
              Actions prioritaires
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {decisionsToValidate.length > 0 && (
              <Link href="/decisions" className="block">
                <div className="p-3.5 rounded-md bg-surface-muted hover:bg-white border border-border space-y-1 transition-all">
                  <div className="flex items-center justify-between text-xs font-semibold text-text">
                    <span className="flex items-center gap-1.5 text-alert">
                      <CheckSquare className="w-4 h-4" />
                      Décisions
                    </span>
                    <Badge variant="alert">{decisionsToValidate.length}</Badge>
                  </div>
                  <p className="text-xs text-text-muted line-clamp-1">
                    {decisionsToValidate[0].text}
                  </p>
                </div>
              </Link>
            )}

            {urgentTasks.length > 0 && (
              <Link href={`/taches/${urgentTasks[0].id}`} className="block">
                <div className="p-3.5 rounded-md bg-surface-muted hover:bg-white border border-border space-y-1 transition-all">
                  <div className="flex items-center justify-between text-xs font-semibold text-text">
                    <span className="flex items-center gap-1.5 text-alert">
                      <Clock className="w-4 h-4" />
                      Tâches urgentes
                    </span>
                    <Badge variant="alert">{urgentTasks.length}</Badge>
                  </div>
                  <p className="text-xs text-text-muted line-clamp-1">
                    {urgentTasks[0].title}
                  </p>
                </div>
              </Link>
            )}

            {pendingRsvp && nextMeeting && (
              <Link href={`/reunions/${nextMeeting.id}`} className="block">
                <div className="p-3.5 rounded-md bg-surface-muted hover:bg-white border border-border space-y-1 transition-all">
                  <div className="flex items-center justify-between text-xs font-semibold text-text">
                    <span className="flex items-center gap-1.5 text-primary">
                      <Calendar className="w-4 h-4" />
                      Présence requise
                    </span>
                    <Badge variant="neutral">RSVP</Badge>
                  </div>
                  <p className="text-xs text-text-muted line-clamp-1">
                    {nextMeeting.title}
                  </p>
                </div>
              </Link>
            )}
          </div>
        </Card>
      )}

      {/* 2. Bandeau « La Seule Chose du mois » */}
      <section aria-label="Priorité du mois">
        <Card
          className={`relative overflow-hidden p-6 md:p-8 border-border transition-all duration-slow ${
            celebrating ? "ring-4 ring-accent scale-[1.01]" : ""
          }`}
        >
          {/* PatternBand en filigrane sur le côté droit uniquement (jamais sous le texte) */}
          <div className="absolute right-0 top-0 bottom-0 w-24 md:w-36 pointer-events-none overflow-hidden opacity-30 select-none">
            <PatternBand height={180} opacity={0.12} className="h-full" />
          </div>

          <div className="relative z-1 space-y-5 max-w-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-full bg-accent/20 text-[#232D6B]">
                  <Target className="w-5 h-5" />
                </div>
                <span className="font-display font-bold text-sm uppercase tracking-wider text-accent">
                  {copy.home.priority.sectionTitle}
                </span>
              </div>

              {activePriority && mounted && (
                <span className="text-xs font-medium text-text-muted tabular-nums">
                  {copy.home.priority.daysRemaining(daysRemainingInMonth)}
                </span>
              )}
            </div>

            {/* État A : Priorité active existante */}
            {activePriority ? (
              <div className="space-y-4">
                <div>
                  <h2 className="font-display font-bold text-xl sm:text-2xl text-primary leading-snug">
                    {activePriority.title}
                  </h2>
                  {activePriority.description && (
                    <p className="font-body text-sm text-text-muted mt-1 leading-relaxed">
                      {activePriority.description}
                    </p>
                  )}
                </div>

                {/* Barre de progression arrondie avec chiffres tabulaires */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-text">
                    <span>{copy.home.priority.progressLabel}</span>
                    <span className="tabular-nums font-display font-bold text-primary">
                      {progressPercent} % ({priorityProgress.done}/{priorityProgress.total})
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-pill bg-surface-muted overflow-hidden border border-border">
                    <div
                      className="h-full bg-primary rounded-pill transition-all duration-slow ease-out-custom"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : proposedPriority ? (
              /* État B : Priorité proposée en attente d'approbation */
              <div className="space-y-4 p-4 rounded-md bg-surface-muted border border-border">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="accent">
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    {copy.home.priority.toApproveBadge}
                  </Badge>
                  <span className="text-xs text-text-muted font-medium">
                    {copy.home.priority.approvalsCount(
                      proposedPriority.approvals_count || 1,
                      proposedPriority.total_planners || 2
                    )}
                  </span>
                </div>

                <div>
                  <h3 className="font-display font-bold text-lg text-primary">
                    {proposedPriority.title}
                  </h3>
                  {proposedPriority.description && (
                    <p className="text-sm text-text-muted mt-1">
                      {proposedPriority.description}
                    </p>
                  )}
                </div>

                {isPlanner && !proposedPriority.has_approved && (
                  <Button
                    variant="primary"
                    onClick={() => handleApprovePriority(proposedPriority.id)}
                    isLoading={isApproving}
                    className="text-sm py-2 min-h-[40px]"
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    <span>{copy.home.priority.approveButton}</span>
                  </Button>
                )}
              </div>
            ) : (
              /* État C : Sans priorité active */
              <div className="py-2 space-y-3">
                <p className="text-sm text-text-muted">
                  {copy.home.priority.memberEmpty}
                </p>
                {isPlanner && (
                  <Button
                    variant="primary"
                    onClick={() => setShowPriorityModal(true)}
                    className="text-sm py-2.5 min-h-[44px]"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    <span>{copy.home.priority.plannerEmptyButton}</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* 3. Section supplémentaire Planificateurs : À surveiller */}
      {isPlanner && (
        <section aria-label="À surveiller">
          <Card className="p-5 border-l-4 border-l-primary space-y-4 shadow-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-primary" />
                <h2 className="font-display font-bold text-base text-primary">
                  À surveiller (Planificateurs)
                </h2>
              </div>
              <Link
                href="/suivi"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>Accéder au suivi et relances</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link href="/suivi" className="block">
                <div className="p-3 rounded-md bg-surface-muted hover:bg-white border border-border text-center space-y-1 transition-all">
                  <span className="text-2xl font-bold font-display text-alert block">
                    {plannerWatchlist?.unseenCount || 0}
                  </span>
                  <span className="text-xs font-medium text-text-muted">
                    Non vues (+24 h)
                  </span>
                </div>
              </Link>

              <Link href="/suivi" className="block">
                <div className="p-3 rounded-md bg-surface-muted hover:bg-white border border-border text-center space-y-1 transition-all">
                  <span className="text-2xl font-bold font-display text-alert block">
                    {plannerWatchlist?.overdueCount || 0}
                  </span>
                  <span className="text-xs font-medium text-text-muted">
                    Tâches en retard
                  </span>
                </div>
              </Link>

              <Link href="/reunions" className="block">
                <div className="p-3 rounded-md bg-surface-muted hover:bg-white border border-border text-center space-y-1 transition-all">
                  <span className="text-2xl font-bold font-display text-primary block">
                    {plannerWatchlist?.draftDecisionsCount || 0}
                  </span>
                  <span className="text-xs font-medium text-text-muted">
                    Décisions brouillon
                  </span>
                </div>
              </Link>
            </div>
          </Card>
        </section>
      )}

      {/* Mini synthèse des indicateurs */}
      {miniMetrics && (
        <section aria-label="Mini synthèse des indicateurs">
          <Card className="p-5 space-y-4 shadow-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h2 className="font-display font-bold text-base text-primary">
                  Santé du club (ce mois-ci)
                </h2>
              </div>
              <Link
                href="/indicateurs"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>Voir les 5 indicateurs</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-md bg-surface-muted border border-border space-y-1">
                <span className="text-xs text-text-muted block font-medium">
                  La Seule Chose
                </span>
                <div className="flex items-baseline gap-1 font-display font-bold text-2xl text-primary">
                  <span>
                    {miniMetrics.priority?.has_data
                      ? `${miniMetrics.priority.percent}%`
                      : "—"}
                  </span>
                </div>
                <span className="text-[11px] text-text-muted">Objectif 100%</span>
              </div>

              <div className="p-3.5 rounded-md bg-surface-muted border border-border space-y-1">
                <span className="text-xs text-text-muted block font-medium">
                  Tâches dans les délais
                </span>
                <div className="flex items-baseline gap-1 font-display font-bold text-2xl text-primary">
                  <span>
                    {miniMetrics.ontime_tasks?.has_data
                      ? `${miniMetrics.ontime_tasks.rate}%`
                      : "—"}
                  </span>
                </div>
                <span className="text-[11px] text-text-muted">Objectif 85%</span>
              </div>

              <div className="p-3.5 rounded-md bg-surface-muted border border-border space-y-1">
                <span className="text-xs text-text-muted block font-medium">
                  Réunions de 45 min
                </span>
                <div className="flex items-baseline gap-1 font-display font-bold text-2xl text-primary">
                  <span>
                    {miniMetrics.meeting_time?.has_data
                      ? `${miniMetrics.meeting_time.rate}%`
                      : "—"}
                  </span>
                </div>
                <span className="text-[11px] text-text-muted">Objectif 100%</span>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* 4. Grille principale des activités */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Prochaine réunion */}
        <Card staggerIndex={1} className="flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <Calendar className="w-5 h-5" />
                </div>
                <h2 className="font-display font-bold text-lg text-primary">
                  {copy.home.nextMeeting.sectionTitle}
                </h2>
              </div>

              {nextMeeting && mounted && (
                <span className="text-xs font-semibold text-text-muted tabular-nums">
                  {formatCountdown(nextMeeting.starts_at)}
                </span>
              )}
            </div>

            {nextMeeting ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold text-base text-text">
                      <Link
                        href={`/reunions/${nextMeeting.id}`}
                        className="hover:underline focus-visible:outline-none"
                      >
                        {nextMeeting.title}
                      </Link>
                    </h3>
                    {nextMeeting.is_improvised && <ImprovisedBadge />}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatOuagaDateTime(nextMeeting.starts_at)}
                    </span>
                    {nextMeeting.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {nextMeeting.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* RSVP confirmation boutons */}
                <div className="pt-2 border-t border-border space-y-2">
                  <span className="text-xs font-medium text-text-muted block">
                    {copy.home.nextMeeting.rsvpTitle}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={rsvpSaving}
                      onClick={() => handleRsvp(nextMeeting.id, "yes")}
                      className={`py-2 px-2 rounded-pill text-xs font-semibold border transition-all touch-target-min flex items-center justify-center gap-1 ${
                        nextMeeting.user_rsvp === "yes"
                          ? "bg-success text-white border-success shadow-1"
                          : "bg-white text-text border-border hover:bg-surface-muted"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{copy.home.nextMeeting.rsvpYes}</span>
                    </button>

                    <button
                      type="button"
                      disabled={rsvpSaving}
                      onClick={() => handleRsvp(nextMeeting.id, "maybe")}
                      className={`py-2 px-2 rounded-pill text-xs font-semibold border transition-all touch-target-min flex items-center justify-center ${
                        nextMeeting.user_rsvp === "maybe"
                          ? "bg-[#F7E7C4] text-[#232D6B] border-accent shadow-1"
                          : "bg-white text-text border-border hover:bg-surface-muted"
                      }`}
                    >
                      <span>{copy.home.nextMeeting.rsvpMaybe}</span>
                    </button>

                    <button
                      type="button"
                      disabled={rsvpSaving}
                      onClick={() => handleRsvp(nextMeeting.id, "no")}
                      className={`py-2 px-2 rounded-pill text-xs font-semibold border transition-all touch-target-min flex items-center justify-center ${
                        nextMeeting.user_rsvp === "no"
                          ? "bg-alert text-white border-alert shadow-1"
                          : "bg-white text-text border-border hover:bg-surface-muted"
                      }`}
                    >
                      <span>{copy.home.nextMeeting.rsvpNo}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center bg-surface-muted/50 rounded-sm border border-dashed border-border">
                <p className="text-sm text-text-muted">
                  {copy.home.nextMeeting.emptyMessage}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* À valider (Décisions en attente de l'utilisateur) */}
        <Card staggerIndex={2} className="flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-full bg-alert/10 text-alert">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <h2 className="font-display font-bold text-lg text-primary">
                  {copy.home.toValidate.sectionTitle}
                </h2>
              </div>

              {decisionsToValidate.length > 0 && (
                <Badge variant="alert">{decisionsToValidate.length} en attente</Badge>
              )}
            </div>

            {decisionsToValidate.length === 0 ? (
              <div className="py-8 text-center bg-surface-muted/50 rounded-sm border border-dashed border-border space-y-1">
                <p className="text-sm text-text-muted font-medium">
                  {copy.home.toValidate.emptyMessage}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {decisionsToValidate.slice(0, 3).map((decision) => {
                  const isSuccess = validatedSuccessId === decision.id;
                  const isValidating = validatingId === decision.id;

                  return (
                    <div
                      key={decision.id}
                      className="p-3.5 rounded-sm bg-surface-muted/70 border border-border flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 flex-1">
                        <Link
                          href={`/decisions/${decision.id}`}
                          className="font-medium text-sm text-text hover:underline block leading-snug"
                        >
                          {decision.text}
                        </Link>
                        {mounted && decision.validation_deadline && (
                          <span className="text-xs text-alert font-medium block tabular-nums">
                            {formatValidationRemaining(decision.validation_deadline)}
                          </span>
                        )}
                      </div>

                      <Button
                        variant={isSuccess ? "secondary" : "primary"}
                        onClick={() => handleValidateDecision(decision.id)}
                        isLoading={isValidating}
                        className={`text-xs px-3.5 py-1.5 min-h-[38px] shrink-0 transition-transform duration-300 ${
                          isSuccess ? "scale-105 bg-success text-white border-success" : ""
                        }`}
                      >
                        {isSuccess ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : (
                          <span>{copy.home.toValidate.validateButton}</span>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Mes tâches non terminées */}
        <Card staggerIndex={3} className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-full bg-success/15 text-success">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h2 className="font-display font-bold text-lg text-primary">
                {copy.home.myTasks.sectionTitle}
              </h2>
            </div>

            <Link
              href="/taches"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Voir tout le tableau
            </Link>
          </div>

          {initialMyTasks.length === 0 ? (
            <div className="py-8 text-center bg-surface-muted/50 rounded-sm border border-dashed border-border">
              <p className="text-sm text-text-muted">
                {copy.home.myTasks.emptyMessage}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {initialMyTasks.slice(0, 6).map((task) => (
                <Link
                  key={task.id}
                  href={`/taches/${task.id}`}
                  className="block p-3.5 rounded-sm bg-surface-muted/70 border border-border hover:border-primary/40 hover:bg-surface-muted transition-all"
                >
                  <div className="space-y-2">
                    <div className="font-medium text-sm text-text line-clamp-2">
                      {task.title}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <DueDateBadge dueDate={task.due_date} />
                      {task.priority_id && (
                        <Badge variant="accent" className="text-[10px] py-0 px-2">
                          Priorité
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Modale d'édition / proposition de priorité (Planificateurs) */}
      {showPriorityModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in-up"
          onClick={() => setShowPriorityModal(false)}
        >
          <div
            className="bg-white rounded-lg border border-border shadow-2 max-w-lg w-full p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="priority-modal-title"
          >
            <div className="border-b border-border pb-3">
              <h3
                id="priority-modal-title"
                className="font-display font-bold text-xl text-primary"
              >
                {copy.home.priority.sheetTitle}
              </h3>
              <p className="text-sm text-text-muted mt-1">
                {copy.home.priority.sheetSubtitle}
              </p>
            </div>

            <form onSubmit={handleProposePriority} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="priority-title"
                  className="block text-sm font-medium text-text"
                >
                  {copy.home.priority.titleLabel}
                </label>
                <input
                  id="priority-title"
                  type="text"
                  maxLength={80}
                  required
                  placeholder={copy.home.priority.titlePlaceholder}
                  value={priorityTitle}
                  onChange={(e) => setPriorityTitle(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 bg-white text-text rounded-sm border-[1.5px] border-border focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="priority-desc"
                  className="block text-sm font-medium text-text"
                >
                  {copy.home.priority.descLabel}
                </label>
                <textarea
                  id="priority-desc"
                  maxLength={300}
                  rows={3}
                  placeholder={copy.home.priority.descPlaceholder}
                  value={priorityDesc}
                  onChange={(e) => setPriorityDesc(e.target.value)}
                  className="w-full p-3 bg-white text-text rounded-sm border-[1.5px] border-border focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowPriorityModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmittingPriority}
                >
                  {copy.home.priority.proposeButton}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
