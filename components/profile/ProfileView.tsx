"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Shield,
  User,
  Mail,
  HelpCircle,
  X,
  ExternalLink,
  Flame,
  Award,
  Sparkles,
  Zap,
  BookOpen,
  Mic,
  CalendarCheck,
  CheckCircle2,
  Lock,
  Clock,
  MessageSquare,
  Edit3,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";
import { formatOuagaDate, formatOuagaDateTime } from "@/lib/date";
import type { Profile, UserBadge, PointsLog, BadgeKey } from "@/types/database";

interface ProfileViewProps {
  profile: Profile;
  planners: Profile[];
  userBadges: UserBadge[];
  pointsLog: PointsLog[];
}

interface BadgeConfig {
  key: BadgeKey;
  title: string;
  description: string;
  icon: React.FC<{ className?: string }>;
}

const BADGES_CONFIG: BadgeConfig[] = [
  {
    key: "first_task",
    title: copy.gamification.badges.first_task.title,
    description: copy.gamification.badges.first_task.description,
    icon: CheckCircle2,
  },
  {
    key: "five_on_time",
    title: copy.gamification.badges.five_on_time.title,
    description: copy.gamification.badges.five_on_time.description,
    icon: Zap,
  },
  {
    key: "series_ten",
    title: copy.gamification.badges.series_ten.title,
    description: copy.gamification.badges.series_ten.description,
    icon: Flame,
  },
  {
    key: "assiduous_reader",
    title: copy.gamification.badges.assiduous_reader.title,
    description: copy.gamification.badges.assiduous_reader.description,
    icon: BookOpen,
  },
  {
    key: "club_voice",
    title: copy.gamification.badges.club_voice.title,
    description: copy.gamification.badges.club_voice.description,
    icon: Mic,
  },
  {
    key: "always_there",
    title: copy.gamification.badges.always_there.title,
    description: copy.gamification.badges.always_there.description,
    icon: CalendarCheck,
  },
];

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  planners,
  userBadges = [],
  pointsLog = [],
}) => {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const earnedMap = new Map<string, string>();
  userBadges.forEach((b) => earnedMap.set(b.badge_key, b.earned_at));

  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "CJ";

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/connexion");
    } catch {
      router.push("/connexion");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up">
      {/* En-tête */}
      <div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary tracking-tight">
          {copy.profile.title}
        </h1>
        <p className="font-body text-base text-text-muted mt-1">
          {copy.profile.subtitle}
        </p>
      </div>

      {/* Profil & Badges de base */}
      <Card className="p-6 sm:p-8 space-y-6 border-t-4 border-t-[#F2B705]">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-2xl border-2 border-border shadow-1 shrink-0">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.full_name || "Avatar"}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-display font-bold text-xl text-text">
                  {profile.full_name || "Membre du Club"}
                </h2>
                {profile.poste?.label && (
                  <p className="text-[13px] text-text-muted font-body font-medium">
                    {profile.poste.label}
                  </p>
                )}
              </div>
              <Link href="/mon-nom?returnUrl=/profil">
                <Button variant="secondary" className="text-xs min-h-[36px] py-1 px-3 border border-primary">
                  <Edit3 className="w-3.5 h-3.5 mr-1 text-primary" />
                  <span>{copy.profile.editNameButton}</span>
                </Button>
              </Link>
            </div>
            <p className="text-sm text-text-muted font-body">{profile.email}</p>
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <Badge variant={profile.role === "planner" ? "primary" : "neutral"}>
                {profile.role === "planner" ? (
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    {copy.roles.planner}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {copy.roles.member}
                  </span>
                )}
              </Badge>
              {profile.poste?.label && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-semibold bg-[#FFF3C4] text-[#232D6B] border border-[#F2B705]">
                  {profile.poste.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Détails du compte */}
        <div className="border-t border-border pt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between py-1.5 border-b border-border/60">
            <span className="text-text-muted">Nom complet</span>
            <span className="font-medium text-text">{profile.full_name || "—"}</span>
          </div>
          {profile.poste?.label && (
            <div className="flex items-center justify-between py-1.5 border-b border-border/60">
              <span className="text-text-muted">{copy.profile.posteLabel}</span>
              <span className="font-semibold text-primary">{profile.poste.label}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-1.5 border-b border-border/60">
            <span className="text-text-muted">{copy.profile.emailLabel}</span>
            <span className="font-medium text-text">{profile.email}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-border/60">
            <span className="text-text-muted">{copy.profile.roleLabel}</span>
            <span className="font-medium text-text">
              {profile.role === "planner" ? copy.roles.planner : copy.roles.member}
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-border/60">
            <span className="text-text-muted">{copy.profile.joinedLabel}</span>
            <span className="font-medium text-text tabular-nums">
              {formatOuagaDate(profile.created_at)}
            </span>
          </div>
        </div>
      </Card>

      {/* Ludification discrète : Points personnels et Séries */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#F2B705]" />
            <h2 className="font-display font-bold text-lg text-primary">
              {copy.gamification.pointsLabel}
            </h2>
          </div>
          <span className="text-xs text-text-muted italic">
            Strictement personnel
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total des points */}
          <Card className="p-5 flex flex-col justify-between space-y-3 bg-white border-t-4 border-t-[#F2B705] shadow-1">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Score personnel
            </span>
            <div className="flex items-baseline gap-1 font-display font-extrabold text-3xl sm:text-4xl text-primary">
              <span>{profile.points || 0}</span>
              <span className="text-sm font-bold text-text-muted">points</span>
            </div>
            <p className="text-[11px] text-text-muted">
              Gagnés par ponctualité et assiduité
            </p>
          </Card>

          {/* Série en cours */}
          <Card className="p-5 flex flex-col justify-between space-y-3 bg-white border-t-4 border-t-[#187A4C] shadow-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                {copy.gamification.streakLabel}
              </span>
              <Flame className="w-4 h-4 text-[#F2B705]" />
            </div>
            <div className="flex items-baseline gap-1 font-display font-extrabold text-3xl sm:text-4xl text-primary">
              <span>{profile.streak || 0}</span>
              <span className="text-xs font-bold text-text-muted">à l’heure</span>
            </div>
            <p className="text-[11px] text-text-muted">
              Tâches consécutives livrées à temps
            </p>
          </Card>

          {/* Record personnel */}
          <Card className="p-5 flex flex-col justify-between space-y-3 bg-white border-t-4 border-t-primary shadow-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                {copy.gamification.bestStreakLabel}
              </span>
              <Award className="w-4 h-4 text-[#187A4C]" />
            </div>
            <div className="flex items-baseline gap-1 font-display font-extrabold text-3xl sm:text-4xl text-primary">
              <span>{profile.best_streak || 0}</span>
              <span className="text-xs font-bold text-text-muted">record</span>
            </div>
            <p className="text-[11px] text-text-muted">
              Meilleure régularité atteinte
            </p>
          </Card>
        </div>
      </section>

      {/* Badges de réussite (6 médaillons circulaires) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-lg text-primary">
              {copy.gamification.badgesTitle}
            </h2>
          </div>
          <Badge variant={userBadges.length > 0 ? "success" : "neutral"}>
            {copy.gamification.badgesEarnedCount(userBadges.length, BADGES_CONFIG.length)}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {BADGES_CONFIG.map((badge) => {
            const earnedAt = earnedMap.get(badge.key);
            const isEarned = Boolean(earnedAt);
            const Icon = badge.icon;

            return (
              <Card
                key={badge.key}
                className={`p-4 flex flex-col items-center text-center space-y-3 transition-all ${
                  isEarned
                    ? "bg-white border-primary/40 shadow-1 hover:border-primary"
                    : "bg-surface-muted/60 border-dashed border-border text-text-muted opacity-80"
                }`}
              >
                {/* Médaillon circulaire (vert et jaune) */}
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    isEarned
                      ? "bg-[#187A4C] text-[#FFF3C4] shadow-md ring-4 ring-[#FFF3C4] animate-badge-celebrate"
                      : "bg-border/60 text-text-muted ring-2 ring-transparent"
                  }`}
                  style={{
                    animationDuration: "600ms",
                  }}
                >
                  {isEarned ? (
                    <Icon className="w-7 h-7" />
                  ) : (
                    <Lock className="w-5 h-5 text-text-muted" />
                  )}
                </div>

                {/* Nom et condition */}
                <div className="space-y-1">
                  <h3
                    className={`font-display font-bold text-sm ${
                      isEarned ? "text-primary" : "text-text-muted"
                    }`}
                  >
                    {badge.title}
                  </h3>
                  <p className="text-[11px] text-text-muted leading-tight">
                    {badge.description}
                  </p>
                </div>

                {/* Statut d'obtention */}
                <div className="pt-1 mt-auto">
                  {isEarned ? (
                    <span className="text-[10px] font-semibold text-success flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{copy.gamification.badgeEarnedDate(formatOuagaDate(earnedAt!))}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-text-muted">
                      {copy.gamification.badgeLockedHint}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Historique des 10 derniers gains de points */}
      <section className="space-y-3">
        <h2 className="font-display font-bold text-base text-primary">
          {copy.gamification.historyTitle}
        </h2>

        {pointsLog.length === 0 ? (
          <Card className="p-6 text-center text-xs text-text-muted italic bg-surface-muted">
            {copy.gamification.noHistory}
          </Card>
        ) : (
          <Card className="divide-y divide-border/60 overflow-hidden">
            {pointsLog.map((log) => (
              <div
                key={log.id}
                className="p-3.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <span className="font-medium text-text block">
                    {log.reason}
                  </span>
                  <span className="text-[11px] text-text-muted tabular-nums">
                    {formatOuagaDateTime(log.created_at)}
                  </span>
                </div>
                <span className="font-bold text-xs px-2 py-0.5 rounded-full bg-success/15 text-success shrink-0">
                  +{log.delta} pts
                </span>
              </div>
            ))}
          </Card>
        )}
      </section>

      {/* Actions bas de page */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border">
        <Button
          variant="secondary"
          onClick={() => setShowSupportModal(true)}
          className="text-xs w-full sm:w-auto"
        >
          <HelpCircle className="w-4 h-4 mr-1.5 text-primary" />
          <span>{copy.profile.supportText}</span>
        </Button>

        <Button
          variant="ghost"
          onClick={handleLogout}
          isLoading={isLoggingOut}
          className="text-xs text-primary border border-primary/30 hover:bg-surface-muted w-full sm:w-auto"
        >
          <LogOut className="w-4 h-4 mr-1.5" />
          <span>{copy.profile.logoutButton}</span>
        </Button>
      </div>

      {/* Modale d'aide & contact des planificateurs */}
      {showSupportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <Card className="w-full max-w-md p-6 space-y-5 animate-scale-up shadow-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-primary">
                {copy.profile.supportModalTitle}
              </h3>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="p-1 rounded-full text-text-muted hover:text-text hover:bg-surface-muted"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-text-muted leading-relaxed">
              Pour toute question sur tes tâches, ton rôle ou les décisions du club, contacte directement un planificateur :
            </p>

            <div className="space-y-3">
              {planners.length === 0 ? (
                <p className="text-xs text-text-muted italic">
                  Aucun planificateur enregistré pour le moment.
                </p>
              ) : (
                planners.map((p) => {
                  const firstName = p.full_name?.split(" ")[0] || "Planificateur";
                  const waText = `Salut ${firstName}, j’ai une question concernant Le Fil du bureau CJ : `;
                  const waUrl = p.phone
                    ? `https://wa.me/${p.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(waText)}`
                    : `https://wa.me/?text=${encodeURIComponent(waText)}`;

                  return (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-md bg-surface-muted border border-border flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <span className="font-semibold text-text block truncate">
                          {p.full_name || "Planificateur"}
                        </span>
                        <span className="text-[11px] text-text-muted truncate block">
                          {p.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex"
                        >
                          <Button
                            variant="primary"
                            className="text-xs min-h-[34px] py-1 px-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white border-none font-semibold"
                          >
                            <MessageSquare className="w-3.5 h-3.5 mr-1" />
                            <span>WhatsApp</span>
                          </Button>
                        </a>
                        <a
                          href={`mailto:${p.email}`}
                          className="p-2 rounded-full hover:bg-white text-primary transition-colors touch-target-min flex items-center justify-center"
                          title="Envoyer un e-mail"
                        >
                          <Mail className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 text-right">
              <Button
                variant="secondary"
                onClick={() => setShowSupportModal(false)}
                className="text-xs"
              >
                Fermer
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
