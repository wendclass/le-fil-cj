import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { DecisionDetailView } from "@/components/decisions/DecisionDetailView";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import type { Decision, Meeting, Task, DecisionValidation, Profile } from "@/types/database";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export default async function DecisionDetailPage({ params }: PageProps) {
  const { profile } = await requireAuth();
  const supabase = await createClient();

  const { data: decisionData, error } = await supabase
    .from("decisions")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !decisionData) {
    return (
      <AppShell profile={profile}>
        <Card className="max-w-md mx-auto text-center py-12 px-6 space-y-4">
          <h1 className="font-display font-bold text-xl text-alert">
            Décision introuvable
          </h1>
          <p className="text-sm text-text-muted">
            Cette décision n’existe pas ou n’a pas encore été publiée.
          </p>
          <div className="pt-2">
            <Link href="/decisions">
              <Button variant="secondary">Retour aux décisions</Button>
            </Link>
          </div>
        </Card>
      </AppShell>
    );
  }

  // Récupérer la réunion liée
  let meeting: Meeting | null = null;
  if (decisionData.meeting_id) {
    const { data: mData } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", decisionData.meeting_id)
      .single();
    if (mData) meeting = mData as Meeting;
  }

  // Récupérer les tâches liées
  const { data: tasksData } = await supabase
    .from("tasks")
    .select("*")
    .eq("decision_id", params.id);

  // Récupérer les validations
  const { data: validationsData } = await supabase
    .from("decision_validations")
    .select("*")
    .eq("decision_id", params.id);

  // Récupérer les profils des membres (pour la vue planificateur)
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  return (
    <AppShell profile={profile}>
      <DecisionDetailView
        profile={profile}
        initialDecision={decisionData as Decision}
        meeting={meeting}
        tasks={(tasksData as Task[]) || []}
        validations={(validationsData as DecisionValidation[]) || []}
        allProfiles={(profilesData as Profile[]) || []}
      />
    </AppShell>
  );
}
