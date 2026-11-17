import { requirePlanner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { TeamManager } from "@/components/team/TeamManager";
import type { Invitation, Profile } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function EquipePage() {
  const { profile } = await requirePlanner();
  const supabase = await createClient();

  // Récupération des invitations en cours
  const { data: invitations } = await supabase
    .from("invitations")
    .select("*")
    .order("created_at", { ascending: false });

  // Récupération des membres inscrits
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return (
    <AppShell profile={profile}>
      <TeamManager
        currentProfile={profile}
        initialInvitations={(invitations as Invitation[]) || []}
        initialProfiles={(profiles as Profile[]) || []}
        siteUrl={siteUrl}
      />
    </AppShell>
  );
}
