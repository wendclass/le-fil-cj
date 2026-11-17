"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Share2,
  Copy,
  Check,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  MessageSquare,
  AlertTriangle,
  Radio,
  ExternalLink,
  Users,
} from "lucide-react";
import { PatternBand } from "@/components/ui/PatternBand";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { LiveMeetingBadge } from "@/components/ui/LiveMeetingBadge";
import { ImprovisedBadge } from "@/components/ui/ImprovisedBadge";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";
import { formatOuagaDateTime, formatCountdown } from "@/lib/date";
import type {
  Profile,
  Meeting,
  AgendaItem,
  Attendance,
  Decision,
  RsvpStatus,
} from "@/types/database";

interface MeetingDetailViewProps {
  profile: Profile;
  initialMeeting: Meeting;
  initialAgendaItems: AgendaItem[];
  initialAttendance: Attendance[];
  initialDecisions: Decision[];
  allProfiles: Profile[];
  siteUrl: string;
  isJustCreated?: boolean;
}

export const MeetingDetailView: React.FC<MeetingDetailViewProps> = ({
  profile,
  initialMeeting,
  initialAgendaItems,
  initialAttendance,
  initialDecisions,
  allProfiles,
  siteUrl,
  isJustCreated = false,
}) => {
  const router = useRouter();
  const { showToast } = useToast();
  const isPlanner = profile.role === "planner";

  const [meeting, setMeeting] = useState<Meeting>(initialMeeting);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>(initialAgendaItems);
  const [attendance, setAttendance] = useState<Attendance[]>(initialAttendance);
  const [decisions, setDecisions] = useState<Decision[]>(initialDecisions);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Modal d'ajout de point d'ordre du jour
  const [showAddAgenda, setShowAddAgenda] = useState(false);
  const [agendaTitle, setAgendaTitle] = useState("");
  const [agendaDetails, setAgendaDetails] = useState("");
  const [agendaMinutes, setAgendaMinutes] = useState(5);
  const [isAddingAgenda, setIsAddingAgenda] = useState(false);

  // Modal de proposition de sujet par membre
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [proposeTitle, setProposeTitle] = useState("");
  const [proposeReason, setProposeReason] = useState("");
  const [isProposing, setIsProposing] = useState(false);

  // Modal de refus de sujet
  const [rejectingItemId, setRejectingItemId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // Modal d'annulation de réunion
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Montage côté client
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Écoute Supabase Realtime si réunion en direct
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`meeting-${meeting.id}`)
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
          event: "*",
          schema: "public",
          table: "agenda_items",
          filter: `meeting_id=eq.${meeting.id}`,
        },
        () => {
          // Recharger les points d'ordre du jour
          supabase
            .from("agenda_items")
            .select("*")
            .eq("meeting_id", meeting.id)
            .order("position", { ascending: true })
            .then(({ data }) => {
              if (data) setAgendaItems(data as AgendaItem[]);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meeting.id]);

  // Points validés vs proposés
  const validatedItems = agendaItems.filter((item) => item.status === "validated");
  const proposedItems = agendaItems.filter((item) => item.status === "proposed");
  const rejectedItems = agendaItems.filter((item) => item.status === "rejected");

  const totalValidatedMinutes = validatedItems.reduce(
    (acc, item) => acc + item.allotted_minutes,
    0
  );
  const isOverTime = totalValidatedMinutes > meeting.planned_minutes;

  // Réponse de l'utilisateur courant
  const currentUserAttendance = attendance.find((a) => a.user_id === profile.id);
  const userRsvp = currentUserAttendance?.rsvp || null;

  // Message de convocation
  const meetingUrl = `${siteUrl}/reunions/${meeting.id}`;
  const dateTimeStr = formatOuagaDateTime(meeting.starts_at);
  const convocationMessage = copy.meetings.share.convocationTemplate(
    meeting.title,
    dateTimeStr,
    meeting.location || "Lieu à confirmer",
    meeting.planned_minutes,
    meetingUrl
  );

  const handleCopyConvocation = async () => {
    try {
      await navigator.clipboard.writeText(convocationMessage);
      setCopiedNotice(true);
      showToast(copy.meetings.share.copiedNotice, "success");
      setTimeout(() => setCopiedNotice(false), 2500);
    } catch {
      showToast(copy.app.errorGeneric, "error");
    }
  };

  const handleRsvp = async (rsvp: RsvpStatus) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("attendance").upsert(
        {
          meeting_id: meeting.id,
          user_id: profile.id,
          rsvp,
        },
        { onConflict: "meeting_id,user_id" }
      );

      if (error) {
        showToast(error.message, "error");
        return;
      }

      setAttendance((prev) => {
        const existing = prev.filter((a) => a.user_id !== profile.id);
        return [...existing, { meeting_id: meeting.id, user_id: profile.id, rsvp, present: false }];
      });
      showToast(copy.home.nextMeeting.rsvpSaved, "success");
    } catch {
      showToast(copy.app.errorGeneric, "error");
    }
  };

  // Ajout d'un point à l'ordre du jour par planificateur
  const handleAddAgendaItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agendaTitle.trim()) return;

    if (totalValidatedMinutes + agendaMinutes > meeting.planned_minutes) {
      showToast(copy.meetings.detail.agendaFullError, "error");
      return;
    }

    try {
      setIsAddingAgenda(true);
      const supabase = createClient();

      const newPos = validatedItems.length;
      const { data, error } = await supabase
        .from("agenda_items")
        .insert({
          meeting_id: meeting.id,
          title: agendaTitle.trim(),
          details: agendaDetails.trim() || null,
          allotted_minutes: agendaMinutes,
          position: newPos,
          status: "validated",
          proposed_by: profile.id,
        })
        .select()
        .single();

      if (error) {
        showToast(error.message, "error");
        setIsAddingAgenda(false);
        return;
      }

      setAgendaItems((prev) => [...prev, data as AgendaItem]);
      setShowAddAgenda(false);
      setAgendaTitle("");
      setAgendaDetails("");
      setAgendaMinutes(5);
      setIsAddingAgenda(false);
      showToast("Point ajouté à l’ordre du jour.", "success");
    } catch {
      showToast(copy.app.errorGeneric, "error");
      setIsAddingAgenda(false);
    }
  };

  // Proposition de sujet par un membre
  const handleProposeTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposeTitle.trim()) return;

    try {
      setIsProposing(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("agenda_items")
        .insert({
          meeting_id: meeting.id,
          title: proposeTitle.trim().slice(0, 80),
          details: proposeReason.trim() || null,
          allotted_minutes: 5,
          status: "proposed",
          proposed_by: profile.id,
        })
        .select()
        .single();

      if (error) {
        showToast(error.message, "error");
        setIsProposing(false);
        return;
      }

      setAgendaItems((prev) => [...prev, data as AgendaItem]);
      setShowProposeModal(false);
      setProposeTitle("");
      setProposeReason("");
      setIsProposing(false);
      showToast("Sujet proposé aux planificateurs.", "success");
    } catch {
      showToast(copy.app.errorGeneric, "error");
      setIsProposing(false);
    }
  };

  // Validation d'un sujet proposé (Planificateur)
  const handleValidateProposedTopic = async (item: AgendaItem, minutes: number) => {
    if (totalValidatedMinutes + minutes > meeting.planned_minutes) {
      showToast(copy.meetings.detail.agendaFullError, "error");
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("agenda_items")
        .update({
          status: "validated",
          allotted_minutes: minutes,
          position: validatedItems.length,
        })
        .eq("id", item.id)
        .select()
        .single();

      if (error) {
        showToast(error.message, "error");
        return;
      }

      setAgendaItems((prev) => prev.map((i) => (i.id === item.id ? (data as AgendaItem) : i)));
      showToast("Sujet validé et intégré à l’ordre du jour.", "success");
    } catch {
      showToast(copy.app.errorGeneric, "error");
    }
  };

  // Refus d'un sujet proposé (Planificateur)
  const handleRejectProposedTopic = async () => {
    if (!rejectingItemId) return;

    try {
      setIsRejecting(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("agenda_items")
        .update({
          status: "rejected",
          reject_reason: rejectReason.trim() || null,
        })
        .eq("id", rejectingItemId)
        .select()
        .single();

      if (error) {
        showToast(error.message, "error");
        setIsRejecting(false);
        return;
      }

      setAgendaItems((prev) =>
        prev.map((i) => (i.id === rejectingItemId ? (data as AgendaItem) : i))
      );
      setRejectingItemId(null);
      setRejectReason("");
      setIsRejecting(false);
      showToast("Sujet refusé.", "info");
    } catch {
      showToast(copy.app.errorGeneric, "error");
      setIsRejecting(false);
    }
  };

  // Annulation de la réunion (Planificateur)
  const handleCancelMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;

    try {
      setIsCancelling(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("meetings")
        .update({
          status: "cancelled",
          description: `[Annulée : ${cancelReason.trim()}] ${meeting.description || ""}`,
        })
        .eq("id", meeting.id)
        .select()
        .single();

      if (error) {
        showToast(error.message, "error");
        setIsCancelling(false);
        return;
      }

      setMeeting(data as Meeting);
      setShowCancelModal(false);
      setIsCancelling(false);
      showToast("Réunion annulée.", "info");
    } catch {
      showToast(copy.app.errorGeneric, "error");
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Bandeau d'alerte si réunion en direct */}
      {meeting.status === "live" && (
        <Card className="bg-alert/10 border-alert text-alert p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Radio className="w-6 h-6 animate-pulse shrink-0" />
            <div>
              <h2 className="font-display font-bold text-base text-alert">
                {copy.meetings.detail.liveBannerTitle}
              </h2>
              <p className="text-xs text-text-muted">
                La séance se déroule en ce moment selon l’ordre du jour.
              </p>
            </div>
          </div>
          {isPlanner && (
            <Link href={`/reunions/${meeting.id}/direct`}>
              <Button variant="danger" className="min-h-[42px] py-2 px-4 text-xs font-semibold">
                {copy.meetings.detail.joinLiveButton}
              </Button>
            </Link>
          )}
        </Card>
      )}

      {/* Bandeau de partage WhatsApp et copie de convocation après création */}
      {(isJustCreated || isPlanner) && meeting.status === "planned" && (
        <Card className="p-4 sm:p-5 bg-surface-muted border-border space-y-3">
          <span className="text-xs font-display font-bold uppercase tracking-wider text-primary">
            Convoquer les membres du club
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(convocationMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-pill min-h-[44px] px-5 py-2.5 bg-[#25D366] text-white font-semibold text-sm shadow-1 hover:brightness-105 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>{copy.meetings.share.whatsappButton}</span>
            </a>

            <Button
              variant="secondary"
              onClick={handleCopyConvocation}
              className="text-sm min-h-[44px] py-2"
            >
              {copiedNotice ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              <span>{copiedNotice ? copy.meetings.share.copiedNotice : copy.meetings.share.copyNoticeButton}</span>
            </Button>
          </div>
        </Card>
      )}

      {/* En-tête de la réunion */}
      <Card className="p-6 md:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {meeting.status === "live" && <LiveMeetingBadge />}
            {meeting.is_improvised && <ImprovisedBadge />}
            {meeting.status === "cancelled" && <Badge variant="alert">Annulée</Badge>}
            {meeting.status === "done" && <Badge variant="success">Terminée</Badge>}
            <Badge variant="primary">{copy.meetings.durationLabel(meeting.planned_minutes)}</Badge>
          </div>

          {mounted && meeting.status === "planned" && (
            <span className="text-sm font-semibold text-text-muted tabular-nums">
              {formatCountdown(meeting.starts_at)}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary leading-tight">
            {meeting.title}
          </h1>
          {meeting.description && (
            <p className="font-body text-base text-text-muted leading-relaxed">
              {meeting.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted border-t border-border pt-4">
          <span className="flex items-center gap-1.5 font-medium text-text">
            <Clock className="w-4 h-4 text-primary" />
            {formatOuagaDateTime(meeting.starts_at)}
          </span>
          {meeting.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              {meeting.location}
            </span>
          )}
          {meeting.status === "done" && meeting.ended_at && (
            <span className="text-xs font-semibold text-success tabular-nums">
              {copy.meetings.detail.realDuration(
                Math.round(
                  (new Date(meeting.ended_at).getTime() - new Date(meeting.started_at || meeting.starts_at).getTime()) /
                    60000
                )
              )}
            </span>
          )}
        </div>

        {/* Boutons d'action : Rejoindre/Démarrer direct pour planificateurs, ou Annuler */}
        {isPlanner && meeting.status === "planned" && (
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
            <Link href={`/reunions/${meeting.id}/direct`}>
              <Button variant="primary">
                <Radio className="w-4 h-4 mr-1.5" />
                <span>{copy.meetings.live.startMeetingButton}</span>
              </Button>
            </Link>

            <Button
              variant="ghost"
              onClick={() => setShowCancelModal(true)}
              className="text-alert hover:bg-alert/10 text-xs"
            >
              {copy.meetings.detail.cancelMeetingButton}
            </Button>
          </div>
        )}
      </Card>

      {/* Confirmation RSVP de présence */}
      {meeting.status === "planned" && (
        <Card className="p-5 space-y-3">
          <h2 className="font-display font-bold text-base text-primary">
            {copy.home.nextMeeting.rsvpTitle}
          </h2>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => handleRsvp("yes")}
              className={`py-2.5 px-3 rounded-pill text-xs font-semibold border transition-all touch-target-min flex items-center justify-center gap-1.5 ${
                userRsvp === "yes"
                  ? "bg-success text-white border-success shadow-1"
                  : "bg-white text-text border-border hover:bg-surface-muted"
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{copy.home.nextMeeting.rsvpYes}</span>
            </button>

            <button
              type="button"
              onClick={() => handleRsvp("maybe")}
              className={`py-2.5 px-3 rounded-pill text-xs font-semibold border transition-all touch-target-min flex items-center justify-center ${
                userRsvp === "maybe"
                  ? "bg-[#F7E7C4] text-[#232D6B] border-accent shadow-1"
                  : "bg-white text-text border-border hover:bg-surface-muted"
              }`}
            >
              <span>{copy.home.nextMeeting.rsvpMaybe}</span>
            </button>

            <button
              type="button"
              onClick={() => handleRsvp("no")}
              className={`py-2.5 px-3 rounded-pill text-xs font-semibold border transition-all touch-target-min flex items-center justify-center ${
                userRsvp === "no"
                  ? "bg-alert text-white border-alert shadow-1"
                  : "bg-white text-text border-border hover:bg-surface-muted"
              }`}
            >
              <span>{copy.home.nextMeeting.rsvpNo}</span>
            </button>
          </div>
        </Card>
      )}

      {/* Ordre du jour avec jauge de temps */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-xl text-primary">
              {copy.meetings.detail.agendaTitle}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs font-bold tabular-nums ${
                  isOverTime ? "text-alert" : "text-text-muted"
                }`}
              >
                {copy.meetings.detail.agendaTimeUsage(
                  totalValidatedMinutes,
                  meeting.planned_minutes
                )}
              </span>
              {isOverTime && (
                <span className="text-xs font-medium text-alert flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {copy.meetings.detail.agendaOverTimeWarning}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowProposeModal(true)}
              className="text-xs min-h-[40px] py-2 px-3.5"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1" />
              <span>{copy.meetings.detail.proposeTopicButton}</span>
            </Button>

            {isPlanner && meeting.status === "planned" && (
              <Button
                variant="primary"
                onClick={() => setShowAddAgenda(true)}
                className="text-xs min-h-[40px] py-2 px-3.5"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Ajouter un point</span>
              </Button>
            )}
          </div>
        </div>

        {/* Barre de jauge de durée d'ordre du jour */}
        <div className="w-full h-2 rounded-pill bg-surface-muted overflow-hidden border border-border">
          <div
            className={`h-full rounded-pill transition-all duration-base ${
              isOverTime ? "bg-alert" : "bg-primary"
            }`}
            style={{
              width: `${Math.min(
                100,
                (totalValidatedMinutes / meeting.planned_minutes) * 100
              )}%`,
            }}
          />
        </div>

        {/* Liste des points validés */}
        {validatedItems.length === 0 ? (
          <Card className="py-8 text-center bg-surface-muted/50 border-dashed">
            <p className="text-sm text-text-muted">
              Aucun point n’a encore été ajouté à l’ordre du jour.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {validatedItems.map((item, idx) => (
              <Card
                key={item.id}
                className="p-4 flex items-start justify-between gap-3 bg-white"
              >
                <div className="flex items-start gap-3 flex-1">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-xs shrink-0 mt-0.5 tabular-nums">
                    {idx + 1}
                  </span>
                  <div className="space-y-1">
                    <h3 className="font-display font-semibold text-base text-text">
                      {item.title}
                    </h3>
                    {item.details && (
                      <p className="text-xs text-text-muted">{item.details}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="primary" className="tabular-nums">
                    {item.allotted_minutes} min
                  </Badge>

                  {/* Actions de réordonnancement pour planificateurs */}
                  {isPlanner && meeting.status === "planned" && (
                    <div className="flex items-center gap-1">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={async () => {
                            const newItems = [...validatedItems];
                            const temp = newItems[idx];
                            newItems[idx] = newItems[idx - 1];
                            newItems[idx - 1] = temp;
                            setAgendaItems(newItems);
                            const supabase = createClient();
                            await supabase
                              .from("agenda_items")
                              .update({ position: idx - 1 })
                              .eq("id", temp.id);
                            await supabase
                              .from("agenda_items")
                              .update({ position: idx })
                              .eq("id", newItems[idx].id);
                          }}
                          className="p-1 rounded-full text-text-muted hover:text-text touch-target-min"
                          aria-label="Monter ce point"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                      )}
                      {idx < validatedItems.length - 1 && (
                        <button
                          type="button"
                          onClick={async () => {
                            const newItems = [...validatedItems];
                            const temp = newItems[idx];
                            newItems[idx] = newItems[idx + 1];
                            newItems[idx + 1] = temp;
                            setAgendaItems(newItems);
                            const supabase = createClient();
                            await supabase
                              .from("agenda_items")
                              .update({ position: idx + 1 })
                              .eq("id", temp.id);
                            await supabase
                              .from("agenda_items")
                              .update({ position: idx })
                              .eq("id", newItems[idx].id);
                          }}
                          className="p-1 rounded-full text-text-muted hover:text-text touch-target-min"
                          aria-label="Descendre ce point"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Sujets proposés par les membres */}
      {(proposedItems.length > 0 || rejectedItems.length > 0) && (
        <section className="space-y-4">
          <h2 className="font-display font-bold text-xl text-primary">
            {copy.meetings.detail.memberTopicTitle}
          </h2>

          <div className="space-y-3">
            {proposedItems.map((item) => (
              <Card
                key={item.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-muted/70"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="accent">Proposé</Badge>
                    <h3 className="font-display font-semibold text-sm text-text">
                      {item.title}
                    </h3>
                  </div>
                  {item.details && (
                    <p className="text-xs text-text-muted italic">
                      « {item.details} »
                    </p>
                  )}
                </div>

                {isPlanner && meeting.status === "planned" && (
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      variant="primary"
                      onClick={() => handleValidateProposedTopic(item, 5)}
                      className="text-xs min-h-[36px] py-1 px-3"
                    >
                      {copy.meetings.detail.validateTopicButton} (5 min)
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setRejectingItemId(item.id)}
                      className="text-xs min-h-[36px] py-1 px-3 text-alert hover:bg-alert/10"
                    >
                      {copy.meetings.detail.rejectTopicButton}
                    </Button>
                  </div>
                )}
              </Card>
            ))}

            {rejectedItems.map((item) => (
              <Card
                key={item.id}
                className="p-4 opacity-70 bg-surface-muted border-dashed flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral">Refusé</Badge>
                    <span className="text-sm font-medium line-through text-text-muted">
                      {item.title}
                    </span>
                  </div>
                  {item.reject_reason && (
                    <p className="text-xs text-alert mt-1">
                      Motif : {item.reject_reason}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Décisions issues de cette réunion (si terminée) */}
      {decisions.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display font-bold text-xl text-primary">
            Décisions prises lors de cette réunion ({decisions.length})
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {decisions.map((dec) => (
              <Link key={dec.id} href={`/decisions/${dec.id}`} className="block">
                <Card className="p-4 hover:border-primary/40 flex items-center justify-between gap-3">
                  <span className="font-medium text-sm text-text">{dec.text}</span>
                  <ExternalLink className="w-4 h-4 text-text-muted shrink-0" />
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Section Présences nominative pour les planificateurs */}
      {isPlanner && (
        <section className="space-y-3">
          <h2 className="font-display font-bold text-xl text-primary">
            {copy.meetings.detail.attendanceTitle} ({allProfiles.length} membres)
          </h2>
          <Card className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {allProfiles.map((p) => {
                const att = attendance.find((a) => a.user_id === p.id);
                const rsvp = att?.rsvp;

                return (
                  <div
                    key={p.id}
                    className="p-3 rounded-md bg-surface-muted border border-border flex items-center justify-between gap-2"
                  >
                    <div className="truncate">
                      <span className="font-medium text-xs sm:text-sm text-text block truncate">
                        {p.full_name || p.email}
                      </span>
                      <span className="text-[11px] text-text-muted">
                        {p.role === "planner" ? "Planificateur" : "Membre"}
                      </span>
                    </div>

                    <Badge
                      variant={
                        rsvp === "yes" ? "success" : rsvp === "maybe" ? "accent" : rsvp === "no" ? "alert" : "neutral"
                      }
                      className="text-[10px] shrink-0"
                    >
                      {rsvp === "yes"
                        ? "Vient"
                        : rsvp === "maybe"
                        ? "Peut-être"
                        : rsvp === "no"
                        ? "Absent"
                        : "Sans réponse"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
      )}

      {/* Modal Ajout point ordre du jour (Planificateur) */}
      {showAddAgenda && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in-up"
          onClick={() => setShowAddAgenda(false)}
        >
          <div
            className="bg-white rounded-lg border border-border shadow-2 max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="add-agenda-title"
          >
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <h3 id="add-agenda-title" className="font-display font-bold text-lg text-primary">
                {copy.meetings.detail.addAgendaItemTitle}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddAgenda(false)}
                className="p-1 rounded-full text-text-muted hover:text-text touch-target-min"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAgendaItem} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="agenda-title" className="block text-sm font-medium text-text">
                  {copy.meetings.detail.itemTitleLabel} *
                </label>
                <Input
                  id="agenda-title"
                  type="text"
                  required
                  placeholder={copy.meetings.detail.itemTitlePlaceholder}
                  value={agendaTitle}
                  onChange={(e) => setAgendaTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="agenda-details" className="block text-sm font-medium text-text">
                  {copy.meetings.detail.itemDetailsLabel}
                </label>
                <Input
                  id="agenda-details"
                  type="text"
                  value={agendaDetails}
                  onChange={(e) => setAgendaDetails(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="agenda-min" className="block text-sm font-medium text-text">
                  {copy.meetings.detail.itemMinutesLabel}
                </label>
                <input
                  id="agenda-min"
                  type="number"
                  min={1}
                  max={45}
                  value={agendaMinutes}
                  onChange={(e) => setAgendaMinutes(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3.5 py-2.5 bg-white text-text rounded-sm border-[1.5px] border-border focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="secondary" onClick={() => setShowAddAgenda(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="primary" isLoading={isAddingAgenda}>
                  {copy.meetings.detail.addItemButton}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Proposition de sujet par un membre */}
      {showProposeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in-up"
          onClick={() => setShowProposeModal(false)}
        >
          <div
            className="bg-white rounded-lg border border-border shadow-2 max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="propose-topic-title"
          >
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <div>
                <h3 id="propose-topic-title" className="font-display font-bold text-lg text-primary">
                  {copy.meetings.detail.proposeModalTitle}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {copy.meetings.detail.proposeModalSubtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProposeModal(false)}
                className="p-1 rounded-full text-text-muted hover:text-text touch-target-min"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProposeTopic} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="propose-t" className="block text-sm font-medium text-text">
                  {copy.meetings.detail.proposeTitleLabel} *
                </label>
                <Input
                  id="propose-t"
                  type="text"
                  maxLength={80}
                  required
                  placeholder="Ex : Répartition du matériel pour le reportage"
                  value={proposeTitle}
                  onChange={(e) => setProposeTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="propose-r" className="block text-sm font-medium text-text">
                  {copy.meetings.detail.proposeReasonLabel} *
                </label>
                <textarea
                  id="propose-r"
                  rows={3}
                  required
                  placeholder="Explique pourquoi ce point doit être traité en réunion..."
                  value={proposeReason}
                  onChange={(e) => setProposeReason(e.target.value)}
                  className="w-full p-3 bg-white text-text text-sm rounded-sm border-[1.5px] border-border focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="secondary" onClick={() => setShowProposeModal(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="primary" isLoading={isProposing}>
                  {copy.meetings.detail.proposeSubmit}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Refus de sujet avec motif */}
      {rejectingItemId && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in-up"
          onClick={() => setRejectingItemId(null)}
        >
          <div
            className="bg-white rounded-lg border border-border shadow-2 max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="reject-topic-title"
          >
            <h3 id="reject-topic-title" className="font-display font-bold text-lg text-alert">
              Refuser ce sujet
            </h3>
            <p className="text-xs text-text-muted">
              Indique un motif court pour le membre proposant (facultatif).
            </p>

            <Input
              placeholder={copy.meetings.detail.rejectReasonPlaceholder}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setRejectingItemId(null)}>
                Annuler
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleRejectProposedTopic}
                isLoading={isRejecting}
              >
                Confirmer le refus
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Annulation de réunion */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in-up"
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="bg-white rounded-lg border border-border shadow-2 max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="cancel-meeting-title"
          >
            <h3 id="cancel-meeting-title" className="font-display font-bold text-lg text-alert">
              {copy.meetings.detail.cancelModalTitle}
            </h3>

            <form onSubmit={handleCancelMeeting} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="cancel-r" className="block text-sm font-medium text-text">
                  {copy.meetings.detail.cancelReasonLabel} *
                </label>
                <Input
                  id="cancel-r"
                  type="text"
                  required
                  placeholder="Ex : Indisponibilité majeure de la salle"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="secondary" onClick={() => setShowCancelModal(false)}>
                  Fermer
                </Button>
                <Button type="submit" variant="danger" isLoading={isCancelling}>
                  {copy.meetings.detail.cancelConfirmButton}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
