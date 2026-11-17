import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { MeetingDetailView } from "@/components/meetings/MeetingDetailView";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import type { Meeting, AgendaItem, Attendance, Decision, Profile } from "@/types/database";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
  searchParams: { created?: string };
}

export default async function ReunionDetailPage({ params, searchParams }: PageProps) {
  const { profile } = await requireAuth();
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
            Cette réunion n’existe plus
          </h1>
          <p className="text-sm text-text-muted">
            La réunion demandée est introuvable ou a été supprimée.
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

  // Récupérer les points de l'ordre du jour
  const { data: agendaData } = await supabase
    .from("agenda_items")
    .select("*")
    .eq("meeting_id", params.id)
    .order("position", { ascending: true });

  // Récupérer les présences
  const { data: attendanceData } = await supabase
    .from("attendance")
    .select("*")
    .eq("meeting_id", params.id);

  // Récupérer les décisions prises
  const { data: decisionsData } = await supabase
    .from("decisions")
    .select("*")
    .eq("meeting_id", params.id);

  // Récupérer la liste des profils pour la vue des planificateurs
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return (
    <AppShell profile={profile}>
      <MeetingDetailView
        profile={profile}
        initialMeeting={meetingData as Meeting}
        initialAgendaItems={(agendaData as AgendaItem[]) || []}
        initialAttendance={(attendanceData as Attendance[]) || []}
        initialDecisions={(decisionsData as Decision[]) || []}
        allProfiles={(profilesData as Profile[]) || []}
        siteUrl={siteUrl}
        isJustCreated={searchParams.created === "true"}
      />
    </AppShell>
  );
}
