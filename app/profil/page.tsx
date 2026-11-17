import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileView } from "@/components/profile/ProfileView";
import type { Profile, UserBadge, PointsLog } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const { profile } = await requireAuth();
  const supabase = await createClient();

  // 1. Récupération des planificateurs pour le contact d'aide
  const { data: planners } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "planner");

  // 2. Badges obtenus par l'utilisateur
  const { data: badgesData } = await supabase
    .from("user_badges")
    .select("*")
    .eq("user_id", profile.id);

  // 3. 10 derniers gains de points
  const { data: pointsData } = await supabase
    .from("points_log")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <AppShell profile={profile}>
      <ProfileView
        profile={profile}
        planners={(planners as Profile[]) || []}
        userBadges={(badgesData as UserBadge[]) || []}
        pointsLog={(pointsData as PointsLog[]) || []}
      />
    </AppShell>
  );
}
