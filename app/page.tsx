import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import type { Priority, Meeting, Decision, Task, RsvpStatus } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { profile } = await requireAuth();
  const supabase = await createClient();

  // 1. Récupération de la priorité active
  const { data: activePriorityData } = await supabase
    .from("priorities")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const activePriority = activePriorityData as Priority | null;

  // 2. Progression des tâches liées à la priorité active
  let priorityProgress = { total: 0, done: 0 };
  if (activePriority) {
    const { data: linkedTasks } = await supabase
      .from("tasks")
      .select("status")
      .eq("priority_id", activePriority.id);

    if (linkedTasks && linkedTasks.length > 0) {
      const total = linkedTasks.length;
      const done = linkedTasks.filter((t) => t.status === "done").length;
      priorityProgress = { total, done };
    }
  }

  // 3. Récupération de l'éventuelle priorité proposée en attente
  let proposedPriority: (Priority & { has_approved: boolean }) | null = null;
  const { data: proposedData } = await supabase
    .from("priorities")
    .select("*, priority_approvals(planner_id)")
    .eq("status", "proposed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (proposedData) {
    const approvals = (proposedData.priority_approvals as { planner_id: string }[]) || [];
    const hasApproved = approvals.some((a) => a.planner_id === profile.id);

    proposedPriority = {
      ...(proposedData as Priority),
      approvals_count: approvals.length,
      total_planners: 2,
      has_approved: hasApproved,
    };
  }

  // 4. Prochaine réunion (prévue ou en direct)
  const { data: nextMeetingData } = await supabase
    .from("meetings")
    .select("*, attendance(rsvp, user_id)")
    .in("status", ["planned", "live"])
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let nextMeetingWithRsvp: (Meeting & { user_rsvp: RsvpStatus | null }) | null = null;
  if (nextMeetingData) {
    const userAttendance = (nextMeetingData.attendance as { user_id: string; rsvp: RsvpStatus }[])?.find(
      (a) => a.user_id === profile.id
    );

    nextMeetingWithRsvp = {
      ...(nextMeetingData as Meeting),
      user_rsvp: userAttendance?.rsvp || null,
    };
  }

  // 5. Décisions publiées à valider par l'utilisateur
  // Récupérer les décisions publiées
  const { data: publishedDecisions } = await supabase
    .from("decisions")
    .select("*, decision_validations(user_id)")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  // Filtrer celles que l'utilisateur n'a pas encore validées
  const decisionsToValidate: Decision[] = [];
  let unvalidatedDecisionsCount = 0;

  if (publishedDecisions) {
    // Récupérer le nombre total de membres pour le calcul planificateur
    const { count: totalMembersCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const totalMembers = totalMembersCount || 1;

    for (const d of publishedDecisions) {
      const validations = (d.decision_validations as { user_id: string }[]) || [];
      const userHasValidated = validations.some((v) => v.user_id === profile.id);

      if (!userHasValidated) {
        decisionsToValidate.push(d as Decision);
      }

      const remainingToValidate = Math.max(0, totalMembers - validations.length);
      if (remainingToValidate > 0) {
        unvalidatedDecisionsCount += remainingToValidate;
      }
    }
  }

  // 6. Mes tâches en cours (triées par échéance, non terminées)
  const { data: myTasksData } = await supabase
    .from("tasks")
    .select("*")
    .eq("assignee_id", profile.id)
    .neq("status", "done")
    .order("due_date", { ascending: true });

  const myTasks = (myTasksData as Task[]) || [];

  // 7. Mini-indicateurs
  const { data: metricsData } = await supabase.rpc("get_club_metrics", {
    p_period: "current_month",
  });

  // 8. Éléments à surveiller pour le planificateur
  let plannerWatchlist = {
    unseenCount: 0,
    overdueCount: 0,
    draftDecisionsCount: 0,
  };

  if (profile.role === "planner") {
    const todayStr = new Date().toISOString().split("T")[0];
    const now24hAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const { count: overdueCount } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .neq("status", "done")
      .lt("due_date", todayStr);

    const { count: draftsCount } = await supabase
      .from("decisions")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft");

    const { data: reads } = await supabase
      .from("reads")
      .select("entity_id, user_id, entity_type");
    const { data: olderTasks } = await supabase
      .from("tasks")
      .select("id, assignee_id")
      .neq("status", "done")
      .lte("created_at", now24hAgo);

    const readSet = new Set(
      (reads || []).map((r) => `${r.entity_type}:${r.entity_id}:${r.user_id}`)
    );
    const unseenTasks = (olderTasks || []).filter(
      (t) => !readSet.has(`task:${t.id}:${t.assignee_id}`)
    ).length;

    plannerWatchlist = {
      unseenCount: unseenTasks,
      overdueCount: overdueCount || 0,
      draftDecisionsCount: draftsCount || 0,
    };
  }

  return (
    <AppShell profile={profile}>
      <HomeDashboard
        profile={profile}
        initialActivePriority={activePriority}
        initialProposedPriority={proposedPriority}
        initialPriorityProgress={priorityProgress}
        initialNextMeeting={nextMeetingWithRsvp}
        initialDecisionsToValidate={decisionsToValidate}
        initialMyTasks={myTasks}
        unvalidatedDecisionsCount={unvalidatedDecisionsCount}
        miniMetrics={metricsData}
        plannerWatchlist={plannerWatchlist}
      />
    </AppShell>
  );
}
