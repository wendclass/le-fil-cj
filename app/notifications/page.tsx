import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import type { AppNotification } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const { profile } = await requireAuth();
  const supabase = await createClient();

  const { data: notificationsData } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = (notificationsData as AppNotification[]) || [];

  return (
    <AppShell profile={profile}>
      <NotificationsList
        userId={profile.id}
        initialNotifications={notifications}
      />
    </AppShell>
  );
}
