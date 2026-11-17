import { requireAuth } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { SettingsView } from "@/components/settings/SettingsView";

export const dynamic = "force-dynamic";

export default async function ParametresPage() {
  const { profile } = await requireAuth();

  return (
    <AppShell profile={profile}>
      <SettingsView profile={profile} />
    </AppShell>
  );
}
