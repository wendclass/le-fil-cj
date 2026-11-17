"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, Shield, User, Mail, HelpCircle, X, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";
import { formatOuagaDate } from "@/lib/date";
import type { Profile } from "@/types/database";

interface ProfileViewProps {
  profile: Profile;
  planners: Profile[];
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, planners }) => {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

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
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary tracking-tight">
          {copy.profile.title}
        </h1>
        <p className="font-body text-base text-text-muted mt-1">
          {copy.profile.subtitle}
        </p>
      </div>

      <Card className="p-6 sm:p-8 space-y-8">
        {/* En-tête profil avec grand avatar */}
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
            <h2 className="font-display font-bold text-xl text-text">
              {profile.full_name || "Membre du Club"}
            </h2>
            <p className="text-sm text-text-muted font-body">{profile.email}</p>
            <div className="pt-1">
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
            </div>
          </div>
        </div>

        {/* Détails du compte */}
        <div className="border-t border-border pt-6 space-y-4">
          <div className="flex items-center justify-between text-sm py-2 border-b border-border/60">
            <span className="text-text-muted">{copy.profile.emailLabel}</span>
            <span className="font-medium text-text">{profile.email}</span>
          </div>
          <div className="flex items-center justify-between text-sm py-2 border-b border-border/60">
            <span className="text-text-muted">{copy.profile.roleLabel}</span>
            <span className="font-medium text-text">
              {profile.role === "planner" ? copy.roles.planner : copy.roles.member}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm py-2 border-b border-border/60">
            <span className="text-text-muted">{copy.profile.joinedLabel}</span>
            <span className="font-medium text-text tabular-nums">
              {formatOuagaDate(profile.created_at)}
            </span>
          </div>
        </div>

        {/* Lien de contact des planificateurs */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowSupportModal(true)}
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-pill px-2 py-1"
          >
            <HelpCircle className="w-4 h-4 text-accent" />
            <span>{copy.profile.supportText}</span>
          </button>
        </div>

        {/* Bouton de déconnexion */}
        <div className="border-t border-border pt-6">
          <Button
            variant="danger"
            onClick={handleLogout}
            isLoading={isLoggingOut}
            className="w-full sm:w-auto"
          >
            <LogOut className="w-4 h-4 mr-1.5" />
            <span>{isLoggingOut ? copy.profile.loggingOut : copy.profile.logoutButton}</span>
          </Button>
        </div>
      </Card>

      {/* Modal / Feuille de contact des planificateurs */}
      {showSupportModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in-up"
          onClick={() => setShowSupportModal(false)}
        >
          <div
            className="bg-white rounded-lg border border-border shadow-2 max-w-md w-full p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="modal-support-title"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3
                id="modal-support-title"
                className="font-display font-bold text-lg text-primary"
              >
                {copy.profile.supportModalTitle}
              </h3>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="p-1.5 rounded-full text-text-muted hover:text-text touch-target-min"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-text-muted leading-relaxed">
              {copy.profile.supportModalDescription}
            </p>

            <div className="space-y-3">
              {planners.length === 0 ? (
                <p className="text-xs text-text-muted italic">
                  Aucun planificateur listé pour le moment.
                </p>
              ) : (
                planners.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-md bg-surface-muted border border-border flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-display font-semibold text-sm text-text">
                        {p.full_name || "Planificateur"}
                      </div>
                      <div className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{p.email}</span>
                      </div>
                    </div>
                    <a
                      href={`mailto:${p.email}?subject=Question%20Le%20Fil%20Club%20CJ`}
                      className="p-2 rounded-pill bg-white border border-border text-primary hover:bg-primary hover:text-white transition-colors"
                      title={`Écrire à ${p.email}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2">
              <Button
                variant="secondary"
                onClick={() => setShowSupportModal(false)}
                className="w-full text-sm"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
