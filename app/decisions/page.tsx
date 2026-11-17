import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { DecisionsList } from "@/components/decisions/DecisionsList";
import type { Decision } from "@/types/database";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { tab?: "to_validate" | "all" | "unvalidated" };
}

export default async function DecisionsPage({ searchParams }: PageProps) {
  const { profile } = await requireAuth();
  const supabase = await createClient();

  // Nombre total de membres inscrits
  const { count: totalMembersCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const totalMembers = totalMembersCount || 1;

  // Récupérer les décisions publiées avec les validations et la réunion associée
  const { data: decisionsData } = await supabase
    .from("decisions")
    .select("*, meetings(title), decision_validations(user_id)")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const decisions = (decisionsData || []).map((d: any) => {
    const validations = (d.decision_validations as { user_id: string }[]) || [];
    const userHasValidated = validations.some((v) => v.user_id === profile.id);

    return {
      ...d,
      total_members: totalMembers,
      validated_count: validations.length,
      user_has_validated: userHasValidated,
      meeting_title: d.meetings?.title || undefined,
    };
  });

  return (
    <AppShell profile={profile}>
      <DecisionsList
        profile={profile}
        initialDecisions={decisions}
        defaultTab={searchParams.tab}
      />
    </AppShell>
  );
}
