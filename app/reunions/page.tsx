import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { MeetingsList } from "@/components/meetings/MeetingsList";
import type { Meeting, RsvpStatus } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ReunionsPage() {
  const { profile } = await requireAuth();
  const supabase = await createClient();

  // Récupérer toutes les réunions avec leurs présences
  const { data: meetingsData } = await supabase
    .from("meetings")
    .select("*, attendance(rsvp, user_id)")
    .order("starts_at", { ascending: true });

  const meetings = (meetingsData || []).map((m: any) => {
    const attendances = (m.attendance as { rsvp: RsvpStatus; user_id: string }[]) || [];
    const confirmedCount = attendances.filter((a) => a.rsvp === "yes").length;
    const userRsvp = attendances.find((a) => a.user_id === profile.id)?.rsvp || null;

    return {
      ...m,
      confirmed_count: confirmedCount,
      user_rsvp: userRsvp,
    };
  });

  return (
    <AppShell profile={profile}>
      <MeetingsList profile={profile} initialMeetings={meetings} />
    </AppShell>
  );
}
