import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileView } from "@/components/profile/ProfileView";
import type { Profile } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const { profile } = await requireAuth();
  const supabase = await createClient();

  // Récupération des planificateurs pour le contact d'aide
  const { data: planners } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "planner");

  return (
    <AppShell profile={profile}>
      <ProfileView profile={profile} planners={(planners as Profile[]) || []} />
    </AppShell>
  );
}
