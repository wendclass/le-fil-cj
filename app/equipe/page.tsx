import { requirePlanner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { TeamManager } from "@/components/team/TeamManager";
import type { Invitation, Profile, Poste } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function EquipePage() {
  const { profile } = await requirePlanner();
  const supabase = await createClient();

  // 1. Récupération des postes définis
  const { data: postes } = await supabase
    .from("postes")
    .select("*")
    .order("rank", { ascending: true });

  // 2. Récupération des invitations en cours avec poste associé
  const { data: invitations } = await supabase
    .from("invitations")
    .select("*, poste:postes(*)")
    .order("created_at", { ascending: false });

  // 3. Récupération des membres inscrits avec poste associé
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*, poste:postes(*)")
    .order("created_at", { ascending: false });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return (
    <AppShell profile={profile}>
      <TeamManager
        currentProfile={profile}
        initialPostes={(postes as Poste[]) || []}
        initialInvitations={(invitations as Invitation[]) || []}
        initialProfiles={(profiles as Profile[]) || []}
        siteUrl={siteUrl}
      />
    </AppShell>
  );
}
