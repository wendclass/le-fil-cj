"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Copy,
  Check,
  Trash2,
  UserPlus,
  Shield,
  User,
  Clock,
  AlertCircle,
  Briefcase,
  ChevronUp,
  ChevronDown,
  Edit2,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";
import { normalizeEmail } from "@/lib/utils";
import { formatOuagaDate } from "@/lib/date";
import type { Profile, Invitation, Poste, UserRole } from "@/types/database";

interface TeamManagerProps {
  currentProfile: Profile;
  initialPostes: Poste[];
  initialInvitations: Invitation[];
  initialProfiles: Profile[];
  siteUrl: string;
}

export const TeamManager: React.FC<TeamManagerProps> = ({
  currentProfile,
  initialPostes,
  initialInvitations,
  initialProfiles,
  siteUrl,
}) => {
  const { showToast } = useToast();
  const [postes, setPostes] = useState<Poste[]>(initialPostes);
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);

  // Formulaire d'invitation
  const [emailInput, setEmailInput] = useState("");
  const [firstNameInput, setFirstNameInput] = useState("");
  const [lastNameInput, setLastNameInput] = useState("");
  const [roleInput, setRoleInput] = useState<UserRole>("member");
  const [posteInput, setPosteInput] = useState<string>("");
  const [isInviting, setIsInviting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Gestion des Postes
  const [newPosteLabel, setNewPosteLabel] = useState("");
  const [isAddingPoste, setIsAddingPoste] = useState(false);
  const [editingPosteId, setEditingPosteId] = useState<string | null>(null);
  const [editingPosteLabel, setEditingPosteLabel] = useState("");
  const [posteToDelete, setPosteToDelete] = useState<Poste | null>(null);
  const [isDeletingPoste, setIsDeletingPoste] = useState(false);

  // Modale de révocation d'invitation
  const [invitationToRevoke, setInvitationToRevoke] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

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

  // --- Gestion des Postes ---

  const handleAddPoste = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = newPosteLabel.trim();
    if (!label) return;

    if (postes.some((p) => p.label.toLowerCase() === label.toLowerCase())) {
      showToast(copy.team.posteAlreadyExists, "error");
      return;
    }

    try {
      setIsAddingPoste(true);
      const supabase = createClient();
      const maxRank = postes.reduce((max, p) => Math.max(max, p.rank), 0);
      const newRank = maxRank + 10;

      const { data, error } = await supabase
        .from("postes")
        .insert({ label, rank: newRank })
        .select()
        .single();

      if (error) throw error;

      setPostes((prev) => [...prev, data as Poste].sort((a, b) => a.rank - b.rank));
      setNewPosteLabel("");
      showToast("Nouveau poste ajouté.", "success");
    } catch (err: any) {
      showToast(err.message || copy.app.errorGeneric, "error");
    } finally {
      setIsAddingPoste(false);
    }
  };

  const handleMovePoste = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= postes.length) return;

    const newPostes = [...postes];
    const currentPoste = newPostes[index];
    const targetPoste = newPostes[targetIndex];

    // Échange des rangs
    const tempRank = currentPoste.rank;
    currentPoste.rank = targetPoste.rank;
    targetPoste.rank = tempRank;

    newPostes.sort((a, b) => a.rank - b.rank);
    setPostes(newPostes);

    try {
      const supabase = createClient();
      await Promise.all([
        supabase.from("postes").update({ rank: currentPoste.rank }).eq("id", currentPoste.id),
        supabase.from("postes").update({ rank: targetPoste.rank }).eq("id", targetPoste.id),
      ]);
    } catch (err) {
      console.error("Erreur réordonnancement postes :", err);
    }
  };

  const handleRenamePoste = async (posteId: string) => {
    const label = editingPosteLabel.trim();
    if (!label) {
      setEditingPosteId(null);
      return;
    }

    if (postes.some((p) => p.id !== posteId && p.label.toLowerCase() === label.toLowerCase())) {
      showToast(copy.team.posteAlreadyExists, "error");
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("postes")
        .update({ label })
        .eq("id", posteId);

      if (error) throw error;

      setPostes((prev) =>
        prev.map((p) => (p.id === posteId ? { ...p, label } : p))
      );
      // Mettre à jour l'affichage sur profiles et invitations
      setProfiles((prev) =>
        prev.map((p) =>
          p.poste_id === posteId ? { ...p, poste: { ...p.poste!, label } } : p
        )
      );
      showToast("Poste renommé.", "success");
    } catch (err: any) {
      showToast(err.message || copy.app.errorGeneric, "error");
    } finally {
      setEditingPosteId(null);
    }
  };

  const handleConfirmDeletePoste = async () => {
    if (!posteToDelete) return;

    try {
      setIsDeletingPoste(true);
      const supabase = createClient();
      const { error } = await supabase
        .from("postes")
        .delete()
        .eq("id", posteToDelete.id);

      if (error) throw error;

      setPostes((prev) => prev.filter((p) => p.id !== posteToDelete.id));
      // Mettre à jour localement les membres passant sans poste
      setProfiles((prev) =>
        prev.map((p) =>
          p.poste_id === posteToDelete.id ? { ...p, poste_id: null, poste: null } : p
        )
      );
      setInvitations((prev) =>
        prev.map((i) =>
          i.poste_id === posteToDelete.id ? { ...i, poste_id: null, poste: null } : i
        )
      );
      showToast("Poste supprimé.", "success");
    } catch (err: any) {
      showToast(err.message || copy.app.errorGeneric, "error");
    } finally {
      setIsDeletingPoste(false);
      setPosteToDelete(null);
    }
  };

  // --- Attribution d'un poste à un profil ---

  const handleUpdateMemberPoste = async (profileId: string, newPosteId: string) => {
    const posteId = newPosteId === "none" ? null : newPosteId;
    const selectedPoste = postes.find((p) => p.id === posteId) || null;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ poste_id: posteId })
        .eq("id", profileId);

      if (error) throw error;

      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profileId ? { ...p, poste_id: posteId, poste: selectedPoste } : p
        )
      );
      showToast("Poste mis à jour.", "success");
    } catch (err: any) {
      showToast(err.message || copy.app.errorGeneric, "error");
    }
  };

  const handleUpdateInvitationPoste = async (email: string, newPosteId: string) => {
    const posteId = newPosteId === "none" ? null : newPosteId;
    const selectedPoste = postes.find((p) => p.id === posteId) || null;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("invitations")
        .update({ poste_id: posteId })
        .eq("email", email);

      if (error) throw error;

      setInvitations((prev) =>
        prev.map((i) =>
          i.email === email ? { ...i, poste_id: posteId, poste: selectedPoste } : i
        )
      );
      showToast("Poste d’invitation mis à jour.", "success");
    } catch (err: any) {
      showToast(err.message || copy.app.errorGeneric, "error");
    }
  };

  // --- Formulaire d'invitation ---

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const email = normalizeEmail(emailInput);
    if (!email || !email.includes("@") || !email.includes(".")) {
      setFormError(copy.team.errorEmailInvalid);
      return;
    }

    const alreadyInvited = invitations.some((i) => i.email === email);
    const alreadyRegistered = profiles.some((p) => p.email === email);
    if (alreadyInvited || alreadyRegistered) {
      setFormError(copy.team.errorAlreadyInvited);
      return;
    }

    try {
      setIsInviting(true);
      const supabase = createClient();

      const newPosteId = posteInput || null;
      const { data, error } = await supabase
        .from("invitations")
        .insert({
          email,
          role: roleInput,
          first_name: firstNameInput.trim() || null,
          last_name: lastNameInput.trim() || null,
          poste_id: newPosteId,
          invited_by: currentProfile.id,
        })
        .select("*, poste:postes(*)")
        .single();

      if (error) {
        setFormError(error.message);
        setIsInviting(false);
        return;
      }

      setInvitations((prev) => [data as Invitation, ...prev]);
      setEmailInput("");
      setFirstNameInput("");
      setLastNameInput("");
      setPosteInput("");
      setRoleInput("member");
      setFormSuccess(copy.team.successInvited);
      setIsInviting(false);
    } catch (err) {
      setFormError(copy.app.errorGeneric);
      setIsInviting(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!invitationToRevoke) return;

    if (invitationToRevoke === normalizeEmail(currentProfile.email)) {
      showToast(copy.team.revokeSelfForbidden, "error");
      setInvitationToRevoke(null);
      return;
    }

    try {
      setIsRevoking(true);
      const supabase = createClient();

      const { error } = await supabase
        .from("invitations")
        .delete()
        .eq("email", invitationToRevoke);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      setInvitations((prev) => prev.filter((i) => i.email !== invitationToRevoke));
      showToast(copy.team.successRevoked, "success");
    } catch {
      showToast(copy.app.errorGeneric, "error");
    } finally {
      setIsRevoking(false);
      setInvitationToRevoke(null);
    }
  };

  // Groupement des membres par poste selon le rank, puis "Sans poste"
  const groupedProfiles = postes.map((poste) => ({
    poste,
    members: profiles.filter((p) => p.poste_id === poste.id),
  }));
  const unassignedMembers = profiles.filter((p) => !p.poste_id);

  // Calcul du nombre de membres affectés au poste en cours de suppression
  const membersAffectedByDelete = posteToDelete
    ? profiles.filter((p) => p.poste_id === posteToDelete.id).length +
      invitations.filter((i) => i.poste_id === posteToDelete.id).length
    : 0;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* En-tête de page */}
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
          className="shrink-0 text-sm font-medium border-2 border-primary text-primary"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-[#187A4C]" />
              <span>{copy.team.copiedMessage}</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-primary" />
              <span>{copy.team.copyMessageButton}</span>
            </>
          )}
        </Button>
      </div>

      {/* SECTION 1 : GESTION DES POSTES DU BUREAU */}
      <Card className="p-6 md:p-8 space-y-6 border-t-4 border-t-primary shadow-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-primary">
                {copy.team.postesTitle}
              </h2>
              <p className="text-xs text-text-muted font-body">
                {copy.team.postesSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Formulaire d'ajout rapide d'un poste */}
        <form onSubmit={handleAddPoste} className="flex flex-col sm:flex-row gap-3">
          <Input
            type="text"
            placeholder={copy.team.newPostePlaceholder}
            value={newPosteLabel}
            onChange={(e) => setNewPosteLabel(e.target.value)}
            className="flex-1 text-sm"
            maxLength={60}
          />
          <Button
            type="submit"
            variant="secondary"
            isLoading={isAddingPoste}
            disabled={!newPosteLabel.trim()}
            className="text-sm shrink-0 min-h-[44px] border-2 border-primary"
          >
            <Plus className="w-4 h-4 mr-1 text-primary" />
            <span>{copy.team.addPosteButton}</span>
          </Button>
        </form>

        {/* Liste des postes ordonnés */}
        <div className="space-y-2">
          {postes.map((p, index) => {
            const isEditing = editingPosteId === p.id;
            const count = profiles.filter((m) => m.poste_id === p.id).length;

            return (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 p-3 rounded-md bg-surface-muted/50 border border-border transition-all"
              >
                {/* Poignées de réordonnancement & Libellé */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMovePoste(index, "up")}
                      className="p-1 rounded text-text-muted hover:text-primary hover:bg-white disabled:opacity-30 disabled:pointer-events-none"
                      aria-label="Monter ce poste"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === postes.length - 1}
                      onClick={() => handleMovePoste(index, "down")}
                      className="p-1 rounded text-text-muted hover:text-primary hover:bg-white disabled:opacity-30 disabled:pointer-events-none"
                      aria-label="Descendre ce poste"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="text"
                        value={editingPosteLabel}
                        onChange={(e) => setEditingPosteLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenamePoste(p.id);
                          if (e.key === "Escape") setEditingPosteId(null);
                        }}
                        autoFocus
                        className="text-sm h-8"
                      />
                      <Button
                        variant="secondary"
                        onClick={() => handleRenamePoste(p.id)}
                        className="text-xs min-h-[32px] px-2.5 py-0.5"
                      >
                        Valider
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-semibold text-sm text-text truncate">
                        {p.label}
                      </span>
                      <span className="text-[11px] text-text-muted px-2 py-0.5 rounded-full bg-white border border-border shrink-0">
                        {count} membre{count > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions de renommage / suppression */}
                <div className="flex items-center gap-1 shrink-0">
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPosteId(p.id);
                        setEditingPosteLabel(p.label);
                      }}
                      className="p-2 rounded-full text-text-muted hover:text-primary hover:bg-white"
                      title="Renommer ce poste"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPosteToDelete(p)}
                    className="p-2 rounded-full text-text-muted hover:text-primary hover:bg-white"
                    title="Supprimer ce poste"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* SECTION 2 : FORMULAIRE D'INVITATION */}
      <Card className="p-6 md:p-8 space-y-6 border-t-4 border-t-primary shadow-1">
        <div className="flex items-center gap-3 pb-2 border-b border-border">
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            <UserPlus className="w-5 h-5" />
          </div>
          <h2 className="font-display font-bold text-lg text-primary">
            {copy.team.inviteSectionTitle}
          </h2>
        </div>

        {formSuccess && (
          <div className="p-3 bg-[#E1F3E8] border border-[#2DB36B]/40 text-[#0F4D30] rounded-sm text-sm font-semibold animate-fade-in-up flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#187A4C]" />
            <span>{formSuccess}</span>
          </div>
        )}

        {formError && (
          <div className="p-3 bg-[#FFF3C4] border-[1.5px] border-[#232D6B] text-[#232D6B] rounded-sm text-sm font-bold animate-fade-in-up flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#232D6B]" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Email */}
            <div className="md:col-span-6 space-y-1.5">
              <label
                htmlFor="invite-email"
                className="block text-xs font-bold uppercase tracking-wider text-text"
              >
                {copy.team.inviteEmailLabel} <span className="text-[#232D6B]">*</span>
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

            {/* Rôle */}
            <div className="md:col-span-3 space-y-1.5">
              <label
                htmlFor="invite-role"
                className="block text-xs font-bold uppercase tracking-wider text-text"
              >
                {copy.team.roleLabel}
              </label>
              <select
                id="invite-role"
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value as UserRole)}
                disabled={isInviting}
                className="w-full min-h-[44px] px-3.5 py-2.5 bg-white text-text text-sm rounded-sm border-[1.5px] border-border focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30 touch-target-min"
              >
                <option value="member">{copy.roles.member}</option>
                <option value="planner">{copy.roles.planner}</option>
              </select>
            </div>

            {/* Poste */}
            <div className="md:col-span-3 space-y-1.5">
              <label
                htmlFor="invite-poste"
                className="block text-xs font-bold uppercase tracking-wider text-text"
              >
                {copy.team.posteOptional}
              </label>
              <select
                id="invite-poste"
                value={posteInput}
                onChange={(e) => setPosteInput(e.target.value)}
                disabled={isInviting}
                className="w-full min-h-[44px] px-3.5 py-2.5 bg-white text-text text-sm rounded-sm border-[1.5px] border-border focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30 touch-target-min"
              >
                <option value="">{copy.team.noPosteLabel}</option>
                {postes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Prénom et Nom facultatifs pour l'invitation */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4 space-y-1.5">
              <label
                htmlFor="invite-first-name"
                className="block text-xs font-bold uppercase tracking-wider text-text-muted"
              >
                {copy.team.firstNameOptional}
              </label>
              <Input
                id="invite-first-name"
                type="text"
                placeholder="Ex : Aminata"
                value={firstNameInput}
                onChange={(e) => setFirstNameInput(e.target.value)}
                disabled={isInviting}
              />
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <label
                htmlFor="invite-last-name"
                className="block text-xs font-bold uppercase tracking-wider text-text-muted"
              >
                {copy.team.lastNameOptional}
              </label>
              <Input
                id="invite-last-name"
                type="text"
                placeholder="Ex : Ouédraogo"
                value={lastNameInput}
                onChange={(e) => setLastNameInput(e.target.value)}
                disabled={isInviting}
              />
            </div>

            <div className="md:col-span-4 flex items-end">
              <Button
                type="submit"
                variant="primary"
                isLoading={isInviting}
                className="w-full min-h-[44px]"
              >
                {copy.team.inviteButton}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* SECTION 3 : INVITATIONS EN ATTENTE */}
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
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-1"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-[#FFF3C4] text-[#232D6B] border border-[#F2B705]">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-text text-sm sm:text-base">
                        {inv.first_name || inv.last_name
                          ? `${inv.first_name || ""} ${inv.last_name || ""}`.trim()
                          : inv.email}
                      </span>
                      {inv.first_name && (
                        <span className="text-xs text-text-muted">({inv.email})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={inv.role === "planner" ? "primary" : "neutral"}>
                        {inv.role === "planner" ? copy.roles.planner : copy.roles.member}
                      </Badge>
                      <span className="text-xs text-text-muted">
                        Invité le {formatOuagaDate(inv.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end md:self-center flex-wrap">
                  {/* Sélecteur de poste pour l'invitation */}
                  <select
                    value={inv.poste_id || "none"}
                    onChange={(e) => handleUpdateInvitationPoste(inv.email, e.target.value)}
                    className="text-xs bg-white text-text border border-border rounded-md px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Modifier le poste"
                  >
                    <option value="none">{copy.team.noPosteLabel}</option>
                    {postes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="ghost"
                    onClick={() => setInvitationToRevoke(inv.email)}
                    className="text-primary hover:bg-surface-muted text-xs px-3 py-1.5 min-h-[36px] border border-primary/30"
                    aria-label={`Retirer l'invitation pour ${inv.email}`}
                  >
                    <Trash2 className="w-4 h-4 mr-1.5 text-primary" />
                    <span>{copy.team.revokeButton}</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 4 : MEMBRES INSCRITS REGROUPÉS PAR POSTE */}
      <section className="space-y-6">
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
          <div className="space-y-6">
            {/* Groupes de membres selon le rank du poste */}
            {groupedProfiles.map(({ poste, members }) => {
              if (members.length === 0) return null;

              return (
                <div key={poste.id} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className="font-display font-bold text-sm text-primary uppercase tracking-wider">
                      {poste.label}
                    </span>
                    <span className="text-xs text-text-muted">
                      ({members.length})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {members.map((p) => renderMemberCard(p))}
                  </div>
                </div>
              );
            })}

            {/* Groupe Sans poste */}
            {unassignedMembers.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="font-display font-bold text-sm text-text-muted uppercase tracking-wider">
                    {copy.team.noPosteLabel}
                  </span>
                  <span className="text-xs text-text-muted">
                    ({unassignedMembers.length})
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {unassignedMembers.map((p) => renderMemberCard(p))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* MODALE DE CONFIRMATION : SUPPRESSION D'UN POSTE */}
      <ConfirmModal
        isOpen={Boolean(posteToDelete)}
        onClose={() => setPosteToDelete(null)}
        onConfirm={handleConfirmDeletePoste}
        title={copy.team.confirmModalTitle}
        isLoading={isDeletingPoste}
        message={
          posteToDelete ? (
            <div className="space-y-2">
              <p>
                Tu es sur le point de supprimer le poste <strong>« {posteToDelete.label} »</strong>.
              </p>
              {membersAffectedByDelete > 0 && (
                <p className="p-3 rounded-md bg-[#FFF3C4] border border-[#F2B705] text-[#232D6B] text-xs font-semibold">
                  {copy.team.deletePosteWarning(membersAffectedByDelete)}
                </p>
              )}
            </div>
          ) : null
        }
      />

      {/* MODALE DE CONFIRMATION : RÉVOCATION D'INVITATION */}
      <ConfirmModal
        isOpen={Boolean(invitationToRevoke)}
        onClose={() => setInvitationToRevoke(null)}
        onConfirm={handleConfirmRevoke}
        title={copy.team.confirmModalTitle}
        isLoading={isRevoking}
        message={
          invitationToRevoke ? (
            <p>
              Tu es sur le point de retirer l’invitation pour <strong>{invitationToRevoke}</strong>. Cette personne ne pourra plus accéder à l’espace du club.
            </p>
          ) : null
        }
      />
    </div>
  );

  function renderMemberCard(p: Profile) {
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
        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-1"
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
            {p.poste?.label && (
              <div className="text-[13px] text-text-muted font-body font-medium leading-tight">
                {p.poste.label}
              </div>
            )}
            <div className="text-xs text-text-muted">{p.email}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-between sm:justify-end flex-wrap">
          {/* Sélecteur de poste modifiable en ligne par le planificateur */}
          <select
            value={p.poste_id || "none"}
            onChange={(e) => handleUpdateMemberPoste(p.id, e.target.value)}
            className="text-xs bg-white text-text border border-border rounded-md px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`Modifier le poste de ${p.full_name}`}
          >
            <option value="none">{copy.team.noPosteLabel}</option>
            {postes.map((pst) => (
              <option key={pst.id} value={pst.id}>
                {pst.label}
              </option>
            ))}
          </select>

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
  }
};
