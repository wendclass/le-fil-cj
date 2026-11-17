"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Settings,
  Calendar,
  FileCheck2,
  CheckSquare,
  Sparkles,
  ArrowRight,
  Inbox,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";
import { formatRelativeTime } from "@/lib/date";
import type { AppNotification } from "@/types/database";

interface NotificationsListProps {
  userId: string;
  initialNotifications: AppNotification[];
}

export const NotificationsList: React.FC<NotificationsListProps> = ({
  userId,
  initialNotifications,
}) => {
  const router = useRouter();
  const { showToast } = useToast();
  const [notifications, setNotifications] =
    useState<AppNotification[]>(initialNotifications);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // Écouter les nouvelles notifications en temps réel
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifs-center-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as AppNotification;
          setNotifications((prev) => [newNotif, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const handleMarkAsRead = async (notif: AppNotification) => {
    if (!notif.read_at) {
      const nowIso = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read_at: nowIso } : n))
      );

      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({ read_at: nowIso })
        .eq("id", notif.id);
    }

    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;

    try {
      setIsMarkingAll(true);
      const nowIso = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || nowIso }))
      );

      const supabase = createClient();
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: nowIso })
        .eq("user_id", userId)
        .is("read_at", null);

      if (error) {
        showToast(error.message, "error");
        setIsMarkingAll(false);
        return;
      }

      showToast(copy.notifications.allMarkedReadToast, "success");
      setIsMarkingAll(false);
    } catch {
      showToast(copy.app.errorGeneric, "error");
      setIsMarkingAll(false);
    }
  };

  const getNotificationIcon = (kind: string) => {
    switch (kind) {
      case "meeting_convocation":
      case "meeting_live":
      case "meeting_reminder_eve":
      case "meeting_reminder_2h":
        return <Calendar className="w-5 h-5 text-primary" />;
      case "decisions_published":
        return <FileCheck2 className="w-5 h-5 text-accent" />;
      case "task_assigned":
      case "task_reminder_2d":
      case "task_reminder_today":
        return <CheckSquare className="w-5 h-5 text-[#25D366]" />;
      default:
        return <Sparkles className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary tracking-tight">
              {copy.notifications.title}
            </h1>
            {unreadCount > 0 && (
              <Badge variant="alert">
                {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <p className="font-body text-sm text-text-muted mt-1">
            {copy.notifications.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              className="text-xs min-h-[36px] py-1 px-3"
              onClick={handleMarkAllAsRead}
              isLoading={isMarkingAll}
            >
              <CheckCheck className="w-4 h-4 mr-1.5 text-primary" />
              <span>{copy.notifications.markAllRead}</span>
            </Button>
          )}

          <Link href="/parametres">
            <Button
              variant="ghost"
              className="text-xs min-h-[36px] py-1 px-3 text-text-muted hover:text-text"
            >
              <Settings className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Paramètres</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Liste des notifications */}
      {notifications.length === 0 ? (
        <Card className="p-8 text-center space-y-3 bg-surface-muted">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <h2 className="font-display font-bold text-lg text-text">
            {copy.notifications.emptyState}
          </h2>
          <p className="text-sm text-text-muted max-w-sm mx-auto">
            {copy.notifications.emptyStateDesc}
          </p>
          <div className="pt-2">
            <Link href="/parametres">
              <Button variant="secondary" className="text-xs">
                Vérifier mes réglages de notifications
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const isUnread = !notif.read_at;
            return (
              <div
                key={notif.id}
                onClick={() => handleMarkAsRead(notif)}
                className={`p-4 rounded-md border transition-all cursor-pointer flex items-start gap-3.5 ${
                  isUnread
                    ? "bg-white border-primary/40 shadow-1 hover:border-primary"
                    : "bg-surface-muted border-border/80 hover:bg-white text-text-muted"
                }`}
              >
                {/* Icône */}
                <div
                  className={`p-2 rounded-full shrink-0 ${
                    isUnread ? "bg-primary/10" : "bg-border/40"
                  }`}
                >
                  {getNotificationIcon(notif.kind)}
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`text-sm font-semibold truncate ${
                        isUnread ? "text-primary" : "text-text"
                      }`}
                    >
                      {notif.title}
                    </h3>
                    <span className="text-[11px] text-text-muted shrink-0 tabular-nums">
                      {formatRelativeTime(notif.created_at)}
                    </span>
                  </div>

                  {notif.body && (
                    <p
                      className={`text-xs line-clamp-2 ${
                        isUnread ? "text-text" : "text-text-muted"
                      }`}
                    >
                      {notif.body}
                    </p>
                  )}
                </div>

                {/* Point bleu si non lue */}
                {isUnread && (
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 self-center"
                    aria-label="Non lue"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lien vers réglages */}
      <div className="pt-4 text-center">
        <Link
          href="/parametres"
          className="text-xs font-semibold text-text-muted hover:text-primary transition-colors inline-flex items-center gap-1"
        >
          <span>Réglages des notifications sur cet appareil</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
