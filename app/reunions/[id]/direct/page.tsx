import { requirePlanner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { LiveMeetingMode } from "@/components/meetings/LiveMeetingMode";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import type { Meeting, AgendaItem, Attendance, Decision, Profile } from "@/types/database";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export default async function ReunionDirectPage({ params }: PageProps) {
  const { profile } = await requirePlanner();
  const supabase = await createClient();

  const { data: meetingData, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !meetingData) {
    return (
      <AppShell profile={profile}>
        <Card className="max-w-md mx-auto text-center py-12 px-6 space-y-4">
          <h1 className="font-display font-bold text-xl text-alert">
            Réunion introuvable
          </h1>
          <p className="text-sm text-text-muted">
            La réunion demandée n’existe pas ou a été supprimée.
          </p>
          <div className="pt-2">
            <Link href="/reunions">
              <Button variant="secondary">Retour aux réunions</Button>
            </Link>
          </div>
        </Card>
      </AppShell>
    );
  }

  // Ordre du jour
  const { data: agendaData } = await supabase
    .from("agenda_items")
    .select("*")
    .eq("meeting_id", params.id)
    .order("position", { ascending: true });

  // Présences
  const { data: attendanceData } = await supabase
    .from("attendance")
    .select("*")
    .eq("meeting_id", params.id);

  // Décisions avec tâches liées
  const { data: decisionsData } = await supabase
    .from("decisions")
    .select("*, tasks(*)")
    .eq("meeting_id", params.id);

  // Tous les membres pour l'appel et l'assignation de tâches
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  return (
    <AppShell profile={profile}>
      <LiveMeetingMode
        profile={profile}
        initialMeeting={meetingData as Meeting}
        initialAgendaItems={(agendaData as AgendaItem[]) || []}
        initialAttendance={(attendanceData as Attendance[]) || []}
        initialDecisions={(decisionsData as (Decision & { tasks?: any[] })[]) || []}
        allProfiles={(profilesData as Profile[]) || []}
      />
    </AppShell>
  );
}
