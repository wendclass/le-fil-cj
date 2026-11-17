"use client";

import React from "react";
import Link from "next/link";
import {
  MessageSquare,
  Copy,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DueDateBadge } from "@/components/ui/DueDateBadge";
import { useToast } from "@/components/ui/Toast";
import { copy } from "@/lib/copy";
import { formatOuagaDate } from "@/lib/date";
import type { Profile } from "@/types/database";

export interface UnseenTaskItem {
  id: string;
  title: string;
  assignee: Profile;
  due_date: string;
  created_at: string;
}

export interface UnreadDecisionItem {
  id: string;
  text: string;
  published_at: string;
  validation_deadline: string | null;
  unreadMembers: Profile[];
  totalMembers: number;
}

export interface OverdueTaskItem {
  id: string;
  title: string;
  assignee: Profile;
  due_date: string;
  daysLate: number;
}

interface TrackingDashboardProps {
  unseenTasks: UnseenTaskItem[];
  unreadDecisions: UnreadDecisionItem[];
  overdueTasks: OverdueTaskItem[];
  siteUrl: string;
}

export const TrackingDashboard: React.FC<TrackingDashboardProps> = ({
  unseenTasks,
  unreadDecisions,
  overdueTasks,
  siteUrl,
}) => {
  const { showToast } = useToast();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(copy.tracking.copiedToast, "success");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      {/* En-tête */}
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-accent font-display">
          Espace planificateurs
        </span>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary tracking-tight">
          {copy.tracking.title}
        </h1>
        <p className="font-body text-base text-text-muted">
          {copy.tracking.subtitle}
        </p>
      </div>

      {/* 1. Tâches non ouvertes depuis +24 h */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-lg text-primary">
              {copy.tracking.blockUnseenTasks}
            </h2>
            <Badge variant={unseenTasks.length > 0 ? "alert" : "neutral"}>
              {unseenTasks.length}
            </Badge>
          </div>
        </div>

        {unseenTasks.length === 0 ? (
          <Card className="p-6 text-center text-sm text-text-muted italic bg-surface-muted">
            <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-2" />
            <p>{copy.tracking.emptyUnseenTasks}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {unseenTasks.map((t) => {
              const firstName = t.assignee.full_name?.split(" ")[0] || "Membre";
              const taskLink = `${siteUrl}/taches/${t.id}`;
              const message = `Salut ${firstName}, tu as une tâche sur Le Fil : « ${t.title} ». Échéance le ${formatOuagaDate(t.due_date)}. Dis-moi si tu as besoin d’aide ! ${taskLink}`;
              const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

              return (
                <Card
                  key={t.id}
                  className="p-5 border-l-4 border-l-alert space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <Link
                        href={`/taches/${t.id}`}
                        className="font-display font-bold text-base text-text hover:text-primary transition-colors flex items-center gap-1.5"
                      >
                        <span>{t.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
                      </Link>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-primary" />
                          <strong className="text-text">
                            {t.assignee.full_name || t.assignee.email}
                          </strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          Échéance : {formatOuagaDate(t.due_date)}
                        </span>
                        <Badge variant="alert">Non ouverte depuis +24 h</Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 sm:pt-0 shrink-0">
                      <Button
                        variant="secondary"
                        className="text-xs min-h-[36px] py-1 px-3"
                        onClick={() => handleCopy(message)}
                      >
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        <span>{copy.tracking.copyMessageButton}</span>
                      </Button>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex"
                      >
                        <Button
                          variant="primary"
                          className="text-xs min-h-[36px] py-1 px-3 bg-[#25D366] hover:bg-[#20ba59] text-white border-none"
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1" />
                          <span>{copy.tracking.whatsappRemindButton}</span>
                        </Button>
                      </a>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. Décisions non lues depuis +24 h */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-lg text-primary">
              {copy.tracking.blockUnseenDecisions}
            </h2>
            <Badge variant={unreadDecisions.length > 0 ? "alert" : "neutral"}>
              {unreadDecisions.length}
            </Badge>
          </div>
        </div>

        {unreadDecisions.length === 0 ? (
          <Card className="p-6 text-center text-sm text-text-muted italic bg-surface-muted">
            <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-2" />
            <p>{copy.tracking.emptyUnseenDecisions}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {unreadDecisions.map((d) => {
              const names = d.unreadMembers
                .map((m) => m.full_name?.split(" ")[0] || "Membre")
                .slice(0, 3)
                .join(", ") + (d.unreadMembers.length > 3 ? " et d’autres" : "");
              const decLink = `${siteUrl}/decisions/${d.id}`;
              const message = `Salut ${names}, il te reste 24 h pour valider la décision : « ${d.text.slice(0, 80)}${d.text.length > 80 ? "..." : ""} ». Merci ! ${decLink}`;
              const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

              return (
                <Card
                  key={d.id}
                  className="p-5 border-l-4 border-l-accent space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-2">
                      <Link
                        href={`/decisions/${d.id}`}
                        className="font-display font-bold text-base text-text hover:text-primary transition-colors flex items-center gap-1.5"
                      >
                        <span className="line-clamp-2">{d.text}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      </Link>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="alert">
                          {d.unreadMembers.length}/{d.totalMembers} non-lecteurs
                        </Badge>
                        <span className="text-text-muted">
                          Non lu par :{" "}
                          <strong className="text-text">
                            {d.unreadMembers
                              .map((m) => m.full_name || m.email)
                              .join(", ")}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                      <Button
                        variant="secondary"
                        className="text-xs min-h-[36px] py-1 px-3"
                        onClick={() => handleCopy(message)}
                      >
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        <span>{copy.tracking.copyMessageButton}</span>
                      </Button>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex"
                      >
                        <Button
                          variant="primary"
                          className="text-xs min-h-[36px] py-1 px-3 bg-[#25D366] hover:bg-[#20ba59] text-white border-none"
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1" />
                          <span>{copy.tracking.whatsappRemindButton}</span>
                        </Button>
                      </a>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Tâches en retard */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-lg text-primary">
              {copy.tracking.blockOverdueTasks}
            </h2>
            <Badge variant={overdueTasks.length > 0 ? "alert" : "neutral"}>
              {overdueTasks.length}
            </Badge>
          </div>
        </div>

        {overdueTasks.length === 0 ? (
          <Card className="p-6 text-center text-sm text-text-muted italic bg-surface-muted">
            <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-2" />
            <p>{copy.tracking.emptyOverdueTasks}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {overdueTasks.map((t) => {
              const firstName = t.assignee.full_name?.split(" ")[0] || "Membre";
              const taskLink = `${siteUrl}/taches/${t.id}`;
              const message = `Salut ${firstName}, ta tâche « ${t.title} » est arrivée à échéance le ${formatOuagaDate(t.due_date)}. Est-ce que tu as pu avancer ou est-ce qu’on peut t’aider à la finaliser ? ${taskLink}`;
              const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

              return (
                <Card
                  key={t.id}
                  className="p-5 border-l-4 border-l-alert space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <Link
                        href={`/taches/${t.id}`}
                        className="font-display font-bold text-base text-text hover:text-primary transition-colors flex items-center gap-1.5"
                      >
                        <span>{t.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
                      </Link>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-primary" />
                          <strong className="text-text">
                            {t.assignee.full_name || t.assignee.email}
                          </strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-alert" />
                          Échéance : {formatOuagaDate(t.due_date)}
                        </span>
                        <Badge variant="alert">
                          En retard ({t.daysLate} jour{t.daysLate > 1 ? "s" : ""})
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 sm:pt-0 shrink-0">
                      <Button
                        variant="secondary"
                        className="text-xs min-h-[36px] py-1 px-3"
                        onClick={() => handleCopy(message)}
                      >
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        <span>{copy.tracking.copyMessageButton}</span>
                      </Button>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex"
                      >
                        <Button
                          variant="primary"
                          className="text-xs min-h-[36px] py-1 px-3 bg-[#25D366] hover:bg-[#20ba59] text-white border-none"
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1" />
                          <span>{copy.tracking.whatsappRemindButton}</span>
                        </Button>
                      </a>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
