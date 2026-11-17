import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { TasksBoard } from "@/components/tasks/TasksBoard";
import type { Task, Priority, Decision, Profile } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function TachesPage() {
  const { profile } = await requireAuth();
  const supabase = await createClient();

  // Récupérer toutes les tâches avec le profil du responsable
  const { data: tasksData } = await supabase
    .from("tasks")
    .select("*, profiles!tasks_assignee_id_fkey(*)")
    .order("due_date", { ascending: true });

  const tasks = (tasksData || []).map((t: any) => ({
    ...t,
    assignee: t.profiles || undefined,
  }));

  // Récupérer la priorité active du mois
  const { data: activePriorityData } = await supabase
    .from("priorities")
    .select("*")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  // Récupérer les décisions publiées
  const { data: decisionsData } = await supabase
    .from("decisions")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  // Récupérer la liste des membres pour les filtres et l'assignation
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  return (
    <AppShell profile={profile}>
      <TasksBoard
        profile={profile}
        initialTasks={tasks}
        allProfiles={(profilesData as Profile[]) || []}
        activePriority={activePriorityData as Priority | null}
        decisions={(decisionsData as Decision[]) || []}
      />
    </AppShell>
  );
}
