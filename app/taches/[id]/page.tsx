import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { TaskDetailView } from "@/components/tasks/TaskDetailView";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import type { Task, Profile, Decision, Priority } from "@/types/database";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export default async function TacheDetailPage({ params }: PageProps) {
  const { profile } = await requireAuth();
  const supabase = await createClient();

  const { data: taskData, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !taskData) {
    return (
      <AppShell profile={profile}>
        <Card className="max-w-md mx-auto text-center py-12 px-6 space-y-4">
          <h1 className="font-display font-bold text-xl text-alert">
            Tâche introuvable
          </h1>
          <p className="text-sm text-text-muted">
            Cette tâche n’existe pas ou a été supprimée.
          </p>
          <div className="pt-2">
            <Link href="/taches">
              <Button variant="secondary">Retour au tableau des tâches</Button>
            </Link>
          </div>
        </Card>
      </AppShell>
    );
  }

  // Responsable
  let assignee: Profile | null = null;
  if (taskData.assignee_id) {
    const { data: aData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", taskData.assignee_id)
      .single();
    if (aData) assignee = aData as Profile;
  }

  // Décision liée
  let decision: Decision | null = null;
  if (taskData.decision_id) {
    const { data: dData } = await supabase
      .from("decisions")
      .select("*")
      .eq("id", taskData.decision_id)
      .single();
    if (dData) decision = dData as Decision;
  }

  // Priorité liée
  let priority: Priority | null = null;
  if (taskData.priority_id) {
    const { data: pData } = await supabase
      .from("priorities")
      .select("*")
      .eq("id", taskData.priority_id)
      .single();
    if (pData) priority = pData as Priority;
  }

  return (
    <AppShell profile={profile}>
      <TaskDetailView
        profile={profile}
        initialTask={taskData as Task}
        assignee={assignee}
        decision={decision}
        priority={priority}
      />
    </AppShell>
  );
}
