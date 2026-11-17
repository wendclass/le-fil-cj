import { requirePlanner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import {
  TrackingDashboard,
  type UnseenTaskItem,
  type UnreadDecisionItem,
  type OverdueTaskItem,
} from "@/components/tracking/TrackingDashboard";
import type { Profile, Task, Decision, ReadReceipt } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function SuiviPage() {
  const { profile } = await requirePlanner();
  const supabase = await createClient();

  const now24hAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const todayStr = new Date().toISOString().split("T")[0];

  // 1. Tous les profils avec leur poste
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("*, poste:postes(*)")
    .order("full_name", { ascending: true });
  const allProfiles = (profilesData as Profile[]) || [];
  const profileMap = new Map<string, Profile>();
  allProfiles.forEach((p) => profileMap.set(p.id, p));

  // 2. Tous les accusés de lecture
  const { data: readsData } = await supabase.from("reads").select("*");
  const reads = (readsData as ReadReceipt[]) || [];

  const readSet = new Set<string>();
  reads.forEach((r) => {
    readSet.add(`${r.entity_type}:${r.entity_id}:${r.user_id}`);
  });

  // 3. Toutes les tâches
  const { data: tasksData } = await supabase
    .from("tasks")
    .select("*")
    .order("due_date", { ascending: true });
  const allTasks = (tasksData as Task[]) || [];

  // Tâches non ouvertes depuis +24h
  const unseenTasks: UnseenTaskItem[] = [];
  // Tâches en retard
  const overdueTasks: OverdueTaskItem[] = [];

  const nowTime = new Date().getTime();

  allTasks.forEach((task) => {
    if (task.status === "done") return;

    const assignee = profileMap.get(task.assignee_id) || {
      id: task.assignee_id,
      email: "inconnu@clubcj.org",
      full_name: "Membre inconnu",
      role: "member",
      points: 0,
      streak: 0,
      best_streak: 0,
      avatar_url: null,
      push_prompted_at: null,
      created_at: task.created_at,
    };

    // Vérifier si non ouvert depuis +24 h
    const isUnseen = !readSet.has(`task:${task.id}:${task.assignee_id}`);
    if (isUnseen && task.created_at <= now24hAgo) {
      unseenTasks.push({
        id: task.id,
        title: task.title,
        assignee,
        due_date: task.due_date,
        created_at: task.created_at,
      });
    }

    // Vérifier si en retard
    if (task.due_date < todayStr) {
      const dueTime = new Date(task.due_date).getTime();
      const diffDays = Math.max(
        1,
        Math.floor((nowTime - dueTime) / (1000 * 3600 * 24))
      );
      overdueTasks.push({
        id: task.id,
        title: task.title,
        assignee,
        due_date: task.due_date,
        daysLate: diffDays,
      });
    }
  });

  // 4. Décisions publiées
  const { data: decisionsData } = await supabase
    .from("decisions")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  const allDecisions = (decisionsData as Decision[]) || [];

  const unreadDecisions: UnreadDecisionItem[] = [];
  allDecisions.forEach((dec) => {
    if (!dec.published_at || dec.published_at > now24hAgo) return;

    const unreadMembers: Profile[] = [];
    allProfiles.forEach((p) => {
      if (!readSet.has(`decision:${dec.id}:${p.id}`)) {
        unreadMembers.push(p);
      }
    });

    if (unreadMembers.length > 0) {
      unreadDecisions.push({
        id: dec.id,
        text: dec.text,
        published_at: dec.published_at,
        validation_deadline: dec.validation_deadline,
        unreadMembers,
        totalMembers: allProfiles.length,
      });
    }
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return (
    <AppShell profile={profile}>
      <TrackingDashboard
        unseenTasks={unseenTasks}
        unreadDecisions={unreadDecisions}
        overdueTasks={overdueTasks}
        siteUrl={siteUrl}
      />
    </AppShell>
  );
}
