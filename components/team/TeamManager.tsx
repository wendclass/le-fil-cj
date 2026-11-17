"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Copy, Check, Trash2, UserPlus, Shield, User, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";
import { normalizeEmail } from "@/lib/utils";
import { formatOuagaDate } from "@/lib/date";
import type { Profile, Invitation, UserRole } from "@/types/database";

interface TeamManagerProps {
  currentProfile: Profile;
  initialInvitations: Invitation[];
  initialProfiles: Profile[];
  siteUrl: string;
}

export const TeamManager: React.FC<TeamManagerProps> = ({
  currentProfile,
  initialInvitations,
  initialProfiles,
  siteUrl,
}) => {
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [emailInput, setEmailInput] = useState("");
  const [roleInput, setRoleInput] = useState<UserRole>("member");
  const [isInviting, setIsInviting] = useState(false);
  const [revokingEmail, setRevokingEmail] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Séparer les invitations en attente (claimed_at est nul)
  const pendingInvitations = invitations.filter((inv) => !inv.claimed_at);

  const handleCopyInviteMessage = async () => {
    try {
      const message = copy.team.inviteTemplate(siteUrl);
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.warn("Échec de copie presse-papiers :", err);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const email = normalizeEmail(emailInput);
    if (!email || !email.includes("@") || !email.includes(".")) {
      setFormError(copy.team.errorEmailInvalid);
      return;
    }

    // Vérifier si déjà présent localement
    const alreadyInvited = invitations.some((i) => i.email === email);
    const alreadyRegistered = profiles.some((p) => p.email === email);
    if (alreadyInvited || alreadyRegistered) {
      setFormError(copy.team.errorAlreadyInvited);
      return;
    }

    try {
      setIsInviting(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("invitations")
        .insert({
          email,
          role: roleInput,
          invited_by: currentProfile.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Erreur invitation :", error.message);
        setFormError(error.message);
        setIsInviting(false);
        return;
      }

      setInvitations((prev) => [data as Invitation, ...prev]);
      setEmailInput("");
      setRoleInput("member");
      setFormSuccess(copy.team.successInvited);
      setIsInviting(false);
    } catch (err) {
      console.error("Exception invitation :", err);
      setFormError(copy.app.errorGeneric);
      setIsInviting(false);
    }
  };

  const handleRevoke = async (targetEmail: string) => {
    if (targetEmail === normalizeEmail(currentProfile.email)) {
      setFormError(copy.team.revokeSelfForbidden);
      return;
    }

    try {
      setRevokingEmail(targetEmail);
      setFormError(null);
      const supabase = createClient();

      const { error } = await supabase
        .from("invitations")
        .delete()
        .eq("email", targetEmail);

      if (error) {
        setFormError(error.message);
        setRevokingEmail(null);
        return;
      }

      setInvitations((prev) => prev.filter((i) => i.email !== targetEmail));
      setFormSuccess(copy.team.successRevoked);
      setRevokingEmail(null);
    } catch {
      setFormError(copy.app.errorGeneric);
      setRevokingEmail(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* En-tête de page avec bouton pour copier le modèle d'invitation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary tracking-tight">
            {copy.team.title}
          </h1>
          <p className="font-body text-base text-text-muted mt-1">
            {copy.team.subtitle}
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={handleCopyInviteMessage}
          className="shrink-0 text-sm font-medium"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-success" />
              <span>{copy.team.copiedMessage}</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>{copy.team.copyMessageButton}</span>
            </>
          )}
        </Button>
      </div>

      {/* Formulaire d'invitation */}
      <Card className="p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3 pb-2 border-b border-border">
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            <UserPlus className="w-5 h-5" />
          </div>
          <h2 className="font-display font-bold text-lg text-primary">
            {copy.team.inviteSectionTitle}
          </h2>
        </div>

        {formSuccess && (
          <div className="p-3 bg-success/10 border border-success/30 text-success rounded-sm text-sm font-medium animate-fade-in-up">
            {formSuccess}
          </div>
        )}

        {formError && (
          <div className="p-3 bg-alert/10 border border-alert/30 text-alert rounded-sm text-sm font-medium animate-fade-in-up flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-6 space-y-1.5">
            <label
              htmlFor="invite-email"
              className="block text-sm font-body font-medium text-text"
            >
              {copy.team.inviteEmailLabel}
            </label>
            <Input
              id="invite-email"
              type="email"
              placeholder={copy.team.inviteEmailPlaceholder}
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
              disabled={isInviting}
            />
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <label
              htmlFor="invite-role"
              className="block text-sm font-body font-medium text-text"
            >
              {copy.team.roleLabel}
            </label>
            <select
              id="invite-role"
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value as UserRole)}
              disabled={isInviting}
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-white text-text text-base rounded-sm border-[1.5px] border-border focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30 touch-target-min"
            >
              <option value="member">{copy.roles.member}</option>
              <option value="planner">{copy.roles.planner}</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <Button
              type="submit"
              variant="primary"
              isLoading={isInviting}
              className="w-full"
            >
              {copy.team.inviteButton}
            </Button>
          </div>
        </form>
      </Card>

      {/* Invitations en attente */}
      <section className="space-y-3">
        <h2 className="font-display font-bold text-xl text-primary">
          {copy.team.pendingSectionTitle}
          <span className="ml-2 text-sm text-text-muted font-normal tabular-nums">
            ({pendingInvitations.length})
          </span>
        </h2>

        {pendingInvitations.length === 0 ? (
          <Card className="py-8 text-center bg-surface-muted/50 border-dashed">
            <p className="text-sm text-text-muted">{copy.team.pendingEmpty}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {pendingInvitations.map((inv) => (
              <Card
                key={inv.email}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-accent/20 text-[#232D6B]">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-medium text-text text-sm sm:text-base">
                      {inv.email}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={inv.role === "planner" ? "primary" : "neutral"}>
                        {inv.role === "planner" ? copy.roles.planner : copy.roles.member}
                      </Badge>
                      <span className="text-xs text-text-muted">
                        Invité le {formatOuagaDate(inv.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => handleRevoke(inv.email)}
                  isLoading={revokingEmail === inv.email}
                  className="text-alert hover:bg-alert/10 text-xs px-3 py-1.5 min-h-[38px] self-end sm:self-center"
                  aria-label={`Retirer l'invitation pour ${inv.email}`}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  <span>{copy.team.revokeButton}</span>
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Membres inscrits */}
      <section className="space-y-3">
        <h2 className="font-display font-bold text-xl text-primary">
          {copy.team.registeredSectionTitle}
          <span className="ml-2 text-sm text-text-muted font-normal tabular-nums">
            ({profiles.length})
          </span>
        </h2>

        {profiles.length === 0 ? (
          <Card className="py-8 text-center bg-surface-muted/50 border-dashed">
            <p className="text-sm text-text-muted">{copy.team.registeredEmpty}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {profiles.map((p) => {
              const initials = p.full_name
                ? p.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                : "CJ";

              return (
                <Card
                  key={p.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-sm shrink-0">
                      {p.avatar_url ? (
                        <Image
                          src={p.avatar_url}
                          alt={p.full_name || "Membre"}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                    <div>
                      <div className="font-display font-bold text-text text-sm sm:text-base">
                        {p.full_name || "Membre du Club"}
                      </div>
                      <div className="text-xs text-text-muted">{p.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 justify-between sm:justify-end">
                    <Badge variant={p.role === "planner" ? "primary" : "neutral"}>
                      {p.role === "planner" ? (
                        <span className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          {copy.roles.planner}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {copy.roles.member}
                        </span>
                      )}
                    </Badge>
                    <span className="text-xs text-text-muted tabular-nums">
                      Arrivé(e) le {formatOuagaDate(p.created_at)}
                    </span>
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
