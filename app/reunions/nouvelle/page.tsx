import { requirePlanner } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { MeetingForm } from "@/components/meetings/MeetingForm";

export const dynamic = "force-dynamic";

export default async function NouvelleReunionPage() {
  const { profile } = await requirePlanner();

  return (
    <AppShell profile={profile}>
      <MeetingForm profile={profile} />
    </AppShell>
  );
}
