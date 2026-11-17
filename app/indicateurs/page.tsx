import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import {
  IndicatorsDashboard,
  type IndicatorsData,
} from "@/components/indicators/IndicatorsDashboard";

export const dynamic = "force-dynamic";

const defaultData: IndicatorsData = {
  priority: {
    has_data: false,
    title: "",
    percent: 0,
    done_tasks: 0,
    total_tasks: 0,
    days_remaining: 0,
  },
  ontime_tasks: {
    has_data: false,
    rate: 0,
    tasks_on_time: 0,
    tasks_due: 0,
    diff_prev: 0,
  },
  decisions_validated: {
    has_data: false,
    rate: 0,
    read_rate: 0,
    decisions_count: 0,
  },
  meeting_time: {
    has_data: false,
    rate: 0,
    avg_minutes: 0,
    meetings_done: 0,
  },
  participation: {
    has_data: false,
    presence_rate: 0,
    rsvp_rate: 0,
    sessions_count: 0,
  },
};

export default async function IndicateursPage() {
  const { profile } = await requireAuth();
  const supabase = await createClient();

  const { data: metricsData } = await supabase.rpc("get_club_metrics", {
    p_period: "current_month",
  });

  const indicators = (metricsData as IndicatorsData) || defaultData;

  return (
    <AppShell profile={profile}>
      <IndicatorsDashboard
        initialData={indicators}
        initialPeriod="current_month"
      />
    </AppShell>
  );
}
